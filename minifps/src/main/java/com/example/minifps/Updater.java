package com.example.minifps;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * 앱 안에서 새 버전을 받아 설치한다. 게임(자바스크립트)이 {@code MiniUpdate.check()} 처럼 부른다.
 *
 * <p>릴리스의 고정 주소에 APK 와 그 설명(mini-fps.json: versionCode, versionName, size, sha256, notes)이
 * 함께 올라온다(.github/workflows/minifps.yml). 설명의 versionCode 가 설치된 것보다 크면 새 버전이다.
 *
 * <p>받은 파일은 남기지 않는다. 설치기에 넘긴 직후 지우고, 받다 만 것·취소된 것은 앱을 열 때마다 치운다.
 * 설치 자체는 시스템의 PackageInstaller 가 하므로, 처음에는 안드로이드의 확인 창이 한 번 뜬다. 서명이 다른
 * 파일은 시스템이 거절한다.
 */
final class Updater {
    static final String ACTION_STATUS = "com.example.minifps.INSTALL_STATUS";
    private static final String BASE = "https://github.com/jjongjjongs/64bit-Rom/releases/download/latest/";

    private final MainActivity activity;
    private final WebView web;
    private final File dir;
    private volatile boolean cancelled;
    private volatile boolean busy;
    private volatile JSONObject meta;
    private volatile File apk;

    Updater(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.dir = new File(activity.getCacheDir(), "updates");
        purge();
    }

    /** 받아 둔 설치 파일을 전부 지운다. 앱을 열 때와 설치·취소·실패 뒤에 부른다. */
    void purge() {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                f.delete();
            }
        }
        apk = null;
    }

    private void emit(String event, JSONObject data) {
        final String js = "window.SV&&SV.upd&&SV.upd.on(" + JSONObject.quote(event) + "," + data + ")";
        activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void fail(String message) {
        try {
            emit("error", new JSONObject().put("message", message));
        } catch (JSONException ignored) {
            // put() 은 문자열 값에서 실패하지 않는다.
        }
    }

    private long installedCode() throws Exception {
        PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
    }

    @JavascriptInterface
    public String version() {
        try {
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            return new JSONObject().put("name", info.versionName).put("code", installedCode()).toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(20000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "Mini-FPS-updater");
        c.setUseCaches(false);
        return c;
    }

    @JavascriptInterface
    public void check() {
        if (busy) {
            return;
        }
        busy = true;
        new Thread(() -> {
            try {
                HttpURLConnection c = open(BASE + "mini-fps.json");
                int code = c.getResponseCode();
                if (code != 200) {
                    throw new IOException("서버 응답 " + code);
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                try (InputStream in = c.getInputStream()) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = in.read(buf)) > 0 && out.size() < 65536) {
                        out.write(buf, 0, n);
                    }
                }
                JSONObject m = new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
                meta = m;
                m.put("installed", installedCode());
                m.put("newer", m.getLong("versionCode") > installedCode());
                emit("checked", m);
            } catch (Exception e) {
                fail("새 버전을 확인하지 못했습니다. 인터넷 연결을 확인해 주세요. (" + e.getMessage() + ")");
            } finally {
                busy = false;
            }
        }, "minifps-update-check").start();
    }

    @JavascriptInterface
    public void download() {
        final JSONObject m = meta;
        if (busy || m == null) {
            return;
        }
        busy = true;
        cancelled = false;
        new Thread(() -> {
            File out = null;
            try {
                purge();
                dir.mkdirs();
                out = new File(dir, "mini-fps-" + m.getLong("versionCode") + ".apk");
                long expected = m.getLong("size");
                HttpURLConnection c = open(BASE + "mini-fps.apk");
                if (c.getResponseCode() != 200) {
                    throw new IOException("서버 응답 " + c.getResponseCode());
                }
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                long done = 0;
                int last = -1;
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(out)) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (cancelled) {
                            throw new InterruptedException();
                        }
                        o.write(buf, 0, n);
                        sha.update(buf, 0, n);
                        done += n;
                        int pct = expected > 0 ? (int) Math.min(100, done * 100 / expected) : 0;
                        if (pct != last) {
                            last = pct;
                            emit("progress", new JSONObject().put("done", done).put("total", expected).put("pct", pct));
                        }
                    }
                }
                StringBuilder hex = new StringBuilder();
                for (byte b : sha.digest()) {
                    hex.append(String.format(Locale.ROOT, "%02x", b));
                }
                // 릴리스는 같은 이름으로 덮어쓰이므로, 설명을 읽은 뒤 파일이 바뀌었을 수 있다. 그때는 다시 확인하게 한다.
                if (done != expected || !hex.toString().equals(m.getString("sha256"))) {
                    throw new IOException("받은 파일이 안내된 것과 다릅니다. 다시 확인해 주세요.");
                }
                apk = out;
                emit("ready", m);
            } catch (InterruptedException e) {
                if (out != null) {
                    out.delete();
                }
                emit("cancelled", new JSONObject());
            } catch (Exception e) {
                if (out != null) {
                    out.delete();
                }
                fail("내려받지 못했습니다. (" + e.getMessage() + ")");
            } finally {
                busy = false;
            }
        }, "minifps-update-download").start();
    }

    @JavascriptInterface
    public void cancel() {
        cancelled = true;
        if (!busy) {
            purge();
        }
    }

    @JavascriptInterface
    public void install() {
        final File file = apk;
        if (busy || file == null || !file.isFile()) {
            fail("설치할 파일이 없습니다. 다시 받아 주세요.");
            return;
        }
        busy = true;
        new Thread(() -> {
            try {
                PackageInstaller installer = activity.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params =
                        new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(activity.getPackageName());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // 이 앱이 직접 설치한 버전을 다시 올릴 때는 시스템이 확인 창을 생략해 줄 수 있다.
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                int id = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(id)) {
                    try (InputStream in = new FileInputStream(file);
                         OutputStream o = session.openWrite("base.apk", 0, file.length())) {
                        byte[] buf = new byte[65536];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            o.write(buf, 0, n);
                        }
                        session.fsync(o);
                    }
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT
                            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
                    Intent status = new Intent(activity, MainActivity.class).setAction(ACTION_STATUS);
                    session.commit(PendingIntent.getActivity(activity, id, status, flags).getIntentSender());
                }
                // 내용은 설치기 세션으로 넘어갔다. 받은 파일은 더 필요 없다.
                purge();
                emit("installing", new JSONObject());
            } catch (Exception e) {
                purge();
                fail("설치를 시작하지 못했습니다. (" + e.getMessage() + ")");
            } finally {
                busy = false;
            }
        }, "minifps-update-install").start();
    }

    /** 설치기가 돌려준 상태. 확인이 필요하면 시스템 창을 띄우고, 실패·취소면 게임에 알린다. */
    void onStatus(Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                activity.startActivity(confirm);
            }
        } else if (status != PackageInstaller.STATUS_SUCCESS) {
            purge();
            String why = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            fail(status == PackageInstaller.STATUS_FAILURE_ABORTED ? "설치를 취소했습니다. 받은 파일은 지웠습니다."
                    : "설치하지 못했습니다. (" + (why == null ? "상태 " + status : why) + ")");
        }
    }
}
