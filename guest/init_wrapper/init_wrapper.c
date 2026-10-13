// init.wrapper — 게스트 부팅 경로 1차 관문 진단용 rdinit
//
// 커널 cmdline의 rdinit=/init.wrapper 로 PID 1로 실행된 뒤, virtio-serial 포트가
// 실제로 존재하는지 확인해서 시리얼 콘솔에 남기고, 원래 /init 으로 넘긴다.
//
// 이 버전은 의도적으로 "최소"다. goldfish pipe 다중화(/dev/qemu_pipe -> vportN)는
// 아직 하지 않는다. Android 게스트가 파이프를 동시에 몇 개나 여는지는 실제로
// 부팅해봐야 알 수 있고, 그 값이 정해지기 전에 다중화 방식을 고르면 헛수고가 되기
// 때문이다. 지금 목표는 docs/GUEST-IMAGE.md 7절의 1~5번 관문을 통과시키는 것.
//
// 빌드: ./build.sh  (NDK 필요, 정적 링크 ARM32)

#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mount.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

// 로그 문자열은 반드시 ASCII 로 유지할 것. /dev/kmsg 는 비ASCII 바이트를
// \xNN 형태로 이스케이프해서 내보내므로, 한글을 쓰면 시리얼 콘솔에서 읽을 수 없다.
#define TAG "init.wrapper: "
#define SCRATCH_DEV "/init_wrapper_dev"
#define VPORT_WAIT_MS 5000
#define VPORT_POLL_MS 50

// 감시자(watchdog) 주기. 부팅이 조용해졌을 때 "멈춘 것"인지 "그냥 콘솔에 안 찍는 것"인지
// 구분할 방법이 이것뿐이다.
#define WD_PERIOD_MS 5000
#define WD_MAX_TICKS 240
#define WD_TABLE_EVERY 12
#define WD_MAX_PROCS 64
// 이름으로 계속 지켜볼 프로세스. 매 틱 전체 표를 뜨는 것은 너무 시끄럽고, 정작 궁금한
// 것은 늘 이 몇 개다 — 지금은 "SurfaceFlinger 가 죽은 것인가 멈춘 것인가"가 그렇다.
#define WD_WATCH_EVERY 4

static int g_log = -1;

// 한 줄을 반드시 write() 한 번으로 내보낸다. /dev/kmsg 는 write 한 번을 메시지
// 한 건으로 취급하므로, 태그와 본문을 나눠 쓰면 커널 로그에 조각으로 흩어진다.
static void put_line(const char *a, const char *b) {
    if (g_log < 0) return;
    char line[512];
    int n = snprintf(line, sizeof(line), TAG "%s%s\n", a ? a : "", b ? b : "");
    if (n < 0) return;
    size_t len = (size_t)n < sizeof(line) ? (size_t)n : sizeof(line) - 1;
    ssize_t unused = write(g_log, line, len);
    (void)unused;
}

static void put_num(const char *a, long v) {
    char buf[32];
    snprintf(buf, sizeof(buf), "%ld", v);
    put_line(a, buf);
}

__attribute__((format(printf, 1, 2)))
static void put_fmt(const char *fmt, ...) {
    char body[448];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(body, sizeof(body), fmt, ap);
    va_end(ap);
    put_line(body, NULL);
}

// 로그를 어디로 낼지는 부팅 시점에 따라 달라진다. 커널이 /dev/console 을 fd 0..2 로
// 열어주지 못했을 수도 있으므로, 먹히는 첫 번째 싱크를 쓴다. /dev/kmsg 가 가장
// 확실하다 — 커널 링버퍼로 들어가 console=ttyAMA0 으로 그대로 나온다.
static void log_open(const char *dev_root) {
    static char path[256];
    const char *names[] = {"/kmsg", "/console", "/ttyAMA0"};
    for (size_t i = 0; i < sizeof(names) / sizeof(names[0]); i++) {
        snprintf(path, sizeof(path), "%s%s", dev_root, names[i]);
        int fd = open(path, O_WRONLY | O_CLOEXEC);
        if (fd >= 0) { g_log = fd; return; }
    }
    if (g_log < 0) g_log = 2;  // 커널이 넘겨준 stderr 에 기대본다
}

/**
 * Counts virtio-serial port nodes and records the first few names.
 *
 * Deliberately matches any vport* rather than a fixed name: port 0 of a virtio-serial bus is
 * reserved for the console, so ports added with -device virtserialport are numbered from
 * /dev/vport0p1 upwards. Waiting on /dev/vport0p0 waits for something that is never created.
 */
static int count_vports(char *names, size_t names_len) {
    DIR *d = opendir(SCRATCH_DEV);
    if (!d) return -1;
    int n = 0;
    size_t used = 0;
    if (names && names_len) names[0] = '\0';
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (strncmp(e->d_name, "vport", 5) != 0) continue;
        n++;
        if (names && used + strlen(e->d_name) + 2 < names_len) {
            if (used) { names[used++] = ' '; names[used] = '\0'; }
            strcpy(names + used, e->d_name);
            used += strlen(e->d_name);
        }
    }
    closedir(d);
    return n;
}

static int wait_for_vport(int timeout_ms) {
    int waited = 0;
    while (waited <= timeout_ms) {
        if (count_vports(NULL, 0) > 0) return waited;
        struct timespec ts = {0, VPORT_POLL_MS * 1000000L};
        nanosleep(&ts, NULL);
        waited += VPORT_POLL_MS;
    }
    return -1;
}

// ---------------------------------------------------------------------------
// 감시자
//
// /init 으로 exec 하기 직전에 fork 해서 남겨두는 프로세스다. exec 는 같은 프로세스를
// 갈아끼우는 것이라 자식은 그대로 살아남고, exec 전에 열어둔 /dev/kmsg fd 도 자식 쪽에는
// 그대로 남는다(안드로이드 init 이 /dev 에 tmpfs 를 새로 덮어도 이미 열린 fd 는 유효하다).
//
// 필요한 이유: 지금 부팅 로그는 "ueventd: Coldboot took 2.58s." 에서 뚝 끊긴다. 그게
// init 이 어딘가에 걸려 있는 건지, 아니면 그냥 logcat 으로만 찍고 있는 건지 콘솔만
// 봐서는 구분이 안 된다. 프로세스 목록과 각 프로세스가 어느 syscall/wchan 에 멈춰
// 있는지를 주기적으로 찍으면 그 구분이 바로 된다.
// ---------------------------------------------------------------------------

static int read_small(const char *path, char *buf, size_t len) {
    int fd = open(path, O_RDONLY | O_CLOEXEC);
    if (fd < 0) return -1;
    ssize_t n = read(fd, buf, len - 1);
    close(fd);
    if (n < 0) n = 0;
    buf[n] = '\0';
    return (int)n;
}

static void chomp(char *s) {
    for (char *p = s; *p; p++) {
        if (*p == '\n' || *p == '\r') { *p = '\0'; return; }
    }
}

static void sleep_ms(int ms) {
    struct timespec ts = {ms / 1000, (long)(ms % 1000) * 1000000L};
    nanosleep(&ts, NULL);
}

// /system /cache /data 가 실제로 마운트됐는지. fs_mgr 이 조용히 실패하는 경우가 있어서
// 커널의 "EXT4-fs (vdX): mounted" 만 믿을 수 없다.
static void wd_mounts(char *out, size_t len) {
    char buf[8192];
    out[0] = '\0';
    if (read_small("/proc/mounts", buf, sizeof(buf)) <= 0) {
        snprintf(out, len, "(no /proc/mounts)");
        return;
    }
    size_t used = 0;
    char *save = NULL;
    for (char *line = strtok_r(buf, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
        char dev[96], mnt[96], type[32];
        if (sscanf(line, "%95s %95s %31s", dev, mnt, type) != 3) continue;
        if (strcmp(mnt, "/system") && strcmp(mnt, "/cache") && strcmp(mnt, "/data")) continue;
        int n = snprintf(out + used, len - used, "%s%s=%s", used ? " " : "", mnt, dev);
        if (n < 0 || (size_t)n >= len - used) break;
        used += (size_t)n;
    }
    if (!used) snprintf(out, len, "(none)");
}

// 블록 장치가 붙긴 했는지. vdc 가 아예 없으면 fs_mgr 은 20초 기다린 뒤 포기한다.
static void wd_blk(char *out, size_t len) {
    DIR *d = opendir("/dev/block");
    size_t used = 0;
    out[0] = '\0';
    if (!d) { snprintf(out, len, "(no /dev/block)"); return; }
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (strncmp(e->d_name, "vd", 2) != 0) continue;
        int n = snprintf(out + used, len - used, "%s%s", used ? " " : "", e->d_name);
        if (n < 0 || (size_t)n >= len - used) break;
        used += (size_t)n;
    }
    closedir(d);
    if (!used) snprintf(out, len, "(no vd*)");
}

// 프로세스 한 줄: 이름 / 상태 / 커널에서 잠든 지점 / 진행 중인 syscall 번호.
// D 상태 + wchan 이 붙어 있으면 그 자리에서 멈춘 것이고, syscall 번호는 무엇을
// 하다 멈췄는지 알려준다(ARM EABI 기준 wait4=114, mount=21, ioctl=54).
static void wd_proc_line(const char *pid, char *out, size_t len) {
    char path[64], comm[64] = "?", stat[256], wchan[64] = "?", sysc[128] = "?";
    char state = '?';

    snprintf(path, sizeof(path), "/proc/%s/comm", pid);
    if (read_small(path, comm, sizeof(comm)) > 0) chomp(comm); else strcpy(comm, "?");

    snprintf(path, sizeof(path), "/proc/%s/stat", pid);
    if (read_small(path, stat, sizeof(stat)) > 0) {
        char *close_paren = strrchr(stat, ')');
        if (close_paren && close_paren[1] && close_paren[2]) state = close_paren[2];
    }

    snprintf(path, sizeof(path), "/proc/%s/wchan", pid);
    if (read_small(path, wchan, sizeof(wchan)) > 0) chomp(wchan); else strcpy(wchan, "?");

    snprintf(path, sizeof(path), "/proc/%s/syscall", pid);
    if (read_small(path, sysc, sizeof(sysc)) > 0) {
        chomp(sysc);
        char *sp = strchr(sysc, ' ');
        if (sp) *sp = '\0';  // 첫 토큰이 syscall 번호. 인자까지는 필요 없다.
    } else {
        strcpy(sysc, "?");
    }

    snprintf(out, len, "p%s %s %c w=%s s=%s", pid, comm, state, wchan, sysc);
}

static int is_pid_dir(const char *name) {
    for (const char *p = name; *p; p++) {
        if (!isdigit((unsigned char)*p)) return 0;
    }
    return name[0] != '\0';
}

// 이름으로 PID 를 찾는다. 프로세스는 재시작하며 PID 가 바뀌므로 이름이 유일한 손잡이다.
static int wd_find_pid(const char *want, char *pid_out, size_t len) {
    DIR *d = opendir("/proc");
    if (!d) return 0;
    struct dirent *e;
    int found = 0;
    while ((e = readdir(d)) != NULL) {
        if (!is_pid_dir(e->d_name)) continue;
        char path[64], comm[64];
        snprintf(path, sizeof(path), "/proc/%s/comm", e->d_name);
        if (read_small(path, comm, sizeof(comm)) <= 0) continue;
        chomp(comm);
        if (strcmp(comm, want) != 0) continue;
        snprintf(pid_out, len, "%s", e->d_name);
        found = 1;
        break;
    }
    closedir(d);
    return found;
}

// 이 프로세스가 /dev/qemu_pipe 를 몇 개 들고 있는가. 파이프를 쥔 채 멈춰 있는 것과
// 파이프를 아예 못 얻은 것은 원인이 정반대인데, 로그만 봐서는 둘 다 "조용함"이다.
static int wd_pipe_fds(const char *pid) {
    char dirpath[64];
    snprintf(dirpath, sizeof(dirpath), "/proc/%s/fd", pid);
    DIR *d = opendir(dirpath);
    if (!d) return -1;
    int n = 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        char link[96], target[160];
        snprintf(link, sizeof(link), "%s/%s", dirpath, e->d_name);
        ssize_t k = readlink(link, target, sizeof(target) - 1);
        if (k <= 0) continue;
        target[k] = '\0';
        if (strstr(target, "qemu_pipe")) n++;
    }
    closedir(d);
    return n;
}

// 관심 프로세스들의 상태를 한 줄씩. 상태 문자가 답을 준다:
//   없음 → 죽었고 아직 안 올라옴 (또는 영영 안 옴)
//   S/D + wchan → 그 자리에서 기다리는 중. syscall 번호가 무엇을 하다 멈췄는지 말해준다
//   R → 돌고 있음
// pipes= 가 1 이상이면 goldfish pipe 를 쥐고 있다는 뜻이고, 그 상태로 멈춰 있으면
// 호스트가 답을 안 하고 있는 것이다.
static void wd_watch(int secs) {
    static const char *names[] = { "surfaceflinger", "system_server", "bootanimation" };
    for (size_t i = 0; i < sizeof(names) / sizeof(names[0]); i++) {
        char pid[16];
        if (!wd_find_pid(names[i], pid, sizeof(pid))) {
            put_fmt("wd t=%ds watch %s: not running", secs, names[i]);
            continue;
        }
        char line[224];
        wd_proc_line(pid, line, sizeof(line));
        put_fmt("wd t=%ds watch %s pipes=%d", secs, line, wd_pipe_fds(pid));
    }
}

static void wd_table(int secs) {
    DIR *d = opendir("/proc");
    if (!d) { put_fmt("wd t=%ds procs: (no /proc)", secs); return; }
    int printed = 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL && printed < WD_MAX_PROCS) {
        if (!is_pid_dir(e->d_name)) continue;
        char line[224];
        wd_proc_line(e->d_name, line, sizeof(line));
        put_fmt("wd t=%ds %s", secs, line);
        printed++;
    }
    closedir(d);
}

// fs_mgr 가 /data 를 왜 거부했는지 로그로 말해주지 않으면, 직접 붙여보는 것이 가장 빠른
// 답이다. 붙으면 파일시스템은 멀쩡하고 문제는 fstab 항목/옵션 쪽이라는 뜻이고, 안 붙으면
// errno 가 곧 이유다. 읽기 전용으로 붙였다 바로 뗀다.
static void probe_data_mount(void) {
    // 커널이 이 장치를 쓰기 금지로 보고 있는가. mount(2) 의 EACCES 는 십중팔구 이것이고,
    // /sys/block/<dev>/ro 가 그 값을 그대로 보여준다. 세 장치를 나란히 찍어야
    // "vdc 만 그런가"가 판별된다.
    //
    // size 도 같이 찍는다. 세 이미지의 크기가 서로 다르므로(system 1.75G, cache 256M,
    // userdata 2G) 크기가 곧 신원이다. virtio-mmio 는 장치가 커맨드라인 순서대로
    // vda/vdb/vdc 가 된다는 보장이 없어서, "vdc 가 정말 userdata 인가"부터 확인해야 한다.
    // 단위는 512바이트 섹터: system=3670016, cache=524288, userdata=4194304.
    const char *disks[] = {"vda", "vdb", "vdc", "vdd"};
    for (size_t i = 0; i < sizeof(disks) / sizeof(disks[0]); i++) {
        char path[64], ro[16] = "?", size[32] = "?";
        snprintf(path, sizeof(path), "/sys/block/%s/ro", disks[i]);
        if (read_small(path, ro, sizeof(ro)) > 0) chomp(ro); else continue;
        snprintf(path, sizeof(path), "/sys/block/%s/size", disks[i]);
        if (read_small(path, size, sizeof(size)) > 0) chomp(size); else strcpy(size, "?");
        put_fmt("wd probe: %s ro=%s sectors=%s", disks[i], ro, size);
    }

    const char *dev = "/dev/block/vdc";
    if (access(dev, F_OK) != 0) {
        put_fmt("wd probe: %s does not exist", dev);
        return;
    }
    // 가장 직접적인 확인. 장치가 쓰기 금지면 O_RDWR open 자체가 EACCES 로 떨어진다.
    // mount 보다 변수가 적어서, 이 한 줄이 곧 판정이다.
    int fd = open(dev, O_RDWR | O_CLOEXEC);
    if (fd >= 0) {
        put_fmt("wd probe: open(%s, O_RDWR) OK -> device is writable", dev);
        close(fd);
    } else {
        put_fmt("wd probe: open(%s, O_RDWR) failed: %s (errno=%d)", dev, strerror(errno), errno);
    }
    const char *probe_dir = "/dev/wd_probe";  // rootfs 는 이 시점에 ro 로 리마운트돼 있다
    if (mkdir(probe_dir, 0755) != 0 && errno != EEXIST) {
        put_fmt("wd probe: mkdir %s failed: %s", probe_dir, strerror(errno));
        return;
    }
    // 쓰기 가능으로 한 번, 읽기 전용으로 한 번. rw 만 실패하면 장치가 쓰기 금지인 것이고,
    // 둘 다 실패하면 파일시스템이나 접근 경로 자체의 문제다.
    struct { unsigned long flags; const char *what; } tries[] = {
        {0, "rw"}, {MS_RDONLY, "ro"},
    };
    for (size_t i = 0; i < sizeof(tries) / sizeof(tries[0]); i++) {
        if (mount(dev, probe_dir, "ext4", tries[i].flags, NULL) == 0) {
            put_fmt("wd probe: mount %s ext4 %s OK", dev, tries[i].what);
            umount(probe_dir);
        } else {
            put_fmt("wd probe: mount %s ext4 %s failed: %s (errno=%d)",
                    dev, tries[i].what, strerror(errno), errno);
        }
    }
    rmdir(probe_dir);
}

// binder 가 없으면 servicemanager 부터 모든 바인더 클라이언트가 죽고, init 은 critical
// 서비스가 반복 실패했다고 판단해 recovery 로 리부트한다. 커널에 드라이버가 없는 것인지
// 노드만 안 만들어진 것인지에 따라 고칠 곳이 완전히 다르므로, 둘을 갈라서 본다.
static void probe_binder(void) {
    // qemu_pipe 는 ranchu 그래픽 HAL 이 호스트 렌더러와 이야기하는 통로다. 이게 없으면
    // gralloc.ranchu / libEGL_emulation 이 호스트에 붙지 못하고, SurfaceFlinger::init 이
    // EGL 설정에 실패해 LOG_ALWAYS_FATAL 로 abort 한다(실측 백트레이스가 그 지점이다).
    // fb0/dri 는 그 대안인 소프트웨어 프레임버퍼 경로가 열려 있는지 확인하는 것이다.
    const char *nodes[] = {"/dev/binder", "/dev/hwbinder", "/dev/vndbinder", "/dev/binderfs",
                           "/dev/qemu_pipe", "/dev/goldfish_pipe",
                           "/dev/graphics/fb0", "/dev/fb0", "/dev/dri/card0"};
    for (size_t i = 0; i < sizeof(nodes) / sizeof(nodes[0]); i++) {
        put_fmt("wd dev: %s %s", nodes[i], access(nodes[i], F_OK) == 0 ? "exists" : "MISSING");
    }
    // 커널에 드라이버가 들어 있으면 misc 클래스에 등록돼 있다. 여기 있는데 /dev 에
    // 없으면 ueventd 문제, 여기도 없으면 커널 설정 문제다.
    put_fmt("wd dev: /sys/class/misc/binder %s",
            access("/sys/class/misc/binder", F_OK) == 0 ? "exists" : "MISSING");

    char fs[4096];
    if (read_small("/proc/filesystems", fs, sizeof(fs)) > 0) {
        put_fmt("wd dev: binderfs in /proc/filesystems: %s", strstr(fs, "binder") ? "yes" : "no");
    }

    // misc 클래스에 실제로 무엇이 등록돼 있는지. 이름을 봐야 추측을 멈출 수 있다.
    DIR *d = opendir("/sys/class/misc");
    if (!d) { put_line("wd dev: /sys/class/misc unreadable", NULL); return; }
    char list[384];
    size_t used = 0;
    list[0] = '\0';
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        int n = snprintf(list + used, sizeof(list) - used, "%s%s", used ? " " : "", e->d_name);
        if (n < 0 || (size_t)n >= sizeof(list) - used) break;
        used += (size_t)n;
    }
    closedir(d);
    put_fmt("wd dev: misc class: %s", used ? list : "(empty)");
}

static void watchdog_main(void) {
    int data_seen = 0;
    int probed = 0;
    int binder_probed = 0;
    for (int tick = 1; tick <= WD_MAX_TICKS; tick++) {
        sleep_ms(WD_PERIOD_MS);
        int secs = tick * (WD_PERIOD_MS / 1000);

        char mounts[256], blk[128], pid1[224];
        wd_mounts(mounts, sizeof(mounts));
        wd_blk(blk, sizeof(blk));
        wd_proc_line("1", pid1, sizeof(pid1));

        put_fmt("wd t=%ds mnt: %s", secs, mounts);
        put_fmt("wd t=%ds blk: %s", secs, blk);
        put_fmt("wd t=%ds %s", secs, pid1);

        if (!data_seen && strstr(mounts, "/data=")) {
            data_seen = 1;
            put_fmt("wd t=%ds MILESTONE /data mounted", secs);
        }
        // /data 가 아직이면 누가 무엇을 붙들고 있는지 전체 표를 뜬다. 마운트가 끝난 뒤에도
        // 표를 계속 찍으면 정작 봐야 할 뒷부분을 밀어내므로 그때는 요약만 남긴다.
        // 게스트는 이제 30초쯤에 recovery 로 리부트한다. binder 확인은 그 전에 끝나야 한다.
        if (!binder_probed && secs >= 10) {
            binder_probed = 1;
            probe_binder();
        }

        // fs_mgr 에게 충분히 시간을 준 뒤(항목당 최대 20초 대기가 있다) 한 번만 확인한다.
        if (!data_seen && !probed && secs >= 30) {
            probed = 1;
            probe_data_mount();
        }

        // /data 가 붙은 뒤부터가 그래픽·system_server 구간이다. 그 전에는 볼 것이 없다.
        if (data_seen && tick % WD_WATCH_EVERY == 0) wd_watch(secs);

        int every = data_seen ? WD_TABLE_EVERY * 4 : WD_TABLE_EVERY;
        if (tick % every == 0) wd_table(secs);
    }
    put_line("wd done", NULL);
    _exit(0);
}

// ---------------------------------------------------------------------------
// fstab 장치 이름 교정
//
// fstab.ranchu 는 vda=/system, vdb=/cache, vdc=/data 를 고정으로 기대한다. 그런데
// virtio-mmio 는 -device 를 적은 순서대로 vda, vdb, vdc 가 된다고 보장하지 않는다.
// 실측: 커맨드라인에 system, cache, userdata 순으로 적었는데 게스트는 vda=userdata(2G),
// vdb=cache(256M), vdc=system(1.75G) 으로 봤다. 그래서 /system 은 빈 userdata 를 물고
// (빈 ext4 도 ro 마운트는 성공한다) /data 는 읽기 전용인 system.img 에 rw 마운트를
//시도하다 EACCES 로 죽었다.
//
// 호스트 QEMU 버전에 따라 순서가 또 달라질 수 있으므로 순서를 맞추는 대신, 각 장치의
// ext4 슈퍼블록 라벨을 읽어 fstab 을 실제 장치 이름으로 고쳐 쓴다. 이 시점의 rootfs 는
// 아직 쓰기 가능하다(안드로이드 init 이 on early-init 에서 ro 로 리마운트한다).
// ---------------------------------------------------------------------------

#define EXT_SB_OFFSET 1024
#define EXT_SB_MAGIC_OFF 0x38
#define EXT_SB_LABEL_OFF 0x78
#define EXT_LABEL_MAX 16

static int read_ext_label(const char *devpath, char *label, size_t len) {
    int fd = open(devpath, O_RDONLY | O_CLOEXEC);
    if (fd < 0) return -1;
    unsigned char sb[256];
    ssize_t n = pread(fd, sb, sizeof(sb), EXT_SB_OFFSET);
    close(fd);
    if (n < (ssize_t)sizeof(sb)) return -1;
    // s_magic 은 리틀엔디안 0xEF53
    if (sb[EXT_SB_MAGIC_OFF] != 0x53 || sb[EXT_SB_MAGIC_OFF + 1] != 0xEF) return -1;
    size_t cap = len - 1 < EXT_LABEL_MAX ? len - 1 : EXT_LABEL_MAX;
    memcpy(label, sb + EXT_SB_LABEL_OFF, cap);
    label[cap] = '\0';
    return 0;
}

static int find_dev_by_label(const char *label, char *out, size_t len) {
    DIR *d = opendir(SCRATCH_DEV);
    if (!d) return -1;
    int found = -1;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        // vda..vdz 만. vda1 같은 파티션은 우리 구성에 없다.
        if (strncmp(e->d_name, "vd", 2) != 0 || strlen(e->d_name) != 3) continue;
        char path[256], lbl[EXT_LABEL_MAX + 1];
        snprintf(path, sizeof(path), "%s/%s", SCRATCH_DEV, e->d_name);
        if (read_ext_label(path, lbl, sizeof(lbl)) != 0) continue;
        put_fmt("disk %s label=\"%s\"", e->d_name, lbl);
        if (found != 0 && strcmp(lbl, label) == 0) {
            snprintf(out, len, "/dev/block/%s", e->d_name);
            found = 0;
        }
    }
    closedir(d);
    return found;
}

static int count_disks(void) {
    DIR *d = opendir(SCRATCH_DEV);
    if (!d) return 0;
    int n = 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (strncmp(e->d_name, "vd", 2) == 0 && strlen(e->d_name) == 3) n++;
    }
    closedir(d);
    return n;
}

// virtio-blk 프로브가 virtio-console 보다 늦을 수 있다. 디스크가 하나도 안 보이는
// 상태에서 라벨을 읽으면 아무것도 못 찾고 fstab 을 그대로 두게 된다.
static int wait_for_disks(int timeout_ms) {
    int waited = 0;
    while (waited <= timeout_ms) {
        if (count_disks() > 0) return waited;
        sleep_ms(VPORT_POLL_MS);
        waited += VPORT_POLL_MS;
    }
    return -1;
}

static void fixup_fstab(const char *path) {
    static const struct { const char *mnt; const char *label; } wanted[] = {
        {"/system", "system"}, {"/cache", "cache"}, {"/data", "data"},
    };
    char buf[16384];
    int n = read_small(path, buf, sizeof(buf));
    if (n <= 0) {
        put_fmt("fstab: cannot read %s", path);
        return;
    }

    char out[16384];
    size_t used = 0;
    int changed = 0;
    char *save = NULL;
    for (char *line = strtok_r(buf, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
        char dev[160], mnt[160], repl[160];
        const char *use = NULL;
        if (sscanf(line, "%159s %159s", dev, mnt) == 2 &&
            strncmp(dev, "/dev/block/vd", 13) == 0) {
            for (size_t i = 0; i < sizeof(wanted) / sizeof(wanted[0]); i++) {
                if (strcmp(mnt, wanted[i].mnt) != 0) continue;
                if (find_dev_by_label(wanted[i].label, repl, sizeof(repl)) == 0) {
                    use = repl;
                } else {
                    put_fmt("fstab: no disk labelled \"%s\" for %s, leaving %s",
                            wanted[i].label, mnt, dev);
                }
                break;
            }
        }
        int wrote;
        if (use && strcmp(use, dev) != 0) {
            put_fmt("fstab: %s %s -> %s", mnt, dev, use);
            changed = 1;
            // 나머지 열(마운트 옵션, fs_mgr 플래그)은 그대로 둔다.
            wrote = snprintf(out + used, sizeof(out) - used, "%s%s\n", use, line + strlen(dev));
        } else {
            wrote = snprintf(out + used, sizeof(out) - used, "%s\n", line);
        }
        if (wrote < 0 || (size_t)wrote >= sizeof(out) - used) {
            put_line("fstab: rewrite buffer full, leaving the file alone", NULL);
            return;
        }
        used += (size_t)wrote;
    }

    if (!changed) {
        put_line("fstab: device names already correct", NULL);
        return;
    }
    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC, 0644);
    if (fd < 0) {
        put_fmt("fstab: cannot write %s: %s", path, strerror(errno));
        return;
    }
    ssize_t w = write(fd, out, used);
    close(fd);
    put_fmt("fstab: rewrote %s (%d bytes)", path, (int)w);
}

// devtmpfs 를 /dev 가 아니라 스크래치 경로에 붙인다. 안드로이드 first-stage init 은
// /dev 에 tmpfs 를 새로 마운트하고 ueventd 로 노드를 만들기 때문에, 여기서 /dev 를
// 점유하면 덮이거나 방해가 된다. 확인만 하고 원상복구한다.
// 게임 APK 공유 폴더. 호스트(앱)가 -fsdev local,...,mount_tag=games 로 내보내는 9p 를 루트의
// /games 에 읽기 전용으로 건다. 안드로이드 init 이 /mnt 를 tmpfs 로 덮으므로 /mnt 아래는 못 쓴다.
// 여기서 걸어 두면 exec 뒤에도 같은 마운트 네임스페이스라 그대로 남는다. 커널에
// CONFIG_NET_9P_VIRTIO, CONFIG_9P_FS 가 있어야 하고, 없거나 호스트가 장치를 안 붙였으면 실패를
// 적고 넘어간다 — 게임 실행 쪽이 "/games 에 파일이 없다"로 알아차린다.
#define GAMES_MOUNT "/games"
#define GAMES_WAIT_MS 3000
static void mount_games(void) {
    if (mkdir(GAMES_MOUNT, 0755) != 0 && errno != EEXIST) {
        put_line("WARN mkdir " GAMES_MOUNT " failed: ", strerror(errno));
        return;
    }
    int waited = 0;
    while (1) {
        if (mount("games", GAMES_MOUNT, "9p", MS_RDONLY,
                  "trans=virtio,version=9p2000.L,cache=loose") == 0) {
            put_num("OK games share mounted at " GAMES_MOUNT ", waited_ms=", waited);
            return;
        }
        if (waited >= GAMES_WAIT_MS) break;
        sleep_ms(100);
        waited += 100;
    }
    put_line("WARN games share mount failed: ", strerror(errno));
    put_line("  -> check CONFIG_NET_9P_VIRTIO/CONFIG_9P_FS and the host -fsdev/virtio-9p-device", NULL);
}

static int scratch_mount(void) {
    if (mkdir(SCRATCH_DEV, 0755) != 0 && errno != EEXIST) return -1;
    if (mount("devtmpfs", SCRATCH_DEV, "devtmpfs", MS_NOSUID, NULL) != 0) return -1;
    return 0;
}

static void scratch_unmount(void) {
    umount(SCRATCH_DEV);
    rmdir(SCRATCH_DEV);
}

int main(int argc, char **argv, char **envp) {
    (void)argc;

    int mounted = scratch_mount() == 0;
    log_open(mounted ? SCRATCH_DEV : "/dev");

    put_line("start (rdinit, PID 1)", NULL);
    if (!mounted) {
        put_line("WARN devtmpfs mount failed (check CONFIG_DEVTMPFS): ", strerror(errno));
    } else {
        // 4번 관문: virtio-serial 포트가 실제로 보이는가.
        // 없으면 emugl 전송로가 없다는 뜻이고, 부팅이 끝까지 가더라도 화면은 안 나온다.
        char names[256];
        int waited = wait_for_vport(VPORT_WAIT_MS);
        int found = count_vports(names, sizeof(names));
        if (waited < 0) {
            put_line("FAIL no /dev/vport* appeared", NULL);
            put_line("  -> check CONFIG_VIRTIO_CONSOLE=y in the guest kernel", NULL);
            put_line("  -> host attaches 8 ports via virtio-serial-device (mmio)", NULL);
        } else {
            put_num("OK virtio-serial ports present, waited_ms=", waited);
        }
        // 성공이든 실패든 실제 상황을 보고한다. 실패 경로에서 개수를 안 찍는 바람에
        // "몇 개가 있긴 한가"조차 알 수 없었다.
        put_num("vport node count=", found);
        put_line("vport nodes: ", found > 0 ? names : "(none)");

        // 디스크가 fstab 이 기대하는 이름으로 올라왔는지 확인하고, 아니면 고친다.
        // 반드시 scratch_unmount 앞에서. 라벨을 읽으려면 devtmpfs 가 붙어 있어야 한다.
        int disk_wait = wait_for_disks(3000);
        put_fmt("disks visible=%d waited_ms=%d", count_disks(), disk_wait);
        fixup_fstab("/fstab.ranchu");
        mount_games();

        scratch_unmount();
    }

    // exec 하기 전에 감시자를 떼어 놓는다. exec 후에는 이 프로세스가 곧 안드로이드
    // init 이 되므로, 감시자는 fork 로만 남길 수 있다.
    pid_t wd = fork();
    if (wd == 0) {
        watchdog_main();
        _exit(0);
    } else if (wd < 0) {
        put_line("WARN watchdog fork failed: ", strerror(errno));
    } else {
        put_num("watchdog pid=", (long)wd);
    }

    // 원래 init 으로 넘긴다. argv/envp 를 그대로 보존해야 안드로이드 init 이
    // 자기가 first stage 인지 판단하는 로직이 깨지지 않는다.
    static const char *candidates[] = {"/init", "/sbin/init", "/system/bin/init"};
    for (size_t i = 0; i < sizeof(candidates) / sizeof(candidates[0]); i++) {
        if (access(candidates[i], X_OK) != 0) continue;
        put_line("exec ", candidates[i]);
        argv[0] = (char *)candidates[i];
        execve(candidates[i], argv, envp);
        put_line("exec failed: ", strerror(errno));
    }

    // 여기 도달했다면 넘길 init 이 없다. PID 1 이 죽으면 커널이 패닉을 내는데,
    // 위 로그가 그 직전에 이유를 남긴다.
    put_line("FATAL no executable /init found - check ramdisk layout", NULL);
    return 1;
}
