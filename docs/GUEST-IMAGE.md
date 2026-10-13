# 게스트 이미지 만들기

호스트(앱) 쪽은 대체로 서 있습니다. 지금 비어 있는 건 **게스트 이미지**이고, 이
문서는 그걸 만드는 절차입니다.

배경과 판단 근거는 [ARCHITECTURE-NOTES.md](ARCHITECTURE-NOTES.md)에 있습니다.
요약하면 — QEMU는 손댈 필요 없고, 게스트가 표준 **ranchu HAL**을 로드한 뒤
`/dev/qemu_pipe`를 열면 `/init.wrapper`가 그걸 virtio-serial로 돌려주고, 호스트의
`libemugl_probe.so`가 받아서 렌더링하는 구조입니다.

---

> **현황 (이 문서에서 가장 먼저 볼 곳): 7절.**
> 게스트는 부팅해서 `/system` `/cache` `/data` 를 마운트하고 zygote 와 system_server 까지
> 올라옵니다. 지금 막혀 있는 곳은 SurfaceFlinger 하나이고, 원인은 goldfish pipe 전송로
> 부재로 보입니다(7.3). CI 가 매 커밋마다 이미지를 조립하고 스모크 부팅까지 돌립니다.

## 0. 대원칙: 폰이 아니라 PC에서 먼저 잡는다

> ⚠ **이 절은 더 이상 유효하지 않습니다.** PC 를 쓸 수 없는 상황이라, 여기 적힌 작업은
> 전부 `.github/workflows/guest-image.yml` 이 GitHub 러너에서 대신합니다. 커널 빌드는
> 캐시되고(스크립트가 안 바뀌면 재사용), 조립·스모크 부팅·판정까지 한 번에 돕니다.
> 결과 아티팩트를 폰에서 내려받아 앱의 "Android 7 구성 가져오기" 로 넣으면 됩니다.


**이게 이 문서에서 제일 중요한 항목입니다.**

게스트 이미지를 폰에 넣고 앱으로 돌리면 한 번 시도에 수 분이 걸리고, 실패해도
원인이 잘 안 보입니다. 반면 **PC의 데스크톱 QEMU에서 똑같은 명령줄을 그대로
재현할 수 있습니다.** 앱이 만드는 인자는 표준 업스트림 QEMU 인자라 그대로 돕니다
(실제로 QEMU 8.2.2에서 검증했습니다).

```sh
sudo apt install qemu-system-arm     # qemu-system-aarch64 가 함께 설치됨
```

부팅 로그가 터미널에 바로 흐르고, 커널 패닉이든 init 실패든 즉시 보입니다.
**게스트가 PC에서 부팅될 때까지는 폰에 올리지 마세요.** 6절에 그대로 쓸 수 있는
명령줄이 있습니다.

---

## 1. 필요한 세 조각

| 조각 | 어떻게 얻나 | 난이도 |
|---|---|---|
| `system.img` | **Android SDK 기성품 그대로** | 쉬움 |
| `kernel` | 빌드 또는 SDK 것 시도 | 중간 |
| `ramdisk.img` + `/init.wrapper` | 기성 램디스크에 바이너리 추가 | 어려움 |

가장 큰 덩어리인 `system.img`가 공짜로 해결된다는 게 핵심입니다.

---

## 2. system.img — SDK 기성품 사용

Android 7.0(API 24) ARM32 에뮬레이터 이미지가 **정확히 우리가 필요한 것**입니다.
ranchu HAL(`gralloc.ranchu`, `libEGL_emulation`)이 이미 들어 있습니다.

```sh
sdkmanager "system-images;android-24;default;armeabi-v7a"
```

받으면 여기 있습니다:

```
$ANDROID_HOME/system-images/android-24/default/armeabi-v7a/
├── system.img
├── ramdisk.img
├── userdata.img
├── kernel-ranchu        (또는 kernel-qemu)
└── build.prop
```

**포맷을 반드시 확인하세요.** 앱은 `format=raw`로 붙입니다:

```sh
file system.img
```

- `Linux rev 1.0 ext4 filesystem data` → 그대로 사용 가능
- `Android sparse image` → 변환 필요:
  ```sh
  simg2img system.img system.raw.img && mv system.raw.img system.img
  ```
  (`simg2img`는 `android-sdk-libsparse-utils` 패키지)

`userdata.img`는 SDK 것이 작습니다. 게임 설치 공간이 필요하면 키우세요:

```sh
truncate -s 4G userdata.img
```

---

## 3. 커널

### 3.1 반드시 켜져 있어야 하는 config

```
CONFIG_VIRTIO=y
CONFIG_VIRTIO_MMIO=y            # virtio-blk-device (디스크)
CONFIG_VIRTIO_BLK=y
CONFIG_VIRTIO_CONSOLE=y         # virtio-serial = emugl 전송로
# PCI는 필요 없습니다 (3.2 참고 — 호스트를 MMIO로 통일했습니다)
CONFIG_ANDROID_BINDER_IPC=y     # cmdline의 binder.devices=
CONFIG_ANDROID_BINDER_DEVICES="binder,hwbinder,vndbinder"
CONFIG_SERIAL_AMBA_PL011=y      # cmdline의 console=ttyAMA0
CONFIG_SERIAL_AMBA_PL011_CONSOLE=y
CONFIG_BLK_DEV_INITRD=y         # rdinit=
```

### 3.2 virtio 버스: MMIO로 통일했습니다

이전 판에서는 호스트가 버스를 섞어 쓰고 있었습니다 — 디스크는 virtio-mmio
(`virtio-blk-device`)인데 emugl 전송로와 GPU는 PCI(`virtio-serial-pci`,
`virtio-gpu-pci`)였습니다.

goldfish/ranchu 계열 ARM 커널은 보통 **virtio-mmio 전용**으로 빌드되어 PCIe 호스트
브리지가 꺼져 있습니다. 그 상태에서는 디스크는 붙지만 **virtio-serial이 보이지
않아** `/dev/vport0p*`가 생기지 않고, 그러면 부팅에 성공하더라도 emugl 전송로가
없어 화면이 영원히 나오지 않습니다.

**그래서 호스트를 전부 MMIO로 통일했습니다.** 이제 커널에 PCI가 필요 없습니다.

| 디바이스 | 변경 전 | 변경 후 |
|---|---|---|
| 디스크 | `virtio-blk-device` | 그대로 (원래 MMIO) |
| emugl 파이프 | `virtio-serial-pci,disable-legacy=on` | **`virtio-serial-device`** |
| GPU | `virtio-gpu-pci,xres=,yres=` | **`virtio-gpu-device,xres=,yres=`** |

> `disable-legacy`는 **virtio-pci 전용 속성**이라 그대로 옮기면 QEMU가 기동조차
> 하지 못합니다 (`Property 'virtio-serial-device.disable-legacy' not found`).
> 그래서 제거했습니다. virt 머신의 virtio-mmio는 기본이 virtio 1.0이라 의미상
> 잃는 것도 없습니다. `xres`/`yres`는 MMIO에서도 그대로 동작합니다.
>
> 위 조합은 QEMU 8.2.2에서 실제로 검증했습니다 — 정상 기동하고 포트 8개가 모두
> MMIO virtio-serial 컨트롤러에 붙습니다.

여전히 **부팅 후 `/dev/vport0p0` 존재 여부가 최대 관문**입니다(7절 4번). 다만 이제
원인이 PCI 부재가 아니라 `CONFIG_VIRTIO_CONSOLE` 누락 쪽입니다.

### 3.2b ⚠ 콘솔이 조용한 문제 (실측)

첫 실기 실행에서 **QEMU가 11초 동안 시리얼 출력을 한 줄도 내지 않고 종료 코드 0으로
끝났습니다.** 커널 패닉이면 뭐라도 찍혔을 텐데 완전 무음이었습니다.

원인으로 가장 유력한 것은 **콘솔 불일치**입니다. ranchu 보드는 콘솔이
`goldfish_tty`(`ttyGF0`)인데 우리는 `-machine virt`의 PL011(`ttyAMA0`)을 씁니다.
SDK의 `kernel-ranchu`에 `CONFIG_SERIAL_AMBA_PL011`이 없으면 커널은 잘 돌면서도
**출력할 곳이 없어 무음으로 부팅**합니다.

그래서 기본 cmdline에 **earlycon**을 넣었습니다:

```
console=ttyAMA0 earlycon=pl011,0x09000000 keep_bootcon ignore_loglevel ...
```

`earlycon`은 드라이버 probe 전에 virt 머신의 UART(`0x09000000`)에 직접 씁니다.
`keep_bootcon`은 나중에 콘솔이 넘어가면서 조용해지는 걸 막습니다.

**이걸로도 무음이면 커널이 아예 시작하지 못한 것**이고, 커널을 교체해야 합니다.

### 3.2c cmdline 재정의 파일 — 앱 재빌드 없이 바꾸기

cmdline을 한 글자 바꿀 때마다 CI 재빌드 → 다운로드 → 재설치는 너무 느립니다.
그래서 앱이 이 파일을 읽습니다:

```
Android/data/com.example.singlevm/files/import/kernel_cmdline.txt
```

파일 관리자로 접근되는 위치입니다. 내용이 있으면 **그 한 줄이 `-append` 전체를
대체**합니다(줄바꿈은 공백으로 치환하니 편집기가 줄을 접어도 됩니다). 실행 로그에
어떤 cmdline을 썼는지 찍히고, 파일이 없으면 기본값을 씁니다.

시도해볼 만한 변형들:

```
console=ttyGF0 earlycon=pl011,0x09000000 keep_bootcon ignore_loglevel androidboot.hardware=ranchu androidboot.selinux=permissive binder.devices=binder,hwbinder,vndbinder rdinit=/init.wrapper root=/dev/ram0 rw
```
```
console=ttyAMA0 earlycon keep_bootcon ignore_loglevel androidboot.hardware=ranchu androidboot.selinux=permissive rdinit=/init root=/dev/ram0 rw
```

두 번째는 `/init.wrapper`를 건너뛰고 원래 `/init`으로 바로 가는 것으로, **래퍼가
문제인지 커널이 문제인지 가르는** 데 씁니다.

### 3.3 커널 소스

cmdline의 `kernel-android54`와 `binder.devices=`를 보면 **android-5.4 커널**을
겨냥하신 것으로 보입니다.

```sh
git clone https://android.googlesource.com/kernel/common -b android11-5.4
# ARCH=arm, virt 보드 대상으로 빌드
```

SDK의 `kernel-ranchu`를 먼저 시도해볼 가치는 있습니다. ranchu 보드 자체가 QEMU
`virt`를 바탕으로 만들어졌기 때문에 PL011 콘솔·virtio-mmio는 맞을 가능성이 높습니다.
MMIO로 통일했으므로 PCI 문제는 사라졌고, 남은 관건은 `CONFIG_VIRTIO_CONSOLE`
포함 여부입니다. **먼저 SDK 커널로 6절 스모크 테스트를 돌려보고,
`/dev/vport0p0` 유무로 판단하는 게 가장 빠릅니다.**

---

## 4. 램디스크와 `/init.wrapper`

### 4.1 왜 스크립트가 아니라 바이너리여야 하나

`rdinit=/init.wrapper`는 **rdinit 시점**에 실행됩니다. 이때는 `/system`이 아직
마운트되지 않아 셸(`/system/bin/sh`, toybox)이 없습니다. 따라서 `#!/bin/sh`
스크립트는 동작하지 않습니다.

**정적 링크된 ARM32 실행 파일**이어야 합니다. 호스트 쪽 `libpodroid-launcher.so`와
같은 성격입니다.

역할은 이렇습니다:

1. `/dev` 준비, `/dev/vport0p*` 가 뜰 때까지 대기
2. `/dev/qemu_pipe`(및 `/dev/goldfish_pipe`) 요청을 virtio-serial 포트로 연결
3. 원래 `/init`을 `execv`로 넘김 (argv 보존)

소스와 빌드 스크립트가 저장소에 있습니다:

```sh
cd guest/init_wrapper
ANDROID_NDK_HOME=~/Android/Sdk/ndk/27.0.12077973 ./build.sh
```

자세한 설명은 [../guest/README.md](../guest/README.md). 1차 버전은 vport 존재 확인과
로그만 하고 `/init`으로 넘깁니다 — 아래 4.2의 다중화는 아직 하지 않습니다.

### 4.2 ⚠ 파이프 다중화 문제

**단순 심볼릭 링크로는 안 됩니다.**

goldfish pipe는 **열 때마다 새 채널**이 생깁니다. HAL 여러 개가 각자 파이프를
동시에 엽니다. 반면 virtio-serial 포트는 **한 번에 하나만** 열립니다. 파이프가
8개인 이유가 이것입니다.

심볼릭 링크는 항상 같은 vport를 가리키므로 **두 번째 클라이언트부터 막힙니다.**
따라서 `open("/dev/qemu_pipe")`를 가로채 **비어 있는 vport로 분배하는 계층**이
필요합니다. 후보:

| 방식 | 장점 | 단점 |
|---|---|---|
| LD_PRELOAD 셔임 | 커널 불필요, 구현 쉬움 | 정적 링크 바이너리엔 안 먹음 |
| FUSE로 `/dev/qemu_pipe` 제공 | 정확한 의미 재현 | 부팅 초기에 FUSE 띄우기가 까다로움 |
| 작은 커널 모듈 | 가장 정확 | 커널 빌드와 묶임 |
| 동시 파이프 8개로 제한 + HAL 패치 | 단순 | system.img 수정 필요 |

**동시에 열리는 파이프가 실제로 몇 개인지 먼저 측정**하는 게 순서입니다. 8개로
충분하다면 분배만 해주면 되고, 그렇지 않다면 파이프 수를
`TRANSPORT_PIPE_COUNT`에서 늘리면 됩니다.

### 4.3 램디스크 재패킹

```sh
mkdir rd && cd rd
zcat ../ramdisk.img | cpio -idmv          # 기성 램디스크 풀기
cp ../init.wrapper .                       # 래퍼 추가
chmod 750 init.wrapper
find . | cpio -o -H newc | gzip > ../ramdisk-new.img
```

---

## 5. 임포터 규격에 맞춰 ZIP 만들기

앱의 `MainActivity.importAndroid7Bundle()`이 ZIP 안에서 **파일명으로** 찾습니다
(경로는 무시하고 basename만 봅니다):

| 찾는 이름 | 필수 | 저장될 이름 |
|---|---|---|
| `kernel-ranchu` → `kernel-qemu` → `kernel` (이 순서) | ✅ | `kernel` |
| `ramdisk.img` | ✅ | `ramdisk.img` |
| `system.img` | ✅ | `system.img` |
| `userdata.img` | ❌ | `userdata.img` |

```sh
zip -0 android7-guest.zip kernel ramdisk.img system.img userdata.img
```

`-0`(무압축)을 쓰면 임포트가 빠릅니다. 앱은 압축 해제 공간으로 **원본 크기 +
256MB**를 요구합니다.

> 참고: `kernel-android54` / `ramdisk-android54.img` 이름을 쓰면 앱이 `-cpu`를
> `cortex-a53`으로 잡습니다. Android 7 **ARM32** 게스트는 `cortex-a15`가 맞으므로
> 파일명을 `kernel` / `ramdisk.img`로 두세요.

---

## 6. PC 스모크 테스트 (앱이 만드는 명령줄과 동일)

`/tmp/guest`에 `kernel`, `ramdisk.img`, `system.img`, `userdata.img`를 두고:

```sh
cd /tmp/guest && mkdir -p transport

ARGS=(
  -machine virt,gic-version=3
  -cpu cortex-a15
  -accel tcg,thread=multi,tb-size=256
  -smp 2 -m 1024
  -display none
  -device virtio-gpu-device,xres=480,yres=800
  -device virtio-serial-device
)
for i in 0 1 2 3 4 5 6 7; do
  ARGS+=(-chardev "socket,id=singlevmpipe$i,path=/tmp/guest/transport/pipe$i.sock,server=on,wait=off")
  ARGS+=(-device "virtserialport,chardev=singlevmpipe$i,name=org.singlevm.pipe.$i")
done
ARGS+=(
  -monitor none -nic none -serial stdio
  -kernel /tmp/guest/kernel
  -initrd /tmp/guest/ramdisk.img
  -drive "if=none,id=userdata,format=raw,file=/tmp/guest/userdata.img"
  -device virtio-blk-device,drive=userdata
  -drive "if=none,id=system,format=raw,readonly=on,file=/tmp/guest/system.img"
  -device virtio-blk-device,drive=system
  -append "console=ttyAMA0 androidboot.hardware=ranchu androidboot.selinux=permissive binder.devices=binder,hwbinder,vndbinder rdinit=/init.wrapper root=/dev/ram0 rw"
)

# 앱과 동일하게: 64비트 QEMU 바이너리가 32비트 CPU(cortex-a15)를 에뮬레이트한다.
# qemu-system-arm 이 아님에 주의 — 앱은 libqemu-system-aarch64.so 를 쓴다.
qemu-system-aarch64 "${ARGS[@]}"
```

> 유닉스 소켓 경로는 **108바이트 제한**이 있습니다. 긴 경로에서는 QEMU가
> `UNIX socket path ... is too long`으로 죽습니다. 짧은 디렉터리를 쓰세요.
> (안드로이드 실제 경로는 약 70바이트라 문제없습니다.)

---

## 7. 단계별 성공 판정 — 실측 현황

아래 표는 계획이 아니라 **CI(`.github/workflows/guest-image.yml`)에서 실제로 확인한
결과**입니다. 각 관문에서 걸렸던 원인과 그 근거가 된 로그 한 줄을 같이 적어둡니다.
같은 자리에서 다시 막혔을 때 추측을 반복하지 않기 위한 기록입니다.

| # | 목표 | 상태 | 걸렸던 원인 |
|---|---|---|---|
| 1 | 커널이 뜬다 | ✅ | SDK `kernel-ranchu` 는 goldfish 보드용이라 `-machine virt` 에서 무음으로 죽음 → 직접 빌드 |
| 2 | 램디스크를 잡는다 | ✅ | |
| 3 | `/init.wrapper` 가 돈다 | ✅ | |
| 4 | virtio-serial 이 보인다 | ✅ | `/dev/vport0p0` 은 영영 안 생김 — 포트 0 은 콘솔 예약. 실제로는 `vport3p1..p8` |
| 5 | `/init` 이 넘겨받는다 | ✅ | `CONFIG_LSM` 에 selinux 가 없으면 selinuxfs 미등록 → 정책 로드 실패 |
| 6 | `/system` `/cache` `/data` 마운트 | ✅ | **장치 순서** (아래 7.1) |
| 7 | zygote / system_server 기동 | ✅ | **바인더** (아래 7.2) |
| 8 | SurfaceFlinger | ✅ | abort 안 함. `/dev/qemu_pipe` 자리를 뺏고 나서 해결 (7.3, 7.3c) |
| 9 | emugl 연결 | ✅ | 폰에서 SurfaceFlinger 가 `init()` 을 끝내고 `bootanim` 을 띄움 (7.3e). CI 는 답할 렌더러가 없어 여기서 멈춤 (7.3d) |
| 10 | 부팅 완료 | ❌ | `system_server` 가 BatteryService 에서 죽음 — healthd 를 꺼 뒀던 것이 원인 (7.6) |
| 11 | APK 전달·실행 | ❌ | 아직 없음. `EXTRA_APK_PATH` 는 부팅 경로에서 한 번도 안 쓰임 |

### 7.1 virtio-mmio 는 커맨드라인 순서를 보장하지 않는다

`-drive` 를 system → cache → userdata 순으로 적었는데 게스트는
`vda=userdata(2G)`, `vdb=cache(256M)`, `vdc=system(1.75G)` 로 봤습니다. 바깥 둘이
뒤집힙니다. 결과:

- `/system` 이 **빈 userdata 를 물었습니다.** 빈 ext4 도 `ro` 마운트는 성공하므로
  로그상으로는 정상으로 보였습니다.
- `/data` 는 `readonly=on` 으로 붙인 system.img 를 가리켰고, 쓰기 마운트가
  거부되며 `error: Permission denied`(EACCES) 로 실패했습니다.
- `/sys/block/vda/ro` 가 1 이었던 것은 fs_mgr 때문입니다. fstab 항목이 `ro` 면
  fs_mgr 이 그 장치에 `BLKROSET` 을 겁니다.

호스트 QEMU 버전마다 달라질 수 있으므로 **순서를 맞추는 방식은 쓰지 않습니다.**
`init.wrapper` 가 각 디스크의 ext4 슈퍼블록 라벨(`system` / `cache` / `data`)을 읽어
`fstab.ranchu` 의 장치 이름을 실제 장치로 고쳐 씁니다. 안드로이드 init 보다 먼저
도는 시점이라 rootfs 가 아직 쓰기 가능합니다.

> `mkfs.ext4 -L` 로 cache/userdata 에 라벨을 주고, SDK 의 system.img 에는
> `e2label` 로 지정합니다. 라벨이 없으면 교정이 동작하지 않습니다.

### 7.2 바인더는 두 번 막힙니다

**(a) 장치가 안 생김.** `CONFIG_ANDROID_BINDERFS=y` 면 binderfs 가
`CONFIG_ANDROID_BINDER_DEVICES` 의 이름을 가져가서 마운트된 binderfs 안에만 장치를
만듭니다. legacy misc 장치가 등록되지 않아 `/dev/binder` 가 없습니다.

판별법 — misc 클래스에 ashmem 은 있는데 binder 가 없고, `/proc/filesystems` 에는
binder 가 있음:

```
wd dev: /sys/class/misc/binder MISSING
wd dev: binderfs in /proc/filesystems: yes
wd dev: misc class: vga_arbiter hw_random autofs rfkill cpu_dma_latency ashmem ...
```

Android 7 은 binderfs 를 모르고 `/dev/binder` 를 직접 엽니다. → **BINDERFS 를 끕니다.**

**(b) ABI 가 안 맞음.** 장치가 생긴 뒤에도 이렇게 죽습니다:

```
E ProcessState: Binder driver protocol does not match user space protocol!
F ProcessState: Binder driver could not be opened.  Terminating.
init: critical process 'servicemanager' exited 4 times in 4 minutes; rebooting into recovery mode
```

API 24 armeabi-v7a 유저스페이스는 옛 **32비트 바인더 API(프로토콜 7**, 바인더 구조체
안 포인터가 32비트)로 빌드돼 있습니다. `BINDER_IPC_32BIT` 는 이후 커널에서 삭제돼
5.10 은 프로토콜 8 + 64비트 포인터만 제공합니다.

드라이버가 전부 `binder_uintptr_t` / `binder_size_t` 타입으로 쓰여 있으므로,
`include/uapi/linux/android/binder.h` 의 타입 정의 두 줄과 버전 상수 한 줄을 되돌리면
드라이버 전체가 32비트 ABI 로 컴파일됩니다. `guest/kernel/build-kernel.sh` 가 이
치환을 하고, **치환이 안 먹으면 빌드를 실패시킵니다** — 조용히 잘못된 ABI 의 커널을
만드는 것이 가장 나쁩니다.

### 7.3 지금 막혀 있는 곳: SurfaceFlinger — goldfish pipe 가 필수임이 확정됐다

```
F DEBUG: pid: 4665, name: surfaceflinger >>> /system/bin/surfaceflinger <<<
F DEBUG:   #06 pc 00025e4d /system/lib/libsurfaceflinger.so (_ZN7android14SurfaceFlinger4initEv+280)
init: Service 'surfaceflinger' killed by signal 6
```

Android 7 의 init.rc 는 surfaceflinger 에 `onrestart restart zygote` 를 걸어둡니다.
그래서 SF 가 죽을 때마다 zygote 와 그 의존 서비스가 통째로 재시작되고, 부팅이
영원히 같은 자리를 맴돕니다(PID 가 10000 을 넘고, zygote 는 895초 시점에도 아직
"Preloading classes" 였습니다). **부팅이 느린 것이 아니라 계속 처음부터 다시 하는
것**이라는 점을 착각하기 쉽습니다.

`SurfaceFlinger::init()` 은 EGL 설정 실패에 `LOG_ALWAYS_FATAL` 을 겁니다.

**소프트웨어 렌더링 우회는 불가능합니다(실측).** "파이프 없이 일단 화면부터" 를
시도했고, 결과는 명확한 부정입니다:

1. 커널에 DRM + virtio-gpu + fbdev 에뮬레이션을 넣어 `/dev/dri/card0` 과
   `/dev/graphics/fb0` 을 만들었습니다. **화면 장치는 이제 있습니다.**
2. `qemu=1 qemu.gles=0` 으로 libEGL 이 소프트웨어 렌더러
   (`libGLES_android.so` = libagl)를 쓰게 했습니다.
3. 그런데도 SF 는 이렇게 죽습니다:

```
W SurfaceFlinger: no suitable EGLConfig found, trying a simpler query
F SurfaceFlinger: no suitable EGLConfig found, giving up
```

이유: Android 7 의 SurfaceFlinger 는 EGL 에 **ES2/ES3 렌더러블 config** 를 요구하는데
libagl 은 **OpenGL ES 1.1 전용**입니다. 이미지에 SwiftShader 도 없습니다
(`/lib/egl` 에는 `libEGL_emulation`, `libGLES_android`, `libGLESv1_CM_emulation`,
`libGLESv2_emulation` 뿐). 즉 **ES2 를 제공하는 소프트웨어 경로 자체가 존재하지
않습니다.** Android 6 부터 SF 의 비-GL 경로가 사라졌기 때문에 우회로도 없습니다.

따라서 남은 길은 하나뿐입니다 — `libEGL_emulation.so` 가 `/dev/qemu_pipe` 로 호스트
렌더러에 붙는 원래 설계. **goldfish pipe 전송로는 선택이 아니라 필수입니다.**
cmdline 도 `qemu.gles=1`(에뮬레이션 드라이버)로 되돌려 뒀습니다. 그래야 실패 지점이
"파이프 없음"으로 정직하게 나옵니다.

> ⚠ virtio-gpu 를 켤 때 함께 필요한 것: **`-global virtio-mmio.force-legacy=false`**.
> virtio-mmio 는 기본이 legacy 라 `VIRTIO_F_VERSION_1` 을 제시하지 않는데 virtio-gpu 는
> 그것을 요구합니다. 그러면 probe 가 실패하고, 5.10 의 실패 처리 경로가 초기화도 안 된
> modeset 을 정리하려다 **커널을 oops 시켜 init 을 죽입니다**:
> `virtio_gpu_probe -> drm_dev_put -> virtio_gpu_release -> virtio_gpu_modeset_fini`.
> 증상은 `Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b` 라
> 원인과 전혀 안 닮았으니 주의하세요.

### 7.3b goldfish pipe 전송로 — 게스트→호스트 방향 검증 완료

`qemu_pipe_link` 로 `/dev/qemu_pipe` 를 virtio-serial 포트에 걸고, CI 에서 호스트 소켓에
붙어 듣는 청취기(`guest/qemu_pipe/host_listener.py`)를 띄웠더니 이렇게 나왔습니다:

```
소켓 8개 발견: pipe0.sock ... pipe7.sock
[pipe0.sock] 연결됨
[pipe0.sock] *** 서비스 헤더: 'pipe:qemud:boot-properties' (27 바이트 수신) ***
[pipe0.sock] 게스트가 닫음 (총 35 바이트)
```

**게스트 안의 프로세스가 `/dev/qemu_pipe` 를 열고 서비스 이름을 썼고, 그 바이트가 호스트
유닉스 소켓까지 도달했습니다.** 추정이 아니라 실제 goldfish pipe 트래픽입니다. 이로써
확인된 것:

- 파이프 하나 = virtio-serial 포트 하나 매핑이 맞습니다. 프레이밍도 다중화 프로토콜도
  필요 없습니다.
- 호스트 절반(`libemugl_probe.so`)은 이미 이 헤더를 읽을 준비가 돼 있습니다.
- 앱이 포트를 8개 붙여둔 것이 곧 "동시 파이프 8개" 설계입니다.

또한 `qemu.gles=1` 로 libEGL 이 에뮬레이션 드라이버를 실제로 적재합니다:

```
D libEGL: Emulator has host GPU support, qemu.gles is set to 1.
D libEGL: loaded /system/lib/egl/libEGL_emulation.so
D libEGL: loaded /system/lib/egl/libGLESv1_CM_emulation.so
D libEGL: loaded /system/lib/egl/libGLESv2_emulation.so
```

(`libGLES_emulation.so` dlopen 실패는 정상입니다 — libEGL 이 통합 라이브러리를 먼저
찾아보고 없으면 분리된 것들을 씁니다.)

**남은 것: 동시 파이프.** `qemu_pipe_link` 는 심볼릭 링크라 포트가 하나뿐이고,
virtio_console 은 포트당 동시 접속이 하나입니다(두 번째 open 은 EBUSY). 위 로그에서
그 하나를 `qemu-props` 가 먼저 가져갔습니다. SurfaceFlinger 와 앱 프로세스들이 각자
파이프를 열어야 하므로, **open 마다 빈 포트를 배정하는 CUSE 데몬**이 필요합니다.
호스트 렌더러 없이도 CI 에서 검증 가능합니다 — 게스트에서 파이프를 여러 개 열어
서로 다른 서비스 이름을 쓰면, 청취기에 서로 다른 소켓으로 나타나야 합니다.

### 7.3c 장치 노드가 "있으면서 없는" 상태 — 대상 없는 심볼릭 링크

CUSE 데몬(`guest/qemu_pipe/qemu_piped.c`)은 정상적으로 떴고 커널과의 handshake 도
성공했습니다:

```
qemu_piped: found 8 virtio-serial ports, first=/dev/vport3p1
qemu_piped: CUSE_INIT ok (kernel 7.32, ours 7.26), device /dev/qemu_pipe
```

그런데 장치가 끝내 안 보였습니다. 같은 로그에 모순되는 두 줄이 있습니다:

```
qemu_piped: FAIL mknod /dev/qemu_pipe (507:0): File exists   ← 있다
init.wrapper: wd dev: /dev/qemu_pipe MISSING                 ← 없다
pipetest:    FAIL /dev/qemu_pipe never appeared after 60000ms
```

데몬 코드는 `stat()` 이 실패했을 때만 `mknod()` 를 부릅니다. 즉 `stat` 은 "없다",
`mknod` 은 "있다"고 답했습니다. **둘 다 참일 수 있는 경우는 하나뿐입니다 — `stat` 은
심볼릭 링크를 따라가고 `mknod` 은 따라가지 않으므로, 그 자리에 대상 없는 심볼릭
링크가 있었던 것입니다.** `access(F_OK)` 도 링크를 따라가므로 감시자와 `pipetest` 도
똑같이 "없다"고 봤습니다.

유력한 출처는 안드로이드 쪽 `init.*.rc` 의 goldfish 호환 링크입니다 — 같은 로그에서
`/dev/goldfish_pipe` 역시 MISSING 이고(우리 커널에는 goldfish 드라이버가 없습니다),
링크 대상이 바로 그것이면 앞뒤가 맞습니다. 조립 단계가 램디스크 `.rc` 를 grep 해서
`qemu_pipe|goldfish_pipe` 줄을 찍도록 했으니 다음 런에서 확정됩니다.

> 그 grep 옆에 있던 `mount_all / on fs` 항목이 계속 `(없음)` 이었던 것도 같이
> 고쳤습니다. 램디스크가 아니라 워크스페이스 최상위에서 `*.rc` 를 찾고 있었습니다 —
> 없던 게 아니라 안 보고 있었습니다.

**고친 방법: 자리를 원자적으로 뺏습니다.** 누가 링크를 걸었는지 캐는 대신,
임시 이름으로 노드를 만들고 `rename()` 으로 덮어씁니다. `rename` 은 심볼릭 링크든
낡은 노드든 조용히 대체하고, ueventd 가 같은 순간에 노드를 만들어도 경합이
없습니다(`stat` 후 `mknod` 사이의 틈이 사라집니다). 덧붙여 데몬은

- 무엇을 밀어냈는지 로그에 남기고(`이전: 심볼릭 링크 -> ... (대상 없음)`),
- 만든 뒤 실제로 `open()` 해 보고,
- 그 뒤로도 노드가 사라지는지 계속 지켜보다가 사라지면 다시 만듭니다.

마지막 항목은 아직 관측된 적 없는 실패 방식(만들어졌다가 제거됨)에 대비한 것입니다.

**확정된 결과** — 추정했던 출처가 그대로 맞았습니다:

```
qemu_piped: created /dev/qemu_pipe as 507:0
  (이전: 심볼릭 링크 -> /dev/goldfish_pipe (대상 없음) / 이후: 문자 장치 507:0 권한 0666)
```

안드로이드 ranchu init 이 goldfish 커널 드라이버를 전제로 링크를 걸어 두는데, 우리
커널에는 그 드라이버가 없습니다. 그래서 링크는 영영 대상을 얻지 못하고, 그 자리는
비어 있지도 차 있지도 않은 상태로 남습니다.

> 데몬이 노드를 만든 직후 스스로 `open()` 해보는 확인 절차가 있었는데 걷어냈습니다.
> 커널은 `CUSE_INIT` **응답을 처리하는 도중에** 이미 sysfs 에 장치를 올리므로 그 틈에
> 열면 `ENXIO` 가 납니다(실측: `FAIL open ...: No such device or address` — 노드는
> 멀쩡했고 아직 살아나기 전이었을 뿐입니다). 열리는지는 `pipetest` 가 확인합니다.

### 7.3d 동시 파이프 동작 확인 — 그리고 CI 의 한계선

같은 런에서 다중화가 실제로 됐습니다. 게스트가 파이프를 세 개 동시에 열고 서로 다른
이름을 썼고, 호스트에서 **서로 다른 소켓 세 개**로 각각 도착했습니다:

```
pipetest:    RESULT ok: 3/3 pipes opened concurrently
qemu_piped:  pipe 1 -> /dev/vport3p1 / pipe 2 -> /dev/vport3p2 / pipe 3 -> /dev/vport3p3

[pipe0.sock] *** 서비스 헤더: 'pipe:pipetest:one' ***
[pipe1.sock] *** 서비스 헤더: 'pipe:pipetest:two' ***
[pipe2.sock] *** 서비스 헤더: 'pipe:pipetest:three' ***
```

시험용만이 아니라 **실제 스택이 같은 장치를 씁니다.** 이어서 진짜 클라이언트들이
각자 포트를 받아갔습니다:

```
[pipe3.sock] *** 서비스 헤더: 'pipe:qemud:adb:5555' ***
[pipe4.sock] *** 서비스 헤더: 'pipe:qemud:boot-properties' ***
[pipe5.sock] *** 서비스 헤더: 'pipe:opengles' ***   ← SurfaceFlinger
[pipe5.sock] +4 바이트 (누적 18) / +20 바이트 (누적 38)
```

심볼릭 링크 방식이었다면 여기서 두 번째 open 이 `EBUSY` 로 끝났을 것입니다.

**SurfaceFlinger 는 더 이상 abort 하지 않습니다.** `signal 6` 도, `failed to open
framebuffer` 도 없습니다. 대신 이렇게 멈춰 있습니다:

```
ServiceManager: Waiting for service SurfaceFlinger...   (계속)
```

죽은 게 아니라 **기다리는 것**입니다 — `pipe:opengles` 로 handshake 를 보내 놓고 답을
기다립니다. CI 의 청취기(`host_listener.py`)는 바이트를 받아 적기만 할 뿐 렌더러가
아니라서 영원히 답하지 않습니다.

**여기가 CI 로 갈 수 있는 끝입니다.** 답해야 하는 쪽은 앱이 들고 있는 실제 AOSP
렌더러(`app/src/main/jniLibs/arm64-v8a/libemugl_host_android.so` — `emugl::RendererImpl`,
`GLESv2Decoder`, `ColorBuffer`, `RenderWindow` 가 들어 있습니다)이고, 그건 폰에서만
돕니다. 다음 검증은 폰에서 해야 합니다.

### 7.3e 폰 실측 — SurfaceFlinger 통과

폰에서 같은 이미지를 돌린 결과입니다. 장치 노드 교정은 폰에서도 글자 그대로 같았고
(같은 링크, 같은 major:minor), 그 뒤가 CI 와 갈립니다:

```
[3.403] qemu_piped: created /dev/qemu_pipe as 507:0
        (이전: 심볼릭 링크 -> /dev/goldfish_pipe (대상 없음) / 이후: 문자 장치 507:0 권한 0666)
[3.629] pipetest: RESULT ok: 3/3 pipes opened concurrently
[5.256] qemu_piped: pipe 4 -> /dev/vport3p4
[5.507] qemu_piped: pipe 5 -> /dev/vport3p5
[5.819] qemu_piped: pipe closed, /dev/vport3p4 freed
[6.618] qemu_piped: pipe 4 -> /dev/vport3p4        ← 닫았다 다시 엶
[6.936] qemu_piped: pipe 6 -> /dev/vport3p6
[6.997] init: Starting service 'bootanim'...
```

**`bootanim` 은 SurfaceFlinger 가 직접 띄웁니다** — `SurfaceFlinger::init()` 끝의
`startBootAnim()` 이 `ctl.start bootanim` 을 씁니다. 그 줄이 있다는 것은 init() 이
끝까지 갔다는 뜻이고, 따라서 그 앞의 EGL·gralloc 초기화가 성공했다는 뜻입니다.
로그에 `killed by signal 6` 도 `failed to open framebuffer` 도 없고, zygote·
audioserver·cameraserver 가 죽지 않고 살아 있습니다 — CI 가 무한 재시작하던 자리입니다.

CI 와의 결정적 차이는 **파이프가 닫혔다 다시 열린다**는 것입니다. CI 에서는
`pipe:opengles` 가 열린 채 영영 멈춰 있었습니다(답하는 쪽이 없으니까). 폰에서는 4번이
반납됐다 재사용되고 6번도 돌았습니다. 반대쪽이 실제로 응답하고 있다는 뜻입니다.

### 7.7 포트 여덟 개로는 모자랍니다

healthd 를 고친 뒤 부팅은 한 관문 더 갔다가 여기서 멈췄습니다:

```
ServiceManager: Waiting for service SurfaceFlinger...   (3분 35초 동안 계속)
```

그 구간 내내 `qemu_piped: pipe N -> ...` 가 **한 줄도** 없습니다. 아무도 파이프를 새로
열지 않는다는 뜻이라, SurfaceFlinger 가 죽고 재시도하는 모습은 아닙니다.

앞선 부팅(02:03)에서는 같은 이미지로 SurfaceFlinger 가 정상 등록됐습니다. 차이는
**부팅 속도** 하나였습니다:

| | 02:03 (성공) | 02:44 (멈춤) |
|---|---|---|
| `/data` | 비어 있음, dexopt 실행 | 이미 채워짐 |
| system_server 시작 | 56초 | **13.6초** |

느린 부팅에서는 파이프 사용자들이 시간축에 흩어지고, 빠른 부팅에서는 전부 겹칩니다.
그리고 세어 보면 여유가 정확히 0 입니다:

| 파이프 | 쓰는 쪽 |
|---|---|
| `qemud:boot-properties` | qemu-props |
| `qemud:adb:5555` | adbd |
| `opengles` | SurfaceFlinger |
| `opengles` | bootanimation |
| `opengles` | system_server |
| ×3 | `pipetest` (부팅 중 가장 붐비는 5초) |

여덟 개 중 여덟 개입니다. 게임 프로세스는 자리가 없습니다. 두 가지를 고쳤습니다:

- **`pipetest` 는 CI 에서만 돕니다.** 커널 커맨드라인에 `singlevm.pipetest=1` 이 있을
  때만 동작하고, CI 는 붙이고 앱은 붙이지 않습니다. 검증은 그대로 하면서 폰에서는
  포트를 하나도 쓰지 않습니다.
- **포트를 8 → 24 로 올렸습니다.** `GuestRunActivity.TRANSPORT_PIPE_COUNT` 와
  `guest-image.yml` 의 루프를 같이 고쳐야 합니다. `virtio-serial-device` 는 31개까지
  받으므로 24는 한계에서 떨어져 있고, 데몬의 `MAX_PIPES` 는 이미 32입니다.

> 이것이 원인이라고 확정된 것은 아닙니다. 그래서 같은 라운드에 감시자가
> `wd ... watch surfaceflinger ... pipes=N` 을, 데몬이 `pipe N: host replied` 를
> 찍도록 넣었습니다(7.5). 다음 로그는 "죽었나 멈췄나"와 "호스트가 답하나"를 직접
> 말해 줍니다.

### 7.8 멈춘 것은 SurfaceFlinger 가 아니라 우리 데몬이었습니다

감시자를 넣은 다음 라운드에서 답이 나왔습니다:

```
init.wrapper: wd t=20s  watch p147 surfaceflinger S w=fuse_simple_request s=0 pipes=2
init.wrapper: wd t=40s  watch p147 surfaceflinger S w=fuse_simple_request s=0 pipes=2
init.wrapper: wd t=100s watch p147 surfaceflinger S w=fuse_simple_request s=0 pipes=2
```

PID 가 100초 동안 그대로입니다 — **죽고 재시작하는 것이 아니라 멈춰 있습니다.** 그리고
멈춘 자리가 `fuse_simple_request` 인데, 그건 커널 FUSE 클라이언트가 **유저스페이스
데몬의 응답을 기다리는** 함수입니다. 호스트 렌더러가 아니라 `qemu_piped` 가 답을 안
하고 있었습니다. 파이프는 두 개 쥐었고, `host replied` 는 한 번도 안 나왔습니다.

데몬 쪽 잘못이 둘이었습니다.

**(a) 읽기가 쓰기를 막습니다.** 파이프당 워커 하나에 FIFO 큐 하나였습니다. 호스트가
아직 보낼 것이 없으면 `read` 가 블록되고, 그 뒤에 들어온 `write` 는 영영 차례가 오지
않습니다. 진짜 goldfish pipe 는 같은 파이프에 읽기와 쓰기가 동시에 되고 emugl 도
그렇게 씁니다. 이제 파이프마다 읽기 워커와 쓰기 워커를 따로 둡니다.

**(b) 블로킹 fd 라 멈추면 아무 말도 못 합니다.** `virtio_console` 은 호스트가 그
포트에 붙어 있지 않으면 `write` 를 무한정 재웁니다. 호스트가 안 붙은 것과 붙었는데
조용한 것은 원인이 정반대인데 둘 다 똑같이 조용했습니다. 이제 포트를 `O_NONBLOCK` 으로
열고 `poll` 로 기다리며, 5초 넘게 못 나가면 어느 쪽인지 적습니다:

```
pipe 3: write 가 5초째 대기 중 (호스트가 이 포트에 붙어 있지 않다)
pipe 3: read 가 5초째 대기 중 (호스트가 조용하다)
```

파이프를 나눠주는 순간에도 `POLLOUT` 을 한 번 봐서 기록합니다 —
`pipe 3 -> /dev/vport3p3 (호스트 연결됨)` 인지 `(호스트 연결 안 됨)` 인지.
`virtio_console` 이 `host_connected` 일 때만 `POLLOUT` 을 주기 때문에 이것이
"앱이 이 소켓에 실제로 붙었는가"에 대한 정확한 답입니다.

### 7.9 호스트가 받기만 하고 답하지 않습니다

논블로킹으로 바꾼 뒤 폰 로그가 어느 쪽인지 말해줬습니다:

```
qemu_piped: pipe 2: read 가 5초째 대기 중 (호스트가 조용하다)
qemu_piped: pipe 3: read 가 60초째 대기 중 (호스트가 조용하다)
```

**`write` 가 막혔다는 줄은 한 줄도 없습니다.** 정리하면:

| | 상태 |
|---|---|
| 호스트 소켓 연결 | ✅ 붙어 있음 (`POLLOUT` 통과) |
| 게스트 → 호스트 쓰기 | ✅ 나감 |
| 호스트 → 게스트 응답 | ❌ 60초 넘게 한 바이트도 없음 |

게스트 절반은 제 몫을 다 합니다. 답해야 하는 쪽은 앱이 들고 있는 렌더러입니다.

**확인해서 지운 가설들** (같은 자리를 다시 파지 않기 위해):

- *앱이 백그라운드였다* — 아닙니다. 계속 앱 화면이었습니다.
- *서피스가 아직 없어서 렌더러가 못 답한다* — 아닙니다. `GuestRunActivity.surfaceCreated()`
  가 `nativeAttachEmuglSurface()` 를 먼저 부르고 **그 다음에** QEMU 를 띄웁니다.
- *포트가 모자라 SurfaceFlinger 가 파이프를 못 얻었다* — 아닙니다. 파이프는 두 개
  받았고(`pipes=2`) 포트도 24개로 늘렸습니다.
- *데몬의 읽기가 쓰기를 막는다* — 실제 버그였고 고쳤지만(7.8-a), 이 증상의 원인은
  아니었습니다. 지금 막힌 것은 뒤에 밀린 쓰기가 아니라 답이 없는 읽기입니다.

**다음에 봐야 할 것.** `nativeStartEmuglBridge` 가 돌려주는 상태 문자열은 앱 화면
로그에만 나오고 `qemu-modern.log` 에는 안 남습니다. 그리고 CI 청취기가 이제 받은
바이트를 16진수로 찍으므로, emugl 이 헤더 뒤에 정확히 무엇을 보내는지 다음 런에서
확인할 수 있습니다.

### 7.10 게스트는 결백합니다 — 세 번의 쓰기가 전부 나갑니다

7.9 의 "다음에 봐야 할 것" 이 답을 냈습니다. CI 청취기의 16진수 출력입니다:

```
[pipe5.sock] *** 서비스 헤더: 'pipe:opengles' (14 바이트 수신) ***
[pipe5.sock] +4 바이트  (누적 18) hex[00 00 00 00] ascii[....]
[pipe5.sock] +20 바이트 (누적 38) hex[13 27 00 00 14 00 00 00 03 1f 00 00 00 00 00 00 00 00 00 00]
```

세 번의 쓰기가 **전부** 호스트 소켓에 도착합니다. 논블로킹 데몬이 두 번째 쓰기를
흘리는 게 아니냐는 의심(파이프 하나에 두 번 쓰는 것은 pipetest 가 한 번도 확인해 준
적이 없었습니다)은 이걸로 지워집니다. 바이트도 정확합니다:

| 값 | 뜻 |
|---|---|
| `00 00 00 00` | HostConnection 이 보내는 4바이트 `clientFlags` |
| `0x2713` = 10003 | renderControl `rcGetGLString` |
| `0x14` = 20 | 이 패킷의 길이 |
| `0x1f03` = 7939 | `GL_EXTENSIONS` |

즉 게스트는 규격대로 `rcGetGLString(GL_EXTENSIONS)` 를 묻고 답을 기다립니다.
**게스트 절반은 여기서 끝났습니다.** 남은 것은 소켓 이쪽 편, 앱 안입니다.

#### 프리빌트 브리지를 뜯어봤습니다

`libemugl_probe.so` 는 소스가 없지만(README "세대 C") 스트링과 역어셈블로 구조가
전부 드러납니다. 확인한 것:

- `nativeStartEmuglBridge(path, primary)` 는 소켓마다 **스레드를 하나 띄우고 즉시
  돌아옵니다.** 화면에 찍히던 `emugl bridge starting: ...` 는 그 반환값이므로,
  **연결됐다는 뜻이 전혀 아닙니다.** 24줄이 다 찍혀도 아무것도 증명하지 못합니다.
- 두 번째 인자(`pipeIndex == 0`)는 전역 세대 카운터를 1 올릴지(`primary`) 그냥
  읽을지를 고릅니다. 각 스레드는 자기 세대를 들고 루프마다 대조해서, 다음 실행이
  시작되면 스스로 빠집니다. 자바가 0번부터 순서대로 부르므로 동작은 맞습니다.
- 스레드 본체: `connect()` 재시도 → `emugl_pipe_open()` → `poll(POLLIN, 5ms)` →
  `recv(65536)` → `emugl_pipe_send()` → 반대 방향은 `emugl_pipe_recv()` → `send()`.
- 헤더를 떼지 않고 **받은 바이트를 그대로 넘깁니다.** 그게 맞습니다.
  `libemugl_host_android.so` 의 `emugl_pipe_send` 가 상태 0 에서 NUL 까지를 모아
  문자열로 쌓고, `"pipe:opengles\0"` **14바이트(NUL 포함)** 와 비교합니다.
  게스트가 보내는 것과 정확히 일치합니다.

**즉 프로토콜은 양쪽 다 맞습니다.** 정적으로 더 좁힐 수 있는 곳이 없습니다.

#### 한 번도 읽지 않은 로그가 있었습니다

브리지는 자기가 옮기는 바이트를 전부 기록하고 있었습니다. 태그는
`SingleVmGlesBridge`:

```
%s connected
%s guest->renderer transfer=%u bytes=%zd total=%llu hex=%s
%s renderer->guest transfer=%u bytes=%d total=%llu hex=%s
%s disconnected guestBytes=%llu rendererBytes=%llu
renderer pipe creation failed / pipe API lookup failed
socket poll ended revents=0x%x / socket recv ended result=%zd errno=%d
renderer send failed result=%d offset=%zu size=%zd
```

브리지는 앱 안에서 돌기 때문에 이 줄들은 **logcat** 으로 갑니다. 폰에는 adb 가
없고 화면 로그에는 QEMU 시리얼만 흐르고 있었으니, 지금까지 아무도 이걸 본 적이
없습니다. 앱이 **자기 UID 의 로그**를 읽는 데에는 권한이 필요 없으므로,
`GuestRunActivity` 가 QEMU 를 띄우기 직전에 `logcat` 을 붙여서 화면과
`gles-bridge.log` 양쪽에 남기도록 했습니다.

#### 다음 폰 실행이 셋 중 하나로 갈립니다

| logcat 에 보이는 것 | 뜻 | 다음에 볼 곳 |
|---|---|---|
| `connected` 만 있고 `guest->renderer` 가 없다 | 바이트가 게스트를 떠났는데 앱에 안 온다 | QEMU chardev / 소켓 배선 |
| `guest->renderer ... hex=pipe:opengles` 는 있는데 `renderer->guest` 가 없다 | 렌더러가 받고도 안 답한다 | `libemugl_host_android` 렌더 스레드 |
| `renderer pipe creation failed` 또는 `pipe API lookup failed` | 렌더러가 준비 안 됐다 | `nativeProbeEmugl` 과 브리지 사이의 상태 |

### 7.11 막고 있던 것은 opengles 가 아니라 grallocPipe 였습니다

앱의 logcat 을 화면에 끌어오자 한 번에 드러났습니다. **emugl 파이프는 처음부터
멀쩡했습니다.** 핸드셰이크가 끝까지 갑니다:

```
pipe0.sock guest->renderer transfer=1 bytes=14 hex=70 69 70 65 3a 6f 70 65 6e 67 6c 65 73 00
pipe0.sock renderer->guest transfer=1 bytes=4  hex=c5 ff ff ff        (-59: 버퍼가 이만큼 필요하다)
pipe0.sock renderer->guest transfer=2 bytes=63 hex=GL_OES_vertex_array_object ANDROID_EMU_...
pipe0.sock EGL configs result=68 count=68 attrs=35 rgba8888=24 rgbx8888=16 rgb565=12 window=68
pipe0.sock renderer->guest transfer=28 bytes=20 hex=41 64 72 65 6e 6f 20 28 54 4d 29 20 38 34 30 00   ("Adreno (TM) 840")
```

렌더컨트롤 순서를 그대로 따라가면 rcGetRendererVersion → rcGetEGLVersion →
rcGetNumConfigs(68개) → rcGetConfigs → rcGetFBParam(480×800 — 커맨드라인의
`xres=480,yres=800` 과 일치) → rcCreateContext → rcCreateWindowSurface →
rcCreateColorBuffer → rcMakeCurrent → GLESv2 명령 몇 개 → rcCloseColorBuffer.
**SurfaceFlinger 는 GL 을 이미 쓰고 있었습니다.**

그 직후에 멈춥니다. 이유는 다른 파이프입니다:

```
pipe2.sock first guest packet bytes=17 preview=pipe:grallocPipe.
renderer send failed result=-1 offset=0 size=17
pipe2.sock disconnected guestBytes=17 rendererBytes=0
pipe2.sock connected
pipe2.sock first guest packet bytes=4 preview=d...    hex=64 00 00 00
renderer send failed result=-1 offset=0 size=4
```

`pipe:qemud:adb:5555` 도 같은 식으로 거절당합니다.

#### 왜 거절되는가

`libemugl_probe.so` 의 문자열 테이블에 서비스 표가 그대로 들어 있습니다 —
`pipe:qemud:boot-properties`, `pipe:qemud:sensors`, `pipe:qemud:camera` 세 개의
qemud 핸들러(`%s serving qemud camera`, `%s boot-properties list response=%d` 도
같이 있습니다)와, **나머지 전부를 넘겨받는 emugl**. 그런데 넘겨받는 쪽
(`libemugl_host_android.so` 의 `emugl_pipe_send`)은 7.10 에서 확인한 대로 헤더가
정확히 `"pipe:opengles\0"` 일 때만 받아들이고 그 외에는 -1 을 돌려줍니다.

그래서 브리지는 소켓을 끊고 다시 붙을 뿐이고, **게스트에게는 아무 답도 가지
않습니다.** gralloc 은 답을 기다리며 멈추고, SurfaceFlinger 가 그 뒤에서 함께
멈춥니다. 데몬이 계속 말하던 "호스트가 조용하다" 는 정확한 보고였습니다 —
조용한 파이프가 opengles 가 아니었을 뿐입니다.

#### 없는 것은 없다고 말합니다

진짜 goldfish 호스트라면 등록되지 않은 서비스에 대해 **헤더 쓰기 자체가
실패하고**, 게스트의 `qemu_pipe_open()` 이 -1 을 받습니다. 그걸 그대로
흉내냅니다. `qemu_piped` 가 첫 쓰기를 들여다보고, 호스트가 답할 수 없는
서비스면 `-EINVAL` 로 거절합니다. 영영 기다리게 두는 것보다 낫고, 포트도
돌려받습니다.

허용 목록은 위 네 가지입니다(`pipetest:*` 는 CI 전용이라 예외).
`grallocPipe` 와 `qemud:adb` 는 거절됩니다. 둘 다 부팅에 필수가 아닙니다 —
gralloc 의 실제 작업인 컬러버퍼 생성/해제는 **opengles** 연결로 나가고, 그건
위에서 보듯 잘 돌고 있습니다.

#### grallocPipe 가 무엇인지 확인했습니다

AOSP 이력을 보면 이 파이프는 나중에 **`GLProcessPipe` 로 이름이 바뀝니다.**
하는 일은 이름 그대로 프로세스 단위 정리입니다 — 게스트가 자기 pid 를 써 보내고
호스트가 돌려주는 고유 id 를 읽어서, 그 프로세스가 죽을 때 호스트가 그 프로세스의
컬러버퍼와 EGLImage 를 청소할 수 있게 합니다. (pid 를 쓰고 답을 **읽는다** 는 점이
로그의 `64 00 00 00` 뒤에 읽기로 멈춰 있던 것과 정확히 맞습니다.)

즉 렌더링 경로가 아니라 **가계부**입니다. 없으면 죽은 프로세스의 호스트 자원이
정리되지 않고 남을 뿐, 그리는 데는 지장이 없습니다. 부팅에는 문제가 없습니다.

거절이 gralloc 에게도 괜찮은지는 다음 실행이 말해 줍니다. 견디면 SurfaceFlinger
가 지나가고, 못 견디면 이번엔 **소리를 내며** 실패하므로 무엇을 구현해야 할지
알게 됩니다. 어느 쪽이든 조용한 정지보다 낫습니다.

#### 덤: 로그가 이제 서비스 이름을 말합니다

`pipe 2` 가 어느 서비스였는지 알아내려고 타임스탬프를 맞춰 보는 짓을 더는 하지
않아도 됩니다. 파이프를 열 때와 닫을 때 서비스 이름을 함께 찍습니다.

### 7.12 임포터가 SDK 원본 ZIP 을 조용히 받아들였습니다

7.11 의 수정을 폰에서 확인하려 했는데, 그 실행은 **수정에 닿지도 못했습니다.**
게스트가 시리얼 한 줄 없이 3.7초 만에 죽었습니다. 앱의 부팅 전 점검이 찍은
크기를 CI 가 만든 것과 나란히 놓으면 이유가 바로 보입니다:

| | CI 아티팩트 | 폰에 올라가 있던 것 |
|---|---|---|
| kernel | 15.1 MB | **2.7 MB** |
| ramdisk.img | 1.6 MB | **1.2 MB** |
| system.img | 1.8 GB | 1.8 GB |
| cache.img | 256.0 MB | **없음** |
| userdata.img | 2.0 GB | **550.0 MB** |

구글 SDK 의 system-image ZIP 입니다. `MainActivity.importAndroid7Bundle()` 이
커널을 `kernel-ranchu` → `kernel-qemu` → `kernel` 순서로 찾기 때문에, SDK ZIP 의
`kernel-qemu`(goldfish 커널, 2.7 MB)를 **우리 커널 자리에 덮어쓰고** "가져오기
완료"를 띄웁니다. `cache.img` 와 `userdata.img` 는 없어도 되는 항목이라 조용히
건너뜁니다.

그 커널은 `-machine virt` 에서 아무것도 못 합니다 — `CONFIG_SERIAL_AMBA_PL011` 이
없어서 `earlycon` 으로도 한 글자 안 나옵니다(앱이 찍은 경고가 정확했습니다). 게다가
cmdline 이 요구하는 `rdinit=/init.wrapper` 가 스톡 램디스크에는 없습니다.

**그런데 `inspect()` 는 "부팅 준비 완료"라고 답했습니다.** `cache.img` 없음은 그
아래에 경고로만 적혔습니다. 폰만 쓰는 상황에서 잘못된 이미지 한 번은 왕복 한
번입니다. 부팅 전에 말해 주는 편이 쌉니다.

#### 표식을 붙였습니다

CI 가 아티팩트에 `guest-image.prop` 을 넣습니다 — 런 id, 커밋, 빌드 시각,
다섯 파일의 크기.

- 임포터는 이 파일을 같이 심습니다. 없으면 **"이 ZIP 은 이 앱의 게스트 이미지가
  아닙니다"** 라고 말합니다. 이전 임포트의 표식이 남아 새 이미지를 우리 빌드로
  둔갑시키지 않도록, 표식이 없는 ZIP 을 넣으면 기존 표식을 지웁니다.
- 부팅 전 점검은 표식이 없으면 **준비 필요**로 떨어집니다. 있으면 어느 빌드가
  올라가 있는지(`build <런 id> / <커밋 7자>`) 화면에 찍습니다. 폰에 무엇이
  들어가 있는지 묻지 않고도 알 수 있습니다.

커널 cmdline 이 `rdinit=/init.wrapper` 를 요구하는 한, 우리 램디스크가 아니면
어떤 조합도 부팅하지 않습니다. 그러니 이 거절은 보수적인 게 아니라 정확합니다.

### 7.6 healthd 를 껐던 것이 부팅을 막고 있었습니다

그래픽이 전부 붙은 뒤에도 화면은 검은 채였습니다. 폰 로그를 끝까지 받아 보니 이유가
그래픽과 무관했습니다:

```
FATAL EXCEPTION IN SYSTEM PROCESS: main
java.lang.RuntimeException: Failed to start service
  com.android.server.BatteryService: onStart threw an exception
Caused by: java.lang.NullPointerException: Attempt to invoke interface method
  'void android.os.IBatteryPropertiesRegistrar.registerListener(...)'
  on a null object reference
    at com.android.server.BatteryService.onStart(BatteryService.java:191)
...
Zygote: Exit zygote because system server (1059) has terminated
```

`system_server` 가 죽으면 zygote 가 따라 죽고 init 이 전부 다시 시작합니다. 실측으로
60초쯤마다 반복했고, WindowManager·SystemUI·런처는 시작조차 못 하므로 화면은 영원히
검습니다. **부팅이 끝나지 않는 것이지 그리지 못하는 것이 아니었습니다.**

`IBatteryPropertiesRegistrar` 를 등록하는 것은 **healthd** 인데, 조립 단계가 healthd
서비스 블록을 통째로 주석 처리하고 있었습니다. 당시 근거는 이랬습니다:

> healthd 는 `-machine virt` 에서 abort 한다. 배터리 UI 라 게임 구동에는 필요 없으므로
> 서비스 자체를 끈다.

앞 문장은 관측이었고 뒷 문장이 틀린 추론이었습니다. `BatteryService` 는 배터리 UI 가
아니라 `SystemServer.startCoreServices()` 가 조건 없이 띄우는 코어 서비스입니다.
배터리를 포기한 것이 아니라 부팅을 포기한 셈이었습니다.

**abort 하던 시점이 중요합니다.** healthd 를 끈 것은 바인더 32비트 ABI 를 고치기
전(7.2)이고, 그때는 servicemanager 조차
`Binder driver protocol does not match user space protocol!` 로 죽고 있었습니다.
healthd 도 바인더로 서비스를 등록하므로 같은 이유로 죽었을 가능성이 큽니다. 그래서
지금은 다시 켭니다.

다만 `critical` 플래그는 뗍니다 — critical 서비스가 4분 안에 4번 죽으면 init 이
recovery 로 리부트해서, 만약 아직도 abort 한다면 그 이유를 볼 수가 없습니다.

> 교훈으로 남길 것: **"이 기능은 필요 없다"와 "이 서비스는 없어도 된다"는 다른
> 말입니다.** 그리고 어떤 것을 껐다면, 그것이 죽던 원인을 나중에 고쳤을 때 다시
> 켜 봐야 합니다. 이 건은 그 사이 열 몇 번의 부팅 동안 조용히 유효했습니다.

### 7.4 치명적이지 않은 잡음 (무시해도 됨)

부팅 로그에 계속 나오지만 진행을 막지 않는 것들입니다. 여기에 시간을 쓰지 마세요.

- `cgroup: Unknown subsys name 'schedtune'` — `SCHED_TUNE` 은 5.10 에서 uclamp 로
  대체되며 삭제됐습니다. `--enable` 해도 조용히 무시됩니다.
- `memtrack` / `radio.primary` / `sound_trigger.primary` / `audio.primary` 로드 실패
  — 해당 HAL 이 이미지에 없습니다.
- `avc: denied ... permissive=1` — permissive 라 차단이 아니라 기록만 된 것입니다.
- `Permission ... not defined in policy` — 5.10 이 정의하는 권한을 Android 7 정책이
  모를 뿐입니다.

### 7.5 진단 도구

추측을 반복하지 않기 위해 게스트 안에 넣어둔 것들입니다.

- **감시자(watchdog)**: `init.wrapper` 가 `/init` 으로 exec 하기 직전 fork 해서 남기는
  프로세스. exec 전에 열어둔 `/dev/kmsg` fd 를 그대로 들고 있어(안드로이드 init 이
  `/dev` 에 tmpfs 를 새로 덮어도 이미 열린 fd 는 유효합니다) 5초마다 마운트 상태,
  블록 장치, PID 1 의 wchan/syscall, 그래픽·바인더 장치 유무를 찍습니다.
  **콘솔이 조용해졌을 때 "멈춘 것"과 "로그를 안 내는 것"을 구분할 방법이 이것뿐입니다.**
- **`printk.devkmsg=on`**: 커널은 유저스페이스의 `/dev/kmsg` 쓰기를 기본값으로 속도
  제한합니다. init 과 fs_mgr 이 바로 이 경로로 로그를 냅니다. 이걸 켜기 전까지
  fs_mgr 의 마운트 실패 이유가 콘솔에 **한 번도** 나오지 않았습니다.
- **`seriallogcat`**: ueventd 이후 안드로이드는 logcat 으로만 로그를 남깁니다.
  조립 단계에서 init.rc 에 logcat 을 콘솔로 흘리는 서비스를 심습니다.

### 7.13 부팅은 끝났는데 화면이 검은 이유 — 폰의 EGL 확장 목록이 게스트로 샜습니다

grallocPipe 거절(7.11) 뒤의 첫 폰 실행에서 게스트가 끝까지 부팅했습니다: 부팅
애니메이션이 프레임을 그리고, PackageManager 가 70개 패키지를 훑고, system_server 가
boot phase 500 까지 올라오고, 설정이 `w800dp h480dp … land` 입니다. 그런데 실행
화면은 검은 채였습니다.

logcat 에 같은 줄이 부팅 애니메이션 내내 **80ms 마다** 찍혀 있었습니다:

```
E GLConsumer: [BootAnimation] syncForReleaseLocked: error creating EGL fence: 0x3004
```

0x3004 는 EGL_BAD_ATTRIBUTE 입니다. 게스트 EGL(libEGL_emulation, Android 7) 의
`eglCreateSyncKHR` 은 호스트가 `ANDROID_EMU_native_sync` 를 광고하지 않으면
`EGL_SYNC_NATIVE_FENCE_ANDROID` 타입을 정확히 그 오류로 거절합니다. 그리고
`GLConsumer::updateAndReleaseLocked` 는 그 실패를 "방금 받은 프레임을 버린다" 로
처리합니다. 즉 SurfaceFlinger 의 모든 레이어가 **첫 프레임에서 멈춥니다**. 부팅
애니메이션의 첫 프레임은 검은색이므로 화면이 검게 보인 것입니다. 렌더러가 프레임을
올리지 않은 게 아니라, SF 가 올릴 새 프레임을 끝내 받지 못한 것입니다.

왜 SF 가 그 타입을 쓰려 했는가. libgui 의 SyncFeatures 는 EGL 확장 문자열에
`EGL_ANDROID_native_fence_sync` 가 있으면 그것을 씁니다. 게스트 EGL 은 자기 고정
목록에 호스트가 `rcQueryEGLString(EGL_EXTENSIONS)` 로 알려 준 목록을 그대로 이어
붙이는데, 진짜 에뮬레이터라면 그게 호스트 EGL 번역기의 짧은 고정 목록입니다. 이
앱의 렌더러는 그 질문을 폰의 진짜 libEGL 에 넘기므로 폰 GPU 드라이버의 1,247 글자
목록이 게스트로 흘러듭니다 — 브리지 로그의 응답이 `EGL_ANDROID_front_buffer_auto_refresh
EGL_ANDROID_native_fence_sync …` 로 시작하는 것이 그 증거입니다. 같은 경로로
`EGL_KHR_partial_update` / `EGL_EXT_buffer_age` 도 새는데, 이건 hwui 가
`eglSetDamageRegionKHR` 를 부르게 만들고 실패하면 LOG_ALWAYS_FATAL 이라 앱마다
RenderThread 가 죽었을 것입니다.

고친 자리는 `qemu_piped` 입니다(렌더러와 브리지는 소스가 없습니다). 데몬이
opengles 파이프의 게스트→호스트 스트림을 명령 단위로 따라가다
`rcQueryEGLString(EGL_EXTENSIONS, buffer, size)` 를 보면, 그 응답 `size` 바이트를
에뮬레이터 호스트가 줄 법한 목록(`EGL_KHR_image_base EGL_KHR_gl_texture_2D_image
EGL_ANDROID_recordable …`)으로 **길이를 지킨 채** 바꿔 씁니다. 길이를 지키는 이유는
두 가지입니다: 게스트가 먼저 길이를 물어 그만큼 읽고, 파이프 체크섬(v1)이 내용이
아닌 길이로 계산되기 때문입니다. 남는 자리는 공백이고, 게스트는 strstr 로 이름을
찾을 뿐이라 무해합니다.

이름이 사라지면 SF 는 게스트 자체 목록의 `EGL_KHR_fence_sync` 로 내려가고, 게스트
EGL 은 그 타입을 `eglWaitClient()`(glFinish) 로 흉내 내 즉시 신호된 sync 를 돌려
줍니다. 프레임마다 호스트 왕복이 하나 늘지만 동작합니다.

같은 종류의 누출이 GL 쪽(`rcGetGLString(GL_EXTENSIONS)`, 폰의 GLES 확장 목록)에도
있을 수 있습니다. 게임이 돌기 시작하면 그쪽도 봐야 합니다.

### 7.14 포트를 다시 쓰면 렌더러가 죽습니다 — 닫힌 포트의 호스트 소켓은 살아 있습니다

같은 로그의 두 번째 문제입니다. system_server 가 AssetAtlas 를 올리고 파이프 11 을
닫은 뒤 370 ms 만에 다시 열자, 호스트에서 곧바로 이것이 찍히고 그 파이프는 영영 답을
못 받았습니다:

```
qemu_piped: pipe 11 [opengles] closed, /dev/vport3p11 freed (보냄 1339369 ...)
qemu_piped: pipe 11: 서비스 'opengles'
W/libc: malloc(18446744072818318950) failed: returning null pointer
qemu_piped: pipe 11: read 가 5초째 대기 중 (호스트가 조용하다)
```

게스트가 virtio-serial 포트를 닫아도 QEMU 는 그 포트의 호스트 소켓 연결을 끊지
않습니다. 소켓에 붙어 있는 브리지는 처음 받은 `pipe:<서비스>` 헤더로 모드를 정하고,
opengles 였다면 이후 바이트를 모두 렌더러에 넘깁니다. 새 프로세스의 `pipe:opengles\0`
헤더가 그 스트림의 "명령" 으로 들어가고, 렌더러의 ReadBuffer 는 `"pipe"` 네 글자를 명령
길이로 읽어 2 GB 가 넘는 버퍼를 잡으려다 실패(그 malloc 이 바로 위 줄)하고 렌더 스레드가
빠져나갑니다. 채널은 열린 채라 브리지는 끊김을 모르고, 게스트는 답을 기다립니다. 진짜
goldfish 호스트에서는 파이프의 열기/닫기가 그대로 보이므로 이런 일이 없습니다.

고친 자리는 양쪽입니다.

- **앱(QmpClient.java)**: QEMU 에 `-qmp` 모니터를 붙이고 포트마다 `id=singlevmportN` 을
  줍니다. 게스트가 포트를 닫으면 QEMU 가 `VSERPORT_CHANGE` 를 보내고, 앱은
  `chardev-change` 로 그 포트의 chardev 를 같은 경로의 새 소켓 서버로 바꿉니다. QEMU 가
  옛 소켓을 닫으므로 브리지는 끊김을 보고 다시 붙고(실측: `disconnected` 직후
  `connected`), 렌더러 파이프도 새로 열립니다. 이전 프로세스의 렌더 스레드는 그때 함께
  정리됩니다. `chardev-change` 는 포트의 백엔드가 켜져 있을 때(게스트 드라이버가
  DRIVER_OK 를 쓴 뒤)만 받아들여지므로, 게스트 없이 띄운 QEMU 에서는 "Chardev user does
  not support chardev hotswap" 으로 거절됩니다 — CI 는 실제 부팅 중에 시험합니다
  (`qmp_portswap.py`).
- **게스트(qemu_piped)**: 빈 포트 중 가장 오래전에 닫힌 것을 고르고, 방금 닫힌 포트를
  다시 써야 하면 첫 write 를 1 초 미룹니다. 교체가 끝나기 전에 새 헤더가 옛 연결로 새어
  나가지 않게 하기 위해서입니다.

### 7.15 런처가 영영 안 뜨는 이유 — system_server 가 60 초마다 죽습니다

7.13·7.14 를 고친 뒤 렌더러는 프레임을 받지만 전부 검은색입니다(`nonBlack=0`). 폰 로그를
보면 부팅 약 60 초 뒤에 system_server 가 죽고 zygote 가 다시 뜨기를 반복합니다:

```
W AlarmManager: Failed to open alarm driver. Falling back to a handler.
...
E AndroidRuntime: *** FATAL EXCEPTION IN SYSTEM PROCESS: main
E AndroidRuntime: java.lang.NullPointerException: Attempt to invoke virtual method
   'void android.app.PendingIntent.send()' on a null object reference
E AndroidRuntime:   at com.android.server.AlarmManagerService$AlarmHandler.handleMessage(AlarmManagerService.java:2616)
```

Android 7 의 AlarmManagerService 는 `/dev/alarm`(옛 안드로이드 알람 드라이버, 5.10 에는
없음)을 못 열면 `timerfd_create(CLOCK_REALTIME_ALARM / CLOCK_BOOTTIME_ALARM)` 로 넘어가고,
그것도 실패하면 자바 핸들러로 폴백합니다. 핸들러 경로는 `operation == null` 인 리스너
알람을 처리하지 못하는 버그가 있어, 첫 리스너 알람(약 60 초 뒤)에서 NPE 로 죽습니다.
system_server 가 죽으면 런처도 함께 사라지므로 화면은 계속 검습니다.

timerfd 쪽이 왜 실패하는지가 남은 질문입니다. 커널(5.10 `fs/timerfd.c`)은 그 두 clockid 에
`CAP_WAKE_ALARM`(비트 35) 을 요구하고 없으면 `EPERM` 을 줍니다. 로그에는 zygote 의
preload 중에 커널 경고 ``capability: warning: `main' uses 32-bit capabilities`` 가 한 번
나옵니다 — 32 비트(v1) capset 은 상위 32 비트 능력을 모두 지우지만, capget 도 같은 경고를
내므로 이것만으로는 단정할 수 없습니다. 앱의 60 초 진단 명령이 init/zygote/system_server
의 `/proc/<pid>/status` Cap 줄과 `/dev/alarm`, `/dev/rtc0` 을 콘솔로 찍도록 했습니다
(`VM_DIAG_CAPS_BEGIN` … `END`). `CapEff` 에 비트 35 가 없으면 능력 문제, 있으면 다른 원인입니다.

고치는 길은 두 가지였습니다. (1) 능력이 사라진 자리를 찾아 되돌린다. (2) 이 게스트 전용
커널에서 timerfd 의 `CAP_WAKE_ALARM` 요구를 지운다. 사용자 승인으로 (2)를 택했습니다:
`build-kernel.sh` 가 `fs/timerfd.c` 의 `!capable(CAP_WAKE_ALARM)` 두 자리(timerfd_create,
timerfd_settime)를 거짓으로 바꾸고, 치환이 안 먹으면 빌드를 멈춥니다. 한 사람이 혼자 쓰는
VM 이라 깨우기 알람을 누구나 만들 수 있어도 잃을 것이 없습니다. 게스트 이미지의
`kernel-config.txt` 에 "timerfd CAP_WAKE_ALARM 패치 자리 수: 2" 가 남습니다.

### 7.16 게스트는 그리는데 화면이 검은 이유 — 렌더러의 비동기 readback 이 0 만 돌려줍니다

7.15 뒤 게스트 부팅은 끝까지 가는데(`Boot is finished`, 키가드 표시) 렌더러의 post 콜백은
1700 프레임 넘게 `nonBlack=0` 이었습니다. 렌더러(`libemugl_host_android.so`,
`FrameBuffer::postImpl`)는 post 콜백이 있으면 `m_asyncReadbackSupported` 에 따라 두 경로 중
하나로 픽셀을 받습니다. Adreno 840 은 "Async readback supported" 로 판정돼
`ReadbackWorker` 경로(다른 스레드·컨텍스트에서 PBO 를 `glMapBufferRange`)를 탔고, 그 결과가
전부 0 이었습니다. `0x108320` 의 분기 하나를 무조건 점프로 바꿔 동기 경로
(`ColorBuffer::readback` → 같은 스레드 `glReadPixels`)만 타게 하자(README 의 세 번째 패치)
폰 실측으로 SystemUI 가 뜨는 시점부터 `sampledRgb=940346 nonBlack=3520` 이 나왔습니다.
합성(SurfaceFlinger → 컬러버퍼 blit)은 정상이었고, 문제는 readback 뿐이었습니다.

남은 것: 부팅 애니메이션(GLES1 로 그린다) 구간은 여전히 검습니다. 부팅 뒤 약 50 초 동안은
검은 화면이 정상입니다.

### 7.17 프레임은 정상인데 화면이 검은 이유 — SurfaceView 의 배경색

7.16 뒤에도 폰 화면은 검었습니다(`nonBlack=5703`, 즉 거의 모든 샘플에 색이 있는데도).
실행 화면의 `SurfaceView` 에 `setBackgroundColor(BLACK)` 이 걸려 있었습니다. `SurfaceView.draw()`
는 뷰 계층에 구멍을 뚫은 뒤 `View.draw()` 로 배경을 그리므로, 불투명한 배경은 서피스를 덮습니다.
배경을 지우고 띠 색은 바깥 `FrameLayout` 이 맡게 했습니다.

### 7.18 터치 입력 — virtio-multitouch + QMP

앱이 QEMU 에 `-device virtio-multitouch-device` 를 붙이고(커널 `CONFIG_VIRTIO_INPUT`),
실행 화면의 `MotionEvent` 를 `QmpClient.sendTouch` 가 `input-send-event` 의 `mtt` 이벤트로
넣습니다. 슬롯은 pointer id, 좌표는 0..32767 로 정규화합니다. 게스트에서는
`/dev/input/eventN` 이 "QEMU Virtio MultiTouch" 로 보이고 INPUT_PROP_DIRECT 가 있어
Android 가 터치스크린으로 분류합니다. CI 의 스모크 부팅에도 같은 장치를 붙입니다
(ubuntu-latest 의 QEMU 8.2 는 이 장치를 압니다).

---

## 8. 폰으로 옮긴 뒤

PC에서 7번까지 통과하면 ZIP으로 묶어 앱에서 **설정 → Android 7 구성 가져오기**로
임포트합니다.

부팅 로그는 두 곳에 남습니다:

- 화면에 실시간 스트리밍 (5초 내 종료 시 원인 후보를 앞으로 끌어냄)
- `Android/data/com.example.singlevm/files/logs/qemu-modern.log`
  — **루팅·adb 없이 파일 관리자로 열립니다**
