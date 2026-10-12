package com.example.singlevm;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

/**
 * 로그 폴더의 파일을 다른 앱에 통째로 건네는 통로. "공유" 로 카카오톡·드라이브·메일에 파일 그대로
 * 보낼 수 있다.
 *
 * <p>왜 직접 쓰는가. 로그를 글자로 공유하면 받는 쪽(클립보드, 인텐트 extra)이 잘라 버린다 —
 * 실측으로 수 MB 짜리 부팅 로그가 복사 중에 잘렸다. 파일을 넘기려면 content:// URI 가 필요하고
 * 그 표준 구현은 androidx 의 FileProvider 인데, 이 프로젝트는 androidx 를 쓰지 않는다. 필요한
 * 건 openFile 하나라 여기 40 줄이면 된다.
 *
 * <p>경로는 {@code content://<authority>/logs/<파일 이름>} 하나만 받는다. 상위 폴더로 올라가는
 * 이름은 거절한다.
 */
public final class LogFileProvider extends ContentProvider {
    static final String AUTHORITY = "com.example.singlevm.logs";

    static Uri uriFor(File file) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY)
                .appendPath("logs").appendPath(file.getName()).build();
    }

    private File resolve(Uri uri) throws FileNotFoundException {
        if (uri.getPathSegments().size() != 2 || !"logs".equals(uri.getPathSegments().get(0))) {
            throw new FileNotFoundException(uri.toString());
        }
        String name = uri.getPathSegments().get(1);
        if (name.contains("/") || name.contains("..")) {
            throw new FileNotFoundException(uri.toString());
        }
        File logs = new File(getContext().getFilesDir(), "single_vm/logs");
        File file = new File(logs, name);
        try {
            if (!file.getCanonicalPath().startsWith(logs.getCanonicalPath() + File.separator)) {
                throw new FileNotFoundException(uri.toString());
            }
        } catch (IOException e) {
            throw new FileNotFoundException(uri.toString());
        }
        if (!file.isFile()) {
            throw new FileNotFoundException(uri.toString());
        }
        return file;
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(resolve(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String order) {
        File file;
        try {
            file = resolve(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        // 받는 앱이 파일 이름과 크기를 묻는다. 이 둘만 답한다.
        MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        cursor.addRow(new Object[]{file.getName(), file.length()});
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        return uri.getLastPathSegment() != null && uri.getLastPathSegment().endsWith(".png")
                ? "image/png" : "text/plain";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] args) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] args) {
        return 0;
    }
}
