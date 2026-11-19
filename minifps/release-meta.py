#!/usr/bin/env python3
"""앱 안 업데이트(Updater.java)가 읽는 mini-fps.json 을 표준 출력으로 낸다.

사용법: release-meta.py <빌드된 APK>
버전은 build.gradle.kts 에서, 바뀐 점은 release-notes.txt(한 줄에 하나, # 은 주석)에서 읽는다.
새 버전을 낼 때는 versionCode 를 반드시 올린다. 앱은 그 숫자가 설치된 것보다 클 때만 알린다.
"""
import hashlib, json, pathlib, re, sys

here = pathlib.Path(__file__).resolve().parent
gradle = (here / 'build.gradle.kts').read_text(encoding='utf-8')
data = pathlib.Path(sys.argv[1]).read_bytes()
notes = [l.strip() for l in (here / 'release-notes.txt').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
print(json.dumps({
    'versionCode': int(re.search(r'versionCode\s*=\s*(\d+)', gradle).group(1)),
    'versionName': re.search(r'versionName\s*=\s*"([^"]+)"', gradle).group(1),
    'size': len(data),
    'sha256': hashlib.sha256(data).hexdigest(),
    'notes': notes[:6],
}, ensure_ascii=False, indent=1))
