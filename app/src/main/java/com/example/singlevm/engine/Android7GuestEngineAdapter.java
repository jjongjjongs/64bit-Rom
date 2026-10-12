package com.example.singlevm.engine;

import android.content.Context;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/* JADX INFO: loaded from: classes3.dex */
public final class Android7GuestEngineAdapter implements EngineAdapter {
    public static final String CORE_LIBRARY_NAME = "libqemu-system-aarch64.so";
    public static final String ID = "android7-qemu";
    public static final String IMAGE_DIRECTORY = "android7";
    public static final String SYSTEM_IMAGE = "system.img";

    /**
     * Accepted kernel filenames, most specific first. GuestRunActivity boots whichever of these
     * exists, so the readiness check has to accept the same set — previously it demanded a file
     * literally named "kernel" while the boot path preferred "kernel-android54", meaning an
     * android54-only image set was bootable but reported as "준비 필요".
     */
    public static final String[] KERNEL_CANDIDATES = {"kernel-android54", "kernel-virt", "kernel"};

    /** Accepted ramdisk filenames, most specific first. Same reasoning as KERNEL_CANDIDATES. */
    public static final String[] RAMDISK_CANDIDATES = {"ramdisk-android54.img", "ramdisk.img"};

    /**
     * Picks the image the guest will actually boot with. Returns the last candidate when none
     * exist, so callers get a sensible path to report as missing.
     */
    private static File selectImage(File imageDir, String[] candidates) {
        for (String name : candidates) {
            File candidate = new File(imageDir, name);
            if (candidate.isFile() && candidate.length() > 0) {
                return candidate;
            }
        }
        return new File(imageDir, candidates[candidates.length - 1]);
    }

    public static File selectKernel(File imageDir) {
        return selectImage(imageDir, KERNEL_CANDIDATES);
    }

    public static File selectRamdisk(File imageDir) {
        return selectImage(imageDir, RAMDISK_CANDIDATES);
    }

    @Override // com.example.singlevm.engine.EngineAdapter
    public String id() {
        return ID;
    }

    @Override // com.example.singlevm.engine.EngineAdapter
    public String displayName() {
        return "Android 7.0 ARM32 게스트";
    }

    @Override // com.example.singlevm.engine.EngineAdapter
    public EngineReadiness inspect(Context context, File vmRoot) {
        String summary;
        File imageDir = new File(vmRoot, IMAGE_DIRECTORY);
        List<String> missing = new ArrayList<>();
        StringBuilder details = new StringBuilder();
        details.append("이미지 폴더: ").append(imageDir.getAbsolutePath()).append('\n');
        File[] required = {
                selectKernel(imageDir),
                selectRamdisk(imageDir),
                new File(imageDir, SYSTEM_IMAGE),
        };
        for (File image : required) {
            boolean present = image.isFile() && image.length() > 0;
            details.append("- ").append(image.getName()).append(": ")
                    .append(present ? humanSize(image.length()) : "없음").append('\n');
            if (!present) {
                missing.add(image.getName());
            }
        }
        // 이 이미지 묶음이 우리 빌드인지 본다.
        //
        // 커널 cmdline 이 rdinit=/init.wrapper 를 요구하므로, 우리 램디스크가 아니면
        // 어떤 커널이든 부팅할 수 없다. 그런데 임포터는 ZIP 에서 kernel-qemu 도 kernel
        // 로 받아들이기 때문에, 구글 SDK 의 system-image ZIP 을 넣어도 "가져오기 완료"가
        // 떴고 이 점검은 "부팅 준비 완료"라고 답했다. 그 뒤 게스트는 시리얼 한 줄 없이
        // 3.7초 만에 죽었고, 진단은 처음부터 다시 시작해야 했다. 폰만 쓰는 상황에서
        // 잘못된 이미지 한 번은 왕복 한 번이다 — 부팅 전에 말해 주는 편이 싸다.
        File stamp = new File(imageDir, "guest-image.prop");
        String stampLine = "없음 — 이 앱의 빌드가 아닙니다";
        if (stamp.isFile() && stamp.length() > 0) {
            String build = readProperty(stamp, "build");
            String commit = readProperty(stamp, "commit");
            stampLine = (build == null ? "확인됨" : "build " + build)
                    + (commit == null ? "" : " / " + commit.substring(0, Math.min(7, commit.length())));
        } else {
            missing.add("guest-image.prop (게스트 이미지가 이 앱의 빌드가 아님)");
        }
        details.append("- 게스트 이미지 빌드: ").append(stampLine).append('\n');

        File cache = new File(imageDir, "cache.img");
        details.append("- cache.img: ").append((!cache.isFile() || cache.length() <= 0)
                ? "없음 (fstab 이 vdb=/cache 를 기대하므로 권장)" : humanSize(cache.length())).append('\n');
        File userdata = new File(imageDir, "userdata.img");
        details.append("- userdata.img: ").append((!userdata.isFile() || userdata.length() <= 0) ? "없음 (첫 부팅 시 생성 예정)" : humanSize(userdata.length())).append('\n');
        File nativeDir = new File(context.getApplicationInfo().nativeLibraryDir);
        File qemuBridge = new File(nativeDir, "libsinglevm_qemu.so");
        boolean bridgeReady = qemuBridge.isFile() && qemuBridge.length() > 0;
        details.append("- QEMU JNI 브리지: ").append(bridgeReady ? "내장됨" : "없음").append('\n');
        if (!bridgeReady) {
            missing.add("libsinglevm_qemu.so");
        }
        File qemuCore = new File(nativeDir, CORE_LIBRARY_NAME);
        boolean coreReady = qemuCore.isFile() && qemuCore.length() > 0;
        details.append("- ARM QEMU/TCG 코어: ").append(coreReady ? "내장됨" : "없음").append('\n');
        details.append("- 실행 방식: ARM32 전체 시스템 소프트웨어 에뮬레이션");
        if (!coreReady) {
            missing.add(CORE_LIBRARY_NAME);
        }
        boolean ready = missing.isEmpty();
        if (ready) {
            summary = "부팅 준비 완료";
        } else {
            summary = "준비 필요: " + join(missing);
        }
        return new EngineReadiness(ready, summary, details.toString());
    }

    /** guest-image.prop 에서 키 하나를 읽는다. 읽히지 않으면 null. */
    private static String readProperty(File file, String key) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            String prefix = key + "=";
            while ((line = reader.readLine()) != null) {
                if (line.startsWith(prefix)) {
                    String value = line.substring(prefix.length()).trim();
                    return value.isEmpty() ? null : value;
                }
            }
        } catch (IOException e) {
            // 표식을 못 읽는 것은 없는 것과 같다. 호출한 쪽이 그렇게 다룬다.
        }
        return null;
    }

    private static String join(List<String> values) {
        StringBuilder out = new StringBuilder();
        for (String value : values) {
            if (out.length() > 0) {
                out.append(", ");
            }
            out.append(value);
        }
        return out.toString();
    }

    private static String humanSize(long bytes) {
        if (bytes >= 1073741824) {
            return String.format(Locale.US, "%.1f GB", Double.valueOf(bytes / 1.073741824E9d));
        }
        if (bytes >= 1048576) {
            return String.format(Locale.US, "%.1f MB", Double.valueOf(bytes / 1048576.0d));
        }
        return bytes + " bytes";
    }
}
