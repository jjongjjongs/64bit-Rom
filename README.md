# Mini-FPS

봇과 두 팀으로 싸우는 오프라인 FPS(팀 데스매치, 폭파 미션). 안드로이드 폰에서 전체 화면 WebView 로 돕니다.
맵은 컨테이너 부두, 물류 창고, 보급기지, 2층짜리 구시가지 넷이고 뒤의 둘에서 폭파 미션을 할 수 있습니다.

설치 파일은 Releases 의 `latest` 에 `mini-fps.apk` 로 늘 최신이 있습니다.

## 구성

- 게임은 `minifps/web/src` 의 HTML 한 조각과 자바스크립트 파일들입니다(three.js r128).
- `python3 minifps/web/build.py` 가 그것을 `minifps/src/main/assets/index.html` 한 장으로 묶고, 앱은 전체 화면 WebView 로 엽니다.
  게임은 네트워크를 쓰지 않고, 앱 안 업데이트(`Updater.java`)만 Releases 에서 새 버전을 확인하고 받습니다.
- 텍스처·소품은 빌드 때 `minifps/web/fetch_assets.py` 가 받습니다(Poly Haven, CC0). 저장소에 넣은 자료와 출처는 `minifps/web/art/README.txt` 에 있습니다.
- 새 버전을 낼 때는 `minifps/build.gradle.kts` 의 `versionCode` 를 올리고 `minifps/release-notes.txt` 를 고칩니다.
- `.github/workflows/minifps.yml` 이 `minifps/**` 가 바뀔 때 빌드해 Releases 의 `latest` 에 올립니다.
- 브라우저에서 미리 보려면 `python3 minifps/web/build.py --artifact` 로 `minifps/web/out/mini-fps.html` 을 만듭니다.

## 빌드

```sh
python3 minifps/web/fetch_assets.py
python3 minifps/web/build.py
./gradlew :minifps:assembleDebug
```

JDK 17 이상, Android SDK Platform 34 + Build-Tools 34 가 필요합니다.
