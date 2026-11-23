package com.example.minifps;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 게임(웹 화면)과 통신(NetRelay) 사이의 다리. 웹 화면은 window.MiniNet 으로 방을 열고, 들어가고, 줄을 보낸다.
 * 받은 줄은 모아서 화면 스레드에서 window.MiniNetIn([...]) 으로 한꺼번에 넘긴다.
 * 웹소켓을 쓰지 않고 앱이 직접 연결하므로, 웹 화면의 보안 규칙(https 화면에서 일반 연결 금지)에 걸리지 않는다.
 */
final class MiniNet implements NetRelay.Listener {
    private final WebView web;
    private final NetRelay relay = new NetRelay(this);
    private final List<String> inbox = new ArrayList<>();
    private boolean posted;

    MiniNet(WebView web) {
        this.web = web;
    }

    /** 방을 연다. 친구에게 알려 줄 이 폰의 주소들을 돌려준다: {"addrs":[{"ip":"…","kind":"와이파이"}]} 또는 {"error":"…"}. */
    @JavascriptInterface
    public String host(int port) {
        JSONObject o = new JSONObject();
        try {
            try {
                relay.host(port);
            } catch (IOException e) {
                o.put("error", "방을 열지 못했습니다. 잠시 뒤 다시 해 보세요.");
                return o.toString();
            }
            o.put("addrs", addresses());
        } catch (JSONException ignored) {
        }
        return o.toString();
    }

    @JavascriptInterface
    public void join(String host, int port) {
        relay.join(host, port);
    }

    @JavascriptInterface
    public void send(String line) {
        relay.send(line);
    }

    @JavascriptInterface
    public void stop() {
        relay.close();
    }

    void destroy() {
        relay.close();
    }

    @Override
    public void onLine(String line) {
        synchronized (inbox) {
            inbox.add(line);
            if (posted) {
                return;
            }
            posted = true;
        }
        web.post(this::flush);
    }

    @Override
    public void onClosed(String why) {
        onLine("{\"t\":\"closed\",\"why\":\"" + why + "\"}");
    }

    private void flush() {
        JSONArray a = new JSONArray();
        synchronized (inbox) {
            for (String s : inbox) {
                a.put(s);
            }
            inbox.clear();
            posted = false;
        }
        web.evaluateJavascript("window.MiniNetIn&&MiniNetIn(" + a + ")", null);
    }

    /** 이 폰이 지금 가진 IPv4 주소들. 100.64.0.0/10 대역은 Tailscale 이 주는 주소다. 통신사 데이터망 주소는 뺀다. */
    private static JSONArray addresses() {
        JSONArray out = new JSONArray();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) {
                    continue;
                }
                String name = ni.getName() == null ? "" : ni.getName().toLowerCase();
                for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
                    if (!(ad instanceof Inet4Address) || ad.isLoopbackAddress() || ad.isLinkLocalAddress()) {
                        continue;
                    }
                    byte[] b = ad.getAddress();
                    int b0 = b[0] & 255;
                    int b1 = b[1] & 255;
                    String kind;
                    if (b0 == 100 && b1 >= 64 && b1 <= 127) {
                        kind = "Tailscale";
                    } else if (name.startsWith("rmnet") || name.startsWith("ccmni") || name.startsWith("pdp") || name.startsWith("v4-rmnet")) {
                        continue;
                    } else if (name.startsWith("wlan")) {
                        kind = "와이파이";
                    } else if (name.startsWith("ap") || name.startsWith("swlan") || name.contains("softap")) {
                        kind = "핫스팟";
                    } else if (name.startsWith("tun") || name.startsWith("wg")) {
                        kind = "VPN";
                    } else {
                        kind = "기타";
                    }
                    JSONObject o = new JSONObject();
                    o.put("ip", ad.getHostAddress());
                    o.put("kind", kind);
                    out.put(o);
                }
            }
        } catch (Exception ignored) {
        }
        return out;
    }
}
