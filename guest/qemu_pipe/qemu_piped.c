// qemu_piped — /dev/qemu_pipe 를 CUSE 로 제공하고 open 마다 virtio-serial 포트를 배정한다
//
// 왜 필요한가
// ----------
// Android 7 의 ranchu 그래픽 스택은 호스트 렌더러와 goldfish pipe 로 이야기한다:
//
//     fd = open("/dev/qemu_pipe", O_RDWR);
//     write(fd, "pipe:opengles\0", 14);   // 끝의 NUL 포함, 전부 써져야 성공
//     ... 이후로는 양방향 바이트 스트림 ...
//
// 이 프로젝트에서 그 스트림은 virtio-serial 포트다. 파이프 하나가 포트 하나에 그대로
// 대응되므로 프레이밍도 다중화 프로토콜도 필요 없다 — 필요한 건 "open 마다 다른 포트"뿐.
//
// 앞선 시험판(pipelink)은 /dev/qemu_pipe 를 포트 하나에 심볼릭 링크로 걸었다. 그것으로
// 전송로가 실제로 동작한다는 것은 확인됐지만(호스트 소켓에 pipe:qemud:boot-properties 도착),
// virtio_console 은 포트당 동시 접속이 하나라서 두 번째 open 은 EBUSY 다. 실제로 그 하나를
// qemu-props 가 먼저 가져가는 바람에 SurfaceFlinger 는 파이프를 못 얻었다.
//
// 그래서 진짜 문자 장치가 필요하고, 커널 밖에서 그걸 만드는 방법이 CUSE 다. 커널이
// /dev/cuse 로 FUSE 요청을 보내면 이 데몬이 응답한다. open 요청마다 빈 포트를 배정하고,
// read/write 는 그 포트로 그대로 넘긴다.
//
// 동시성
// ------
// 디스패처(메인 스레드)는 절대 블록되면 안 된다. 한 파이프의 read 가 블록되는 동안
// 다른 파이프의 요청도 처리해야 하기 때문이다. 그래서 read/write 는 파이프별 워커
// 스레드로 넘기고, 디스패처는 큐에 넣고 곧바로 다음 요청을 읽는다. open/release/flush 는
// 블록되지 않으므로 디스패처가 직접 처리한다.
//
// 빌드: guest/qemu_pipe/build.sh (NDK, 정적 링크 ARM32)

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <pthread.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <time.h>
#include <unistd.h>

// ---------------------------------------------------------------------------
// FUSE/CUSE 프로토콜 정의
//
// 커널 uapi(linux/fuse.h)에서 필요한 것만 옮겨 적는다. NDK 헤더 버전에 따라 구조체가
// 없거나 다를 수 있는데, 이건 커널과 주고받는 고정된 바이너리 규약이라 직접 적는 편이
// 오히려 안전하다. 크기가 어긋나면 조용히 깨지므로 아래 컴파일 타임 검사로 못 박는다.
// ---------------------------------------------------------------------------

#define FUSE_KERNEL_VERSION 7
// 우리가 구현하는 최소 마이너. 커널은 더 높은 버전을 제시하지만, 응답에 적은 쪽으로
// 맞춰 준다. 낮게 잡을수록 구조체가 단순해서 어긋날 여지가 적다.
#define FUSE_KERNEL_MINOR_VERSION 26

enum fuse_opcode {
    FUSE_OPEN_OP = 14,
    FUSE_READ_OP = 15,
    FUSE_WRITE_OP = 16,
    FUSE_RELEASE_OP = 18,
    FUSE_FLUSH_OP = 25,
    FUSE_INIT_OP = 26,
    FUSE_INTERRUPT_OP = 36,
    FUSE_DESTROY_OP = 38,
    CUSE_INIT_OP = 4096,
};

#define FOPEN_DIRECT_IO (1 << 0)
#define FOPEN_NONSEEKABLE (1 << 2)

struct fuse_in_header {
    uint32_t len;
    uint32_t opcode;
    uint64_t unique;
    uint64_t nodeid;
    uint32_t uid;
    uint32_t gid;
    uint32_t pid;
    uint32_t padding;
};

struct fuse_out_header {
    uint32_t len;
    int32_t error;
    uint64_t unique;
};

struct cuse_init_in {
    uint32_t major;
    uint32_t minor;
    uint32_t unused;
    uint32_t flags;
};

struct cuse_init_out {
    uint32_t major;
    uint32_t minor;
    uint32_t unused;
    uint32_t flags;
    uint32_t max_read;
    uint32_t max_write;
    uint32_t dev_major;
    uint32_t dev_minor;
    uint32_t spare[10];
};

struct fuse_open_in {
    uint32_t flags;
    uint32_t unused;
};

struct fuse_open_out {
    uint64_t fh;
    uint32_t open_flags;
    uint32_t padding;
};

struct fuse_read_in {
    uint64_t fh;
    uint64_t offset;
    uint32_t size;
    uint32_t read_flags;
    uint64_t lock_owner;
    uint32_t flags;
    uint32_t padding;
};

struct fuse_write_in {
    uint64_t fh;
    uint64_t offset;
    uint32_t size;
    uint32_t write_flags;
    uint64_t lock_owner;
    uint32_t flags;
    uint32_t padding;
};

struct fuse_write_out {
    uint32_t size;
    uint32_t padding;
};

struct fuse_release_in {
    uint64_t fh;
    uint32_t flags;
    uint32_t release_flags;
    uint64_t lock_owner;
};

// 구조체 크기가 커널과 어긋나면 요청 파싱이 통째로 밀린다. 조용히 깨지느니 빌드를 막는다.
#define CHECK_SIZE(type, want) \
    typedef char check_##type[(sizeof(struct type) == (want)) ? 1 : -1]
CHECK_SIZE(fuse_in_header, 40);
CHECK_SIZE(fuse_out_header, 16);
CHECK_SIZE(cuse_init_in, 16);
CHECK_SIZE(cuse_init_out, 72);
CHECK_SIZE(fuse_open_in, 8);
CHECK_SIZE(fuse_open_out, 16);
CHECK_SIZE(fuse_read_in, 40);
CHECK_SIZE(fuse_write_in, 40);
CHECK_SIZE(fuse_write_out, 8);
CHECK_SIZE(fuse_release_in, 24);

// ---------------------------------------------------------------------------
// 설정
// ---------------------------------------------------------------------------

#define TAG "qemu_piped: "
#define CUSE_DEV "/dev/cuse"
#define PIPE_DEV "/dev/qemu_pipe"
#define DEV_NAME "qemu_pipe"
#define MAX_PIPES 32
#define MAX_WRITE (64 * 1024)
#define REQ_BUF (MAX_WRITE + 8192)

static int g_log = -1;
static int g_cuse = -1;
static pthread_mutex_t g_write_lock = PTHREAD_MUTEX_INITIALIZER;

__attribute__((format(printf, 1, 2)))
static void put(const char *fmt, ...) {
    if (g_log < 0) return;
    char line[400];
    int n = snprintf(line, sizeof(line), TAG);
    va_list ap;
    va_start(ap, fmt);
    int m = vsnprintf(line + n, sizeof(line) - (size_t)n - 2, fmt, ap);
    va_end(ap);
    if (m < 0) return;
    n += m;
    if ((size_t)n >= sizeof(line) - 1) n = (int)sizeof(line) - 2;
    line[n++] = '\n';
    ssize_t unused = write(g_log, line, (size_t)n);
    (void)unused;
}

// ---------------------------------------------------------------------------
// 포트 풀
//
// /dev/vport{컨트롤러}p{번호} 이름은 실행마다 달라진다(실측: vport1p*, vport3p* 둘 다).
// 그래서 이름을 고정하지 않고 부팅 시점에 훑어서 목록을 만든다.
// ---------------------------------------------------------------------------

struct request {
    struct request *next;
    uint64_t unique;
    uint32_t opcode;
    uint32_t size;          // read: 요청 크기, write: 페이로드 크기
    unsigned char *payload; // write 전용, malloc
};

// 읽기와 쓰기는 각자의 큐와 각자의 스레드를 갖는다.
//
// 처음에는 파이프당 워커 하나에 큐 하나였다. 그것이 교착을 만든다 — 호스트가 아직
// 보낼 것이 없으면 read 가 블록되고, 큐가 FIFO 라서 그 뒤에 온 write 는 영영 차례가
// 오지 않는다. 진짜 goldfish pipe 는 같은 파이프에 읽기와 쓰기가 동시에 가능하고,
// emugl 도 그렇게 쓴다.
//
// 실측: SurfaceFlinger 가 100초 넘게 `fuse_simple_request` 에서 멈춰 있었다. 그건
// 커널 FUSE 클라이언트가 유저스페이스 데몬의 응답을 기다리는 자리다 — 즉 호스트가
// 아니라 이 데몬이 답을 안 하고 있었다.
struct req_queue {
    pthread_mutex_t lock;
    pthread_cond_t cv;
    struct request *head, *tail;
    int stop;
};

struct pipe_slot;
struct worker_arg {
    struct pipe_slot *s;
    int is_read;
};

struct pipe_slot {
    int in_use;
    int fd;                 // 배정된 vport (O_NONBLOCK)
    int port_index;
    int slot_no;            // 로그에 찍을 1-기반 번호
    pthread_t rd_worker, wr_worker;
    struct worker_arg rd_arg, wr_arg;
    struct req_queue rq, wq;
    // 바이트 수를 세는 이유: "호스트가 답을 하는가"가 지금 가장 중요한 질문인데,
    // 답하지 않는 것과 게스트가 애초에 안 보내는 것이 로그상 똑같이 조용하다.
    unsigned long tx, rx;   // tx=게스트→호스트, rx=호스트→게스트
    int rx_announced;       // 첫 응답만 한 번 알린다
    int header_seen;        // 첫 쓰기(서비스 이름)를 이미 검사했는가
    int rejected;           // 호스트에 없는 서비스라 거절한 파이프
    char service[64];       // 로그용. 헤더에서 뽑은 서비스 이름

    // EGL 확장 문자열 바꿔치기 상태 (아래 "호스트 EGL 확장 문자열" 참고).
    // 게스트→호스트 스트림을 명령 단위로 따라가며, rcQueryEGLString(EGL_EXTENSIONS)
    // 을 보면 그 응답을 scrub_* 로 바꿔 쓴다.
    int is_gles;            // 서비스가 opengles 라 스트림을 따라가는가
    int track_broken;       // 명령 경계를 놓쳐 따라가기를 포기했는가
    unsigned flags_left;    // 헤더 뒤 clientFlags 4 바이트 중 아직 안 지나간 수
    unsigned char hdr[20];  // 현재 명령의 앞부분: opcode, 길이, 인자 세 개
    unsigned hdr_len;
    uint32_t cmd_left;      // 현재 명령에서 아직 안 지나간 바이트 (헤더 8 바이트 뒤로)
    pthread_mutex_t scrub_lock;
    uint32_t scrub_size;    // 바꿔 쓸 응답 전체 길이 (NUL 포함)
    uint32_t scrub_off;     // 그중 이미 지나간 바이트
};

// 호스트가 실제로 답할 수 있는 서비스 목록.
//
// 앱의 libemugl_probe.so 는 소스가 없지만, 문자열 테이블에 서비스 이름이 그대로
// 들어 있어서 무엇을 처리하는지 확인할 수 있다: "pipe:qemud:boot-properties",
// "pipe:qemud:sensors", "pipe:qemud:camera" 세 개의 qemud 핸들러와, 나머지 전부를
// 넘겨받는 emugl. 그런데 emugl 쪽(libemugl_host_android.so 의 emugl_pipe_send)은
// 헤더가 정확히 "pipe:opengles\0" 일 때만 받아들이고 그 외에는 -1 을 돌려준다.
//
// 그래서 목록에 없는 서비스를 열면 브리지가 소켓을 끊고 다시 붙을 뿐, 게스트에게는
// 아무 답도 가지 않는다. 실측(폰 logcat):
//
//   pipe2.sock first guest packet bytes=17 preview=pipe:grallocPipe.
//   renderer send failed result=-1 offset=0 size=17
//   pipe2.sock disconnected guestBytes=17 rendererBytes=0
//
// 그 상태로 gralloc 은 답을 기다리며 멈추고, SurfaceFlinger 가 그 뒤에서 함께
// 멈춘다. 진짜 goldfish 호스트라면 등록되지 않은 서비스에 대해 헤더 쓰기 자체가
// 실패하고, 게스트의 qemu_pipe_open() 은 -1 을 받는다. 여기서 그 동작을 그대로
// 흉내낸다 — 없는 것은 없다고 말해 주는 편이 영영 기다리게 두는 것보다 낫다.
static const char *const g_known_services[] = {
    "opengles",
    "qemud:boot-properties",
    "qemud:sensors",
    "qemud:camera",
};

static int service_known(const char *name) {
    // pipetest 는 CI 전용이다. 호스트에 붙는 것은 듣기만 하는 host_listener.py 라
    // 목록에는 없지만, 여기서 거절해 버리면 다중 파이프 검증이 통째로 사라진다.
    // 폰에서는 singlevm.pipetest=1 이 없어 아예 열리지 않는다.
    if (strncmp(name, "pipetest:", 9) == 0) return 1;
    for (size_t i = 0; i < sizeof(g_known_services) / sizeof(g_known_services[0]); i++)
        if (strcmp(name, g_known_services[i]) == 0) return 1;
    return 0;
}

// ---------------------------------------------------------------------------
// 호스트 EGL 확장 문자열
//
// 게스트 EGL(libEGL_emulation) 은 자기 확장 목록에 호스트가 알려 준 EGL_EXTENSIONS 를
// 그대로 이어 붙인다. 진짜 에뮬레이터라면 호스트의 EGL 번역기가 주는 짧고 고정된
// 목록이지만, 이 앱의 렌더러는 폰의 진짜 libEGL 에 그 질문을 그대로 넘기므로 폰 GPU
// 드라이버의 목록이 게스트로 흘러든다. 실측(폰 logcat, 1,247 글자):
//
//   EGL_ANDROID_front_buffer_auto_refresh EGL_ANDROID_native_fence_sync ...
//
// 그 결과 게스트는 폰이 되는 것을 자기도 된다고 믿는다. 두 가지가 치명적이다:
//
//   * EGL_ANDROID_native_fence_sync — SurfaceFlinger(libgui SyncFeatures) 가 이것을
//     보고 프레임마다 eglCreateSyncKHR(EGL_SYNC_NATIVE_FENCE_ANDROID) 를 부른다. 게스트
//     EGL 은 호스트가 ANDROID_EMU_native_sync 를 광고하지 않으면 그 타입을
//     EGL_BAD_ATTRIBUTE(0x3004) 로 거절한다. GLConsumer 는 그 실패를 "새 프레임을
//     버린다" 로 처리하므로 모든 레이어가 첫 프레임에서 멈춘다 — 실측에서 부팅
//     애니메이션 내내 80ms 마다 찍힌 `syncForReleaseLocked: error creating EGL
//     fence: 0x3004` 가 그것이고, 실행 화면은 검은 채로 남았다. 이 이름이 없으면
//     SF 는 EGL_KHR_fence_sync(게스트 자체 목록) 로 내려가고, 그건 게스트 EGL 이
//     glFinish 로 흉내 내 준다.
//   * EGL_KHR_partial_update / EGL_EXT_buffer_age — hwui(RenderThread) 가 이것을 보면
//     eglSetDamageRegionKHR 를 부르고, 실패하면 LOG_ALWAYS_FATAL 이다. 게스트 EGL 은
//     그 함수가 없다.
//
// 그래서 호스트의 답을 통째로, 길이는 그대로 둔 채, 진짜 에뮬레이터 호스트가 줄 법한
// 목록으로 바꿔 쓴다. 길이를 지키는 이유: 게스트는 먼저 길이를 물어 그만큼 버퍼를
// 잡고, 그 크기만큼 정확히 읽는다. 또 파이프 체크섬(v1)은 내용이 아니라 길이로
// 계산되므로 내용만 바꾸면 깨지지 않는다. 남는 자리는 공백으로 채운다 — 게스트는
// strstr 로 이름을 찾을 뿐이라 공백은 무해하다.
//
// 바꿔 쓰려면 "지금 오는 응답이 그 질문의 답" 임을 알아야 하고, 그러려면 게스트→
// 호스트 스트림을 명령 단위로 따라가야 한다. 인코더 규약: 모든 명령은
// [opcode u32][전체 길이 u32][인자들...] 이고, 호스트 연결 직후 4 바이트 clientFlags 가
// 먼저 온다. 한 write 에 명령 여러 개가 들어오기도 하고(실측: rcSetWindowColorBuffer
// 와 rcMakeCurrent 가 한 번에), 큰 명령(glTexImage2D)은 여러 write 로 쪼개져 오므로
// "현재 명령에서 몇 바이트 남았나" 를 파이프마다 들고 간다. 응답 쪽도 같은 이유로
// 오프셋 기준으로 바꿔 쓴다 — 응답이 몇 번의 read 로 나뉘어 와도 상관없다.
//
// 질문/답은 같은 스레드에서 동기적으로 오간다(write 가 끝나야 read 를 시작한다).
// 그래서 디스패처가 write 를 큐에 넣기 전에 따라가 두면, 그 답을 읽기 워커가 볼
// 때는 이미 상태가 잡혀 있다.
// ---------------------------------------------------------------------------

#define RC_QUERY_EGL_STRING 0x2712u
#define EGL_EXTENSIONS_ENUM 0x3055u

// 에뮬레이터 호스트의 EGL 번역기가 주는 목록과 같은 모양. 게스트가 스스로 붙이는
// EGL_KHR_fence_sync / EGL_KHR_image_base 등은 여기 없어도 된다.
static const char g_egl_extensions[] =
    "EGL_KHR_image_base EGL_KHR_gl_texture_2D_image EGL_ANDROID_recordable "
    "EGL_KHR_surfaceless_context ";

static uint32_t le32(const unsigned char *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

// 명령 하나가 끝났다. rcQueryEGLString(EGL_EXTENSIONS, buffer, size) 였다면 그 답을
// 바꿔 쓰도록 예약한다. 인자 배치: name(+8), __size_buffer(+12), bufferSize(+16).
// 크기를 묻는 첫 호출은 size 가 0 이고 답이 없으므로 건너뛴다.
static void command_done(struct pipe_slot *s) {
    if (s->hdr_len >= 20 && le32(s->hdr) == RC_QUERY_EGL_STRING) {
        uint32_t name = le32(s->hdr + 8);
        uint32_t size = le32(s->hdr + 12);
        if (name == EGL_EXTENSIONS_ENUM && size > 0) {
            pthread_mutex_lock(&s->scrub_lock);
            s->scrub_size = size;
            s->scrub_off = 0;
            pthread_mutex_unlock(&s->scrub_lock);
            put("pipe %d: EGL 확장 문자열 응답 %u 바이트를 에뮬레이터 목록으로 바꿔 쓴다",
                s->slot_no, size);
        }
    }
    s->hdr_len = 0;
    s->cmd_left = 0;
}

// 게스트→호스트 바이트를 명령 경계에 맞춰 따라간다. 내용은 바꾸지 않는다.
static void track_guest_stream(struct pipe_slot *s, const unsigned char *p, size_t n) {
    if (!s->is_gles || s->track_broken) return;
    while (n > 0) {
        size_t k;
        if (s->flags_left > 0) {
            k = n < s->flags_left ? n : s->flags_left;
            s->flags_left -= (unsigned)k;
            p += k; n -= k;
            continue;
        }
        if (s->hdr_len < 8) {
            k = 8 - s->hdr_len;
            if (k > n) k = n;
            memcpy(s->hdr + s->hdr_len, p, k);
            s->hdr_len += (unsigned)k;
            p += k; n -= k;
            if (s->hdr_len < 8) continue;
            uint32_t len = le32(s->hdr + 4);
            if (len < 8) {
                // 길이가 헤더보다 짧을 수는 없다. 경계를 놓친 것이므로 더는 믿지 않는다.
                // 바꿔치기만 멈출 뿐 파이프 자체는 그대로 흘려보낸다.
                put("pipe %d: 명령 길이 %u (opcode 0x%x) - 스트림 추적을 멈춘다",
                    s->slot_no, len, le32(s->hdr));
                s->track_broken = 1;
                return;
            }
            s->cmd_left = len - 8;
            if (s->cmd_left == 0) command_done(s);
            continue;
        }
        k = n < s->cmd_left ? n : s->cmd_left;
        if (s->hdr_len < sizeof(s->hdr)) {
            size_t c = sizeof(s->hdr) - s->hdr_len;
            if (c > k) c = k;
            memcpy(s->hdr + s->hdr_len, p, c);
            s->hdr_len += (unsigned)c;
        }
        s->cmd_left -= (uint32_t)k;
        p += k; n -= k;
        if (s->cmd_left == 0) command_done(s);
    }
}

// 호스트→게스트 바이트. 예약된 응답 구간이면 그 자리를 바꿔 쓴다.
static void scrub_host_stream(struct pipe_slot *s, unsigned char *buf, size_t n) {
    if (!s->is_gles) return;
    pthread_mutex_lock(&s->scrub_lock);
    if (s->scrub_off < s->scrub_size) {
        size_t left = s->scrub_size - s->scrub_off;
        size_t k = n < left ? n : left;
        size_t canon = sizeof(g_egl_extensions) - 1;
        for (size_t i = 0; i < k; i++) {
            size_t pos = s->scrub_off + i;
            if (pos == s->scrub_size - 1) buf[i] = '\0';
            else if (pos < canon) buf[i] = (unsigned char)g_egl_extensions[pos];
            else buf[i] = ' ';
        }
        s->scrub_off += (uint32_t)k;
    }
    pthread_mutex_unlock(&s->scrub_lock);
}

static char g_ports[MAX_PIPES][288];
static int g_port_taken[MAX_PIPES];
static int g_port_count = 0;
static struct pipe_slot g_slots[MAX_PIPES];
static pthread_mutex_t g_pool_lock = PTHREAD_MUTEX_INITIALIZER;

// /dev/vport3p12 에서 끝의 12 를 뽑는다. 이름 전체가 아니라 이 숫자가 호스트 소켓
// 번호와 대응한다(vport<컨트롤러>p<번호>, 번호는 1부터).
static long port_num(const char *path) {
    const char *p = strrchr(path, 'p');
    if (!p) return -1;
    char *end = NULL;
    long n = strtol(p + 1, &end, 10);
    return (end && *end == '\0') ? n : -1;
}

static int scan_ports(void) {
    DIR *d = opendir("/dev");
    if (!d) return 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL && g_port_count < MAX_PIPES) {
        if (strncmp(e->d_name, "vport", 5) != 0) continue;
        snprintf(g_ports[g_port_count], sizeof(g_ports[0]), "/dev/%s", e->d_name);
        g_port_count++;
    }
    closedir(d);
    // 번호순으로 정렬해서 배정 순서를 예측 가능하게 만든다. 호스트 소켓 번호와
    // 대응이 맞아야 로그를 읽을 때 헷갈리지 않는다.
    //
    // strcmp 로 하면 안 된다. 포트가 여덟 개일 때는 사전순과 번호순이 같아서 문제가
    // 없었는데, 24개로 늘리자 vport3p1, vport3p10, vport3p11 ... 순이 됐다(실측).
    // 파이프 1번이 소켓 0번, 2번이 소켓 9번에 붙는 식이라 로그를 읽을 수 없었다.
    for (int i = 0; i < g_port_count; i++) {
        for (int j = i + 1; j < g_port_count; j++) {
            if (port_num(g_ports[j]) < port_num(g_ports[i])) {
                char tmp[288];
                memcpy(tmp, g_ports[i], sizeof(tmp));
                memcpy(g_ports[i], g_ports[j], sizeof(tmp));
                memcpy(g_ports[j], tmp, sizeof(tmp));
            }
        }
    }
    return g_port_count;
}

// ---------------------------------------------------------------------------
// 응답 쓰기
//
// /dev/cuse 로의 write 는 요청 하나에 정확히 한 번이어야 하고, 워커 스레드들이 동시에
// 쓸 수 있으므로 직렬화한다.
// ---------------------------------------------------------------------------

static void reply(uint64_t unique, int error, const void *data, size_t len) {
    if (error) len = 0;
    struct fuse_out_header out;
    out.len = (uint32_t)(sizeof(out) + len);
    out.error = error;
    out.unique = unique;

    unsigned char buf[REQ_BUF];
    if (sizeof(out) + len > sizeof(buf)) {
        put("reply too large (%zu), dropping", len);
        return;
    }
    memcpy(buf, &out, sizeof(out));
    if (len) memcpy(buf + sizeof(out), data, len);

    pthread_mutex_lock(&g_write_lock);
    ssize_t n = write(g_cuse, buf, sizeof(out) + len);
    pthread_mutex_unlock(&g_write_lock);
    if (n < 0 && errno != ENOENT) {
        // ENOENT 는 요청이 이미 취소된 것이라 정상이다.
        put("reply write failed: %s", strerror(errno));
    }
}

// (write_all 은 없어졌다. 쓰기 워커가 poll 로 기다리며 직접 나눠 쓴다 — 논블로킹
//  fd 에서는 짧은 쓰기와 EAGAIN 을 같이 다뤄야 해서 한 곳에 모아 두는 편이 낫다.)

// ---------------------------------------------------------------------------
// 워커: 파이프 하나의 블로킹 I/O 를 전담한다
// ---------------------------------------------------------------------------

// fd 가 준비될 때까지 기다린다. 블로킹 read/write 를 그냥 부르지 않는 이유는 진단이다 —
// 멈추면 왜 멈췄는지 말할 수 있어야 한다.
//
// POLLOUT 이 안 오는 것과 POLLIN 이 안 오는 것은 뜻이 다르다. virtio_console 은
// 호스트가 그 포트에 붙어 있을 때만 POLLOUT 을 준다. 그래서 write 가 못 나가면
// "호스트가 이 포트에 연결돼 있지 않다"는 뜻이고, read 가 안 되면 "연결은 됐는데
// 보낼 것이 없다"는 뜻이다. 로그만 봐서는 구분되지 않던 두 경우다.
static int io_wait(struct pipe_slot *s, short events, const char *what) {
    struct pollfd p = {.fd = s->fd, .events = events, .revents = 0};
    int waited_ms = 0;
    for (;;) {
        int n = poll(&p, 1, 5000);
        if (n < 0) {
            if (errno == EINTR) continue;
            put("pipe %d: poll(%s) 실패: %s", s->slot_no, what, strerror(errno));
            return -1;
        }
        if (n > 0) {
            if (p.revents & (POLLERR | POLLHUP | POLLNVAL)) {
                put("pipe %d: %s 중 포트가 끊김 (revents=0x%x)",
                    s->slot_no, what, p.revents);
                return -1;
            }
            if (waited_ms) put("pipe %d: %s 재개 (%dms 대기)", s->slot_no, what, waited_ms);
            return 0;
        }
        waited_ms += 5000;
        // 처음 두 번만 알리고 그 뒤로는 1분에 한 번. 멈춘 것은 알려야 하지만
        // 로그를 도배하면 정작 다른 것이 안 보인다.
        if (waited_ms <= 10000 || waited_ms % 60000 == 0) {
            put("pipe %d: %s 가 %d초째 대기 중%s", s->slot_no, what, waited_ms / 1000,
                (events & POLLOUT) ? " (호스트가 이 포트에 붙어 있지 않다)" : " (호스트가 조용하다)");
        }
    }
}

static void *worker_main(void *arg) {
    struct worker_arg *wa = arg;
    struct pipe_slot *s = wa->s;
    struct req_queue *q = wa->is_read ? &s->rq : &s->wq;
    unsigned char buf[MAX_WRITE];

    for (;;) {
        pthread_mutex_lock(&q->lock);
        while (!q->head && !q->stop) pthread_cond_wait(&q->cv, &q->lock);
        if (q->stop && !q->head) {
            pthread_mutex_unlock(&q->lock);
            break;
        }
        struct request *r = q->head;
        q->head = r->next;
        if (!q->head) q->tail = NULL;
        pthread_mutex_unlock(&q->lock);

        if (wa->is_read) {
            uint32_t want = r->size > sizeof(buf) ? (uint32_t)sizeof(buf) : r->size;
            ssize_t n = -1;
            if (io_wait(s, POLLIN, "read") == 0) {
                do { n = read(s->fd, buf, want); } while (n < 0 && errno == EINTR);
            }
            if (n < 0) {
                reply(r->unique, -EIO, NULL, 0);
            } else {
                s->rx += (unsigned long)n;
                if (n > 0) scrub_host_stream(s, buf, (size_t)n);
                // 호스트가 이 파이프에 처음으로 무언가 보낸 순간. 이 줄이 안 나오면
                // 게스트는 요청만 보내고 영원히 답을 기다리는 중이라는 뜻이다.
                if (n > 0 && !s->rx_announced) {
                    s->rx_announced = 1;
                    put("pipe %d: host replied (%zd bytes)", s->slot_no, n);
                }
                reply(r->unique, 0, buf, (size_t)n);
            }
        } else {
            size_t done = 0;
            int failed = 0;
            while (done < r->size) {
                if (io_wait(s, POLLOUT, "write") != 0) { failed = 1; break; }
                ssize_t n = write(s->fd, r->payload + done, r->size - done);
                if (n > 0) { done += (size_t)n; continue; }
                if (n < 0 && (errno == EINTR || errno == EAGAIN)) continue;
                failed = 1;
                break;
            }
            if (failed && done == 0) {
                reply(r->unique, -EIO, NULL, 0);
            } else {
                s->tx += (unsigned long)done;
                struct fuse_write_out wo = {.size = (uint32_t)done, .padding = 0};
                reply(r->unique, 0, &wo, sizeof(wo));
            }
        }
        free(r->payload);
        free(r);
    }
    return NULL;
}

// 큐에 넣기만 하고 즉시 돌아온다. 디스패처가 여기서 블록되면 다른 파이프가 굶는다.
static void enqueue(struct pipe_slot *s, struct request *r) {
    struct req_queue *q = (r->opcode == FUSE_READ_OP) ? &s->rq : &s->wq;
    pthread_mutex_lock(&q->lock);
    r->next = NULL;
    if (q->tail) q->tail->next = r;
    else q->head = r;
    q->tail = r;
    pthread_cond_signal(&q->cv);
    pthread_mutex_unlock(&q->lock);
}

// ---------------------------------------------------------------------------
// 슬롯 배정/해제
// ---------------------------------------------------------------------------

static struct pipe_slot *slot_of(uint64_t fh) {
    if (fh == 0 || fh > MAX_PIPES) return NULL;
    struct pipe_slot *s = &g_slots[fh - 1];
    return s->in_use ? s : NULL;
}

static int slot_alloc(void) {
    pthread_mutex_lock(&g_pool_lock);
    int idx = -1;
    for (int i = 0; i < MAX_PIPES; i++) {
        if (!g_slots[i].in_use) { idx = i; break; }
    }
    if (idx < 0) { pthread_mutex_unlock(&g_pool_lock); return -1; }

    int port = -1;
    for (int p = 0; p < g_port_count; p++) {
        if (!g_port_taken[p]) { port = p; break; }
    }
    if (port < 0) { pthread_mutex_unlock(&g_pool_lock); return -2; }

    int fd = open(g_ports[port], O_RDWR | O_CLOEXEC | O_NONBLOCK);
    if (fd < 0) {
        // 포트가 다른 프로세스에 잡혀 있으면 EBUSY. 그 포트는 쓰지 않도록 표시하고
        // 다음 open 에서 다른 포트를 고르게 한다.
        put("open %s failed: %s", g_ports[port], strerror(errno));
        g_port_taken[port] = 1;
        pthread_mutex_unlock(&g_pool_lock);
        return -3;
    }

    struct pipe_slot *s = &g_slots[idx];
    memset(s, 0, sizeof(*s));
    s->in_use = 1;
    s->fd = fd;
    s->port_index = port;
    s->slot_no = idx + 1;
    s->header_seen = 0;
    s->rejected = 0;
    s->service[0] = '\0';
    pthread_mutex_init(&s->scrub_lock, NULL);
    pthread_mutex_init(&s->rq.lock, NULL);
    pthread_cond_init(&s->rq.cv, NULL);
    pthread_mutex_init(&s->wq.lock, NULL);
    pthread_cond_init(&s->wq.cv, NULL);
    s->rd_arg.s = s; s->rd_arg.is_read = 1;
    s->wr_arg.s = s; s->wr_arg.is_read = 0;
    g_port_taken[port] = 1;

    if (pthread_create(&s->rd_worker, NULL, worker_main, &s->rd_arg) != 0 ||
        pthread_create(&s->wr_worker, NULL, worker_main, &s->wr_arg) != 0) {
        close(fd);
        g_port_taken[port] = 0;
        s->in_use = 0;
        pthread_mutex_unlock(&g_pool_lock);
        return -4;
    }
    pthread_mutex_unlock(&g_pool_lock);

    // 호스트가 이 포트에 붙어 있는가. virtio_console 은 host_connected 일 때만
    // POLLOUT 을 준다. 붙어 있지 않으면 첫 write 부터 영원히 못 나가므로, 그 사실을
    // 파이프를 나눠주는 순간에 알아야 한다.
    struct pollfd probe = {.fd = fd, .events = POLLOUT, .revents = 0};
    int ready = poll(&probe, 1, 0) > 0 && (probe.revents & POLLOUT);
    put("pipe %d -> %s (호스트 %s)", idx + 1, g_ports[port],
        ready ? "연결됨" : "연결 안 됨 - 이 파이프로 보내는 것은 막힌다");
    return idx;
}

static void slot_free(struct pipe_slot *s) {
    struct req_queue *qs[2] = { &s->rq, &s->wq };
    for (int i = 0; i < 2; i++) {
        pthread_mutex_lock(&qs[i]->lock);
        qs[i]->stop = 1;
        pthread_cond_signal(&qs[i]->cv);
        pthread_mutex_unlock(&qs[i]->lock);
    }
    pthread_join(s->rd_worker, NULL);
    pthread_join(s->wr_worker, NULL);

    pthread_mutex_lock(&g_pool_lock);
    close(s->fd);
    g_port_taken[s->port_index] = 0;
    put("pipe %d [%s] closed, %s freed (보냄 %lu, 받음 %lu 바이트)",
        s->slot_no, s->service[0] ? s->service : "?", g_ports[s->port_index],
        s->tx, s->rx);
    s->in_use = 0;
    pthread_mutex_unlock(&g_pool_lock);
}

// ---------------------------------------------------------------------------
// CUSE 초기화
// ---------------------------------------------------------------------------

static int cuse_handshake(const struct fuse_in_header *in, const struct cuse_init_in *ci) {
    struct cuse_init_out out;
    memset(&out, 0, sizeof(out));
    out.major = FUSE_KERNEL_VERSION;
    out.minor = ci->minor < FUSE_KERNEL_MINOR_VERSION ? ci->minor : FUSE_KERNEL_MINOR_VERSION;
    out.max_read = MAX_WRITE;
    out.max_write = MAX_WRITE;
    out.dev_major = 0;  // 0 이면 커널이 동적으로 배정한다
    out.dev_minor = 0;

    // 장치 이름은 NUL 로 끝나는 "KEY=VALUE" 목록으로 뒤에 붙인다.
    static const char info[] = "DEVNAME=" DEV_NAME "\0";
    unsigned char buf[sizeof(out) + sizeof(info)];
    memcpy(buf, &out, sizeof(out));
    memcpy(buf + sizeof(out), info, sizeof(info));

    reply(in->unique, 0, buf, sizeof(buf));
    put("CUSE_INIT ok (kernel %u.%u, ours %u.%u), device /dev/%s",
        ci->major, ci->minor, out.major, out.minor, DEV_NAME);
    return 0;
}

// 경로에 무엇이 있는지 사람이 읽을 수 있게 적는다. 진단에만 쓴다.
static void describe_path(const char *path, char *out, size_t len) {
    struct stat st;
    if (lstat(path, &st) != 0) {
        snprintf(out, len, "없음 (%s)", strerror(errno));
        return;
    }
    if (S_ISLNK(st.st_mode)) {
        char target[256];
        ssize_t n = readlink(path, target, sizeof(target) - 1);
        if (n < 0) { snprintf(out, len, "심볼릭 링크 (readlink 실패)"); return; }
        target[n] = '\0';
        // 링크가 가리키는 곳이 실제로 있는지가 핵심이다. 없으면 stat 은 실패하는데
        // mknod 는 EEXIST 를 내서, 노드가 있는 것처럼도 없는 것처럼도 보인다.
        snprintf(out, len, "심볼릭 링크 -> %s (%s)",
                 target, access(path, F_OK) == 0 ? "대상 있음" : "대상 없음");
        return;
    }
    if (S_ISCHR(st.st_mode)) {
        snprintf(out, len, "문자 장치 %u:%u 권한 %04o",
                 major(st.st_rdev), minor(st.st_rdev), st.st_mode & 07777);
        return;
    }
    snprintf(out, len, "다른 무엇 (모드 %o)", st.st_mode);
}

// 장치 노드는 우리가 직접 만든다.
//
// 커널은 CUSE_INIT 응답을 받으면 /sys/class/cuse/<이름> 아래에 장치를 등록하고 uevent 를
// 쏜다. 원래는 ueventd 가 그걸 보고 /dev 에 노드를 만들어야 하는데, 실측으로 만들어지지
// 않았다(CUSE_INIT 은 성공했는데 /dev/qemu_pipe 가 끝내 안 생김). ueventd 의 규칙을
// 파고드는 대신, 커널이 배정한 major:minor 를 sysfs 에서 읽어 우리가 mknod 한다.
// 어차피 권한도 0666 으로 열어줘야 한다 — ueventd 기본값은 0600 root:root 인데
// surfaceflinger 는 system 권한으로 돈다.
//
// 만드는 방식이 mknod 직접 호출이 아니라 "임시 이름으로 만들고 rename" 인 이유:
//
// 실측에서 stat 은 "없다"고 하는데 같은 자리에 한 mknod 가 EEXIST 로 실패했다. 둘 다
// 참일 수 있는 경우는 하나뿐이다 — stat 은 링크를 따라가고 mknod 는 따라가지 않으므로,
// 대상이 없는 심볼릭 링크가 그 자리에 있었던 것이다. 그리고 그 뒤로 access(F_OK) 가
// 계속 실패해서 pipetest 도 SurfaceFlinger 도 장치가 없다고 봤다.
//
// 누가 그 링크를 만들었는지 캐는 것보다, 무엇이 있든 원자적으로 밀어내는 편이 낫다.
// rename 은 심볼릭 링크든 낡은 노드든 대상을 조용히 대체하고, ueventd 가 같은 순간에
// 노드를 만들어도 경합이 생기지 않는다.
static int create_pipe_node(unsigned major_no, unsigned minor_no) {
    char before[320];
    describe_path(PIPE_DEV, before, sizeof(before));

    const char *tmp = "/dev/.qemu_pipe.new";
    unlink(tmp);
    if (mknod(tmp, S_IFCHR | 0666, makedev(major_no, minor_no)) != 0) {
        put("FAIL mknod %s (%u:%u): %s", tmp, major_no, minor_no, strerror(errno));
        return -1;
    }
    // mknod 는 umask 를 먹으므로 권한을 다시 못박는다. surfaceflinger 는 root 가 아니다.
    if (chmod(tmp, 0666) != 0) put("WARN chmod %s: %s", tmp, strerror(errno));
    if (rename(tmp, PIPE_DEV) != 0) {
        put("FAIL rename %s -> %s: %s", tmp, PIPE_DEV, strerror(errno));
        unlink(tmp);
        return -1;
    }

    char after[320];
    describe_path(PIPE_DEV, after, sizeof(after));
    put("created %s as %u:%u (이전: %s / 이후: %s)",
        PIPE_DEV, major_no, minor_no, before, after);
    return 0;
}

static void *device_watcher(void *unused) {
    (void)unused;
    const char *devattr = "/sys/class/cuse/" DEV_NAME "/dev";
    unsigned major_no = 0, minor_no = 0;
    int have = 0;

    for (int i = 0; i < 600 && !have; i++) {
        int fd = open(devattr, O_RDONLY | O_CLOEXEC);
        if (fd < 0) {
            struct timespec ts = {0, 100 * 1000000L};
            nanosleep(&ts, NULL);
            continue;
        }
        char buf[64] = {0};
        ssize_t n = read(fd, buf, sizeof(buf) - 1);
        close(fd);
        if (n > 0 && sscanf(buf, "%u:%u", &major_no, &minor_no) == 2) {
            have = 1;
            break;
        }
        put("WARN %s unreadable: %s", devattr, strerror(errno));
        return NULL;
    }
    if (!have) {
        // 커널이 장치를 아예 등록하지 않은 것이다 — CUSE_INIT 응답 자체를 커널이
        // 거부했다는 뜻이라, ueventd 가 아니라 우리 응답을 봐야 한다.
        put("FAIL %s never appeared - kernel did not register the CUSE device", devattr);
        return NULL;
    }

    if (create_pipe_node(major_no, minor_no) != 0) return NULL;

    // 여기서 우리가 직접 open 해보지는 않는다. 커널은 CUSE_INIT 응답을 처리하는 도중에
    // 이미 sysfs 에 장치를 올리므로, 이 스레드가 그 틈에 열면 ENXIO 가 난다(실측:
    // "FAIL open /dev/qemu_pipe: No such device or address" — 노드는 멀쩡한데 아직
    // 살아나기 전이었다). 게다가 자기 자신을 여는 것은 디스패처에게 FUSE_OPEN 을
    // 보내는 일이라 굳이 할 이유가 없다. 열리는지는 pipetest 가 확인한다.

    // 만들어 놓고 끝내지 않는다. 지금까지 못 본 실패 방식이 하나 남아 있다 — 노드가
    // 생겼다가 나중에 사라지는 경우(ueventd 의 remove 처리 등). 한동안 지켜보다가
    // 없어지면 다시 만들고, 그 사실을 로그에 남긴다.
    for (int i = 0; i < 600; i++) {
        struct timespec ts = {0, 500 * 1000000L};
        nanosleep(&ts, NULL);
        if (access(PIPE_DEV, F_OK) == 0) continue;
        char gone[320];
        describe_path(PIPE_DEV, gone, sizeof(gone));
        put("WARN %s 가 %dms 만에 사라졌다 (%s) - 다시 만든다",
            PIPE_DEV, (i + 1) * 500, gone);
        if (create_pipe_node(major_no, minor_no) != 0) return NULL;
    }
    return NULL;
}

// ---------------------------------------------------------------------------

int main(void) {
    g_log = open("/dev/kmsg", O_WRONLY | O_CLOEXEC);

    // virtio-serial 포트가 나타날 때까지 기다린다. ueventd 콜드부트 직후라 보통 이미 있다.
    for (int i = 0; i < 100 && scan_ports() == 0; i++) {
        struct timespec ts = {0, 100 * 1000000L};
        nanosleep(&ts, NULL);
    }
    if (g_port_count == 0) {
        put("FAIL no /dev/vport* found - is virtio-serial attached?");
        return 1;
    }
    put("found %d virtio-serial ports, first=%s", g_port_count, g_ports[0]);

    g_cuse = open(CUSE_DEV, O_RDWR | O_CLOEXEC);
    if (g_cuse < 0) {
        put("FAIL open %s: %s (need CONFIG_CUSE=y)", CUSE_DEV, strerror(errno));
        return 1;
    }

    pthread_t watcher;
    pthread_create(&watcher, NULL, device_watcher, NULL);
    pthread_detach(watcher);

    static unsigned char buf[REQ_BUF];
    for (;;) {
        ssize_t n = read(g_cuse, buf, sizeof(buf));
        if (n < 0) {
            if (errno == EINTR || errno == EAGAIN) continue;
            if (errno == ENODEV) { put("device gone, exiting"); break; }
            put("read %s failed: %s", CUSE_DEV, strerror(errno));
            break;
        }
        if ((size_t)n < sizeof(struct fuse_in_header)) continue;

        struct fuse_in_header in;
        memcpy(&in, buf, sizeof(in));
        const unsigned char *body = buf + sizeof(in);
        size_t body_len = (size_t)n - sizeof(in);

        switch (in.opcode) {
        case CUSE_INIT_OP: {
            if (body_len < sizeof(struct cuse_init_in)) { reply(in.unique, -EINVAL, NULL, 0); break; }
            struct cuse_init_in ci;
            memcpy(&ci, body, sizeof(ci));
            cuse_handshake(&in, &ci);
            break;
        }
        case FUSE_OPEN_OP: {
            int idx = slot_alloc();
            if (idx < 0) {
                put("open refused (%d): no free pipe (%d ports, all busy)", idx, g_port_count);
                reply(in.unique, -ENOSPC, NULL, 0);
                break;
            }
            struct fuse_open_out oo;
            memset(&oo, 0, sizeof(oo));
            oo.fh = (uint64_t)(idx + 1);
            // 스트림 장치다. 페이지 캐시를 끼우면 안 되고 seek 도 의미가 없다.
            oo.open_flags = FOPEN_DIRECT_IO | FOPEN_NONSEEKABLE;
            reply(in.unique, 0, &oo, sizeof(oo));
            break;
        }
        case FUSE_READ_OP: {
            if (body_len < sizeof(struct fuse_read_in)) { reply(in.unique, -EINVAL, NULL, 0); break; }
            struct fuse_read_in ri;
            memcpy(&ri, body, sizeof(ri));
            struct pipe_slot *s = slot_of(ri.fh);
            if (!s) { reply(in.unique, -EBADF, NULL, 0); break; }
            if (s->rejected) { reply(in.unique, -EINVAL, NULL, 0); break; }
            struct request *r = calloc(1, sizeof(*r));
            if (!r) { reply(in.unique, -ENOMEM, NULL, 0); break; }
            r->unique = in.unique;
            r->opcode = FUSE_READ_OP;
            r->size = ri.size;
            enqueue(s, r);
            break;
        }
        case FUSE_WRITE_OP: {
            if (body_len < sizeof(struct fuse_write_in)) { reply(in.unique, -EINVAL, NULL, 0); break; }
            struct fuse_write_in wi;
            memcpy(&wi, body, sizeof(wi));
            struct pipe_slot *s = slot_of(wi.fh);
            if (!s) { reply(in.unique, -EBADF, NULL, 0); break; }
            size_t avail = body_len - sizeof(wi);
            size_t len = wi.size < avail ? wi.size : avail;
            struct request *r = calloc(1, sizeof(*r));
            if (!r) { reply(in.unique, -ENOMEM, NULL, 0); break; }
            r->payload = malloc(len ? len : 1);
            if (!r->payload) { free(r); reply(in.unique, -ENOMEM, NULL, 0); break; }
            memcpy(r->payload, body + sizeof(wi), len);
            // goldfish 규약: 파이프를 연 뒤 첫 쓰기가 "pipe:<서비스>\0" 이다.
            if (!s->header_seen) {
                s->header_seen = 1;
                const char *buf = (const char *)r->payload;
                if (len > 5 && memcmp(buf, "pipe:", 5) == 0 && memchr(buf, '\0', len)) {
                    snprintf(s->service, sizeof(s->service), "%s", buf + 5);
                    if (!service_known(s->service)) {
                        put("pipe %d: 서비스 '%s' 는 호스트에 없다 - 열기를 거절한다",
                            s->slot_no, s->service);
                        s->rejected = 1;
                        free(r->payload);
                        free(r);
                        reply(in.unique, -EINVAL, NULL, 0);
                        break;
                    }
                    put("pipe %d: 서비스 '%s'", s->slot_no, s->service);
                    if (strcmp(s->service, "opengles") == 0) {
                        s->is_gles = 1;
                        s->flags_left = 4;
                        // 헤더 write 에 그 뒤 바이트가 딸려 올 수도 있다.
                        const char *nul = memchr(buf, '\0', len);
                        size_t used = (size_t)(nul - buf) + 1;
                        track_guest_stream(s, r->payload + used, len - used);
                    }
                }
            } else {
                track_guest_stream(s, r->payload, len);
            }
            r->unique = in.unique;
            r->opcode = FUSE_WRITE_OP;
            r->size = (uint32_t)len;
            enqueue(s, r);
            break;
        }
        case FUSE_RELEASE_OP: {
            if (body_len < sizeof(struct fuse_release_in)) { reply(in.unique, -EINVAL, NULL, 0); break; }
            struct fuse_release_in rl;
            memcpy(&rl, body, sizeof(rl));
            struct pipe_slot *s = slot_of(rl.fh);
            if (s) slot_free(s);
            reply(in.unique, 0, NULL, 0);
            break;
        }
        case FUSE_FLUSH_OP:
            reply(in.unique, 0, NULL, 0);
            break;
        case FUSE_INTERRUPT_OP:
            // 응답하지 않는 요청이다.
            break;
        case FUSE_DESTROY_OP:
            reply(in.unique, 0, NULL, 0);
            break;
        default:
            // poll/ioctl 등은 구현하지 않는다. Android 7 의 qemu_pipe 클라이언트는
            // open/write/read/close 만 쓴다.
            reply(in.unique, -ENOSYS, NULL, 0);
            break;
        }
    }
    return 0;
}
