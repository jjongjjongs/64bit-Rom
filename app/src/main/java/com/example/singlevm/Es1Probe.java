package com.example.singlevm;

import android.opengl.EGL14;
import android.opengl.EGLConfig;
import android.opengl.EGLContext;
import android.opengl.EGLDisplay;
import android.opengl.EGLSurface;
import android.opengl.GLES10;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;

/**
 * 폰 GPU 드라이버가 OpenGL ES 1.x 컨텍스트를 ES 3 컨텍스트와 공유한 채로 만들고 그릴 수 있는지
 * 재 본다. 호스트 렌더러(libemugl_host_android.so)는 게스트의 ES1 컨텍스트를 폰의
 * libGLESv1_CM 으로 그대로 만들고, 그 결과를 ES2/3 쪽 보조 컨텍스트가 공유 텍스처로 가져간다.
 * 게스트의 ES1 앱(부팅 애니메이션, 옛 게임)만 검게 나오므로 그 조합이 되는지부터 가른다.
 *
 * <p>결과는 한 줄 문자열이다. 실패 지점과 EGL 오류 코드를 담는다.
 */
final class Es1Probe {
    private Es1Probe() {
    }

    static String run() {
        EGLDisplay display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY);
        int[] version = new int[2];
        if (display == EGL14.EGL_NO_DISPLAY || !EGL14.eglInitialize(display, version, 0, version, 1)) {
            return "ES1 self-test: eglInitialize failed 0x" + Integer.toHexString(EGL14.eglGetError());
        }
        try {
            int[] attribs = {
                    EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES_BIT | EGL14.EGL_OPENGL_ES2_BIT,
                    EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
                    EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8,
                    EGL14.EGL_NONE};
            EGLConfig[] configs = new EGLConfig[1];
            int[] count = new int[1];
            if (!EGL14.eglChooseConfig(display, attribs, 0, configs, 0, 1, count, 0) || count[0] < 1) {
                return "ES1 self-test: no ES1+ES2 pbuffer config (0x" + Integer.toHexString(EGL14.eglGetError()) + ")";
            }
            EGLConfig config = configs[0];
            EGLContext es3 = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT,
                    new int[]{EGL14.EGL_CONTEXT_CLIENT_VERSION, 3, EGL14.EGL_NONE}, 0);
            if (es3 == EGL14.EGL_NO_CONTEXT) {
                return "ES1 self-test: ES3 context failed 0x" + Integer.toHexString(EGL14.eglGetError());
            }
            StringBuilder out = new StringBuilder("ES1 self-test:");
            EGLContext es1 = EGL14.eglCreateContext(display, config, es3,
                    new int[]{EGL14.EGL_CONTEXT_CLIENT_VERSION, 1, EGL14.EGL_NONE}, 0);
            if (es1 == EGL14.EGL_NO_CONTEXT) {
                out.append(" shared-ES1 FAILED 0x").append(Integer.toHexString(EGL14.eglGetError()));
                es1 = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT,
                        new int[]{EGL14.EGL_CONTEXT_CLIENT_VERSION, 1, EGL14.EGL_NONE}, 0);
                if (es1 == EGL14.EGL_NO_CONTEXT) {
                    out.append(", unshared-ES1 FAILED 0x").append(Integer.toHexString(EGL14.eglGetError()));
                    EGL14.eglDestroyContext(display, es3);
                    return out.toString();
                }
                out.append(", unshared-ES1 ok");
            } else {
                out.append(" shared-ES1 ok");
            }
            EGLSurface pbuffer = EGL14.eglCreatePbufferSurface(display, config,
                    new int[]{EGL14.EGL_WIDTH, 64, EGL14.EGL_HEIGHT, 64, EGL14.EGL_NONE}, 0);
            if (pbuffer == EGL14.EGL_NO_SURFACE) {
                out.append(", pbuffer FAILED 0x").append(Integer.toHexString(EGL14.eglGetError()));
            } else if (!EGL14.eglMakeCurrent(display, pbuffer, pbuffer, es1)) {
                out.append(", makeCurrent(ES1) FAILED 0x").append(Integer.toHexString(EGL14.eglGetError()));
            } else {
                out.append(", draw=").append(drawTriangle());
                EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
            }
            if (pbuffer != EGL14.EGL_NO_SURFACE) {
                EGL14.eglDestroySurface(display, pbuffer);
            }
            EGL14.eglDestroyContext(display, es1);
            EGL14.eglDestroyContext(display, es3);
            return out.toString();
        } finally {
            EGL14.eglTerminate(display);
        }
    }

    /** 파란 바탕에 빨간 삼각형을 그리고 가운데 픽셀을 읽는다. 빨강이면 ES1 그리기가 된다. */
    private static String drawTriangle() {
        GLES10.glViewport(0, 0, 64, 64);
        GLES10.glClearColor(0f, 0f, 1f, 1f);
        GLES10.glClear(GLES10.GL_COLOR_BUFFER_BIT);
        float[] verts = {-1f, -1f, 1f, -1f, 0f, 1f};
        FloatBuffer buffer = ByteBuffer.allocateDirect(verts.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
        buffer.put(verts).position(0);
        GLES10.glEnableClientState(GLES10.GL_VERTEX_ARRAY);
        GLES10.glVertexPointer(2, GLES10.GL_FLOAT, 0, buffer);
        GLES10.glColor4f(1f, 0f, 0f, 1f);
        GLES10.glDrawArrays(GLES10.GL_TRIANGLES, 0, 3);
        GLES10.glFinish();
        ByteBuffer pixel = ByteBuffer.allocateDirect(4).order(ByteOrder.nativeOrder());
        GLES10.glReadPixels(32, 20, 1, 1, GLES10.GL_RGBA, GLES10.GL_UNSIGNED_BYTE, pixel);
        int error = GLES10.glGetError();
        int r = pixel.get(0) & 0xff;
        int g = pixel.get(1) & 0xff;
        int b = pixel.get(2) & 0xff;
        String color = "rgb(" + r + "," + g + "," + b + ")";
        if (error != GLES10.GL_NO_ERROR) {
            return "glError 0x" + Integer.toHexString(error) + " " + color;
        }
        return (r > 200 && b < 50 ? "ok " : "WRONG ") + color;
    }
}
