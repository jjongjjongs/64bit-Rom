package com.example.minifps;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 멀티플레이의 통신. 방장 폰이 작은 중계기를 열고, 다른 폰은 그 주소로 접속한다(같은 와이파이나 Tailscale).
 * 주고받는 것은 한 줄에 하나씩인 JSON 글자이고, 중계기는 받은 줄을 나머지 모두에게 그대로 넘길 뿐 내용은 보지 않는다.
 * 접속할 때마다 번호를 주고({"t":"id","id":n}), 누가 나가면 알린다({"t":"left","id":n}). 방장 자신은 1번이다.
 * 안드로이드에 기대지 않는 순수 자바라서 컴퓨터에서도 그대로 돌려 시험할 수 있다.
 */
final class NetRelay {
    interface Listener {
        /** 다른 쪽에서 온 한 줄. 통신 스레드에서 불린다. */
        void onLine(String line);

        /** 연결이 끝났다. 통신 스레드에서 불린다. */
        void onClosed(String why);
    }

    private static final int MAX_PEERS = 10;
    private static final int MAX_LINE = 64 * 1024;

    private final Listener local;
    private final List<Peer> peers = new ArrayList<>();
    private ServerSocket server;
    private Socket link;
    private OutputStream linkOut;
    private int nextId = 1;
    private volatile boolean open;

    NetRelay(Listener local) {
        this.local = local;
    }

    /** 방을 연다. 방장 자신이 1번이 된다. */
    synchronized void host(int port) throws IOException {
        close();
        ServerSocket s = new ServerSocket();
        s.setReuseAddress(true);
        s.bind(new InetSocketAddress(port));
        server = s;
        open = true;
        nextId = 2;
        Thread t = new Thread(() -> accept(s), "minifps-relay");
        t.setDaemon(true);
        t.start();
        local.onLine("{\"t\":\"id\",\"id\":1}");
    }

    /** 남의 방에 들어간다. 연결은 뒤에서 이뤄지고, 안 되면 onClosed 로 알린다. */
    synchronized void join(String host, int port) {
        close();
        open = true;
        Thread t = new Thread(() -> {
            Socket s = new Socket();
            try {
                s.connect(new InetSocketAddress(host, port), 5000);
                s.setTcpNoDelay(true);
                synchronized (NetRelay.this) {
                    if (!open) {
                        s.close();
                        return;
                    }
                    link = s;
                    linkOut = s.getOutputStream();
                }
                BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
                String line;
                while ((line = readLine(in)) != null) {
                    local.onLine(line);
                }
                closedByOther(s, "lost");
            } catch (IOException e) {
                closedByOther(s, linkOut == null ? "connect" : "lost");
            }
        }, "minifps-link");
        t.setDaemon(true);
        t.start();
    }

    private void closedByOther(Socket s, String why) {
        boolean was;
        synchronized (this) {
            was = open && (link == s || link == null);
            if (was) {
                open = false;
                link = null;
                linkOut = null;
            }
        }
        try {
            s.close();
        } catch (IOException ignored) {
        }
        if (was) {
            local.onClosed(why);
        }
    }

    /** 내가 보내는 한 줄. 방장이면 모두에게, 참가자면 방장에게 간다. */
    void send(String line) {
        if (line.indexOf('\n') >= 0 || line.length() > MAX_LINE) {
            return;
        }
        byte[] b = (line + "\n").getBytes(StandardCharsets.UTF_8);
        OutputStream out;
        List<Peer> to = null;
        synchronized (this) {
            if (!open) {
                return;
            }
            out = linkOut;
            if (server != null) {
                to = new ArrayList<>(peers);
            }
        }
        if (to != null) {
            for (Peer p : to) {
                p.write(b);
            }
        } else if (out != null) {
            try {
                synchronized (out) {
                    out.write(b);
                    out.flush();
                }
            } catch (IOException ignored) {
            }
        }
    }

    synchronized void close() {
        open = false;
        if (server != null) {
            try {
                server.close();
            } catch (IOException ignored) {
            }
            server = null;
        }
        for (Peer p : peers) {
            p.shut();
        }
        peers.clear();
        if (link != null) {
            try {
                link.close();
            } catch (IOException ignored) {
            }
            link = null;
            linkOut = null;
        }
    }

    private void accept(ServerSocket s) {
        while (true) {
            Socket c;
            try {
                c = s.accept();
            } catch (IOException e) {
                return;
            }
            Peer p;
            synchronized (this) {
                if (server != s || peers.size() >= MAX_PEERS - 1) {
                    try {
                        c.close();
                    } catch (IOException ignored) {
                    }
                    continue;
                }
                p = new Peer(c, nextId++);
                peers.add(p);
            }
            Thread t = new Thread(() -> serve(p), "minifps-peer-" + p.id);
            t.setDaemon(true);
            t.start();
        }
    }

    private void serve(Peer p) {
        try {
            p.sock.setTcpNoDelay(true);
            p.out = p.sock.getOutputStream();
            p.write(("{\"t\":\"id\",\"id\":" + p.id + "}\n").getBytes(StandardCharsets.UTF_8));
            BufferedReader in = new BufferedReader(new InputStreamReader(p.sock.getInputStream(), StandardCharsets.UTF_8));
            String line;
            while ((line = readLine(in)) != null) {
                byte[] b = (line + "\n").getBytes(StandardCharsets.UTF_8);
                List<Peer> to;
                synchronized (this) {
                    to = new ArrayList<>(peers);
                }
                for (Peer o : to) {
                    if (o != p) {
                        o.write(b);
                    }
                }
                local.onLine(line);
            }
        } catch (IOException ignored) {
        }
        boolean was;
        List<Peer> to;
        synchronized (this) {
            was = peers.remove(p);
            to = new ArrayList<>(peers);
        }
        p.shut();
        if (was) {
            String left = "{\"t\":\"left\",\"id\":" + p.id + "}";
            byte[] b = (left + "\n").getBytes(StandardCharsets.UTF_8);
            for (Peer o : to) {
                o.write(b);
            }
            local.onLine(left);
        }
    }

    /** 한 줄을 읽되 터무니없이 긴 줄은 끊는다. */
    private static String readLine(BufferedReader in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int ch;
        while ((ch = in.read()) >= 0) {
            if (ch == '\n') {
                return sb.toString();
            }
            if (sb.length() >= MAX_LINE) {
                throw new IOException("line too long");
            }
            sb.append((char) ch);
        }
        return null;
    }

    private static final class Peer {
        final Socket sock;
        final int id;
        OutputStream out;

        Peer(Socket sock, int id) {
            this.sock = sock;
            this.id = id;
        }

        void write(byte[] b) {
            OutputStream o = out;
            if (o == null) {
                return;
            }
            try {
                synchronized (this) {
                    o.write(b);
                    o.flush();
                }
            } catch (IOException e) {
                shut();
            }
        }

        void shut() {
            try {
                sock.close();
            } catch (IOException ignored) {
            }
        }
    }
}
