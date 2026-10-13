package com.example.singlevm;

import android.content.Context;
import android.os.SystemClock;
import android.util.Base64;
import android.view.Surface;
import com.example.singlevm.engine.Android7GuestEngineAdapter;
import com.example.singlevm.engine.EngineAdapter;
import com.example.singlevm.engine.EngineReadiness;
import com.example.singlevm.engine.EngineRegistry;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * 가상롬 하나. ":vm" 프로세스 안에 하나만 있고, 실행 화면이 아니라 {@link VmService} 가 붙들고
 * 있다.
 *
 * <p>예전에는 게임을 누를 때마다 실행 화면이 QEMU 를 띄우고, 화면이 닫히면 같이 껐다. 그러면
 * 게임 하나 켜는 데 안드로이드 7 전체 부팅(TCG 소프트웨어 에뮬레이션이라 분 단위)을 매번
 * 기다려야 한다. 이제는 앱을 여는 순간 서비스가 부팅을 시작하고 계속 살려 두며, 실행 화면은
 * 이미 돌고 있는 가상롬에 화면만 붙였다 뗀다.
 *
 * <p>코드는 대부분 예전 GuestRunActivity 에서 그대로 옮겨 왔다. 바뀐 것은 주인뿐이다.
 */
public final class GuestVm {
    /**
     * Number of virtio-serial pipes wired between host and guest.
     *
     * <p>Eight was not enough. One goldfish pipe is one virtio-serial port, and a normal boot
     * already needs five before any app runs: qemud:boot-properties, qemud:adb, and one
     * pipe:opengles each for SurfaceFlinger, bootanimation and system_server. Every process
     * that renders wants its own, so a game adds at least one more.
     *
     * <p>The shortage only shows up on a fast boot. With /data already populated there is no
     * dexopt, system_server starts around 13s instead of 56s, and everything overlaps instead
     * of arriving spread out. Keep this in step with the loop in guest-image.yml.
     * virtio-serial-device allows 31 ports, so 24 leaves room and stays clear of the limit.
     */
    static final int TRANSPORT_PIPE_COUNT = 24;
    /**
     * 게스트 화면 크기. 게임은 가로로 돈다. libemugl_host_android.so 가 렌더러를 이 크기로
     * 만들도록 패치돼 있으므로(원래 480x800 이 하드코딩돼 있었다) 셋이 맞아야 한다:
     * 여기, QEMU 의 virtio-gpu, 그리고 그 라이브러리.
     */
    static final int GUEST_WIDTH = 800;
    static final int GUEST_HEIGHT = 480;
    private static final long GUEST_DIAGNOSTICS_DELAY_MS = 60_000L;
    /** Drop a one-line kernel cmdline here to override the default without rebuilding the app. */
    static final String KERNEL_CMDLINE_FILE = "kernel_cmdline.txt";
    /**
     * earlycon is what makes a silent boot diagnosable. console=ttyAMA0 only produces output once
     * the PL011 driver is up, and a ranchu kernel consoles on goldfish_tty instead — so a kernel
     * missing CONFIG_SERIAL_AMBA_PL011 boots and dies without printing a single character.
     * earlycon writes straight to the virt machine's UART at 0x09000000 from very early on,
     * before driver probing, and keep_bootcon stops it being handed off and silenced.
     */
    private static final String DEFAULT_KERNEL_CMDLINE =
            // keep_bootcon 은 뺐다: earlycon 과 ttyAMA0 가 같은 UART 라 둘 다 살려 두면 커널 줄이
            // 전부 두 번씩 찍힌다. 넘겨주기가 되는 것은 실측으로 확인됐다.
            // audit=0: permissive 라 SELinux 가 막지는 않으면서 거부 기록(avc: denied)을 매 동작마다
            // 찍고, logd 가 그것을 auditd/프로세스 이름으로 또 찍는다. 부팅 로그의 절반이 그것
            // 이었다. 감사 서브시스템을 끄면 둘 다 사라지고 동작은 그대로다.
            "console=ttyAMA0 earlycon=pl011,0x09000000 ignore_loglevel printk.devkmsg=on audit=0"
                + " qemu=1 qemu.gles=1"
                    + " androidboot.hardware=ranchu androidboot.selinux=permissive"
                    // 시리얼에 루트 셸(init.rc 의 console 서비스)을 띄운다. QEMU 의 stdin 으로
                    // 명령을 넣고 stdout 으로 결과를 받는다 — captureGuestScreen 이 그 통로로
                    // screencap 을 실행한다. 이게 없으면 init 이 "service 'console' requires
                    // console" 하고 셸을 띄우지 않는다.
                    + " androidboot.console=ttyAMA0"
                    + " binder.devices=binder,hwbinder,vndbinder"
                    + " rdinit=/init.wrapper root=/dev/ram0 rw";
    /**
     * 게스트 화면 캡처. 콘솔 셸에서 screencap 을 찍고 base64 로 시리얼에 흘린다. 표식은 셸이
     * 되돌려 주는 명령 echo 와 구분되도록 따옴표로 쪼개 쓴다: echo 된 줄에는 BE''GIN 이 그대로
     * 남고, 실제 출력에만 SVMSHOT_BEGIN 이 나온다. 줄마다 붙는 SVMB64: 는 시리얼에 섞여 드는
     * logcat 줄과 가르기 위한 것이다.
     */
    private static final String SHOT_BEGIN = "SVMSHOT_BEGIN";
    private static final String SHOT_END = "SVMSHOT_END";
    private static final String SHOT_LINE = "SVMB64:";
    private static final String SHOT_COMMAND =
            "\rscreencap -p /data/local/tmp/svm.png && echo SVMSHOT_BE''GIN"
                    + " && base64 /data/local/tmp/svm.png | sed 's/^/SVMB64:/' && echo SVMSHOT_E''ND\r";
    private static final long SHOT_TIMEOUT_MS = 40_000L;
    /** How many trailing QEMU output lines are kept in last_run.txt. */
    private static final int QEMU_LOG_TAIL_LINES = 120;
    /** How often the running log is mirrored somewhere a file manager can open. */
    private static final long QEMU_LOG_MIRROR_MS = 3_000L;
    /**
     * libemugl_probe.so logs every byte it moves in either direction under this tag, with a hex
     * dump — "%s guest->renderer transfer=... hex=..." and the matching renderer->guest line, plus
     * "%s connected", "renderer pipe creation failed" and "socket poll ended revents=...". The
     * bridge runs inside the app, so its output goes to logcat, and the phone has no adb.
     *
     * <p>An unprivileged app reads its own UID's log without any permission, which is exactly the
     * scope needed here.
     */
    private static final String[] BRIDGE_LOGCAT_COMMAND = {
        "logcat", "-v", "time", "-T", "1", "-s",
        "SingleVmGlesBridge:V", "SingleVmEmugl:V", "emuGL:V", "libc:V", "DEBUG:V", "AndroidRuntime:E",
    };
    private static final int BRIDGE_LOG_TAIL_LINES = 60;
    /**
     * Once GLES traffic actually flows, the per-transfer hex dumps arrive faster than anything can
     * usefully read them. Keep the file bounded.
     */
    private static final int BRIDGE_LOG_MAX_LINES = 20_000;
    /** A guest that dies faster than this never really booted; say so loudly. */
    private static final long QEMU_EARLY_EXIT_MS = 5_000L;
    private static final String GUEST_DIAGNOSTICS_COMMAND =
            "echo VM_DIAG_FILE_BEGIN\rcat /data/local/tmp/bootdiag.log 2>&1\recho VM_DIAG_FILE_END\r"
            // 알람 드라이버 진단. system_server 의 AlarmManagerService 는 /dev/alarm 이 없으면
            // timerfd_create(CLOCK_BOOTTIME_ALARM) 로 넘어가는데, 그 clockid 는 CAP_WAKE_ALARM
            // (비트 35) 이 없으면 EPERM 이다. 실패하면 핸들러로 폴백하고, 그 경로는 리스너
            // 알람에서 NPE 로 죽어 부팅이 무한 재시작한다(실측). 어느 프로세스에서 상위 32 비트
            // 능력이 사라졌는지 보려고 init/zygote/system_server 의 Cap 줄을 찍는다.
            + "echo VM_DIAG_CAPS_BEGIN\r"
            + "for p in 1 $(pidof zygote) $(pidof system_server); do"
            + " echo \"== pid $p $(cat /proc/$p/comm 2>/dev/null)\"; grep -E '^Cap' /proc/$p/status 2>&1; done\r"
            + "ls -l /dev/alarm /dev/rtc0 2>&1\rcat /sys/class/rtc/rtc0/name 2>&1\r"
            + "dmesg 2>/dev/null | grep -i 'capabilit' | head -5\r"
            + "echo VM_DIAG_CAPS_END\r";

    private static GuestVm instance;

    private final Context app;
    private volatile Process qemuProcess;
    private volatile Process bridgeLogProcess;
    private volatile QmpClient qmp;
    /** 캡처 중이면 base64 조각이 쌓인다. 아니면 null. */
    private volatile StringBuilder shotBuffer;
    private volatile ShotCallback shotCallback;

    public interface ShotCallback {
        /** {@code png} 가 null 이면 {@code error} 에 이유가 있다. 임의의 스레드에서 불린다. */
        void onResult(File png, String error);
    }
    private volatile boolean probed = false;
    /** 우리가 껐을 때의 사유. null 이면 게스트가 스스로 끝난 것이다. */
    private volatile String stopReason = null;
    private volatile Runnable onExit;
    private final Deque<String> qemuTail = new ArrayDeque<>();
    private final Deque<String> bridgeTail = new ArrayDeque<>();
    /**
     * Lines the guest actually produced. Counted separately from qemuTail because the tail also
     * carries our own "stream interrupted" marker.
     */
    private volatile int qemuOutputLines = 0;
    private final StringBuilder runtimeLog = new StringBuilder();

    private GuestVm(Context context) {
        this.app = context.getApplicationContext();
    }

    public static synchronized GuestVm get(Context context) {
        if (instance == null) {
            instance = new GuestVm(context);
        }
        return instance;
    }

    public boolean isRunning() {
        Process process = this.qemuProcess;
        return process != null && process.isAlive();
    }

    /** 서비스가 가상롬이 저절로 꺼졌을 때 따라 내려가도록 건다. */
    void setOnExit(Runnable onExit) {
        this.onExit = onExit;
    }

    /**
     * 가상롬이 꺼져 있으면 켠다. 이미 돌고 있으면 아무것도 하지 않으므로, 앱을 열 때와 게임을
     * 누를 때 어디서 불러도 된다.
     */
    public synchronized void ensureStarted() {
        if (isRunning()) {
            return;
        }
        synchronized (this.qemuTail) {
            this.qemuTail.clear();
        }
        synchronized (this.bridgeTail) {
            this.bridgeTail.clear();
        }
        this.qemuOutputLines = 0;
        this.stopReason = null;
        synchronized (this.runtimeLog) {
            this.runtimeLog.setLength(0);
        }
        appendLog("가상롬 시작 (앱이 열릴 때 미리 부팅)");
        ensureProbed();
        File vmRoot = new File(this.app.getFilesDir(), "single_vm");
        EngineAdapter engine = EngineRegistry.byId(Android7GuestEngineAdapter.ID);
        EngineReadiness readiness = engine.inspect(this.app, vmRoot);
        appendLog("\n\nAndroid 7.0 게스트 부팅 사전 검사\n" + readiness.summary + "\n" + readiness.details);
        if (!readiness.ready) {
            appendLog("\n\n준비가 안 돼 가상롬을 켜지 않았습니다.");
            return;
        }
        String nativeDir = this.app.getApplicationInfo().nativeLibraryDir;
        String corePath = new File(nativeDir, Android7GuestEngineAdapter.CORE_LIBRARY_NAME).getAbsolutePath();
        List<String> command = buildModernQemuCommand(corePath, vmRoot.getAbsolutePath());
        appendLog("\n\nQEMU 11 실행 파일: " + corePath);
        appendLog("\n\nQEMU_BOOT_ARGS\n" + renderCommand(command));
        startAndroid7Guest(command, vmRoot.getAbsolutePath());
    }

    /** QEMU 를 끈다. 사유는 종료 보고에 그대로 남는다. */
    public synchronized void stop(String reason) {
        Process process = this.qemuProcess;
        if (process != null && process.isAlive()) {
            // QEMU handles SIGTERM by shutting the VM down cleanly and exiting 0, which is
            // indistinguishable in the log from the guest having powered itself off. Record that
            // we asked for it so the exit report can say which happened.
            this.stopReason = reason;
            appendLog("\n\n[가상롬 끄기] " + reason);
            process.destroy();
        }
    }

    /**
     * 렌더러를 한 번 준비한다. 화면 없이도 된다 — 서비스가 화면보다 먼저 가상롬을 켜고, 실행
     * 화면은 나중에 {@link #attachSurface} 로 붙는다.
     */
    private synchronized void ensureProbed() {
        if (this.probed || !GuestRunActivity.emuglLoaded()) {
            if (!GuestRunActivity.emuglLoaded()) {
                appendLog("\n\nAOSP emugl host probe library load failed");
            }
            return;
        }
        try {
            appendLog("\n\nAOSP emugl host probe\n" + GuestRunActivity.nativeProbeEmugl());
            this.probed = true;
        } catch (RuntimeException | UnsatisfiedLinkError e) {
            appendLog("\n\nAOSP emugl host probe failed: " + e.getMessage());
        }
    }

    /**
     * 게스트의 화면을 PNG 로 받아 온다. 게스트 SurfaceFlinger 가 보는 화면이라, 호스트 렌더러의
     * 출력(실행 화면)과 비교하면 검은 화면이 어느 쪽 탓인지 가를 수 있다.
     */
    public void captureGuestScreen(ShotCallback callback) {
        Process process = this.qemuProcess;
        if (process == null || !process.isAlive()) {
            callback.onResult(null, "가상롬이 꺼져 있습니다.");
            return;
        }
        if (this.shotCallback != null) {
            callback.onResult(null, "이미 캡처 중입니다.");
            return;
        }
        this.shotBuffer = null;
        this.shotCallback = callback;
        try {
            process.getOutputStream().write(SHOT_COMMAND.getBytes(StandardCharsets.US_ASCII));
            process.getOutputStream().flush();
        } catch (IOException e) {
            this.shotCallback = null;
            callback.onResult(null, "콘솔에 쓸 수 없습니다: " + e.getMessage());
            return;
        }
        appendLog("\n[화면 캡처] 게스트 콘솔에 screencap 요청");
        new Thread(() -> {
            SystemClock.sleep(SHOT_TIMEOUT_MS);
            ShotCallback waiting = this.shotCallback;
            if (waiting == callback) {
                this.shotCallback = null;
                this.shotBuffer = null;
                appendLog("\n[화면 캡처] 응답 없음");
                callback.onResult(null, "게스트가 " + (SHOT_TIMEOUT_MS / 1000) + "초 안에 답하지 않았습니다. "
                        + "콘솔 셸이 아직 안 떴거나(부팅 중) screencap 이 실패한 것입니다.");
            }
        }, "single-vm-shot-timeout").start();
    }

    /** QEMU 출력 한 줄을 캡처 상태 기계에 넣는다. 캡처 중이 아니면 거의 공짜다. */
    private void handleShotLine(String line) {
        if (this.shotCallback == null) {
            return;
        }
        if (this.shotBuffer == null) {
            if (line.contains(SHOT_BEGIN) && !line.contains("BE''GIN")) {
                this.shotBuffer = new StringBuilder();
            }
            return;
        }
        if (line.contains(SHOT_END) && !line.contains("E''ND")) {
            finishShot();
            return;
        }
        int at = line.indexOf(SHOT_LINE);
        if (at >= 0) {
            this.shotBuffer.append(line.substring(at + SHOT_LINE.length()).trim());
        }
    }

    private void finishShot() {
        ShotCallback callback = this.shotCallback;
        StringBuilder encoded = this.shotBuffer;
        this.shotCallback = null;
        this.shotBuffer = null;
        if (callback == null || encoded == null) {
            return;
        }
        File out = new File(new File(this.app.getFilesDir(), "single_vm/logs"), "guest-screen.png");
        try {
            byte[] png = Base64.decode(encoded.toString(), Base64.DEFAULT);
            if (png.length < 8) {
                throw new IllegalArgumentException("PNG 가 비어 있음 (" + png.length + " bytes)");
            }
            try (FileOutputStream stream = new FileOutputStream(out)) {
                stream.write(png);
            }
            appendLog("\n[화면 캡처] " + out.getName() + " 저장 (" + png.length + " bytes)");
            callback.onResult(out, null);
        } catch (IOException | IllegalArgumentException e) {
            appendLog("\n[화면 캡처] 실패: " + e.getMessage());
            callback.onResult(null, "PNG 복원 실패: " + e.getMessage());
        }
    }

    /** 실행 화면의 서피스를 렌더러 출력으로 붙인다. 가상롬은 그 전부터 돌고 있어도 된다. */
    public void attachSurface(Surface surface) {
        ensureProbed();
        if (!this.probed) {
            return;
        }
        try {
            appendLog("\n" + GuestRunActivity.nativeAttachEmuglSurface(surface));
        } catch (RuntimeException | UnsatisfiedLinkError e) {
            appendLog("\n\nAOSP emugl surface attach failed: " + e.getMessage());
        }
    }

    /**
     * 실행 화면의 터치 한 점을 게스트 터치스크린에 넣는다. 좌표는 0..1 로 정규화한 값이다.
     * QEMU 의 절대 좌표 범위는 0..32767 이고 게스트 쪽에서 화면 크기로 다시 맞춘다.
     *
     * @param slot    손가락 번호(0..9)
     * @param phase   {@link QmpClient#TOUCH_BEGIN}, {@link QmpClient#TOUCH_UPDATE},
     *                {@link QmpClient#TOUCH_END}
     */
    public void sendTouch(int slot, int phase, float x, float y) {
        QmpClient monitor = this.qmp;
        if (monitor != null) {
            monitor.sendTouch(slot, phase, x, y);
        }
    }

    /** 실행 화면이 사라질 때. 가상롬은 계속 돈다. */
    public void detachSurface() {
        if (!this.probed) {
            return;
        }
        try {
            GuestRunActivity.nativeDetachEmuglSurface();
            appendLog("\nsurface bridge: detached (가상롬은 계속 실행 중)");
        } catch (RuntimeException | UnsatisfiedLinkError e) {
            appendLog("\nsurface detach failed: " + e.getMessage());
        }
    }

    private List<String> buildModernQemuCommand(String corePath, String vmRootPath) {
        File imageRoot = new File(vmRootPath, Android7GuestEngineAdapter.IMAGE_DIRECTORY);
        File nativeDir = new File(this.app.getApplicationInfo().nativeLibraryDir);
        File launcher = new File(nativeDir, "libpodroid-launcher.so");
        List<String> command = new ArrayList<>();
        if (launcher.isFile()) {
            command.add(launcher.getAbsolutePath());
        }
        command.add(corePath);
        // Selection lives in the engine adapter so the readiness check and the boot path can
        // never disagree about which kernel/ramdisk names are acceptable.
        File selectedKernel = Android7GuestEngineAdapter.selectKernel(imageRoot);
        File selectedRamdisk = Android7GuestEngineAdapter.selectRamdisk(imageRoot);
        command.add("-machine");
        command.add("virt,gic-version=3");
        command.add("-cpu");
        // A plain "kernel" is the legacy ARM32 (ranchu/goldfish) image; the android54 and virt
        // kernels are the newer 64-bit-capable ones.
        command.add("kernel".equals(selectedKernel.getName()) ? "cortex-a15" : "cortex-a53");
        command.add("-accel");
        command.add("tcg,thread=multi,tb-size=256");
        command.add("-smp");
        command.add("2");
        command.add("-m");
        command.add("1024");
        command.add("-display");
        command.add("none");
        // virtio-mmio 는 기본이 legacy 라 VIRTIO_F_VERSION_1 을 제시하지 않는다. virtio-gpu 는
        // 그 기능을 요구하므로 probe 가 실패하고, 게스트 커널 5.10 의 실패 처리 경로가
        // 초기화도 안 된 modeset 을 정리하려다 oops 를 내며 init 을 죽인다. 증상은
        // "Attempted to kill init! exitcode=0x0000000b" 라 원인과 전혀 안 닮았다.
        command.add("-global");
        command.add("virtio-mmio.force-legacy=false");
        command.add("-device");
        command.add("virtio-gpu-device,xres=" + GUEST_WIDTH + ",yres=" + GUEST_HEIGHT);
        // 터치 화면. QEMU 의 virtio-multitouch 는 슬롯(ABS_MT_SLOT)·추적 id 를 쓰는 B 형
        // 멀티터치 장치로 보이고 INPUT_PROP_DIRECT 가 붙어 Android 가 터치스크린으로 분류한다.
        // 이벤트는 실행 화면의 터치를 QMP input-send-event 로 넣는다(sendTouch). 게스트 커널에
        // CONFIG_VIRTIO_INPUT 이 있어야 /dev/input/eventN 이 생긴다(build-kernel.sh).
        command.add("-device");
        command.add("virtio-multitouch-device");
        File transportDir = new File(vmRootPath, "transport");
        if (!transportDir.exists()) {
            transportDir.mkdirs();
        }
        // virtio-mmio throughout, matching the virtio-blk-device disks below. The guest kernel
        // then needs only CONFIG_VIRTIO_MMIO and no PCIe host bridge.
        //
        // disable-legacy is deliberately absent: it is a virtio-pci property and QEMU rejects it
        // outright on the mmio device ("Property 'virtio-serial-device.disable-legacy' not found").
        command.add("-device");
        command.add("virtio-serial-device");
        // 지난 실행이 남긴 소켓과 세대별 소켓(pipeN.gK.sock, QmpClient 참고), 링크를 치운다.
        File[] stale = transportDir.listFiles();
        if (stale != null) {
            for (File file : stale) {
                if (file.getName().startsWith("pipe") && file.getName().contains(".sock")) {
                    file.delete();
                }
            }
        }
        for (int pipeIndex = 0; pipeIndex < TRANSPORT_PIPE_COUNT; pipeIndex++) {
            File pipeSocket = new File(transportDir, "pipe" + pipeIndex + ".sock");
            String pipeId = QmpClient.CHARDEV_ID_PREFIX + pipeIndex;
            command.add("-chardev");
            command.add("socket,id=" + pipeId + ",path=" + pipeSocket.getAbsolutePath() + ",server=on,wait=off");
            // 포트에 id 를 주어야 QEMU 가 게스트의 열기/닫기를 VSERPORT_CHANGE 로 알린다.
            // QmpClient 가 그 닫기마다 chardev 를 새로 만들어 브리지 연결을 초기화한다.
            command.add("-device");
            command.add("virtserialport,chardev=" + pipeId + ",id=" + QmpClient.PORT_ID_PREFIX + pipeIndex
                    + ",name=org.singlevm.pipe." + pipeIndex);
        }
        File qmpSocket = new File(transportDir, "qmp.sock");
        if (qmpSocket.exists()) {
            qmpSocket.delete();
        }
        command.add("-qmp");
        command.add("unix:" + qmpSocket.getAbsolutePath() + ",server=on,wait=off");
        command.add("-monitor");
        command.add("none");
        command.add("-nic");
        command.add("none");
        command.add("-serial");
        command.add("stdio");
        command.add("-kernel");
        command.add(selectedKernel.getAbsolutePath());
        command.add("-initrd");
        command.add(selectedRamdisk.getAbsolutePath());
        // 순서가 곧 장치 이름이다. 게스트의 init.wrapper 가 라벨로 fstab 을 바로잡지만, 기본
        // 배치는 vda=system, vdb=cache, vdc=userdata 로 붙인다. cache 가 없으면 userdata 가 vdb 로
        // 당겨지므로 로그로 알린다.
        command.add("-drive");
        command.add("if=none,id=system,format=raw,readonly=on,file="
                + new File(imageRoot, "system.img").getAbsolutePath());
        command.add("-device");
        command.add("virtio-blk-device,drive=system");

        File cache = new File(imageRoot, "cache.img");
        File userdata = new File(imageRoot, "userdata.img");
        if (cache.isFile()) {
            command.add("-drive");
            command.add("if=none,id=cache,format=raw,file=" + cache.getAbsolutePath());
            command.add("-device");
            command.add("virtio-blk-device,drive=cache");
        } else if (userdata.isFile()) {
            appendLog("\n\n⚠ cache.img 가 없어 userdata 가 vdb 로 잡힙니다."
                    + "\n  Android 7 fstab 은 vdb=/cache, vdc=/data 를 기대하므로 /data 마운트가 실패합니다.");
        }
        if (userdata.isFile()) {
            command.add("-drive");
            command.add("if=none,id=userdata,format=raw,file=" + userdata.getAbsolutePath());
            command.add("-device");
            command.add("virtio-blk-device,drive=userdata");
        }
        command.add("-append");
        command.add(resolveKernelCmdline());
        return command;
    }

    /**
     * The kernel command line, overridable at runtime from a plain text file in external storage,
     * so a line can be edited and the guest relaunched without a rebuild.
     */
    private String resolveKernelCmdline() {
        File override = kernelCmdlineOverrideFile();
        if (override != null && override.isFile()) {
            String text = readSmallFile(override);
            if (text != null && !text.trim().isEmpty()) {
                // Editors love to wrap; a kernel command line has to be one line.
                String cmdline = text.replace('\n', ' ').replace('\r', ' ').trim();
                appendLog("\n\n커널 cmdline 재정의 사용: " + override.getAbsolutePath() + "\n" + cmdline);
                return cmdline;
            }
        }
        return DEFAULT_KERNEL_CMDLINE;
    }

    private File kernelCmdlineOverrideFile() {
        File dir = this.app.getExternalFilesDir("import");
        return dir == null ? null : new File(dir, KERNEL_CMDLINE_FILE);
    }

    private static String readSmallFile(File file) {
        if (file.length() > 8192) {
            return null;
        }
        try (InputStream in = new FileInputStream(file)) {
            byte[] buffer = new byte[(int) file.length()];
            int read = 0;
            while (read < buffer.length) {
                int n = in.read(buffer, read, buffer.length - read);
                if (n < 0) {
                    break;
                }
                read += n;
            }
            return new String(buffer, 0, read, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    private static String renderCommand(List<String> command) {
        StringBuilder output = new StringBuilder();
        for (String arg : command) {
            if (output.length() > 0) {
                output.append(' ');
            }
            output.append('\"').append(arg).append('\"');
        }
        return output.toString();
    }

    private void startAndroid7Guest(final List<String> command, final String vmRootPath) {
        appendLog("\n\nQEMU_SESSION_START_REQUESTED");
        final File filesDir = this.app.getFilesDir();
        final String libPath = this.app.getApplicationInfo().nativeLibraryDir + ":" + filesDir.getAbsolutePath();
        Process process;
        File logDir = new File(vmRootPath, "logs");
        if (!logDir.exists()) {
            logDir.mkdirs();
        }
        final File outputLog = new File(logDir, "qemu-modern.log");
        // Start before QEMU: the bridge threads connect within milliseconds of start(), and
        // "connected" / the first transfer are the lines that matter.
        startBridgeLogCapture(logDir);
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.directory(filesDir);
            builder.environment().put("LD_LIBRARY_PATH", libPath);
            builder.redirectErrorStream(true);
            process = builder.start();
        } catch (IOException | RuntimeException e) {
            appendLog("\n\nQEMU_SESSION_FAILED: " + e.getMessage());
            fireExit();
            return;
        }
        // 여기서 바로 세운다. 백그라운드 스레드에서 세우면 그 사이에 들어온 두 번째
        // ensureStarted() 가 꺼져 있는 줄 알고 QEMU 를 하나 더 띄운다.
        this.qemuProcess = process;
        final Process started = process;
        final long startedAt = SystemClock.elapsedRealtime();
        File transportDir = new File(vmRootPath, "transport");
        QmpClient monitor = new QmpClient(new File(transportDir, "qmp.sock"), transportDir,
                text -> appendLog("\n" + text));
        this.qmp = monitor;
        monitor.start();
        new Thread(() -> {
            String result;
            try {
                if (GuestRunActivity.emuglLoaded()) {
                    StringBuilder bridgeStatus = new StringBuilder();
                    for (int pipeIndex = 0; pipeIndex < TRANSPORT_PIPE_COUNT; pipeIndex++) {
                        String socketPath =
                                new File(vmRootPath, "transport/pipe" + pipeIndex + ".sock").getAbsolutePath();
                        String status = GuestRunActivity.nativeStartEmuglBridge(socketPath, pipeIndex == 0);
                        if (bridgeStatus.length() > 0) {
                            bridgeStatus.append('\n');
                        }
                        bridgeStatus.append(status);
                    }
                    appendLog("\n" + bridgeStatus);
                }
                scheduleGuestDiagnostics(started);
                streamQemuOutput(started, outputLog);
                int exitCode = started.waitFor();
                long ranForMs = SystemClock.elapsedRealtime() - startedAt;
                result = describeGuestExit(exitCode, ranForMs, outputLog);
            } catch (InterruptedException | RuntimeException e) {
                Thread.currentThread().interrupt();
                result = "QEMU_SESSION_FAILED: " + e.getMessage();
            }
            appendLog("\n\n" + result);
            QmpClient qmpClient = this.qmp;
            if (qmpClient != null) {
                qmpClient.close();
                this.qmp = null;
            }
            Process logcat = this.bridgeLogProcess;
            if (logcat != null) {
                logcat.destroy();
                this.bridgeLogProcess = null;
            }
            fireExit();
        }, "single-vm-qemu").start();
    }

    private void fireExit() {
        Runnable callback = this.onExit;
        if (callback != null) {
            callback.run();
        }
    }

    /**
     * Pumps QEMU's combined stdout/stderr to {@code outputLog}. Returns when the guest closes the
     * stream. The stream must be drained regardless: if nobody reads it, QEMU blocks once the pipe
     * buffer fills and the guest wedges partway through boot.
     */
    private void streamQemuOutput(Process process, File outputLog) {
        long lastMirror = 0L;
        long lastPersist = 0L;
        try (BufferedReader reader =
                     new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
             Writer logWriter =
                     new OutputStreamWriter(new FileOutputStream(outputLog, false), StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                logWriter.write(line);
                logWriter.write('\n');
                logWriter.flush();
                handleShotLine(line);
                synchronized (this.qemuTail) {
                    this.qemuTail.addLast(line);
                    while (this.qemuTail.size() > QEMU_LOG_TAIL_LINES) {
                        this.qemuTail.removeFirst();
                    }
                }
                this.qemuOutputLines++;
                long now = SystemClock.elapsedRealtime();
                // Mirror to external storage while the guest is still running, so the boot log can
                // be read without stopping the guest first.
                if (now - lastMirror >= QEMU_LOG_MIRROR_MS) {
                    lastMirror = now;
                    copyLogToSharedDir(outputLog);
                }
                if (now - lastPersist >= QEMU_LOG_MIRROR_MS) {
                    lastPersist = now;
                    persistLog();
                }
            }
        } catch (IOException e) {
            synchronized (this.qemuTail) {
                this.qemuTail.addLast("[로그 스트림 중단: " + e.getMessage() + "]");
            }
        }
        persistLog();
    }

    /**
     * Turns the raw exit code into something the user can act on.
     */
    private String describeGuestExit(int exitCode, long ranForMs, File outputLog) {
        StringBuilder out = new StringBuilder();
        out.append("QEMU_PROCESS_EXIT=").append(exitCode)
                .append(" (").append(ranForMs).append("ms 실행)\n");
        String reason = this.stopReason;
        if (reason != null) {
            out.append("\n※ 앱이 가상롬을 껐습니다. 사유: ").append(reason).append('\n');
        }
        if (this.qemuOutputLines == 0) {
            out.append("\n⚠ QEMU 시리얼 출력이 한 줄도 없습니다.\n")
                    .append("커널이 콘솔에 아무것도 쓰지 못했다는 뜻입니다. 흔한 원인:\n")
                    .append("- 커널에 CONFIG_SERIAL_AMBA_PL011 이 없음 (ranchu 커널은 goldfish_tty 를 씀)\n")
                    .append("- 커널이 이 머신/CPU 조합에서 아예 시작하지 못함\n")
                    .append("cmdline 의 earlycon 으로도 안 나오면 커널을 바꿔야 합니다.\n")
                    .append("재정의 파일: Android/data/" + this.app.getPackageName() + "/files/import/"
                            + KERNEL_CMDLINE_FILE + "\n");
        } else {
            out.append("\n게스트 시리얼 출력 ").append(this.qemuOutputLines).append("줄 수신됨.\n");
        }
        // 우리가 끈 경우는 부팅 실패가 아니다. 그때 커널/이미지를 탓하면 엉뚱한 곳을 보게 된다.
        if (ranForMs < QEMU_EARLY_EXIT_MS && reason == null) {
            out.append("\n⚠ 게스트가 부팅하지 못하고 즉시 종료했습니다.\n")
                    .append("커널/램디스크/시스템 이미지가 이 QEMU 구성(-machine virt)과 맞는지,\n")
                    .append("램디스크에 커널 cmdline이 요구하는 /init.wrapper 가 있는지 확인하세요.\n");
        }
        out.append("\n로그: ").append(outputLog.getAbsolutePath());
        File shared = copyLogToSharedDir(outputLog);
        if (shared != null) {
            out.append("\n복사본(파일 관리자로 접근 가능): ").append(shared.getAbsolutePath());
        }
        return out.toString();
    }

    /**
     * Mirrors a log into external app storage. getFilesDir() is unreadable without adb or root,
     * which makes the single most useful diagnostic artifact effectively invisible.
     */
    private File copyLogToSharedDir(File outputLog) {
        File sharedDir = this.app.getExternalFilesDir("logs");
        if (sharedDir == null || !outputLog.isFile()) {
            return null;
        }
        if (!sharedDir.exists() && !sharedDir.mkdirs()) {
            return null;
        }
        File shared = new File(sharedDir, outputLog.getName());
        try (InputStream in = new FileInputStream(outputLog);
             OutputStream out = new FileOutputStream(shared, false)) {
            byte[] buffer = new byte[65536];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return shared;
        } catch (IOException e) {
            return null;
        }
    }

    /**
     * One minute after boot, pokes the guest's serial console to dump its boot diagnostics into
     * the QEMU log. Fire-and-forget: failures are swallowed on purpose.
     */
    private static void scheduleGuestDiagnostics(final Process process) {
        new Thread(() -> {
            try {
                Thread.sleep(GUEST_DIAGNOSTICS_DELAY_MS);
                if (process.isAlive()) {
                    process.getOutputStream().write(GUEST_DIAGNOSTICS_COMMAND.getBytes(StandardCharsets.US_ASCII));
                    process.getOutputStream().flush();
                }
            } catch (IOException | InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "single-vm-guest-diagnostics").start();
    }

    /**
     * Pumps this process's own logcat into {@code gles-bridge.log}, so the emugl bridge's account
     * of what it did with each pipe socket is readable on a phone with no adb.
     */
    private void startBridgeLogCapture(final File logDir) {
        new Thread(() -> {
            File bridgeLog = new File(logDir, "gles-bridge.log");
            long lastMirror = 0L;
            int written = 0;
            try {
                ProcessBuilder builder = new ProcessBuilder(BRIDGE_LOGCAT_COMMAND);
                builder.redirectErrorStream(true);
                Process logcat = builder.start();
                this.bridgeLogProcess = logcat;
                appendBridgeLine("[logcat 시작: " + String.join(" ", BRIDGE_LOGCAT_COMMAND) + "]");
                try (BufferedReader reader = new BufferedReader(
                             new InputStreamReader(logcat.getInputStream(), StandardCharsets.UTF_8));
                     Writer writer = new OutputStreamWriter(
                             new FileOutputStream(bridgeLog, false), StandardCharsets.UTF_8)) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (written < BRIDGE_LOG_MAX_LINES) {
                            writer.write(line);
                            writer.write('\n');
                            writer.flush();
                            written++;
                            if (written == BRIDGE_LOG_MAX_LINES) {
                                writer.write("[" + BRIDGE_LOG_MAX_LINES + "줄에서 파일 기록 중단]\n");
                                writer.flush();
                            }
                        }
                        appendBridgeLine(line);
                        long now = SystemClock.elapsedRealtime();
                        if (now - lastMirror >= QEMU_LOG_MIRROR_MS) {
                            lastMirror = now;
                            copyLogToSharedDir(bridgeLog);
                        }
                    }
                }
                appendBridgeLine("[logcat 종료]");
            } catch (IOException | RuntimeException e) {
                appendBridgeLine("[logcat 실패: " + e.getMessage() + "]");
            }
            copyLogToSharedDir(bridgeLog);
        }, "single-vm-bridge-log").start();
    }

    private void appendBridgeLine(String line) {
        synchronized (this.bridgeTail) {
            this.bridgeTail.addLast(line);
            while (this.bridgeTail.size() > BRIDGE_LOG_TAIL_LINES) {
                this.bridgeTail.removeFirst();
            }
        }
    }

    /** 실행 기록에 한 줄을 덧붙이고 last_run.txt 를 새로 쓴다. 홈의 "로그" 가 이 파일을 보여 준다. */
    public void appendLog(String value) {
        synchronized (this.runtimeLog) {
            this.runtimeLog.append(value);
        }
        persistLog();
    }

    /** The full transcript: setup messages plus whatever the guest has printed so far. */
    private String composeLog() {
        String tail;
        synchronized (this.qemuTail) {
            tail = this.qemuTail.isEmpty() ? "" : String.join("\n", this.qemuTail);
        }
        String bridge;
        synchronized (this.bridgeTail) {
            bridge = this.bridgeTail.isEmpty() ? "" : String.join("\n", this.bridgeTail);
        }
        StringBuilder out;
        synchronized (this.runtimeLog) {
            out = new StringBuilder(this.runtimeLog);
        }
        if (!bridge.isEmpty()) {
            out.append("\n\n--- emugl 브리지 (logcat) ---\n").append(bridge);
        }
        if (!tail.isEmpty()) {
            out.append("\n\n--- QEMU ---\n").append(tail);
        }
        return out.toString();
    }

    private synchronized void persistLog() {
        File logDir = new File(this.app.getFilesDir(), "single_vm/logs");
        if (!logDir.exists() && !logDir.mkdirs()) {
            return;
        }
        File logFile = new File(logDir, "last_run.txt");
        try (FileOutputStream output = new FileOutputStream(logFile, false)) {
            output.write(composeLog().getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            // 기록 실패는 가상롬을 멈출 이유가 아니다.
        }
    }
}
