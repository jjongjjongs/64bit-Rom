package com.example.singlevm;

import android.net.LocalSocket;
import android.net.LocalSocketAddress;
import android.os.SystemClock;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
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

    interface Log {
        void line(String text);
    }

    private final File socketFile;
    private final File transportDir;
    private final Log log;
    private volatile LocalSocket socket;
    private volatile boolean closed = false;
    private int swaps = 0;

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
            String line;
            while (!this.closed && (line = reader.readLine()) != null) {
                handle(new JSONObject(line), out);
            }
        } catch (IOException | JSONException e) {
            if (!this.closed) {
                this.log.line("[qmp] 끊김: " + e.getMessage());
            }
        } finally {
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

    private void handle(JSONObject message, OutputStream out) throws IOException, JSONException {
        if (message.has("error")) {
            this.log.line("[qmp] 오류 응답: " + message.getJSONObject("error").optString("desc"));
            return;
        }
        if (!message.has("event")) {
            // "return" 은 chardev-change 의 승인이다. 성공은 조용히 지나간다.
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
        File pipeSocket = new File(this.transportDir, "pipe" + pipeIndex + ".sock");
        // 폴더가 없으면 QEMU 의 bind 가 ENOENT 로 실패한다(실측: 가상롬이 도는 중에 초기화를 눌러
        // 루트가 지워졌을 때). 다시 만들어 두면 교체는 된다.
        if (!this.transportDir.isDirectory() && !this.transportDir.mkdirs()) {
            this.log.line("[qmp] 전송 폴더가 없어 pipe" + pipeIndex + " 교체를 건너뛴다");
            return;
        }
        JSONObject addr = new JSONObject()
                .put("type", "unix")
                .put("data", new JSONObject().put("path", pipeSocket.getAbsolutePath()));
        JSONObject backend = new JSONObject()
                .put("type", "socket")
                .put("data", new JSONObject().put("addr", addr).put("server", true).put("wait", false));
        JSONObject arguments = new JSONObject()
                .put("id", CHARDEV_ID_PREFIX + pipeIndex)
                .put("backend", backend);
        send(out, new JSONObject().put("execute", "chardev-change").put("arguments", arguments));
        this.swaps++;
        // 처음 몇 번만 남긴다. 그 뒤로는 평범한 일이라 로그를 채울 필요가 없다.
        if (this.swaps <= 5) {
            this.log.line("[qmp] 게스트가 pipe" + pipeIndex + " 를 닫음 - 호스트 소켓을 새로 만든다"
                    + (this.swaps == 5 ? " (이후 생략)" : ""));
        }
    }

    private static void send(OutputStream out, JSONObject command) throws IOException {
        out.write((command.toString() + "\n").getBytes(StandardCharsets.UTF_8));
        out.flush();
    }
}
