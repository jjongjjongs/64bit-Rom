#!/usr/bin/env python3
"""스모크 부팅용 호스트측 파이프 청취기.

앱에서는 libemugl_probe.so 가 QEMU 가 열어둔 유닉스 소켓들에 붙어서, 게스트가 보낸
"pipe:<서비스>" 헤더를 읽고 해당 서비스로 연결해 준다. CI 에는 그 렌더러가 없으므로
소켓에 아무도 붙지 않고, 그래서 게스트가 파이프를 열려고 시도하는지조차 알 수 없었다.

이 스크립트는 그 자리를 대신해 "듣기만" 한다. GLES 프로토콜은 구현하지 않는다.
확인하려는 것은 딱 하나 — 게스트에서 나온 바이트가 호스트 소켓까지 실제로 도달하는가,
그리고 그 첫 바이트가 "pipe:opengles" 인가. 전송로 전체를 GLES 를 빼고 검증하는 셈이다.

사용법: host_listener.py <소켓이 생길 디렉터리>

디렉터리를 받는 이유: 이 청취기는 QEMU 보다 먼저 떠야 첫 바이트를 놓치지 않는데, 그
시점에는 소켓 파일이 아직 없다. 셸에서 pipe*.sock 을 미리 펼치면 아무것도 매치되지
않아 글로브 문자열이 그대로 넘어온다(실측: "[pipe*.sock] 연결 실패"). 그래서 탐색과
대기를 여기서 한다.
"""
import glob
import os
import socket
import sys
import threading
import time

CONNECT_TIMEOUT_S = 240
RECONNECT_DELAY_S = 0.5
DISCOVER_TIMEOUT_S = 120


def log(msg: str) -> None:
    print(msg, flush=True)


def dump(data: bytes, limit: int = 64) -> str:
    """바이트를 16진수와 읽을 수 있는 문자로 같이 보여준다."""
    chunk = data[:limit]
    hexed = " ".join(f"{b:02x}" for b in chunk)
    text = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
    more = f" (+{len(data) - limit} bytes)" if len(data) > limit else ""
    return f"hex[{hexed}] ascii[{text}]{more}"


def watch(path: str) -> None:
    name = os.path.basename(path)

    # QEMU 가 소켓을 만들기 전에 시작될 수 있다. 붙을 때까지 기다린다.
    deadline = time.monotonic() + CONNECT_TIMEOUT_S
    sock = None
    while time.monotonic() < deadline:
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.connect(path)
            sock = s
            break
        except OSError:
            time.sleep(RECONNECT_DELAY_S)
    if sock is None:
        log(f"[{name}] 연결 실패 (소켓이 생기지 않음)")
        return

    log(f"[{name}] 연결됨")
    total = 0
    header_done = False
    try:
        while True:
            data = sock.recv(65536)
            if not data:
                # 게스트가 포트를 닫으면 qmp_portswap.py 가 chardev 를 새로 만들고, 그러면
                # 이 연결이 끊긴다. 앱의 브리지가 하듯 새 소켓에 다시 붙는다.
                log(f"[{name}] 호스트 소켓이 닫힘 (총 {total} 바이트) - 다시 붙는다")
                sock.close()
                return watch(path)
            total += len(data)
            if not header_done:
                # goldfish pipe 의 첫 쓰기는 NUL 로 끝나는 서비스 이름이다.
                head = data.split(b"\x00", 1)[0]
                try:
                    text = head.decode("ascii")
                except UnicodeDecodeError:
                    text = repr(head[:32])
                log(f"[{name}] *** 서비스 헤더: {text!r} ({len(data)} 바이트 수신) ***")
                header_done = True
                rest = data.split(b"\x00", 1)[1] if b"\x00" in data else b""
                if rest:
                    log(f"[{name}] 헤더 뒤 {dump(rest)}")
            elif total < 4096:
                # 헤더 다음에 오는 것이 emugl 핸드셰이크다. 폰에서 호스트가 이 바이트를
                # 받고도 답을 안 하는 상황이라(실측: 게스트가 60초 넘게 read 대기),
                # 무엇을 보내는지 정확히 알아야 앱 쪽을 판단할 수 있다.
                log(f"[{name}] +{len(data)} 바이트 (누적 {total}) {dump(data)}")
    except OSError as exc:
        log(f"[{name}] 오류: {exc} (총 {total} 바이트)")


def main() -> int:
    if len(sys.argv) != 2:
        log("사용법: host_listener.py <소켓 디렉터리>")
        return 2
    directory = sys.argv[1]

    # QEMU 가 소켓을 만들 때까지 기다린다.
    pattern = os.path.join(directory, "pipe*.sock")
    deadline = time.monotonic() + DISCOVER_TIMEOUT_S
    paths: list = []
    while time.monotonic() < deadline:
        paths = sorted(glob.glob(pattern))
        if paths:
            break
        time.sleep(RECONNECT_DELAY_S)
    if not paths:
        log(f"소켓을 찾지 못했습니다: {pattern}")
        return 1
    log(f"소켓 {len(paths)}개 발견: {', '.join(os.path.basename(p) for p in paths)}")

    threads = [threading.Thread(target=watch, args=(p,), daemon=True) for p in paths]
    for t in threads:
        t.start()
    # 스모크 부팅이 끝나면 부모가 죽인다. 그때까지 그냥 살아 있는다.
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    sys.exit(main())
