package com.example.minifps;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;

/**
 * 게임 한 장을 전체 화면 WebView 로 띄운다. 게임 코드는 assets/index.html 에, 텍스처와 모델은 assets/a/ 에
 * 들어 있다(minifps/web/build.py 가 만든다). 페이지는 {@link #ORIGIN} 이라는 가짜 https 주소로 열고, 그 주소로
 * 가는 요청을 전부 APK 안 파일로 답한다. file:// 로 열면 WebGL 이 이미지와 모델을 읽지 못하기 때문이다.
 * 게임은 실제 네트워크를 쓰지 않는다. 네트워크는 {@link Updater} 가 새 버전을 확인하고 받을 때만 쓴다.
 */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://minifps.app/";

    private WebView web;
    private Updater updater;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // 펀치홀·노치 옆까지 그린다. 게임 쪽이 safe-area 여백으로 조작 버튼을 비켜 놓는다.
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 13, 15));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHapticFeedbackEnabled(false);
        // 길게 누르면 뜨는 글자 선택이 조작 버튼을 가로채지 않게 한다.
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        // 설정과 지난 매치 구성을 localStorage 에 둔다.
        s.setDomStorageEnabled(true);
        // 첫 총성이 버튼 터치와 다른 틱에 날 수 있다.
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setAllowFileAccess(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.startsWith(ORIGIN)) {
                    return null;
                }
                String path = request.getUrl().getPath();
                path = path == null || path.length() <= 1 ? "index.html" : path.substring(1);
                try {
                    return new WebResourceResponse(mime(path), null, getAssets().open(path));
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
                }
            }
        });
        updater = new Updater(this, web);
        web.addJavascriptInterface(updater, "MiniUpdate");
        setContentView(web);
        if (savedInstanceState == null) {
            web.loadUrl(ORIGIN + "index.html");
        } else {
            web.restoreState(savedInstanceState);
        }
        immersive();
    }

    private static String mime(String path) {
        String p = path.toLowerCase(java.util.Locale.ROOT);
        if (p.endsWith(".html")) {
            return "text/html";
        } else if (p.endsWith(".js")) {
            return "text/javascript";
        } else if (p.endsWith(".json") || p.endsWith(".gltf")) {
            return "application/json";
        } else if (p.endsWith(".jpg") || p.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (p.endsWith(".png")) {
            return "image/png";
        }
        return "application/octet-stream";
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (Updater.ACTION_STATUS.equals(intent.getAction())) {
            updater.onStatus(intent);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            immersive();
        }
    }

    /** 상태 표시줄과 내비게이션 바를 숨긴다. 가장자리를 쓸면 잠깐 나왔다 들어간다. */
    @SuppressWarnings("deprecation")
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    protected void onPause() {
        // 게임이 visibilitychange 로 스스로 멈추고, WebView 타이머도 같이 세운다.
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    /** 뒤로가기는 먼저 게임에 묻는다: 전투 중이면 일시정지, 메뉴면 한 단계 뒤로, 첫 화면이면 종료. */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.SV&&SV.back)?SV.back():false", handled -> {
            if (!"true".equals(handled)) {
                finish();
            }
        });
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
