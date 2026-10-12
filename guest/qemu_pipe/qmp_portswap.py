#!/usr/bin/env python3
"""QEMU QMP 에 붙어 게스트가 파이프 포트를 닫을 때마다 그 포트의 chardev 를 새로 만든다.

앱의 QmpClient.java 와 같은 일을 하는 CI 용 복제본이다. 게스트(pipetest, qemu_piped)가
포트를 열고 닫는 실제 부팅에서 chardev-change 가 받아들여지는지, 즉 "포트 재사용 때 브리지
연결이 새로 맺히는" 기전이 이 QEMU 에서 동작하는지를 확인한다.

사용법: qmp_portswap.py <qmp.sock> <transport 디렉터리>
출력 한 줄마다 OK/FAIL 로 시작하므로 CI 는 FAIL 이 있는지만 본다.
"""
import json
import os
import socket
import sys
import time

PORT_ID_PREFIX = "singlevmport"
CHARDEV_ID_PREFIX = "singlevmpipe"
CONNECT_TIMEOUT_S = 120.0


def log(msg: str) -> None:
    print(f"{time.strftime('%H:%M:%S')} {msg}", flush=True)


def main() -> int:
    qmp_path, transport = sys.argv[1], sys.argv[2]
    deadline = time.monotonic() + CONNECT_TIMEOUT_S
    sock = None
    while time.monotonic() < deadline:
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.connect(qmp_path)
            sock = s
            break
        except OSError:
            time.sleep(0.2)
    if sock is None:
        log("FAIL qmp 소켓에 붙지 못함")
        return 1
    f = sock.makefile("r")
    greeting = f.readline()
    if '"QMP"' not in greeting:
        log(f"FAIL 인사말이 아님: {greeting.strip()}")
        return 1
    sock.sendall(b'{"execute":"qmp_capabilities"}\n')
    log("OK qmp 연결됨")
    pending = []   # 보낸 chardev-change 의 파이프 번호, 응답 순서대로
    while True:
        line = f.readline()
        if not line:
            log("qmp 끊김")
            return 0
        msg = json.loads(line)
        if "return" in msg or "error" in msg:
            if not pending:
                continue   # qmp_capabilities 의 응답
            n = pending.pop(0)
            if "error" in msg:
                log(f"FAIL pipe{n} chardev-change: {msg['error'].get('desc')}")
            else:
                log(f"OK pipe{n} chardev 교체됨")
            continue
        if msg.get("event") != "VSERPORT_CHANGE":
            continue
        data = msg.get("data", {})
        port_id = data.get("id", "")
        if data.get("open", True) or not port_id.startswith(PORT_ID_PREFIX):
            continue
        n = int(port_id[len(PORT_ID_PREFIX):])
        path = os.path.join(transport, f"pipe{n}.sock")
        cmd = {"execute": "chardev-change", "arguments": {
            "id": f"{CHARDEV_ID_PREFIX}{n}",
            "backend": {"type": "socket", "data": {
                "addr": {"type": "unix", "data": {"path": path}},
                "server": True, "wait": False}}}}
        sock.sendall((json.dumps(cmd) + "\n").encode())
        pending.append(n)
        log(f"게스트가 pipe{n} 을 닫음 - chardev-change 요청")


if __name__ == "__main__":
    sys.exit(main())
