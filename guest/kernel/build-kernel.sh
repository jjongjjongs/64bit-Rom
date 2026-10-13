#!/usr/bin/env bash
# Android 7 게스트용 ARM32 커널을 -machine virt 에서 부팅 가능하게 빌드한다.
#
# 사용법: build-kernel.sh <출력 zImage 경로>
#
# 이 파일이 워크플로에서 분리돼 있는 이유는 캐시 키 때문이다. 커널 빌드는 15분쯤
# 걸리는데, 워크플로 파일 전체를 해시로 삼으면 판정 단계 문구 하나만 고쳐도 캐시가
# 날아간다. 커널 결과물을 실제로 바꾸는 것은 이 스크립트뿐이므로 키도 이 파일만 본다.
#
# 커널 버전 고정 이유: ashmem 이 Linux 5.18 에서 제거됐다. Android 7 은 ashmem 없이는
# 부팅하지 못하므로 5.17 이하가 필요하고, 안드로이드 패치가 들어간 계보 중 가장 최신인
# android12-5.10-lts 를 쓴다.
set -euo pipefail

OUT="${1:?출력 경로를 인자로 넘겨야 한다}"
KERNEL_BRANCH="${KERNEL_BRANCH:-android12-5.10-lts}"
SRC="${KERNEL_SRC_DIR:-kernel-src}"

sudo apt-get install -y -qq gcc-arm-linux-gnueabihf bc bison flex libssl-dev

git clone --depth 1 -b "$KERNEL_BRANCH" \
  https://android.googlesource.com/kernel/common "$SRC"
cd "$SRC"

export ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf-

# --- 32비트 바인더 ABI 복원 ---
#
# API 24 armeabi-v7a 시스템 이미지의 유저스페이스는 옛 32비트 바인더 API(프로토콜 7,
# 바인더 구조체 안의 포인터가 32비트)로 빌드돼 있다. 커널 쪽 BINDER_IPC_32BIT 는 이후
# 삭제돼서 5.10 은 항상 프로토콜 8 과 64비트 포인터만 제공한다.
#
# 실측: /dev/binder 가 정상적으로 생기고 열리는데도
#   "Binder driver protocol does not match user space protocol!"
#   "Binder driver could not be opened. Terminating."
# 로 servicemanager 가 exit 255 로 죽고, 4번 반복되자 init 이 recovery 로 리부트했다.
#
# uapi 헤더의 타입 정의와 버전만 되돌리면 드라이버 전체가 32비트 ABI 로 컴파일된다.
# 헤더 모양이 달라져서 치환이 안 먹으면 조용히 잘못된 커널을 만들지 말고 여기서 멈춘다.
BINDER_UAPI=include/uapi/linux/android/binder.h
sed -i \
  -e 's/^typedef __u64 binder_size_t;$/typedef __u32 binder_size_t;/' \
  -e 's/^typedef __u64 binder_uintptr_t;$/typedef __u32 binder_uintptr_t;/' \
  -e 's/^#define BINDER_CURRENT_PROTOCOL_VERSION 8$/#define BINDER_CURRENT_PROTOCOL_VERSION 7/' \
  "$BINDER_UAPI"
for expect in \
  '^typedef __u32 binder_size_t;$' \
  '^typedef __u32 binder_uintptr_t;$' \
  '^#define BINDER_CURRENT_PROTOCOL_VERSION 7$'; do
  grep -qE "$expect" "$BINDER_UAPI" || {
    echo "::error::바인더 uapi 패치 실패 ($expect). 헤더 내용:"
    grep -nE 'binder_size_t;|binder_uintptr_t;|BINDER_CURRENT_PROTOCOL_VERSION' "$BINDER_UAPI"
    exit 1
  }
done
echo "바인더 uapi 를 32비트 ABI(프로토콜 7)로 되돌렸다"

# --- 알람 timerfd 의 CAP_WAKE_ALARM 요구 해제 (사용자 승인 — docs/GUEST-IMAGE.md 7.15) ---
#
# Android 7 의 AlarmManagerService 는 /dev/alarm(5.10 에는 없다)이 없으면
# timerfd_create(CLOCK_REALTIME_ALARM / CLOCK_BOOTTIME_ALARM) 로 넘어간다. 커널은 그 두
# clockid 에 CAP_WAKE_ALARM(비트 35)을 요구하고 없으면 EPERM 을 준다. 그러면 자바 핸들러로
# 폴백하는데, 그 경로는 리스너 알람에서 NPE 로 죽어(AlarmManagerService.java:2616)
# system_server 가 약 60 초마다 재시작하고 런처가 영영 뜨지 않는다(실측).
#
# 이 커널은 한 사람이 혼자 쓰는 게스트 VM 전용이다. 깨우기 알람을 아무 프로세스나 만들어도
# 잃을 것이 없으므로 요구 조건만 지운다. 알람 자체는 hrtimer 로 동작해 RTC 와 무관하다.
TIMERFD=fs/timerfd.c
sed -i 's/!capable(CAP_WAKE_ALARM))/0 \/* CAP_WAKE_ALARM 불필요: Mini Rom 게스트 전용 *\/)/' "$TIMERFD"
if grep -q 'capable(CAP_WAKE_ALARM)' "$TIMERFD" || ! grep -q 'Mini Rom' "$TIMERFD"; then
  echo "::error::timerfd CAP_WAKE_ALARM 패치 실패. 해당 부분:"
  grep -n -B3 -A2 'CAP_WAKE_ALARM\|Mini Rom' "$TIMERFD"
  exit 1
fi
echo "timerfd 알람 clockid 의 CAP_WAKE_ALARM 요구를 지웠다"

make -s multi_v7_defconfig

# 안드로이드가 요구하는 것 + 우리 가상 하드웨어. 실측에서 나온 목록 그대로.
#
# LSM 을 명시하는 이유: SECURITY_SELINUX 를 켜는 것만으로는 부족하다. CONFIG_LSM 이
# 활성 LSM 목록을 정하고, 거기 selinux 가 없으면 selinuxfs 가 등록되지 않아 init 이
# 정책을 올리지 못한다.
#
# ANDROID_BINDERFS 를 끄는 이유: 켜져 있으면 binderfs 가 ANDROID_BINDER_DEVICES 의
# 이름들을 가져가서, 마운트된 binderfs 안에만 장치를 만든다. 그러면 legacy misc 장치가
# 등록되지 않는다(실측: /proc/filesystems 에는 binder 가 있는데 misc 클래스에는 ashmem
# 만 있고 binder 가 없었다). Android 7 은 binderfs 를 모르고 /dev/binder 를 직접 여는데,
# 그게 없으니 servicemanager 가 반복해서 죽고 init 이 recovery 로 리부트했다.
#
# SCHED_TUNE 은 여기 없다. 5.10 에서 제거됐고(uclamp 로 대체) --enable 해봐야 조용히
# 무시된다. init 이 /sys/fs/cgroup/stune 쓰기에 실패하며 로그를 남기지만 치명적이지 않다.
#
# DRM/virtio-gpu 를 켜는 이유: 호스트는 -device virtio-gpu-device 를 붙이는데 커널에
# 드라이버가 없어서 게스트에 화면 장치가 하나도 없었다(실측: /dev/dri/card0, /dev/fb0,
# /dev/graphics/fb0 전부 없음). SurfaceFlinger::init() 이 그릴 곳을 못 찾아 abort 하고,
# init.rc 의 "onrestart restart zygote" 때문에 부팅 전체가 무한 재시작에 빠졌다.
# FBDEV_EMULATION 이 DRM 위에 /dev/fb0 을 만들어 주고, ueventd 가 그것을
# /dev/graphics/fb0 으로 올린다 — Android 7 의 프레임버퍼 gralloc 이 여는 경로다.
#
# FUSE/CUSE 를 켜는 이유: ranchu 그래픽 스택은 /dev/qemu_pipe 라는 문자 장치를 연다.
# 번들 QEMU 에는 goldfish_pipe 장치가 없어서(strings 로 확인: goldfish_pic/rtc/tty 만
# 있음) 커널 드라이버로는 만들 수 없고, 전송로는 virtio-serial 포트다. 파이프 하나가
# 포트 하나이므로 open 마다 빈 포트를 배정해 줄 무언가가 필요한데, 커널 밖에서 문자
# 장치를 만드는 방법이 CUSE 다. guest/qemu_pipe/qemu_piped.c 가 그 데몬이다.
#
# netfilter 를 켜는 이유: netd 가 부팅할 때마다
#   "iptables v1.4.20: can't initialize iptables table `filter': Table does not exist"
# 로 방화벽 규칙 설치에 전부 실패한다. multi_v7_defconfig 에는 iptables 테이블이 없다.
# netd 자체는 죽지 않지만 system_server 의 ConnectivityService 가 netd 를 기다리므로
# 부팅이 여기서 늘어질 수 있다. MODULES 를 껐으므로 전부 내장이어야 한다.
./scripts/config \
  --enable SECURITY --enable SECURITY_SELINUX --enable SECURITY_SELINUX_BOOTPARAM \
  --enable SECURITY_NETWORK --enable AUDIT \
  --disable SECURITY_APPARMOR \
  --set-str LSM "lockdown,yama,loadpin,safesetid,integrity,selinux" \
  --enable ANDROID --enable ANDROID_BINDER_IPC \
  --disable ANDROID_BINDERFS \
  --set-str ANDROID_BINDER_DEVICES "binder,hwbinder,vndbinder" \
  --enable ASHMEM \
  --enable POWER_SUPPLY --enable TEST_POWER \
  --enable PM_WAKELOCKS --enable PM_SLEEP --enable SUSPEND \
  --enable RTC_CLASS --enable RTC_DRV_PL031 --enable RTC_HCTOSYS \
  --enable VIRTIO --enable VIRTIO_MMIO --enable VIRTIO_BLK \
  --enable VIRTIO_CONSOLE --enable VIRTIO_NET \
  --enable SERIAL_AMBA_PL011 --enable SERIAL_AMBA_PL011_CONSOLE \
  --enable SERIAL_EARLYCON --enable BLK_DEV_INITRD \
  --enable DEVTMPFS --enable DEVTMPFS_MOUNT \
  --enable EXT4_FS --enable EXT4_USE_FOR_EXT2 \
  --enable EXT4_FS_SECURITY --enable EXT4_FS_POSIX_ACL \
  --enable CGROUPS --enable CGROUP_SCHED --enable FAIR_GROUP_SCHED \
  --enable CGROUP_CPUACCT --enable MEMCG --enable CGROUP_FREEZER \
  --enable CGROUP_DEVICE --enable CPUSETS \
  --enable KALLSYMS --enable KALLSYMS_ALL \
  --enable FUSE_FS --enable CUSE \
  --enable DRM --enable DRM_VIRTIO_GPU --enable DRM_FBDEV_EMULATION \
  --enable FB --enable FB_DEVICE --enable FRAMEBUFFER_CONSOLE \
  --enable NETFILTER --enable NETFILTER_ADVANCED --enable NETFILTER_XTABLES \
  --enable NF_CONNTRACK --enable NF_NAT \
  --enable IP_NF_IPTABLES --enable IP_NF_FILTER --enable IP_NF_TARGET_REJECT \
  --enable IP_NF_MANGLE --enable IP_NF_RAW --enable IP_NF_NAT \
  --enable IP_NF_TARGET_MASQUERADE \
  --enable IP6_NF_IPTABLES --enable IP6_NF_FILTER --enable IP6_NF_TARGET_REJECT \
  --enable IP6_NF_MANGLE --enable IP6_NF_RAW \
  --enable NETFILTER_XT_MARK --enable NETFILTER_XT_MATCH_STATE \
  --enable NETFILTER_XT_MATCH_OWNER --enable NETFILTER_XT_MATCH_QUOTA \
  --enable NETFILTER_XT_MATCH_CONNMARK --enable NETFILTER_XT_TARGET_CONNMARK \
  --enable NETFILTER_XT_TARGET_IDLETIMER \
  --disable MODULES
make -s olddefconfig

# 내장인지 확인한다. 모듈이면 램디스크에 모듈이 없어 아무 소용이 없다.
# 결과를 파일로도 남긴다. 이 단계는 캐시 적중이면 통째로 건너뛰므로, 판정 단계에서
# "지금 쓰는 커널이 어떤 설정으로 빌드됐는지"를 볼 방법이 이것뿐이다.
for opt in CONFIG_VIRTIO_CONSOLE CONFIG_SECURITY_SELINUX CONFIG_ANDROID_BINDER_IPC \
           CONFIG_ANDROID_BINDERFS CONFIG_ANDROID_BINDER_DEVICES \
           CONFIG_ASHMEM CONFIG_LSM CONFIG_KALLSYMS \
           CONFIG_IP_NF_FILTER CONFIG_IP6_NF_FILTER \
           CONFIG_DRM_VIRTIO_GPU CONFIG_DRM_FBDEV_EMULATION CONFIG_FB \
           CONFIG_FUSE_FS CONFIG_CUSE CONFIG_RTC_CLASS CONFIG_RTC_DRV_PL031; do
  printf '%-34s %s\n' "$opt" "$(grep -E "^$opt=" .config || echo '(설정 안 됨)')"
done | tee "$(dirname "$OUT")/kernel-config.txt"

# 바인더 ABI 는 .config 에 안 나오므로 헤더에서 직접 확인해 같이 남긴다.
grep -E 'binder_size_t;|binder_uintptr_t;|BINDER_CURRENT_PROTOCOL_VERSION' "$BINDER_UAPI" \
  | sed 's/^/binder uapi: /' | tee -a "$(dirname "$OUT")/kernel-config.txt"
grep -c 'Mini Rom' "$TIMERFD" | sed 's/^/timerfd CAP_WAKE_ALARM 패치 자리 수: /' \
  | tee -a "$(dirname "$OUT")/kernel-config.txt"

make -j"$(nproc)" zImage
cp arch/arm/boot/zImage "$OUT"
file "$OUT"
