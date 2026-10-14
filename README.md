# Mini Rom — 단일 32비트 가상롬

VPhoneOS류의 안드로이드 가상 ROM 컨테이너 앱. QEMU aarch64 기반으로 게스트 안드로이드
환경을 돌려 32bit 앱 실행/호환성을 확보하는 것이 목표.

## 쓰는 법 (사용자 기준)

1. `app-debug.apk` 를 설치한다. Releases 의 `latest` 에 늘 최신이 있다.
2. 처음 열면 가상롬 구성(약 290 MB)을 내려받을지 묻는다. 한 번만 받으면 된다. 나중에는
   설정 → 구성 가져오기에서 다시 받을 수 있고, 설치한 게임은 그대로 남는다.
3. "APK 설치" 로 32비트 게임 APK 를 넣는다. 한 번이면 된다.
4. 앱을 열어 두면 가상롬이 뒤에서 미리 부팅된다(약 1분). 게임 타일을 누르면 가상롬 안에
   게임이 설치되고(처음 한 번, 몇 분) 곧바로 게임 화면만 뜬다. 가상롬이 이미 떠 있으면 바로 뜬다.
5. 앱을 나가도 가상롬은 켜진 채 남는다(알림 "Mini Rom 실행 중"). 그래서 다음에 게임을 누르면
   부팅 없이 바로 뜬다. 끄려면 알림의 "끄기". 앱을 새로 깔았는데 구성이 옛것이면 홈 화면이
   새 구성 내려받기를 권한다 — 받아야 고친 것이 적용된다.

가상롬(QEMU + 구글 SDK 의 Android 7.0 ARM32 시스템 이미지)은 앱 안에서 돈다. 따로 설치되는
것은 없다.

## 이 저장소의 출처

원본 Android Studio 프로젝트 소스가 유실되어, 빌드된 APK(`단일_32비트_가상롬.apk`,
versionName 0.2.0)를 [jadx](https://github.com/skylot/jadx) 1.5.6으로 역디컴파일해서
복구한 상태입니다. 정확도 등급은 파일마다 다릅니다.

| 구성 | 상태 |
|---|---|
| `app/src/main/java/com/example/singlevm/**` | jadx로 복구한 커스텀 코드. **jadx 산출물 그대로는 컴파일 불가였고(오류 30개), 수정 완료.** 원본 변수명/주석은 유실됨 |
| `app/src/main/java/org/libsdl/app/**` | SDL2 안드로이드 프로젝트의 표준 Java 글루 코드 (zlib 라이선스, 커스텀 아님). **현재 앱에서 전혀 사용되지 않음** — 아래 "SDL 계층은 죽은 코드" 참고 |
| `app/src/main/AndroidManifest.xml`, `res/**` | jadx가 실제로 디코딩한 리소스 — 원본과 동일 (AGP 8 호환을 위해 매니페스트 일부 정리) |
| `app/src/main/jniLibs/arm64-v8a/*.so` | apk에서 그대로 추출한 **컴파일된 바이너리**. 디컴파일 불가 (기계어) |

## 빌드

```sh
./gradlew :app:assembleDebug
```

필요 환경:

- JDK 17 이상 (JDK 21에서 확인)
- Android SDK Platform 34 + Build-Tools 34.x
- Gradle wrapper 8.7 (저장소에 포함, 자동 다운로드)
- NDK는 **불필요**. `.so`는 이미 빌드된 바이너리를 그대로 패키징만 함

`local.properties`에 SDK 경로를 지정하거나 `ANDROID_HOME`을 설정하세요:

```sh
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
```

CI(`.github/workflows/build.yml`)에서 `assembleDebug`가 통과하는 것을 확인했습니다.
GitHub Actions 러너에는 SDK가 있고 네트워크 제한이 없습니다. APK는 워크플로
아티팩트(`app-debug-apk`)로 올라갑니다.

### 샌드박스 환경 제약

일부 자동화/샌드박스 환경에서는 `dl.google.com`이 이그레스 정책으로 차단되어
**Android SDK와 AGP(Android Gradle Plugin) 자체를 받을 수 없습니다.**
(`maven.google.com`도 `dl.google.com`으로 리다이렉트됩니다.)
그런 환경에서는 `./gradlew assembleDebug`가 다음에서 실패합니다:

```
Plugin [id: 'com.android.application', version: '8.5.0'] was not found
```

이건 프로젝트 문제가 아니라 네트워크 정책 문제입니다. SDK 없이 자바 소스만
검증하려면:

```sh
./tools/verify-compile.sh
```

Maven Central의 Robolectric `android-all` (API 34) jar를 프레임워크 스텁으로
써서 `javac`만 돌립니다. APK는 만들지 않고 리소스(`R.*`) 참조도 검증하지
않지만, 자바 레벨 오류는 전부 잡습니다. 현재 **오류 0개**이며 남은 경고는
SDL 보일러플레이트의 deprecation과 `PackageInfo.versionCode` 레거시 폴백뿐입니다
(후자는 `Build.VERSION.SDK_INT` 분기로 의도된 것).

## 네이티브 라이브러리 정체 (실측)

`.so` 바이너리에서 ELF 메타데이터/문자열로 확인한 결과입니다. README 초안의 추정과
달리, 이 `.so` 묶음은 **서로 다른 두 세대의 빌드가 겹쳐 쌓인 상태**입니다.

### 세대 A — 현재 실제로 쓰이는 QEMU 경로 (NDK r27 / clang 18.0.3)

| 파일 | 정체 | 근거 |
|---|---|---|
| `libqemu-system-aarch64.so` | **QEMU 11.0.2** (PIE 실행파일, .so가 아님) | `QEMU emulator version 11.0.2`, 빌드 경로 `/qemu-11.0.2/include/qemu/...`, `/opt/qemu-out/etc/qemu/` |
| `libslirp.so` | **libslirp** (QEMU meson subproject로 빌드) | 빌드 경로 `../subprojects/slirp/src/*.c` |
| `libpodroid-launcher.so` | **커스텀 4.9KB exec 래퍼** (PIE 실행파일) | `podroid-launcher: usage: launcher <qemu-path> [args...]`, `execv` |

`libqemu-system-aarch64.so`의 `NEEDED`는 `libslirp/libz/libm/libdl/libc`뿐입니다.
즉 **glib과 pixman은 QEMU 바이너리에 정적 링크**되어 있고, 아래 세대 B의
`libglib-2.0.so` / `libpixman-1.so`는 이 경로에서 쓰이지 않습니다.

### 세대 B — Limbo 계열 레거시 묶음 (2018년경 prebuilt)

| 파일 | 정체 | 근거 |
|---|---|---|
| `libglib-2.0.so` | **GLib 2.56.1** | `glib_major/minor/micro_version` 전역값을 .rodata에서 직접 읽음 |
| `libpixman-1.so` | **pixman 0.40.0** | `pixman_version_string` 상수 |
| `libSDL2.so` | **SDL 2.0.8 계열** (git 이전 hg 리비전) | `SDL_GetRevision` 문자열 `hg-11914:f1084c419f33` |
| `libcompat-limbo.so`, `libcompat-musl.so` | **Limbo(QEMU 안드로이드 프론트엔드) 호환 셈** | `LIMBO_JNI_READY storage=%s`, glib/pixman이 이 둘을 `NEEDED`로 링크 |
| `libcompat-SDL2-ext.so`, `libcompat-SDL2-addons.so` | Limbo의 SDL2 보조 셈 | `libcompat-SDL2-ext.so`만 `libSDL2.so`를 `NEEDED` |

### 세대 C — 커스텀 JNI 글루 (NDK r26 / clang 17.0.2, 소스 없음)

| 파일 | export하는 JNI 심볼 | 상태 |
|---|---|---|
| `libsinglevm_runtime.so` | `MainActivity.nativeProbeRuntime`, `GuestRunActivity.nativeStartGuest` / `nativeRunFrame` / `nativeAttachSurface` / `nativeDetachSurface` | 자바 선언과 **일치**. 레거시 엔진 경로에서 사용 중 |
| `libemugl_probe.so` | `GuestRunActivity.nativeProbeEmugl` / `nativeAttachEmuglSurface` / `nativeDetachEmuglSurface` / `nativeStartEmuglBridge` | 자바 선언과 **일치**. Android7 엔진 경로에서 사용 중 |
| `libsinglevm_qemu.so` | `GuestRunActivity.nativeBuildQemuArgs` / `nativeQemuProbe` / `nativeStartAndroid7Guest` | ⚠️ **자바 쪽에 대응 선언이 없음 — 죽은 바이너리** |
| `libemugl_host_android.so` | (JNI export 없음) | `libemugl_probe.so`가 **dlopen으로 로드** (확인됨: probe가 `dlopen`/`dlsym`을 import하고 emugl 심볼을 정적으로 참조하지 않음) |

**`libemugl_host_android.so` 는 원본에서 두 명령어를 고쳤습니다.** 렌더러 크기가
`emugl_android_smoke_test` 안에 `initRenderer(480, 800, …)` 로 박혀 있어서(가상 주소
`0xfec48`/`0xfec4c`, 파일 오프셋 동일), 게스트가 세로 화면밖에 될 수 없었습니다. 게임은
가로로 돌기 때문에 두 `mov` 의 즉치값을 맞바꿔 `initRenderer(800, 480, …)` 로 만들었습니다.

| | 명령어 | sha256 |
|---|---|---|
| 원본 | `mov w1,#480` (`52803c01`) / `mov w2,#800` (`52806402`) | `506d9ed3…021bdb5416` |
| 패치 | `mov w1,#800` (`52806401`) / `mov w2,#480` (`52803c02`) | `e2f1b8e5…4d02ff1` |

**세 번째 패치 — post 의 비동기 readback 을 끈다.** `FrameBuffer::postImpl` 은 post 콜백이
있으면 `m_asyncReadbackSupported`(Adreno 840 에서 "Async readback supported") 에 따라
`ReadbackWorker` 의 PBO 경로(다른 스레드·컨텍스트에서 `glMapBufferRange`)로 픽셀을 받는다.
폰 실측에서는 그 경로로 받은 프레임이 전부 0 이었다(`guest frame posted ... nonBlack=0`,
1700 프레임 넘게). 동기 경로(`ColorBuffer::readback` → 같은 스레드에서 `glReadPixels`)만 타도록
분기 하나를 무조건 점프로 바꿨다. `0x108320`: `cbz w8, 0x1083ec` (`68060034`) →
`b 0x1083ec` (`33000014`). 결과 sha256 `782ec8bc…`(아래 명령으로 확인).

**네 번째 패치 — 동기 경로의 세로 뒤집기를 끈다.** 세 번째 패치 뒤 화면은 나왔지만 위아래가
뒤집혀 있었다(폰 실측: 런처 글자가 거꾸로, 상태 표시줄이 아래). post 콜백은 `ydir < 0` 이면
줄 순서를 뒤집는데, 동기 경로의 `ColorBuffer::readback` 은 이미 위에서 아래 순서로 준다.
`0x1083fc`: `mov w3, #-1` (`03008012`) → `mov w3, #1` (`23008052`). 결과 sha256 `dbf0cae5…`.

**다섯 번째 패치 — 앱 서피스 flush 마다 화면에 올리던 것을 끈다.** 이 프리빌트의
`FrameBuffer::flushWindowSurfaceColorBuffer` 는 앱 창이 flush 될 때마다 그 창의 컬러버퍼를
`postImpl` 로 화면에 올리고(`flush callback post handle=…`), 컬러버퍼가 없으면 창을 직접
readback 해 콜백에 넘긴다. SurfaceFlinger 가 합성한 화면(`rcFBPost`)과 게임 창의 버퍼가
번갈아 올라가 화면이 심하게 깜빡였다(폰 실측, 시드2 타이틀). `0x10b608`: `cbz x24, +0x38`
(`d80100b4`) → `b +0x38` (`0e000014`), `0x10b640`: `cbz x8, +0xa4` (`280500b4`) → `b +0xa4`
(`29000014`). 이제 화면은 `rcFBPost` 로만 바뀐다. 결과 sha256 `3fc18e8b…`.

```
sha256sum app/src/main/jniLibs/arm64-v8a/libemugl_host_android.so
```

이 크기는 QEMU 의 `virtio-gpu-device,xres=800,yres=480`(앱의 `GuestRunActivity` 와
`guest-image.yml`) 과 늘 같아야 합니다.

**`libsinglevm_qemu.so`가 죽은 이유**: 자바 코드가 JNI로 QEMU를 띄우던 방식에서
`ProcessBuilder`로 QEMU 실행파일을 exec하는 방식(`buildModernQemuCommand` +
`startAndroid7Guest`)으로 이미 옮겨갔기 때문입니다. 그런데
`Android7GuestEngineAdapter.inspect()`는 여전히 `libsinglevm_qemu.so`의 **존재
여부**를 부팅 준비 완료 조건으로 검사합니다. 파일만 있으면 통과하므로 동작에는
문제가 없지만, 실제로 호출되지는 않는 잔재입니다.

### SDL 계층은 죽은 코드

- `com.example.singlevm`의 어떤 코드도 SDL을 참조하지 않습니다. 앱이 로드하는 것은
  `singlevm_runtime`과 `emugl_probe` 둘뿐입니다.
- 매니페스트에 `SDLActivity`가 등록되어 있지 않습니다.
- `libSDL2.so`를 `NEEDED`로 잡는 것은 `libcompat-SDL2-ext.so` 하나뿐이고, 그것도
  현재 실행 경로에서 로드되지 않습니다.
- `dlopen`을 쓰는 라이브러리들(`libemugl_probe`, `libemugl_host_android`,
  `libsinglevm_runtime`, `libsinglevm_qemu`, `libqemu-system-aarch64`) 중
  **`libSDL2.so`를 이름으로 여는 곳은 없습니다** — 해당 문자열을 가진 것은
  `libSDL2.so` 자신뿐입니다. 따라서 제거는 링크·로딩상 안전합니다.
- 게다가 Java 글루(`nativeSetupJNI` 존재 → SDL 2.0.10+)와 `libSDL2.so`(hg-11914 →
  2.0.8 계열)의 **버전이 서로 어긋납니다.**

따라서 SDL 계층은 "공식 소스로 교체"보다 **먼저 제거 여부를 판단**하는 것이 맞습니다.

## 서브모듈 교체 계획

`.so`를 소스 기반으로 되돌리는 작업은 세대별로 난이도가 크게 다릅니다.
현재 실행 경로(세대 A)만 재현하면 앱은 동작하므로, 이 순서를 권장합니다.

**1단계 — 세대 A만 소스화 (실질적으로 이것만 하면 됨)**

```sh
git submodule add https://gitlab.com/qemu-project/qemu.git third_party/qemu
git -C third_party/qemu checkout v11.0.2
```

- `libslirp`는 QEMU의 `subprojects/slirp`로 함께 빌드됩니다 (별도 서브모듈 불필요).
  QEMU 트리의 `subprojects/*.wrap`이 고정 커밋을 가리키므로 버전도 자동으로 맞습니다.
- glib/pixman은 QEMU에 정적 링크되어 있으므로, QEMU 빌드 시 정적 링크로 함께
  해결하면 됩니다. 별도 서브모듈로 뺄 필요 없음.
- NDK r27(clang 18.0.3)로 빌드. 원본과 동일 툴체인.
- 산출물은 `.so` 확장자를 단 PIE 실행파일이어야 합니다 (안드로이드가 `lib*.so`만
  네이티브 디렉터리에 풀어주기 때문에 쓰는 관용적 트릭).

**2단계 — 커스텀 글루 재작성 (세대 C, 소스 없음)**

- `libpodroid-launcher.so`: 4.9KB짜리 `execv` 래퍼. 사실상 재작성이 자명함
  (`main(argc, argv)` → `execv(argv[1], argv+1)`). 가장 먼저 처리 권장.
- `libsinglevm_runtime.so`, `libemugl_probe.so`, `libemugl_host_android.so`:
  원 작성자 확인 또는 재작성 필요. `libemugl_*`는 AOSP 에뮬레이터 emugl 계열로
  보이지만 확증은 못 했습니다.
- `libsinglevm_qemu.so`: 죽은 바이너리이므로 **재작성 대상이 아니라 삭제 후보**.
  단, `Android7GuestEngineAdapter`의 준비 검사에서 함께 빼야 합니다.

**3단계 — 세대 B 처리**

Limbo 계열 prebuilt(glib 2.56.1 / pixman 0.40.0 / SDL 2.0.8 / compat-*)는 현재
실행 경로에서 쓰이지 않습니다. 소스로 교체하기보다 **APK에서 빼는 것이 우선**이고,
빼도 동작하는지 확인 후 제거하면 APK가 크게 줄어듭니다.

## 알려진 리소스 (매니페스트 실측값)

- `applicationId` / `namespace`: `com.example.singlevm`
- `minSdk 24` / `targetSdk 34` / `compileSdk 34`
- `versionCode 1`, `versionName "0.2.0"`
- 원본 apk는 debug 빌드였음 (`debuggable=true`). 지금은 매니페스트 하드코딩 대신
  `buildTypes.debug`에서 관리하므로 release 빌드에는 자동으로 빠집니다.
- `extractNativeLibs=true`는 **필수**입니다. QEMU와 launcher가 `.so`가 아니라
  실제로 exec되는 실행파일이라, 압축 해제되어 실파일로 존재해야 합니다.
  `app/build.gradle.kts`의 `jniLibs.useLegacyPackaging = true`가 이를 보장합니다.

## 문서

- [docs/GUEST-IMAGE.md](docs/GUEST-IMAGE.md) — **게스트 이미지 만드는 절차.**
  지금 비어 있는 유일한 조각이며, 여기부터 시작하면 됩니다. PC의 데스크톱 QEMU에서
  먼저 부팅시키는 방법(검증된 명령줄 포함)이 들어 있습니다.
- [docs/ARCHITECTURE-NOTES.md](docs/ARCHITECTURE-NOTES.md) — 왜 아직 게임이 실행되지
  않는지, `.so` 실측 결과, 접근 방식 비교.
- [guest/README.md](guest/README.md) — 게스트 안에서 도는 구성요소 (`init.wrapper`).

## TODO

- [x] jadx 산출물 컴파일 오류 수정 (30개)
- [x] 난해한 변수명/인라인 상수 정리
- [x] 빌드 설정 AGP 8 호환화 + Gradle wrapper 추가
- [x] 네이티브 라이브러리 진짜 버전 특정
- [x] `./gradlew :app:assembleDebug` 실제 통과 확인 (CI, APK 아티팩트 생성)
- [x] `/init.wrapper` 1차 버전 (vport 확인 + /init 인계) — `guest/init_wrapper/`
- [ ] **게스트 이미지 제작** (kernel + system.img + 램디스크 재패킹) — 최우선, docs/GUEST-IMAGE.md 참고
- [ ] `/dev/qemu_pipe` → virtio-serial 다중화 방식 결정 (docs/GUEST-IMAGE.md 4.2)
- [x] virtio 버스를 MMIO로 통일 (게스트 커널에 PCI 불필요)
- [ ] 게스트 부팅 성공 후: APK를 게스트로 넘기는 통로 구현
- [ ] QEMU 11.0.2 서브모듈 추가 및 NDK r27로 재빌드
- [ ] `libpodroid-launcher.so` 재작성 (가장 쉬움)
- [ ] `libsinglevm_qemu.so` 제거 + `Android7GuestEngineAdapter` 준비 검사에서 제외
- [ ] SDL 계층(`org/libsdl/app/**` + `libSDL2.so` + `libcompat-SDL2-*`) 제거 검토
- [ ] 세대 B prebuilt 제거 후 동작 확인 (APK 크기 대폭 감소)
