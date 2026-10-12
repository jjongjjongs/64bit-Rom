plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.singlevm"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.singlevm"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.2.0" // jadx로 확인된 원본 버전명

        ndk {
            // 원본 apk는 arm64-v8a 네이티브 라이브러리만 포함
            abiFilters += listOf("arm64-v8a")
        }
    }

    // 서명 키를 고정한다.
    //
    // 설정이 없으면 Gradle 은 ~/.android/debug.keystore 로 서명하는데, GitHub Actions 러너는
    // 매번 새 기계라 빌드마다 새 키가 생긴다. 그러면 폰에 설치된 것과 키가 달라 업데이트 설치가
    // 거부되고, 삭제 후 재설치하면 앱 데이터(수 GB 짜리 게스트 이미지까지)가 지워진다.
    //
    // 디버그 키라 저장소에 둔다. 비밀번호도 안드로이드 기본 디버그 키와 같다. 이 저장소를 가진
    // 사람은 누구나 이 앱의 업데이트를 서명할 수 있다는 뜻이므로, 배포용 release 서명은 여기가
    // 아니라 비밀(secret)로 따로 둬야 한다.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            // 원본 apk가 debuggable=true 였음. 매니페스트 하드코딩 대신 여기서 관리.
            isDebuggable = true
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isDebuggable = false
            isMinifyEnabled = false
        }
    }

    packaging {
        jniLibs {
            // 원본 매니페스트의 extractNativeLibs="true"에 해당.
            // GuestRunActivity가 nativeLibraryDir의 libqemu-system-aarch64.so /
            // libpodroid-launcher.so를 ProcessBuilder로 exec 하므로, 실제 파일로
            // 풀려 있어야 한다. false(AGP 기본값)로 두면 QEMU 기동이 깨진다.
            useLegacyPackaging = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // decompile된 소스 기준으로는 androidx/외부 의존성 없음 (순수 android.* + org.json)
}
