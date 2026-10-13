package com.example.singlevm;

import android.net.LocalSocket;
import android.net.LocalSocketAddress;
import android.os.SystemClock;
import android.system.ErrnoException;
import android.system.Os;
import android.util.SparseIntArray;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * QEMU 의 QMP 모니터에 붙어, 게스트가 파이프 포트를 닫을 때마다 그 포트의 호스트 소켓을 새로
 * 만든다.
 *
 * <p>왜 필요한가. 게스트 파이프 하나는 virtio-serial 포트 하나이고, 그 포트의 호스트 쪽은
 * 유닉스 소켓 서버다. 브리지(libemugl_probe.so)는 그 소켓에 클라이언트로 붙어 있고, 처음 받는
 * "pipe:<서비스>\0" 헤더로 모드를 정한다. 그런데 게스트 프로세스가 포트를 닫아도 QEMU 는
 * 호스트 소켓 연결을 끊지 않는다. 다음 프로세스가 같은 포트를 열고 헤더를 쓰면 브리지는 그것을
 * 이전 opengles 스트림의 데이터로 렌더러에 넘기고, 렌더러는 "pipe" 네 글자를 명령 길이로 읽어
 * 2 GB 를 할당하려다 죽는다. 실측(폰 logcat):
 *
 * <pre>
 *   qemu_piped: pipe 11 [opengles] closed ... / pipe 11: 서비스 'opengles'   (370 ms 뒤 재사용)
 *   W/libc: malloc(18446744072818318950) failed: returning null pointer
 *   qemu_piped: pipe 11: read 가 5초째 대기 중 (호스트가 조용하다)
 * </pre>
 *
 * <p>진짜 goldfish 호스트는 파이프마다 열기/닫기가 분명하다. 그것을 여기서 되살린다: QEMU 는
 * 게스트가 포트를 열고 닫을 때 {@code VSERPORT_CHANGE} 이벤트를 내고, {@code chardev-change}
 * 로 그 포트의 chardev 를 같은 경로의 새 소켓 서버로 바꿀 수 있다. 바꾸면 QEMU 가 옛 소켓을
 * 닫으므로 브리지는 끊김을 보고 다시 붙고(실측: "disconnected" 직후 "connected"), 렌더러
 * 파이프도 새로 열린다. 이전 프로세스의 렌더러 스레드는 브리지가 끊길 때 함께 정리된다.
 *
 * <p>게스트 쪽 {@code qemu_piped} 는 방금 닫힌 포트를 바로 다시 쓰지 않고 1 초를 두므로, 교체가
 * 끝나기 전에 새 프로세스의 헤더가 옛 연결로 새어 나가는 일은 없다.
 */
final class QmpClient implements Runnable {
    /** virtserialport 의 device id 접두사. 뒤에 파이프 번호가 붙는다. */
    static final String PORT_ID_PREFIX = "singlevmport";
    /** chardev id 접두사. 뒤에 파이프 번호가 붙는다. */
    static final String CHARDEV_ID_PREFIX = "singlevmpipe";
    private static final long CONNECT_TIMEOUT_MS = 20_000L;
    /** QMU 절대 좌표 축의 최댓값(INPUT_EVENT_ABS_MAX). */
    private static final int ABS_MAX = 0x7fff;
    /** pending 큐에서 chardev-change 가 아닌 명령(입력 이벤트)을 뜻하는 표시. */
    private static final int PENDING_INPUT = -1;
    static final int TOUCH_BEGIN = 0;
    static final int TOUCH_UPDATE = 1;
    static final int TOUCH_END = 2;
    private static final String[] TOUCH_TYPES = {"begin", "update", "end"};

    interface Log {
        void line(String text);
    }

    private final File socketFile;
    private final File transportDir;
    private final Log log;
    private volatile LocalSocket socket;
    private volatile OutputStream out;
    private volatile boolean closed = false;
    private int swaps = 0;
    private int inputErrors = 0;
    /** 보낸 chardev-change 의 파이프 번호. QMP 는 응답을 보낸 순서대로 돌려준다. */
    private final ArrayDeque<Integer> pending = new ArrayDeque<>();
    /** 파이프마다 지금까지 만든 소켓 세대. 경로는 pipeN.g<세대>.sock 이다. */
    private final SparseIntArray generation = new SparseIntArray();

    QmpClient(File socketFile, File transportDir, Log log) {
        this.socketFile = socketFile;
        this.transportDir = transportDir;
        this.log = log;
    }

    void start() {
        Thread thread = new Thread(this, "single-vm-qmp");
        thread.setDaemon(true);
        thread.start();
    }

    void close() {
        this.closed = true;
        LocalSocket current = this.socket;
        if (current != null) {
            try {
                current.close();
            } catch (IOException ignored) {
                // 어차피 끝나는 중이다.
            }
        }
    }

    @Override
    public void run() {
        LocalSocket connected = connectWithRetry();
        if (connected == null) {
            return;
        }
        this.socket = connected;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(connected.getInputStream(), StandardCharsets.UTF_8))) {
            OutputStream out = connected.getOutputStream();
            String greeting = reader.readLine();
            if (greeting == null || !greeting.contains("\"QMP\"")) {
                this.log.line("[qmp] 인사말이 아님: " + greeting);
                return;
            }
            send(out, new JSONObject().put("execute", "qmp_capabilities"));
            // 능력 협상 응답은 pending 없이 온다. 그 뒤부터 터치 이벤트를 받는다.
            String first = reader.readLine();
            if (first == null) {
                return;
            }
            this.out = out;
            String line;
            while (!this.closed && (line = reader.readLine()) != null) {
                handle(new JSONObject(line), out);
            }
        } catch (IOException | JSONException e) {
            if (!this.closed) {
                this.log.line("[qmp] 끊김: " + e.getMessage());
            }
        } finally {
            this.out = null;
            try {
                connected.close();
            } catch (IOException ignored) {
                // 이미 닫혔을 수 있다.
            }
            this.socket = null;
        }
    }

    private LocalSocket connectWithRetry() {
        long deadline = SystemClock.elapsedRealtime() + CONNECT_TIMEOUT_MS;
        while (!this.closed && SystemClock.elapsedRealtime() < deadline) {
            LocalSocket candidate = new LocalSocket();
            try {
                candidate.connect(new LocalSocketAddress(
                        this.socketFile.getAbsolutePath(), LocalSocketAddress.Namespace.FILESYSTEM));
                this.log.line("[qmp] 연결됨: " + this.socketFile.getName());
                return candidate;
            } catch (IOException e) {
                // QEMU 가 아직 소켓을 만들기 전이다.
                try {
                    candidate.close();
                } catch (IOException ignored) {
                    // 열리지도 않았다.
                }
                SystemClock.sleep(100);
            }
        }
        if (!this.closed) {
            this.log.line("[qmp] 연결 실패 - 포트 재사용 시 브리지가 초기화되지 않는다");
        }
        return null;
    }

    /** 지금 눌려 있는 손가락 수. BTN_TOUCH 는 첫 손가락이 닿을 때와 마지막 손가락이 떨어질 때만 보낸다. */
    private int fingersDown = 0;

    /**
     * 터치 한 점을 virtio-multitouch 장치에 넣는다. 실행 화면(UI 스레드)에서 부른다. 모니터가
     * 아직 안 붙었으면 조용히 버린다 — 부팅 중의 터치는 어차피 받을 곳이 없다.
     *
     * <p>QEMU(virtio-input-hid.c)의 규칙: mtt 이벤트 중 type 이 data 인 것만 좌표(ABS_MT_POSITION_X/Y)
     * 가 되고, begin/update/end 는 ABS_MT_SLOT 과 ABS_MT_TRACKING_ID 를 그대로 보낸다. 그래서 손가락이
     * 닿으면 begin(슬롯, 추적 id) 뒤에 data x, data y 를, 움직이면 update(슬롯 고르기) 뒤에 data x, y 를,
     * 떨어지면 end 에 추적 id -1 을 보내야 한다. 추적 id 의 최댓값이 슬롯 수라 슬롯 번호를 그대로 쓴다.
     * BTN_TOUCH 는 btn "touch" 이벤트로 따로 보낸다.
     */
    void sendTouch(int slot, int phase, float x, float y) {
        OutputStream current = this.out;
        if (current == null || phase < 0 || phase >= TOUCH_TYPES.length) {
            return;
        }
        int ax = Math.max(0, Math.min(ABS_MAX, Math.round(x * ABS_MAX)));
        int ay = Math.max(0, Math.min(ABS_MAX, Math.round(y * ABS_MAX)));
        try {
            JSONArray events = new JSONArray();
            synchronized (this.pending) {
                switch (phase) {
                    case TOUCH_BEGIN:
                        if (this.fingersDown == 0) {
                            events.put(buttonEvent(true));
                        }
                        this.fingersDown++;
                        events.put(touchEvent("begin", slot, slot, "x", ax));
                        events.put(touchEvent("data", slot, slot, "x", ax));
                        events.put(touchEvent("data", slot, slot, "y", ay));
                        break;
                    case TOUCH_UPDATE:
                        events.put(touchEvent("update", slot, slot, "x", ax));
                        events.put(touchEvent("data", slot, slot, "x", ax));
                        events.put(touchEvent("data", slot, slot, "y", ay));
                        break;
                    default:
                        events.put(touchEvent("end", slot, -1, "x", ax));
                        if (this.fingersDown > 0) {
                            this.fingersDown--;
                        }
                        if (this.fingersDown == 0) {
                            events.put(buttonEvent(false));
                        }
                        break;
                }
                JSONObject command = new JSONObject()
                        .put("execute", "input-send-event")
                        .put("arguments", new JSONObject().put("events", events));
                this.pending.addLast(PENDING_INPUT);
                send(current, command);
            }
        } catch (IOException | JSONException e) {
            if (this.inputErrors++ == 0) {
                this.log.line("[qmp] 터치 전송 실패: " + e.getMessage());
            }
        }
    }

    private static JSONObject touchEvent(String type, int slot, int trackingId, String axis, int value)
            throws JSONException {
        JSONObject data = new JSONObject()
                .put("type", type)
                .put("slot", slot)
                .put("tracking-id", trackingId)
                .put("axis", axis)
                .put("value", value);
        return new JSONObject().put("type", "mtt").put("data", data);
    }

    private static JSONObject buttonEvent(boolean down) throws JSONException {
        JSONObject data = new JSONObject().put("down", down).put("button", "touch");
        return new JSONObject().put("type", "btn").put("data", data);
    }

    private void handle(JSONObject message, OutputStream out) throws IOException, JSONException {
        if (message.has("error") || message.has("return")) {
            Integer pipeIndex;
            synchronized (this.pending) {
                pipeIndex = this.pending.pollFirst();
            }
            if (pipeIndex != null && pipeIndex == PENDING_INPUT) {
                // 터치 이벤트의 응답. 오류는 처음 몇 번만 남긴다.
                if (message.has("error") && this.inputErrors++ < 3) {
                    this.log.line("[qmp] 터치 이벤트 거절: " + message.getJSONObject("error").optString("desc"));
                }
                return;
            }
            if (message.has("error")) {
                this.log.line("[qmp] 오류 응답" + (pipeIndex == null ? "" : " (pipe" + pipeIndex + ")") + ": "
                        + message.getJSONObject("error").optString("desc"));
            } else if (pipeIndex != null) {
                // chardev-change 가 끝났다. 옛 chardev 는 사라지며 자기 소켓 파일을 지웠고, 새
                // chardev 는 새 경로에 있다. 브리지가 아는 경로를 그리로 돌린다.
                pointBridgePath(pipeIndex);
            }
            return;
        }
        if (!message.has("event")) {
            return;
        }
        if (!"VSERPORT_CHANGE".equals(message.getString("event"))) {
            return;
        }
        JSONObject data = message.getJSONObject("data");
        String id = data.optString("id", "");
        if (data.optBoolean("open", true) || !id.startsWith(PORT_ID_PREFIX)) {
            return;
        }
        int pipeIndex;
        try {
            pipeIndex = Integer.parseInt(id.substring(PORT_ID_PREFIX.length()));
        } catch (NumberFormatException e) {
            return;
        }
        // 폴더가 없으면 QEMU 의 bind 가 ENOENT 로 실패한다(실측: 가상롬이 도는 중에 초기화를 눌러
        // 루트가 지워졌을 때). 다시 만들어 두면 교체는 된다.
        if (!this.transportDir.isDirectory() && !this.transportDir.mkdirs()) {
            this.log.line("[qmp] 전송 폴더가 없어 pipe" + pipeIndex + " 교체를 건너뛴다");
            return;
        }
        // 같은 경로로 바꾸면 안 된다. QEMU 는 새 chardev 를 먼저 만들고(경로를 지우고 다시 bind)
        // 옛 chardev 를 없애는데, 옛것이 사라지면서 "자기" 경로를 unlink 한다 — 그 경로가 새
        // 소켓의 경로이기도 해서 새 소켓 파일이 함께 사라진다. 실측: 교체 뒤 브리지가 "QEMU GLES
        // socket connection timed out", CI 의 listener 가 "소켓이 생기지 않음". 그래서 세대마다
        // 다른 경로에 만들고, 브리지가 아는 pipeN.sock 은 그리로 가는 심볼릭 링크로 바꾼다.
        int nextGeneration = this.generation.get(pipeIndex, 0) + 1;
        this.generation.put(pipeIndex, nextGeneration);
        File pipeSocket = new File(this.transportDir, "pipe" + pipeIndex + ".g" + nextGeneration + ".sock");
        JSONObject addr = new JSONObject()
                .put("type", "unix")
                .put("data", new JSONObject().put("path", pipeSocket.getAbsolutePath()));
        JSONObject backend = new JSONObject()
                .put("type", "socket")
                .put("data", new JSONObject().put("addr", addr).put("server", true).put("wait", false));
        JSONObject arguments = new JSONObject()
                .put("id", CHARDEV_ID_PREFIX + pipeIndex)
                .put("backend", backend);
        synchronized (this.pending) {
            this.pending.addLast(pipeIndex);
            send(out, new JSONObject().put("execute", "chardev-change").put("arguments", arguments));
        }
        this.swaps++;
        // 처음 몇 번만 남긴다. 그 뒤로는 평범한 일이라 로그를 채울 필요가 없다.
        if (this.swaps <= 5) {
            this.log.line("[qmp] 게스트가 pipe" + pipeIndex + " 를 닫음 - 호스트 소켓을 새로 만든다"
                    + (this.swaps == 5 ? " (이후 생략)" : ""));
        }
    }

    /**
     * pipeN.sock 을 현재 세대의 소켓으로 가는 심볼릭 링크로 바꾼다. 브리지는 끊긴 뒤 같은 경로로
     * 다시 붙으려 하므로(실측: 약 15 초 동안 재시도) 그 사이에 링크가 생기면 된다. 임시 이름으로
     * 만들어 rename 하므로 브리지가 보기에 경로는 "없음" 아니면 "새 소켓" 둘 중 하나다.
     */
    private void pointBridgePath(int pipeIndex) {
        int currentGeneration = this.generation.get(pipeIndex, 0);
        File link = new File(this.transportDir, "pipe" + pipeIndex + ".sock");
        File temp = new File(this.transportDir, "pipe" + pipeIndex + ".sock.tmp");
        String target = "pipe" + pipeIndex + ".g" + currentGeneration + ".sock";
        try {
            temp.delete();
            Os.symlink(target, temp.getAbsolutePath());
            Os.rename(temp.getAbsolutePath(), link.getAbsolutePath());
        } catch (ErrnoException e) {
            this.log.line("[qmp] pipe" + pipeIndex + " 링크 실패: " + e.getMessage());
            return;
        }
        // 지난 세대의 소켓 파일은 QEMU 가 지우지만, 혹시 남았으면 치운다.
        if (currentGeneration > 1) {
            new File(this.transportDir, "pipe" + pipeIndex + ".g" + (currentGeneration - 1) + ".sock").delete();
        }
    }

    private static void send(OutputStream out, JSONObject command) throws IOException {
        out.write((command.toString() + "\n").getBytes(StandardCharsets.UTF_8));
        out.flush();
    }
}
