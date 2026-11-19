plugins {
    id("com.android.application")
}

// Mini-FPS: WebView 한 장으로 도는 오프라인 봇전 FPS. 게임 자체는 minifps/web 에 있고,
// 빌드 전에 `python3 minifps/web/build.py` 가 src/main/assets 를 채운다(워크플로가 실행한다).
android {
    namespace = "com.example.minifps"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.minifps"
        minSdk = 24
        targetSdk = 34
        versionCode = 9
        versionName = "0.6.1"
    }

    // :app 과 같은 고정 디버그 키로 서명한다. 러너마다 키가 달라지면 업데이트 설치가 거부된다.
    signingConfigs {
        getByName("debug") {
            storeFile = file("../app/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
