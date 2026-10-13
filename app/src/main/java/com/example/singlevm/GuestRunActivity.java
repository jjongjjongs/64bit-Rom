package com.example.singlevm;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import com.example.singlevm.engine.Android7GuestEngineAdapter;
import java.io.File;
import java.io.IOException;

/**
 * 게임 실행 화면. 게임 화면만 보인다.
 *
 * <p>Android 7 엔진에서는 가상롬을 직접 켜고 끄지 않는다. 가상롬은 {@link VmService} 가 앱을 열
 * 때 미리 부팅해 {@link GuestVm} 으로 살려 두고, 이 화면은 거기에 서피스만 붙였다 뗀다. 그래서
 * 이 화면을 나가도 가상롬은 계속 돌고, 다음 게임은 다시 부팅하지 않는다.
 */
public class GuestRunActivity extends Activity implements SurfaceHolder.Callback {
    private static final boolean EMUGL_PROBE_LOADED;
    public static final String EXTRA_ABIS = "abis";
    public static final String EXTRA_APK_PATH = "apk_path";
    public static final String EXTRA_ARM32_LIB_COUNT = "arm32_lib_count";
    public static final String EXTRA_DATA_DIR = "data_dir";
    public static final String EXTRA_ENGINE_ID = "engine_id";
    public static final String EXTRA_INSTALL_ID = "install_id";
    public static final String EXTRA_LABEL = "label";
    public static final String EXTRA_LAUNCHER = "launcher";
    public static final String EXTRA_LIB_DIR = "lib_dir";
    public static final String EXTRA_PACKAGE = "package";
    private static final long FRAME_TICK_DELAY_MS = 700;
    private static final int FRAME_TICK_LIMIT = 8;
    private static final boolean NATIVE_RUNTIME_LOADED;
    private String engineId;
    private boolean runtimeStarted = false;
    private boolean surfaceAttached = false;
    private boolean frameLoopRunning = false;
    private int frameTicks = 0;
    private final Handler frameHandler = new Handler(Looper.getMainLooper());
    private final Runnable frameTicker = this::runFrameTick;

    /*
     * emugl 쪽 네 함수는 static 이다. 원래는 인스턴스 메서드였지만, 가상롬이 이제 화면이 아닌
     * 서비스(GuestVm)에서 돌기 때문에 액티비티 인스턴스 없이 불러야 한다. JNI 에서 static 과
     * 인스턴스의 차이는 두 번째 인자(jclass / jobject)뿐인데, libemugl_probe.so 의 네 함수는
     * 그 인자를 스택에 저장만 하고 다시 읽지 않는다(역어셈블로 확인). 그래서 이름과 시그니처를
     * 그대로 두고 static 으로 바꿔도 같은 코드가 돈다.
     */
    static native String nativeAttachEmuglSurface(Surface surface);

    static native void nativeDetachEmuglSurface();

    static native String nativeProbeEmugl();

    static native String nativeStartEmuglBridge(String pipeSocketPath, boolean primaryPipe);

    static boolean emuglLoaded() {
        return EMUGL_PROBE_LOADED;
    }

    private native String nativeAttachSurface(Surface surface);

    private native String nativeDetachSurface();

    /* JADX INFO: Access modifiers changed from: private */
    public native String nativeRunFrame();

    private native String nativeStartGuest(String vmRootPath, String installId);

    static {
        boolean loaded;
        boolean emuglProbeLoaded;
        try {
            System.loadLibrary("singlevm_runtime");
            loaded = true;
        } catch (UnsatisfiedLinkError e) {
            loaded = false;
        }
        NATIVE_RUNTIME_LOADED = loaded;
        try {
            System.loadLibrary("emugl_probe");
            emuglProbeLoaded = true;
        } catch (UnsatisfiedLinkError e2) {
            emuglProbeLoaded = false;
        }
        EMUGL_PROBE_LOADED = emuglProbeLoaded;
    }

    /**
     * Called from native code: opens {@code path} (a filesystem path or a {@code content://} URI)
     * and hands the raw file descriptor over to the caller, which then owns it.
     *
     * @return the detached fd, or -1 if the path could not be opened.
     */
    public int get_fd(String path) {
        if (path == null) {
            return -1;
        }
        ParcelFileDescriptor descriptor = null;
        try {
            if (path.startsWith("content://")) {
                descriptor = getContentResolver().openFileDescriptor(Uri.parse(path), "rw");
                if (descriptor == null) {
                    descriptor = getContentResolver().openFileDescriptor(Uri.parse(path), "r");
                }
            } else {
                descriptor = ParcelFileDescriptor.open(new File(path), ParcelFileDescriptor.MODE_READ_WRITE);
            }
        } catch (Exception e) {
            if (descriptor != null) {
                try {
                    descriptor.close();
                } catch (IOException ignored) {
                }
            }
            return -1;
        }
        if (descriptor == null) {
            return -1;
        }
        return descriptor.detachFd();
    }

    public int close_fd(int fd) {
        if (fd < 0) {
            return -1;
        }
        try {
            ParcelFileDescriptor.adoptFd(fd).close();
            return 0;
        } catch (IOException | RuntimeException e) {
            return -1;
        }
    }

    @Override // android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.engineId = getExtra(EXTRA_ENGINE_ID, Android7GuestEngineAdapter.ID);
        buildUi();
        if (isAndroid7()) {
            appendRuntimeLog("\n\n[실행 화면] " + getExtra(EXTRA_LABEL, "게임") + " 열림");
            // 보통은 앱을 열 때 이미 켜져 있다. 그 사이에 꺼졌다면(알림에서 끄기 등) 여기서 다시 켠다.
            try {
                VmService.start(this);
            } catch (RuntimeException e) {
                appendRuntimeLog("\n가상롬 서비스 시작 실패: " + e.getMessage());
            }
        }
    }

    @Override // android.app.Activity
    protected void onResume() {
        super.onResume();
        if (this.runtimeStarted && this.surfaceAttached) {
            startFrameLoop();
        }
    }

    @Override // android.app.Activity
    protected void onPause() {
        stopFrameLoop();
        super.onPause();
    }

    /**
     * 뒤로가기는 묻고 나간다. 가로 전체 화면에서는 화면 왼쪽·오른쪽 가장자리를 안쪽으로 쓸면
     * 그게 곧 뒤로가기라, 게임을 하다 손이 스치기만 해도 나가 버린다. 나가도 가상롬은 계속 돈다.
     */
    @Override // android.app.Activity
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        new AlertDialog.Builder(this)
                .setTitle("게임을 종료할까요?")
                .setPositiveButton("종료", (dialog, which) -> {
                    appendRuntimeLog("\n[실행 화면] 사용자가 종료 (가상롬은 계속 실행)");
                    finish();
                })
                .setNegativeButton("계속하기", null)
                .setOnDismissListener(dialog -> enterImmersive())
                .show();
    }

    /**
     * 게임 화면만 보인다. 게스트는 가로(800x480)로 그리므로 화면을 가로로 고정하고, 서피스는
     * 게스트와 같은 5:3 비율로 가운데 둔다 — 폰 화면(대략 20:9)에 꽉 채우면 늘어나 보인다.
     * 로그는 화면에 띄우지 않는다. 홈의 "로그" 에서 본다.
     */
    private void buildUi() {
        enterImmersive();
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        FrameLayout stage = new FrameLayout(this) {
            @Override
            protected void onMeasure(int widthSpec, int heightSpec) {
                int w = MeasureSpec.getSize(widthSpec);
                int h = MeasureSpec.getSize(heightSpec);
                // 게스트 비율 그대로(800:480 = 5:3). 남는 쪽은 검은 띠가 된다.
                if (w * GuestVm.GUEST_HEIGHT > h * GuestVm.GUEST_WIDTH) {
                    w = h * GuestVm.GUEST_WIDTH / GuestVm.GUEST_HEIGHT;
                } else {
                    h = w * GuestVm.GUEST_HEIGHT / GuestVm.GUEST_WIDTH;
                }
                super.onMeasure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
                        MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY));
            }
        };
        SurfaceView surfaceView = new SurfaceView(this);
        // 배경색을 주면 안 된다. SurfaceView.draw() 는 먼저 뷰 계층에 구멍을 뚫고 나서 View.draw()
        // 로 배경을 그리므로, 불투명한 배경은 서피스를 덮어 검은 화면만 남는다(실측: 렌더러는
        // nonBlack=5703 짜리 프레임을 올리는데 화면은 검었다). 띠 색은 root 가 맡는다.
        surfaceView.getHolder().setFormat(PixelFormat.RGBA_8888);
        surfaceView.getHolder().addCallback(this);
        surfaceView.setOnTouchListener(this::forwardTouch);
        stage.addView(surfaceView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(stage, new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER));
        setContentView(root);
    }

    @Override // android.app.Activity
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersive();
        }
    }

    /** 상태바와 내비게이션 바를 숨긴다. 가장자리에서 쓸면 잠깐 나타난다. */
    @SuppressWarnings("deprecation")
    private void enterImmersive() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    private boolean isAndroid7() {
        return Android7GuestEngineAdapter.ID.equals(this.engineId);
    }

    /** 기존 시험 엔진(libsinglevm_runtime) 경로. Android 7 엔진과는 무관하게 그대로 둔다. */
    private void startGuestRuntime() {
        String installId = getExtra(EXTRA_INSTALL_ID, "");
        StringBuilder out = new StringBuilder();
        out.append("실행 요청\n");
        out.append("- 게임: ").append(getExtra(EXTRA_LABEL, installId)).append('\n');
        out.append("- 패키지: ").append(getExtra(EXTRA_PACKAGE, "")).append('\n');
        out.append("- 런처: ").append(getExtra(EXTRA_LAUNCHER, "")).append('\n');
        out.append("- ABI: ").append(getExtra(EXTRA_ABIS, "")).append('\n');
        out.append("- ARM32 라이브러리: ").append(getIntent().getIntExtra(EXTRA_ARM32_LIB_COUNT, 0)).append("개\n");
        out.append("- APK: ").append(getExtra(EXTRA_APK_PATH, "")).append('\n');
        out.append("- lib: ").append(getExtra(EXTRA_LIB_DIR, "")).append('\n');
        out.append("- data: ").append(getExtra(EXTRA_DATA_DIR, "")).append("\n\n");
        if (!NATIVE_RUNTIME_LOADED) {
            out.append("native runtime load failed\n");
            appendRuntimeLog("\n\n" + out);
            return;
        }
        try {
            out.append(nativeStartGuest(getFilesDir().getAbsolutePath() + "/single_vm", installId));
        } catch (RuntimeException e) {
            out.append("nativeStartGuest failed: ").append(e.getMessage());
        } catch (UnsatisfiedLinkError e2) {
            out.append("nativeStartGuest JNI missing: ").append(e2.getMessage());
        }
        appendRuntimeLog("\n\n" + out);
    }

    private void startFrameLoop() {
        if (!NATIVE_RUNTIME_LOADED || this.frameLoopRunning || !this.surfaceAttached || isAndroid7()) {
            return;
        }
        this.frameLoopRunning = true;
        this.frameTicks = 0;
        appendRuntimeLog("\n\nframe loop: persistent NativeRender tick start");
        this.frameHandler.postDelayed(this.frameTicker, FRAME_TICK_DELAY_MS);
    }

    private void stopFrameLoop() {
        if (!this.frameLoopRunning) {
            return;
        }
        this.frameLoopRunning = false;
        this.frameHandler.removeCallbacks(this.frameTicker);
    }

    private void runFrameTick() {
        if (!this.frameLoopRunning || !NATIVE_RUNTIME_LOADED) {
            return;
        }
        if (this.frameTicks >= FRAME_TICK_LIMIT) {
            this.frameLoopRunning = false;
            appendRuntimeLog("\n\nframe loop: stopped after " + FRAME_TICK_LIMIT + " ticks");
            return;
        }
        this.frameTicks++;
        new Thread(() -> {
            String result;
            try {
                result = nativeRunFrame();
            } catch (RuntimeException e) {
                result = "nativeRunFrame failed: " + e.getMessage();
            } catch (UnsatisfiedLinkError e) {
                result = "nativeRunFrame JNI missing: " + e.getMessage();
            }
            final String output = "\n\n" + result;
            runOnUiThread(() -> {
                if (this.frameLoopRunning) {
                    appendRuntimeLog(output);
                    this.frameHandler.postDelayed(this.frameTicker, FRAME_TICK_DELAY_MS);
                }
            });
        }, "single-vm-frame-tick").start();
    }

    /**
     * 실행 화면의 터치를 게스트 터치스크린으로 보낸다. 서피스는 게스트와 같은 비율이므로 뷰 안
     * 좌표를 0..1 로 나누기만 하면 된다. 손가락마다 pointer id 를 슬롯으로 쓴다(최대 10 개).
     */
    private boolean forwardTouch(View view, MotionEvent event) {
        if (!isAndroid7() || view.getWidth() <= 0 || view.getHeight() <= 0) {
            return false;
        }
        GuestVm vm = GuestVm.get(this);
        int action = event.getActionMasked();
        switch (action) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: {
                int index = event.getActionIndex();
                sendPointer(vm, view, event, index, QmpClient.TOUCH_BEGIN);
                return true;
            }
            case MotionEvent.ACTION_MOVE:
                for (int index = 0; index < event.getPointerCount(); index++) {
                    sendPointer(vm, view, event, index, QmpClient.TOUCH_UPDATE);
                }
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP: {
                int index = event.getActionIndex();
                sendPointer(vm, view, event, index, QmpClient.TOUCH_END);
                return true;
            }
            case MotionEvent.ACTION_CANCEL:
                for (int index = 0; index < event.getPointerCount(); index++) {
                    sendPointer(vm, view, event, index, QmpClient.TOUCH_END);
                }
                return true;
            default:
                return false;
        }
    }

    private static void sendPointer(GuestVm vm, View view, MotionEvent event, int index, int phase) {
        int slot = event.getPointerId(index);
        if (slot < 0 || slot >= 10) {
            return;
        }
        float x = event.getX(index) / view.getWidth();
        float y = event.getY(index) / view.getHeight();
        vm.sendTouch(slot, phase, x, y);
    }

    @Override // android.view.SurfaceHolder.Callback
    public void surfaceCreated(SurfaceHolder holder) {
        this.surfaceAttached = true;
        if (isAndroid7()) {
            // 가상롬은 이미 서비스에서 돌고 있다(또는 막 부팅 중이다). 화면만 붙인다.
            this.runtimeStarted = true;
            GuestVm.get(this).attachSurface(holder.getSurface());
            return;
        }
        if (!NATIVE_RUNTIME_LOADED) {
            appendRuntimeLog("\n\nsurface bridge: native runtime not loaded");
            return;
        }
        try {
            appendRuntimeLog("\n\n" + nativeAttachSurface(holder.getSurface()));
        } catch (RuntimeException e2) {
            appendRuntimeLog("\n\nnativeAttachSurface failed: " + e2.getMessage());
        } catch (UnsatisfiedLinkError e3) {
            appendRuntimeLog("\n\nnativeAttachSurface JNI missing: " + e3.getMessage());
        }
        if (!this.runtimeStarted) {
            this.runtimeStarted = true;
            startGuestRuntime();
        }
        startFrameLoop();
    }

    @Override // android.view.SurfaceHolder.Callback
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        appendRuntimeLog("\nsurface changed: " + width + "x" + height);
    }

    @Override // android.view.SurfaceHolder.Callback
    public void surfaceDestroyed(SurfaceHolder holder) {
        this.surfaceAttached = false;
        stopFrameLoop();
        if (isAndroid7()) {
            GuestVm.get(this).detachSurface();
            return;
        }
        if (NATIVE_RUNTIME_LOADED) {
            try {
                appendRuntimeLog("\n" + nativeDetachSurface());
            } catch (RuntimeException e3) {
                appendRuntimeLog("\nnativeDetachSurface failed: " + e3.getMessage());
            } catch (UnsatisfiedLinkError e4) {
                appendRuntimeLog("\nnativeDetachSurface JNI missing: " + e4.getMessage());
            }
        }
    }

    /** 실행 기록은 가상롬 쪽(last_run.txt)에 한데 모은다. 홈의 "로그" 가 그 파일을 보여 준다. */
    private void appendRuntimeLog(String value) {
        GuestVm.get(this).appendLog(value);
    }

    private String getExtra(String key, String fallback) {
        String value = getIntent().getStringExtra(key);
        return (value == null || value.isEmpty()) ? fallback : value;
    }
}
