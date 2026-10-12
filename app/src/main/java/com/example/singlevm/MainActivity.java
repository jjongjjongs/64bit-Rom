package com.example.singlevm;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.example.singlevm.engine.Android7GuestEngineAdapter;
import com.example.singlevm.engine.EngineAdapter;
import com.example.singlevm.engine.EngineReadiness;
import com.example.singlevm.engine.EngineRegistry;
import com.example.singlevm.engine.LegacyArmEngineAdapter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/* JADX INFO: loaded from: classes2.dex */
public class MainActivity extends Activity {
    private static final String ACTION_IMPORT_ADB_GUEST = "com.example.singlevm.IMPORT_ADB_GUEST";
    private static final String KEY_ACTIVE_PACKAGE = "active_package";
    private static final String KEY_INSTALLED_PACKAGES = "installed_packages";
    private static final int MANIFEST_SCHEMA_VERSION = 1;
    /** Buffer used when unpacking multi-hundred-MB guest images out of a bundle zip. */
    private static final int IMAGE_COPY_BUFFER_BYTES = 1024 * 1024;
    /** Headroom demanded on top of the raw entry sizes before unpacking a guest image bundle. */
    private static final long IMAGE_EXTRACT_HEADROOM_BYTES = 256L * 1024 * 1024;
    /** QEMU 부팅 로그는 수 MB까지 커진다. 다이얼로그와 클립보드가 감당할 만큼만 읽는다. */
    private static final int LOG_VIEW_TAIL_BYTES = 128 * 1024;
    /** Intent extra는 Binder 트랜잭션(약 1MB)을 타므로 여유 있게 잘라 보낸다. */
    private static final int LOG_SHARE_MAX_CHARS = 200 * 1024;
    private static final boolean NATIVE_RUNTIME_LOADED;
    private static final String PREFS = "single_vm_state";
    private static final int REQUEST_IMPORT_ANDROID7_IMAGE = 7002;
    private static final int REQUEST_IMPORT_APK = 7001;
    private File android7ImageDir;
    private File apkDir;
    private GridLayout appGrid;
    private File appsDir;
    private GridLayout commandGrid;
    private File dataDir;
    private TextView detailsView;
    private File externalGuestApk;
    private File externalImportDir;
    private File logsDir;
    private File nativeLibDir;
    private SharedPreferences prefs;
    private TextView statusView;
    private File vmRoot;

    private native String nativeProbeRuntime(String vmRootPath, String installId);

    static {
        boolean loaded;
        try {
            System.loadLibrary("singlevm_runtime");
            loaded = true;
        } catch (UnsatisfiedLinkError e) {
            loaded = false;
        }
        NATIVE_RUNTIME_LOADED = loaded;
    }

    @Override // android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.prefs = getSharedPreferences(PREFS, 0);
        initPaths();
        buildUi();
        ensureVmDirs();
        refreshState();
        handleStartupIntent(getIntent());
    }

    @Override // android.app.Activity
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleStartupIntent(intent);
    }

    private void handleStartupIntent(Intent intent) {
        if (intent != null && ACTION_IMPORT_ADB_GUEST.equals(intent.getAction())) {
            importAdbGuestApk(false);
        }
    }

    private void initPaths() {
        this.vmRoot = new File(getFilesDir(), "single_vm");
        this.apkDir = new File(this.vmRoot, "apks");
        this.appsDir = new File(this.vmRoot, "apps");
        this.dataDir = new File(this.vmRoot, "data");
        this.nativeLibDir = new File(this.vmRoot, "native_libs");
        this.logsDir = new File(this.vmRoot, "logs");
        this.externalImportDir = getExternalFilesDir("import");
        if (this.externalImportDir == null) {
            this.externalImportDir = new File(this.vmRoot, "adb_import");
        }
        this.externalGuestApk = new File(this.externalImportDir, "guest.apk");
        this.android7ImageDir = new File(this.vmRoot, Android7GuestEngineAdapter.IMAGE_DIRECTORY);
    }

    private void buildUi() {
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(Color.rgb(245, 245, 245));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(14), dp(22), dp(14), dp(18));
        scrollView.addView(root, new FrameLayout.LayoutParams(-1, -2));
        TextView search = new TextView(this);
        search.setText("앱 검색");
        search.setTextSize(17.0f);
        search.setGravity(Gravity.CENTER);
        search.setTextColor(Color.rgb(0, 121, 107));
        Drawable searchIcon = getDrawable(R.drawable.ic_cmd_search);
        if (searchIcon != null) {
            searchIcon = searchIcon.mutate();
            searchIcon.setColorFilter(Color.rgb(0, 121, 107), PorterDuff.Mode.SRC_IN);
            searchIcon.setBounds(0, 0, dp(20), dp(20));
            search.setCompoundDrawables(searchIcon, null, null, null);
            search.setCompoundDrawablePadding(dp(10));
        }
        // 밑줄 대신 둥근 흰 검색창. 글자와 아이콘은 가운데에 모은다.
        GradientDrawable searchBg = new GradientDrawable();
        searchBg.setColor(Color.WHITE);
        searchBg.setCornerRadius(dp(26));
        searchBg.setStroke(dp(1), Color.rgb(228, 226, 223));
        LinearLayout searchRow = new LinearLayout(this);
        searchRow.setGravity(Gravity.CENTER);
        searchRow.setBackground(searchBg);
        searchRow.addView(search, new LinearLayout.LayoutParams(-2, -1));
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(-1, dp(52));
        searchParams.setMargins(dp(2), dp(14), dp(2), 0);
        root.addView(searchRow, searchParams);
        this.statusView = makePanelText(15, true);
        this.statusView.setBackgroundColor(0);
        this.statusView.setTextColor(Color.rgb(58, 54, 55));
        this.statusView.setPadding(dp(6), dp(20), dp(6), dp(6));
        root.addView(this.statusView, panelParams(dp(0)));
        this.commandGrid = new GridLayout(this);
        // 다섯 개를 한 줄에. 칸 너비는 가중치로 균등하게 나눈다(makeBaseTile).
        this.commandGrid.setColumnCount(5);
        this.commandGrid.setPadding(0, dp(8), 0, dp(0));
        root.addView(this.commandGrid, new LinearLayout.LayoutParams(-1, -2));
        this.appGrid = new GridLayout(this);
        this.appGrid.setColumnCount(5);
        this.appGrid.setPadding(0, dp(6), 0, dp(10));
        root.addView(this.appGrid, new LinearLayout.LayoutParams(-1, -2));
        this.detailsView = makePanelText(14, false);
        this.detailsView.setPadding(dp(14), dp(12), dp(14), dp(14));
        root.addView(this.detailsView, panelParams(dp(10)));
        this.detailsView.setVisibility(View.GONE);
        setContentView(scrollView);
    }

    private Button makeButton(String text) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(text);
        button.setTextSize(16.0f);
        button.setTextColor(Color.WHITE);
        button.setBackgroundColor(Color.rgb(45, 42, 43));
        button.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(50));
        params.setMargins(0, dp(4), 0, dp(4));
        button.setLayoutParams(params);
        return button;
    }

    private Button makeSecondaryButton(String text) {
        Button button = makeButton(text);
        button.setTextColor(Color.rgb(45, 42, 43));
        button.setBackgroundColor(Color.rgb(248, 245, 239));
        return button;
    }

    private TextView makePanelText(int size, boolean bold) {
        TextView text = new TextView(this);
        text.setTextSize(size);
        text.setTextColor(Color.rgb(42, 39, 40));
        text.setBackgroundColor(Color.rgb(255, 252, 247));
        if (bold) {
            text.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return text;
    }

    private LinearLayout.LayoutParams panelParams(int topMargin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, topMargin, 0, 0);
        return params;
    }

    private void refreshAppGrid() {
        if (this.appGrid == null || this.commandGrid == null) {
            return;
        }
        this.commandGrid.removeAllViews();
        // 연한 바탕 + 같은 계열의 진한 선 아이콘.
        this.commandGrid.addView(makeCommandTile("APK 설치", R.drawable.ic_cmd_apk,
                Color.rgb(227, 240, 253), Color.rgb(31, 111, 209), v -> openApkPicker()));
        this.commandGrid.addView(makeCommandTile("ADB 설치", R.drawable.ic_cmd_adb,
                Color.rgb(221, 243, 238), Color.rgb(11, 127, 110), v -> importAdbGuestApk(true)));
        this.commandGrid.addView(makeCommandTile("실행 전 스캔", R.drawable.ic_cmd_scan,
                Color.rgb(229, 235, 241), Color.rgb(63, 90, 117), v -> showRuntimeProbe()));
        this.commandGrid.addView(makeCommandTile("설정", R.drawable.ic_cmd_settings,
                Color.rgb(236, 235, 234), Color.rgb(85, 80, 79), v -> showVmSettings()));
        this.commandGrid.addView(makeCommandTile("로그", R.drawable.ic_cmd_log,
                Color.rgb(238, 231, 248), Color.rgb(107, 72, 176), v -> showLogs()));
        this.appGrid.removeAllViews();
        Set<String> installed = getInstalledPackages();
        for (String installId : installed) {
            this.appGrid.addView(makeInstalledAppTile(installId));
        }
        // 칸은 가중치로 폭을 나누므로, 마지막 줄이 덜 차면 있는 아이콘이 벌어진다.
        // 빈 칸으로 다섯을 채워 위의 명령 아이콘과 줄을 맞춘다.
        int columns = this.appGrid.getColumnCount();
        int remainder = installed.size() % columns;
        for (int i = 0; remainder != 0 && i < columns - remainder; i++) {
            this.appGrid.addView(makeBaseTile(""));
        }
    }

    private View makeInstalledAppTile(final String installId) {
        View icon;
        String label = this.prefs.getString(("app." + installId + ".") + GuestRunActivity.EXTRA_LABEL, installId);
        Drawable appIcon = loadInstalledAppIcon(installId);
        LinearLayout tile = makeBaseTile(label);
        if (appIcon != null) {
            ImageView imageView = new ImageView(this);
            imageView.setImageDrawable(appIcon);
            imageView.setScaleType(ImageView.ScaleType.FIT_CENTER);
            icon = imageView;
        } else {
            icon = makeGlyphIcon(firstLetter(label), Color.rgb(63, 81, 181), false);
            ((TextView) icon).setTextSize(22.0f);
        }
        tile.addView(icon, new LinearLayout.LayoutParams(dp(56), dp(56)));
        tile.addView(makeTileLabel(label));
        tile.setOnClickListener(v -> showInstalledAppActions(installId));
        tile.setOnLongClickListener(v -> {
            showInstalledAppActions(installId);
            return true;
        });
        return tile;
    }

    private View makeCommandTile(String label, int iconRes, int tint, int ink, View.OnClickListener listener) {
        LinearLayout tile = makeBaseTile(label);
        ImageView icon = new ImageView(this);
        icon.setImageResource(iconRes);
        icon.setColorFilter(ink, PorterDuff.Mode.SRC_IN);
        icon.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        icon.setPadding(dp(14), dp(14), dp(14), dp(14));
        GradientDrawable background = new GradientDrawable();
        background.setColor(tint);
        background.setCornerRadius(dp(18));
        icon.setBackground(background);
        tile.addView(icon, new LinearLayout.LayoutParams(dp(56), dp(56)));
        tile.addView(makeTileLabel(label));
        tile.setOnClickListener(listener);
        return tile;
    }

    private LinearLayout makeBaseTile(String label) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setPadding(0, 0, 0, 0);
        tile.setContentDescription(label);
        // 너비 0 + 가중치 1: 다섯 칸이 화면 폭을 똑같이 나눠 가진다. 고정 76dp 였을 때는
        // 넷째 칸 뒤에 다섯째가 들어갈 자리가 없어 로그가 둘째 줄로 밀렸다.
        GridLayout.LayoutParams params = new GridLayout.LayoutParams(
                GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, 1f));
        params.width = 0;
        params.height = dp(104);
        params.setMargins(0, dp(10), 0, dp(6));
        tile.setLayoutParams(params);
        return tile;
    }

    private TextView makeGlyphIcon(String glyph, int backgroundColor, boolean circular) {
        TextView icon = new TextView(this);
        icon.setText(glyph);
        icon.setTextSize(30.0f);
        icon.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        icon.setGravity(Gravity.CENTER);
        icon.setTextColor(Color.WHITE);
        GradientDrawable background = new GradientDrawable();
        background.setColor(backgroundColor);
        background.setShape(circular ? GradientDrawable.OVAL : GradientDrawable.RECTANGLE);
        background.setCornerRadius(dp(18));
        icon.setBackground(background);
        return icon;
    }

    private TextView makeTileLabel(String label) {
        TextView text = new TextView(this);
        text.setText(label);
        text.setTextSize(12.0f);
        text.setTextColor(Color.rgb(58, 54, 55));
        text.setGravity(Gravity.CENTER);
        text.setMaxLines(2);
        text.setEllipsize(TextUtils.TruncateAt.END);
        text.setPadding(0, dp(8), 0, 0);
        return text;
    }

    private Drawable loadInstalledAppIcon(String installId) {
        String prefix = "app." + installId + ".";
        String apkPath = this.prefs.getString(prefix + GuestRunActivity.EXTRA_APK_PATH, "");
        if (apkPath.isEmpty()) {
            return null;
        }
        try {
            PackageInfo info = getPackageManager().getPackageArchiveInfo(apkPath, 0);
            if (info != null && info.applicationInfo != null) {
                ApplicationInfo appInfo = info.applicationInfo;
                appInfo.sourceDir = apkPath;
                appInfo.publicSourceDir = apkPath;
                return appInfo.loadIcon(getPackageManager());
            }
            return null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private String firstLetter(String label) {
        if (label == null || label.trim().isEmpty()) {
            return "?";
        }
        return label.trim().substring(0, 1).toUpperCase(Locale.KOREA);
    }

    private void showInstalledAppActions(final String installId) {
        this.prefs.edit().putString(KEY_ACTIVE_PACKAGE, installId).apply();
        String prefix = "app." + installId + ".";
        String label = this.prefs.getString(prefix + GuestRunActivity.EXTRA_LABEL, installId);
        String[] items = {"실행", "실행 전 APK 스캔", "앱 정보", "삭제"};
        new AlertDialog.Builder(this)
                .setTitle(label)
                .setItems(items, (dialog, which) -> onInstalledAppAction(installId, which))
                .show();
    }

    private void onInstalledAppAction(String installId, int which) {
        if (which == 0) {
            launchInstalledApp(installId);
        } else if (which == 1) {
            showRuntimeProbe();
        } else if (which == 2) {
            showInstalledAppInfo(installId);
        } else if (which == 3) {
            confirmDeleteInstalledApp(installId);
        }
    }

    private void launchInstalledApp(final String installId) {
        EngineAdapter engine = EngineRegistry.primary();
        EngineReadiness readiness = engine.inspect(this, this.vmRoot);
        if (!readiness.ready) {
            new AlertDialog.Builder(this)
                    .setTitle(engine.displayName())
                    .setMessage(readiness.summary + "\n\n" + readiness.details)
                    .setPositiveButton("구성 파일 가져오기", (dialog, which) -> openAndroid7ImagePicker())
                    .setNegativeButton("기존 시험 엔진",
                            (dialog, which) -> launchGuestWithEngine(installId, LegacyArmEngineAdapter.ID))
                    .show();
        } else {
            launchGuestWithEngine(installId, engine.id());
        }
    }

    private void launchGuestWithEngine(String installId, String engineId) {
        String prefix = "app." + installId + ".";
        String packageName = this.prefs.getString(prefix + GuestRunActivity.EXTRA_PACKAGE, "");
        Intent intent = new Intent(this, (Class<?>) GuestRunActivity.class);
        intent.putExtra(GuestRunActivity.EXTRA_ENGINE_ID, engineId);
        intent.putExtra(GuestRunActivity.EXTRA_INSTALL_ID, installId);
        intent.putExtra(GuestRunActivity.EXTRA_LABEL, this.prefs.getString(prefix + GuestRunActivity.EXTRA_LABEL, installId));
        intent.putExtra(GuestRunActivity.EXTRA_PACKAGE, packageName);
        intent.putExtra(GuestRunActivity.EXTRA_LAUNCHER, this.prefs.getString(prefix + "first_activity", ""));
        intent.putExtra(GuestRunActivity.EXTRA_APK_PATH, this.prefs.getString(prefix + GuestRunActivity.EXTRA_APK_PATH, ""));
        intent.putExtra(GuestRunActivity.EXTRA_LIB_DIR, this.prefs.getString(prefix + GuestRunActivity.EXTRA_LIB_DIR, ""));
        intent.putExtra(GuestRunActivity.EXTRA_DATA_DIR, this.prefs.getString(prefix + GuestRunActivity.EXTRA_DATA_DIR, ""));
        intent.putExtra(GuestRunActivity.EXTRA_ABIS, this.prefs.getString(prefix + GuestRunActivity.EXTRA_ABIS, ""));
        intent.putExtra(GuestRunActivity.EXTRA_ARM32_LIB_COUNT, this.prefs.getInt(prefix + GuestRunActivity.EXTRA_ARM32_LIB_COUNT, 0));
        startActivity(intent);
    }

    private void showRunNotReady(String label) {
        new AlertDialog.Builder(this)
                .setTitle(label)
                .setMessage("아직 실행 엔진이 준비되지 않았습니다.\n\n'실행 전 APK 스캔'에서 필요한 보완 요소를 확인할 수 있습니다.")
                .setPositiveButton("스캔", (dialog, which) -> showRuntimeProbe())
                .setNegativeButton("확인", null)
                .show();
    }

    private void showInstalledAppInfo(String installId) {
        String prefix = "app." + installId + ".";
        String message = "게임 이름: " + this.prefs.getString(prefix + GuestRunActivity.EXTRA_LABEL, installId) + "\n패키지: " + this.prefs.getString(prefix + GuestRunActivity.EXTRA_PACKAGE, installId) + "\n버전: " + this.prefs.getString(prefix + "version_name", "") + " (" + this.prefs.getLong(prefix + "version_code", 0L) + ")\n대표 Activity: " + this.prefs.getString(prefix + "first_activity", "알 수 없음") + "\nABI: " + this.prefs.getString(prefix + GuestRunActivity.EXTRA_ABIS, "없음") + "\nARM32 라이브러리: " + this.prefs.getInt(prefix + GuestRunActivity.EXTRA_ARM32_LIB_COUNT, 0) + "\n설치 시간: " + this.prefs.getString(prefix + "installed_at", "") + "\n\n앱 폴더:\n" + this.prefs.getString(prefix + "app_dir", "") + "\n\n데이터 폴더:\n" + this.prefs.getString(prefix + GuestRunActivity.EXTRA_DATA_DIR, "");
        new AlertDialog.Builder(this).setTitle("앱 정보").setMessage(message).setPositiveButton("확인", (DialogInterface.OnClickListener) null).show();
    }

    private void confirmDeleteInstalledApp(final String installId) {
        String prefix = "app." + installId + ".";
        String label = this.prefs.getString(prefix + GuestRunActivity.EXTRA_LABEL, installId);
        new AlertDialog.Builder(this)
                .setTitle("삭제")
                .setMessage(label + "을(를) 가상폰에서 삭제할까요?")
                .setPositiveButton("삭제", (dialog, which) -> deleteInstalledApp(installId))
                .setNegativeButton("취소", null)
                .show();
    }

    private void deleteInstalledApp(String installId) {
        String prefix = "app." + installId + ".";
        clearVmChildPath(this.prefs.getString(prefix + "app_dir", ""));
        clearVmChildPath(this.prefs.getString(prefix + GuestRunActivity.EXTRA_DATA_DIR, ""));
        Set<String> installed = getInstalledPackages();
        installed.remove(installId);
        SharedPreferences.Editor editor = this.prefs.edit();
        editor.putStringSet(KEY_INSTALLED_PACKAGES, installed);
        if (installId.equals(this.prefs.getString(KEY_ACTIVE_PACKAGE, ""))) {
            editor.putString(KEY_ACTIVE_PACKAGE, installed.isEmpty() ? "" : installed.iterator().next());
        }
        String[] keys = {"display_name", GuestRunActivity.EXTRA_LABEL, GuestRunActivity.EXTRA_PACKAGE, "version_name", "version_code", "first_activity", "activity_count", "permission_count", GuestRunActivity.EXTRA_ABIS, "dex_count", "native_lib_count", GuestRunActivity.EXTRA_ARM32_LIB_COUNT, "arm64_lib_count", "extracted_lib_count", "asset_count", "archive_size", GuestRunActivity.EXTRA_APK_PATH, "app_dir", GuestRunActivity.EXTRA_LIB_DIR, "assets_dir", GuestRunActivity.EXTRA_DATA_DIR, "installed_at"};
        int length = keys.length;
        for (int i = 0; i < length; i++) {
            String key = keys[i];
            editor.remove(prefix + key);
        }
        editor.apply();
        try {
            writeVmManifest(installed);
        } catch (IOException e) {
            showError("manifest update failed", e.getMessage());
        }
        refreshState();
    }

    private void clearVmChildPath(String path) {
        if (path == null || path.isEmpty()) {
            return;
        }
        File target = new File(path);
        String rootPath = this.vmRoot.getAbsolutePath();
        String targetPath = target.getAbsolutePath();
        if (!targetPath.startsWith(rootPath + File.separator)) {
            return;
        }
        clearDirectory(target);
    }

    /**
     * Log viewer. Exists because the useful diagnostics live in app-private storage, which is
     * unreachable without adb or root — and adb is not an option for someone working phone-only.
     * Reading the tail rather than the whole file keeps a multi-megabyte QEMU boot log from
     * blowing up the dialog or the clipboard.
     */
    private void showLogs() {
        File logDir = new File(this.vmRoot, "logs");
        File[] files = logDir.listFiles();
        if (files == null || files.length == 0) {
            new AlertDialog.Builder(this)
                    .setTitle("로그")
                    .setMessage("아직 로그가 없습니다.\n\n" + logDir.getAbsolutePath()
                            + "\n\n게임을 한 번 실행하면 QEMU 부팅 로그가 여기에 쌓입니다.")
                    .setPositiveButton("확인", null)
                    .show();
            return;
        }
        // The QEMU serial log is the one worth sharing when a boot fails, but it is not the most
        // recently written file, so sorting purely by mtime buried it under the screen transcript
        // and led to the wrong file being reported. Rank it first and label what each one is.
        java.util.Arrays.sort(files, (a, b) -> {
            int byName = Integer.compare(logPriority(a.getName()), logPriority(b.getName()));
            return byName != 0 ? byName : Long.compare(b.lastModified(), a.lastModified());
        });
        String[] labels = new String[files.length];
        for (int i = 0; i < files.length; i++) {
            labels[i] = files[i].getName() + "  (" + humanSize(files[i].length()) + ")"
                    + describeLogFile(files[i].getName());
        }
        new AlertDialog.Builder(this)
                .setTitle("로그")
                .setItems(labels, (dialog, which) -> showLogFile(files[which]))
                .setNegativeButton("닫기", null)
                .show();
    }

    private static int logPriority(String name) {
        if ("qemu-modern.log".equals(name)) {
            return 0;
        }
        return "last_run.txt".equals(name) ? 1 : 2;
    }

    private static String describeLogFile(String name) {
        if ("qemu-modern.log".equals(name)) {
            return "\n★ 게스트 커널/시리얼 출력 — 부팅 실패는 이걸 보세요";
        }
        if ("last_run.txt".equals(name)) {
            return "\n화면에 표시된 실행 기록";
        }
        return "";
    }

    private void showLogFile(final File file) {
        final String tail = readTail(file, LOG_VIEW_TAIL_BYTES);
        String header = file.getName() + "  (" + humanSize(file.length()) + ")";
        if (file.length() > LOG_VIEW_TAIL_BYTES) {
            header += "\n※ 마지막 " + humanSize(LOG_VIEW_TAIL_BYTES) + "만 표시";
        }
        new AlertDialog.Builder(this)
                .setTitle(header)
                .setMessage(tail.isEmpty() ? "(비어 있음)" : tail)
                .setPositiveButton("복사", (dialog, which) -> copyToClipboard(file.getName(), tail))
                .setNeutralButton("공유", (dialog, which) -> shareText(file.getName(), tail))
                .setNegativeButton("닫기", null)
                .show();
    }

    /** Reads at most {@code maxBytes} from the end of the file, trimming the first partial line. */
    private String readTail(File file, int maxBytes) {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long length = raf.length();
            long from = Math.max(0L, length - maxBytes);
            raf.seek(from);
            byte[] buffer = new byte[(int) Math.min(length - from, maxBytes)];
            raf.readFully(buffer);
            String text = new String(buffer, StandardCharsets.UTF_8);
            if (from > 0) {
                int newline = text.indexOf('\n');
                if (newline >= 0 && newline + 1 < text.length()) {
                    text = text.substring(newline + 1);
                }
            }
            return text;
        } catch (IOException e) {
            return "로그를 읽을 수 없습니다: " + e.getMessage();
        }
    }

    private void copyToClipboard(String label, String text) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        if (clipboard == null) {
            showToast("클립보드를 사용할 수 없습니다.");
            return;
        }
        clipboard.setPrimaryClip(ClipData.newPlainText(label, text));
        showToast("복사했습니다 (" + humanSize(text.length()) + ")");
    }

    /**
     * Shares the log as plain text rather than as a file URI, which would need a ContentProvider
     * and an androidx dependency this project otherwise does not have. Intent extras cross a
     * Binder transaction with a hard size ceiling, so the payload is capped well below it.
     */
    private void shareText(String label, String text) {
        String payload = text;
        if (payload.length() > LOG_SHARE_MAX_CHARS) {
            payload = payload.substring(payload.length() - LOG_SHARE_MAX_CHARS);
        }
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, "singlevm " + label);
        intent.putExtra(Intent.EXTRA_TEXT, payload);
        startActivity(Intent.createChooser(intent, "로그 공유"));
    }

    private void showVmSettings() {
        EngineAdapter primaryEngine = EngineRegistry.primary();
        EngineReadiness primaryState = primaryEngine.inspect(this, this.vmRoot);
        EngineReadiness legacyState = EngineRegistry.legacy().inspect(this, this.vmRoot);
        String message = "가상롬 루트:\n" + this.vmRoot.getAbsolutePath() + "\n\nADB 설치 경로:\n" + this.externalGuestApk.getAbsolutePath() + "\n\n기본 엔진: " + primaryEngine.displayName() + "\n상태: " + primaryState.summary + "\n\n" + primaryState.details + "\n\n기존 시험 엔진: " + legacyState.summary + "\n\n설치된 게임 수: " + getInstalledPackages().size();
        new AlertDialog.Builder(this)
                .setTitle("설정")
                .setMessage(message)
                .setPositiveButton("확인", null)
                .setNeutralButton("Android 7 구성 가져오기", (dialog, which) -> openAndroid7ImagePicker())
                .setNegativeButton("가상롬 초기화", (dialog, which) -> confirmReset())
                .show();
    }

    private void openAndroid7ImagePicker() {
        Intent intent = new Intent("android.intent.action.OPEN_DOCUMENT");
        intent.addCategory("android.intent.category.OPENABLE");
        intent.setType("*/*");
        intent.putExtra("android.intent.extra.MIME_TYPES", new String[]{"application/zip", "application/octet-stream"});
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(intent, REQUEST_IMPORT_ANDROID7_IMAGE);
    }

    private void openApkPicker() {
        Intent intent = new Intent("android.intent.action.OPEN_DOCUMENT");
        intent.addCategory("android.intent.category.OPENABLE");
        intent.setType("*/*");
        intent.putExtra("android.intent.extra.MIME_TYPES", new String[]{"application/vnd.android.package-archive", "application/octet-stream"});
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(intent, REQUEST_IMPORT_APK);
    }

    @Override // android.app.Activity
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_IMPORT_APK && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri == null) {
                showToast("APK 파일을 읽을 수 없습니다.");
                return;
            }
            try {
                importApk(uri);
                return;
            } catch (IOException e) {
                showError("APK 가져오기 실패", e.getMessage());
                return;
            }
        }
        if (requestCode == REQUEST_IMPORT_ANDROID7_IMAGE && resultCode == RESULT_OK && data != null) {
            Uri uri2 = data.getData();
            if (uri2 == null) {
                showToast("구성 파일을 읽을 수 없습니다.");
            } else {
                importAndroid7ImageAsync(uri2);
            }
        }
    }

    private void importAndroid7ImageAsync(final Uri uri) {
        showToast("Android 7 구성 파일을 확인하는 중입니다.");
        new Thread(() -> {
            try {
                final String result = importAndroid7Image(uri);
                runOnUiThread(() -> showToast(result));
            } catch (IOException e) {
                final String message = e.getMessage();
                runOnUiThread(() -> showError("Android 7 구성 가져오기 실패", message));
            }
        }, "android7-image-import").start();
    }

    private String importAndroid7Image(Uri uri) throws IOException {
        String sourceName = getDisplayName(uri);
        if (sourceName != null && sourceName.toLowerCase(Locale.US).endsWith(".zip")) {
            return importAndroid7Bundle(uri);
        }
        String normalized = normalizeAndroid7ImageName(sourceName);
        if (normalized == null) {
            throw new IOException("지원 파일: Android 시스템 이미지 ZIP 또는 kernel, ramdisk.img, system.img, userdata.img");
        }
        if (!this.android7ImageDir.exists() && !this.android7ImageDir.mkdirs()) {
            throw new IOException("Android 7 이미지 폴더를 만들 수 없습니다.");
        }
        File destination = new File(this.android7ImageDir, normalized);
        copyUriToFile(uri, destination);
        return normalized + " 가져오기 완료";
    }

    private String importAndroid7Bundle(Uri uri) throws IOException {
        ensureVmDirs();
        if (!this.android7ImageDir.exists() && !this.android7ImageDir.mkdirs()) {
            throw new IOException("Android 7 이미지 폴더를 만들 수 없습니다.");
        }
        File bundle = new File(this.vmRoot, "android7-import.zip");
        copyUriToFile(uri, bundle);
        try {
            ZipFile zip = new ZipFile(bundle);
            try {
                ZipEntry kernel = findZipEntry(zip, "kernel-ranchu");
                if (kernel == null) {
                    kernel = findZipEntry(zip, "kernel-qemu");
                }
                if (kernel == null) {
                    kernel = findZipEntry(zip, "kernel");
                }
                ZipEntry ramdisk = findZipEntry(zip, "ramdisk.img");
                ZipEntry system = findZipEntry(zip, "system.img");
                ZipEntry userdata = findZipEntry(zip, "userdata.img");
                ZipEntry cache = findZipEntry(zip, "cache.img");
                // 우리 빌드가 넣어 주는 표식. 없으면 이 ZIP 은 우리 것이 아니다.
                ZipEntry stamp = findZipEntry(zip, "guest-image.prop");
                if (kernel == null || ramdisk == null || system == null) {
                    throw new IOException("ZIP에 kernel-ranchu/kernel-qemu, ramdisk.img, system.img가 필요합니다.");
                }
                long required = positiveSize(kernel) + positiveSize(ramdisk) + positiveSize(system)
                        + positiveSize(userdata) + positiveSize(cache) + IMAGE_EXTRACT_HEADROOM_BYTES;
                if (required > 0 && this.android7ImageDir.getUsableSpace() < required) {
                    throw new IOException("압축 해제 공간이 부족합니다. 최소 " + humanSize(required) + "가 필요합니다.");
                }
                extractZipEntry(zip, kernel, new File(this.android7ImageDir, "kernel"));
                extractZipEntry(zip, ramdisk, new File(this.android7ImageDir, "ramdisk.img"));
                extractZipEntry(zip, system, new File(this.android7ImageDir, "system.img"));
                if (userdata != null) {
                    extractZipEntry(zip, userdata, new File(this.android7ImageDir, "userdata.img"));
                }
                // cache.img 가 없으면 userdata 가 vdb 로 잡혀 fstab 매핑이 어긋난다.
                if (cache != null) {
                    extractZipEntry(zip, cache, new File(this.android7ImageDir, "cache.img"));
                }
                // 표식을 같이 심는다. 남겨 두면 부팅 전 점검이 어느 빌드인지 말해 주고,
                // 없으면 거절할 수 있다. 이전 임포트의 표식이 남아 새 이미지를 우리
                // 빌드로 둔갑시키지 않도록, 없을 때는 지운다.
                File stampFile = new File(this.android7ImageDir, "guest-image.prop");
                if (stamp != null) {
                    extractZipEntry(zip, stamp, stampFile);
                } else if (stampFile.exists() && !stampFile.delete()) {
                    stampFile.deleteOnExit();
                }
                zip.close();
                if (bundle.exists() && !bundle.delete()) {
                    bundle.deleteOnExit();
                }
                if (stamp == null) {
                    // 구글 SDK 의 system-image ZIP 을 집어넣으면 여기로 온다. 임포터가
                    // kernel-qemu 를 kernel 로 받아들이기 때문에 "완료"처럼 보이지만,
                    // 그 커널은 -machine virt 에서 시리얼 한 줄 못 찍고 죽고, 스톡
                    // 램디스크에는 cmdline 이 요구하는 /init.wrapper 가 없다.
                    return "가져왔지만 이 ZIP 은 이 앱의 게스트 이미지가 아닙니다"
                            + " (guest-image.prop 없음). SDK 원본 ZIP 으로는 부팅하지"
                            + " 않습니다. guest-image 빌드 아티팩트를 넣어 주세요.";
                }
                return "Android 7 ARM32 구성 가져오기 완료";
            } catch (Throwable th) {
                try {
                    zip.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
                throw th;
            }
        } catch (Throwable th3) {
            if (bundle.exists() && !bundle.delete()) {
                bundle.deleteOnExit();
            }
            throw th3;
        }
    }

    private ZipEntry findZipEntry(ZipFile zip, String fileName) {
        Enumeration<? extends ZipEntry> entries = zip.entries();
        while (entries.hasMoreElements()) {
            ZipEntry entry = entries.nextElement();
            if (!entry.isDirectory()) {
                String name = entry.getName().replace('\\', '/');
                int slash = name.lastIndexOf(47);
                String baseName = slash >= 0 ? name.substring(slash + 1) : name;
                if (baseName.equalsIgnoreCase(fileName)) {
                    return entry;
                }
            }
        }
        return null;
    }

    private long positiveSize(ZipEntry entry) {
        if (entry == null) {
            return 0L;
        }
        return Math.max(0L, entry.getSize());
    }

    private String humanSize(long bytes) {
        if (bytes >= 1073741824) {
            return String.format(Locale.US, "%.1f GB", Double.valueOf(bytes / 1.073741824E9d));
        }
        if (bytes >= 1048576) {
            return String.format(Locale.US, "%.1f MB", Double.valueOf(bytes / 1048576.0d));
        }
        return bytes + " bytes";
    }

    /**
     * Streams one zip entry to {@code destination} through a {@code .part} sidecar file so a
     * failed or interrupted extraction never leaves a half-written image behind.
     */
    private void extractZipEntry(ZipFile zip, ZipEntry entry, File destination) throws IOException {
        File partial = new File(destination.getParentFile(), destination.getName() + ".part");
        if (partial.exists() && !partial.delete()) {
            throw new IOException(partial.getName() + " 임시 파일을 정리할 수 없습니다.");
        }
        try {
            try (InputStream input = zip.getInputStream(entry);
                 OutputStream output = new FileOutputStream(partial)) {
                byte[] buffer = new byte[IMAGE_COPY_BUFFER_BYTES];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
            }
            if (destination.exists() && !destination.delete()) {
                partial.delete();
                throw new IOException(destination.getName() + " 기존 파일을 교체할 수 없습니다.");
            }
            if (!partial.renameTo(destination)) {
                partial.delete();
                throw new IOException(destination.getName() + " 파일을 확정할 수 없습니다.");
            }
        } catch (IOException e) {
            partial.delete();
            throw e;
        }
    }

    private String normalizeAndroid7ImageName(String name) {
        if (name == null) {
            return null;
        }
        String lower = name.trim().toLowerCase(Locale.US);
        if (lower.equals("kernel-android54")) {
            return "kernel-android54";
        }
        if (lower.equals("ramdisk-android54.img")) {
            return "ramdisk-android54.img";
        }
        if (lower.equals("kernel") || lower.equals("zimage") || lower.equals("kernel-ranchu") || lower.equals("kernel-qemu")) {
            return "kernel";
        }
        if (lower.equals("ramdisk.img")) {
            return "ramdisk.img";
        }
        if (lower.equals("system.img")) {
            return "system.img";
        }
        if (lower.equals("cache.img")) {
            return "cache.img";
        }
        if (!lower.equals("userdata.img")) {
            return null;
        }
        return "userdata.img";
    }

    private void importApk(Uri uri) throws IOException {
        ensureVmDirs();
        String displayName = getDisplayName(uri);
        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = "guest.apk";
        }
        File apkFile = new File(this.apkDir, "guest.apk");
        copyUriToFile(uri, apkFile);
        finishImportApk(apkFile, displayName);
        showToast("APK를 단일 가상롬 저장소에 가져왔습니다.");
    }

    private void importAdbGuestApk(boolean showMissingDialog) {
        ensureVmDirs();
        if (!this.externalGuestApk.exists()) {
            if (showMissingDialog) {
                showError("ADB guest.apk 없음", "다음 경로에 APK를 넣은 뒤 다시 누르세요.\n\n" + this.externalGuestApk.getAbsolutePath());
                return;
            }
            return;
        }
        try {
            File apkFile = new File(this.apkDir, "guest.apk");
            copyFileToFile(this.externalGuestApk, apkFile);
            finishImportApk(apkFile, this.externalGuestApk.getName());
            showToast("ADB guest.apk를 가져왔습니다.");
        } catch (IOException e) {
            showError("ADB APK 가져오기 실패", e.getMessage());
        }
    }

    private void finishImportApk(File apkFile, String displayName) throws IOException {
        String installId;
        if (!displayName.toLowerCase(Locale.US).endsWith(".apk")) {
            apkFile.delete();
            showError("지원하지 않는 파일", ".apk 파일을 선택해야 합니다.");
            return;
        }
        ApkReport report = inspectApk(apkFile);
        if (report.validApk) {
            String installId2 = sanitizePackageName(report.packageName);
            if (installId2.isEmpty()) {
                installId2 = sanitizePackageName(displayName.replace(".apk", ""));
            }
            if (!installId2.isEmpty()) {
                installId = installId2;
            } else {
                installId = "unknown_app";
            }
            File appDir = new File(this.appsDir, installId);
            File appApkFile = new File(appDir, "base.apk");
            File appLibDir = new File(appDir, "lib");
            File appAssetsDir = new File(appDir, "assets");
            File appDataDir = new File(this.dataDir, installId);
            clearDirectory(appDir);
            if (!appDir.exists() && !appDir.mkdirs()) {
                throw new IOException("설치 폴더를 만들 수 없습니다: " + appDir);
            }
            if (!appLibDir.exists() && !appLibDir.mkdirs()) {
                throw new IOException("라이브러리 폴더를 만들 수 없습니다: " + appLibDir);
            }
            if (!appDataDir.exists() && !appDataDir.mkdirs()) {
                throw new IOException("데이터 폴더를 만들 수 없습니다: " + appDataDir);
            }
            appAssetsDir.mkdirs();
            copyFileToFile(apkFile, appApkFile);
            int extractedLibs = extractArm32Libraries(appApkFile, appLibDir);
            int extractedAssets = extractApkAssets(appApkFile, appAssetsDir);
            clearDirectory(this.nativeLibDir);
            this.nativeLibDir.mkdirs();
            saveInstalledState(report, displayName, installId, appApkFile, appDir, appLibDir, appAssetsDir, appDataDir, extractedLibs, extractedAssets);
            refreshState();
            return;
        }
        apkFile.delete();
        showError("APK 분석 실패", "AndroidManifest.xml 또는 패키지 정보를 찾지 못했습니다.");
    }

    private ApkReport inspectApk(File apkFile) throws IOException {
        ApkReport report = new ApkReport();
        report.archiveSize = apkFile.length();
        ZipFile zip = new ZipFile(apkFile);
        try {
            report.validApk = zip.getEntry("AndroidManifest.xml") != null;
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (name.equals("classes.dex") || name.matches("classes\\d+\\.dex")) {
                    report.dexCount++;
                }
                if (name.startsWith("lib/") && name.endsWith(".so")) {
                    String[] parts = name.split("/");
                    if (parts.length >= 3) {
                        report.abis.add(parts[1]);
                        report.nativeLibCount++;
                        if ("armeabi".equals(parts[1]) || "armeabi-v7a".equals(parts[1])) {
                            report.arm32LibCount++;
                        }
                        if ("arm64-v8a".equals(parts[1])) {
                            report.arm64LibCount++;
                        }
                    }
                }
            }
            zip.close();
            PackageManager pm = getPackageManager();
            PackageInfo info = pm.getPackageArchiveInfo(apkFile.getAbsolutePath(),
                    PackageManager.GET_ACTIVITIES | PackageManager.GET_META_DATA | PackageManager.GET_PERMISSIONS);
            if (info == null) {
                report.validApk = false;
                return report;
            }
            report.packageName = info.packageName == null ? "" : info.packageName;
            report.versionName = info.versionName == null ? "" : info.versionName;
            report.versionCode = getVersionCode(info);
            if (info.activities != null && info.activities.length > 0) {
                ActivityInfo first = info.activities[0];
                report.firstActivity = first.name == null ? "" : first.name;
                report.activityCount = info.activities.length;
            }
            if (info.requestedPermissions != null) {
                report.permissionCount = info.requestedPermissions.length;
            }
            ApplicationInfo appInfo = info.applicationInfo;
            if (appInfo != null) {
                appInfo.sourceDir = apkFile.getAbsolutePath();
                appInfo.publicSourceDir = apkFile.getAbsolutePath();
                CharSequence label = appInfo.loadLabel(pm);
                report.appLabel = label != null ? label.toString() : "";
            }
            return report;
        } catch (Throwable th) {
            try {
                zip.close();
            } catch (Throwable th2) {
                th.addSuppressed(th2);
            }
            throw th;
        }
    }

    private int extractArm32Libraries(File apkFile, File targetLibDir) throws IOException {
        int count = 0;
        ZipFile zip = new ZipFile(apkFile);
        try {
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!entry.isDirectory() && name.startsWith("lib/") && name.endsWith(".so")) {
                    String[] parts = name.split("/");
                    if (parts.length >= 3) {
                        String abi = parts[1];
                        if ("armeabi".equals(abi) || "armeabi-v7a".equals(abi)) {
                            File abiDir = new File(targetLibDir, abi);
                            if (!abiDir.exists() && !abiDir.mkdirs()) {
                                throw new IOException("네이티브 라이브러리 폴더를 만들 수 없습니다: " + abiDir);
                            }
                            File out = new File(abiDir, new File(name).getName());
                            InputStream in = zip.getInputStream(entry);
                            try {
                                OutputStream output = new FileOutputStream(out);
                                try {
                                    copy(in, output);
                                    output.close();
                                    if (in != null) {
                                        in.close();
                                    }
                                    count++;
                                } catch (Throwable th) {
                                    try {
                                        output.close();
                                    } catch (Throwable th2) {
                                        th.addSuppressed(th2);
                                    }
                                    throw th;
                                }
                            } catch (Throwable th3) {
                                if (in != null) {
                                    try {
                                        in.close();
                                    } catch (Throwable th4) {
                                        th3.addSuppressed(th4);
                                    }
                                }
                                throw th3;
                            }
                        }
                    }
                }
            }
            zip.close();
            return count;
        } catch (Throwable th5) {
            try {
                zip.close();
            } catch (Throwable th6) {
                th5.addSuppressed(th6);
            }
            throw th5;
        }
    }

    private int extractApkAssets(File apkFile, File targetAssetsDir) throws IOException {
        int count = 0;
        ZipFile zip = new ZipFile(apkFile);
        try {
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!entry.isDirectory() && name.startsWith("assets/")) {
                    String relative = name.substring("assets/".length());
                    if (!relative.isEmpty()) {
                        File out = new File(targetAssetsDir, relative);
                        File parent = out.getParentFile();
                        if (parent != null && !parent.exists() && !parent.mkdirs()) {
                            throw new IOException("Cannot create assets directory: " + parent);
                        }
                        InputStream in = zip.getInputStream(entry);
                        try {
                            OutputStream output = new FileOutputStream(out);
                            try {
                                copy(in, output);
                                output.close();
                                if (in != null) {
                                    in.close();
                                }
                                count++;
                            } catch (Throwable th) {
                                try {
                                    output.close();
                                } catch (Throwable th2) {
                                    th.addSuppressed(th2);
                                }
                                throw th;
                            }
                        } catch (Throwable th3) {
                            if (in != null) {
                                try {
                                    in.close();
                                } catch (Throwable th4) {
                                    th3.addSuppressed(th4);
                                }
                            }
                            throw th3;
                        }
                    }
                }
            }
            zip.close();
            return count;
        } catch (Throwable th5) {
            try {
                zip.close();
            } catch (Throwable th6) {
                th5.addSuppressed(th6);
            }
            throw th5;
        }
    }

    private void saveInstalledState(ApkReport report, String displayName, String installId, File apkFile, File appDir, File appLibDir, File appAssetsDir, File appDataDir, int extractedLibs, int extractedAssets) throws IOException {
        Set<String> installed = getInstalledPackages();
        installed.add(installId);
        String installedAt = now();
        String prefix = "app." + installId + ".";
        this.prefs.edit().putBoolean("has_apk", true).putStringSet(KEY_INSTALLED_PACKAGES, installed).putString(KEY_ACTIVE_PACKAGE, installId).putString("display_name", displayName).putString(GuestRunActivity.EXTRA_LABEL, emptyToFallback(report.appLabel, displayName)).putString(GuestRunActivity.EXTRA_PACKAGE, report.packageName).putString("version_name", report.versionName).putLong("version_code", report.versionCode).putString("first_activity", report.firstActivity).putInt("activity_count", report.activityCount).putInt("permission_count", report.permissionCount).putString(GuestRunActivity.EXTRA_ABIS, join(report.abis)).putInt("dex_count", report.dexCount).putInt("native_lib_count", report.nativeLibCount).putInt(GuestRunActivity.EXTRA_ARM32_LIB_COUNT, report.arm32LibCount).putInt("arm64_lib_count", report.arm64LibCount).putInt("extracted_lib_count", extractedLibs).putInt("asset_count", extractedAssets).putLong("archive_size", report.archiveSize).putString(GuestRunActivity.EXTRA_APK_PATH, apkFile.getAbsolutePath()).putString("imported_at", installedAt).putString(prefix + "display_name", displayName).putString(prefix + GuestRunActivity.EXTRA_LABEL, emptyToFallback(report.appLabel, displayName)).putString(prefix + GuestRunActivity.EXTRA_PACKAGE, report.packageName).putString(prefix + "version_name", report.versionName).putLong(prefix + "version_code", report.versionCode).putString(prefix + "first_activity", report.firstActivity).putInt(prefix + "activity_count", report.activityCount).putInt(prefix + "permission_count", report.permissionCount).putString(prefix + GuestRunActivity.EXTRA_ABIS, join(report.abis)).putInt(prefix + "dex_count", report.dexCount).putInt(prefix + "native_lib_count", report.nativeLibCount).putInt(prefix + GuestRunActivity.EXTRA_ARM32_LIB_COUNT, report.arm32LibCount).putInt(prefix + "arm64_lib_count", report.arm64LibCount).putInt(prefix + "extracted_lib_count", extractedLibs).putInt(prefix + "asset_count", extractedAssets).putLong(prefix + "archive_size", report.archiveSize).putString(prefix + GuestRunActivity.EXTRA_APK_PATH, apkFile.getAbsolutePath()).putString(prefix + "app_dir", appDir.getAbsolutePath()).putString(prefix + GuestRunActivity.EXTRA_LIB_DIR, appLibDir.getAbsolutePath()).putString(prefix + "assets_dir", appAssetsDir.getAbsolutePath()).putString(prefix + GuestRunActivity.EXTRA_DATA_DIR, appDataDir.getAbsolutePath()).putString(prefix + "installed_at", installedAt).apply();
        writeAppManifest(report, displayName, installId, apkFile, appDir, appLibDir, appAssetsDir, appDataDir, extractedLibs, extractedAssets, installedAt);
        writeVmManifest(installed);
    }

    private void refreshState() {
        ensureVmDirs();
        refreshAppGrid();
        Set<String> installed = getInstalledPackages();
        if (installed.isEmpty()) {
            this.statusView.setText("설치된 게임이 없습니다.");
            this.detailsView.setText("");
            return;
        }
        String active = this.prefs.getString(KEY_ACTIVE_PACKAGE, "");
        if (active.isEmpty() || !installed.contains(active)) {
            active = installed.iterator().next();
        }
        String str = "app." + active + ".";
        this.statusView.setText("설치된 게임 " + installed.size() + "개");
        this.detailsView.setText("");
    }

    private void showRuntimeProbe() {
        Set<String> installed = getInstalledPackages();
        String active = this.prefs.getString(KEY_ACTIVE_PACKAGE, "");
        if ((active.isEmpty() || !installed.contains(active)) && !installed.isEmpty()) {
            active = installed.iterator().next();
        }
        String activePrefix = "app." + active + ".";
        String imported = installed.isEmpty() ? "없음" : "있음";
        String activeLabel = active.isEmpty() ? "없음" : this.prefs.getString(activePrefix + GuestRunActivity.EXTRA_LABEL, active);
        int arm32Libs = active.isEmpty() ? 0 : this.prefs.getInt(activePrefix + GuestRunActivity.EXTRA_ARM32_LIB_COUNT, 0);
        String message = "실행 전 스캔 결과\n\n현재 구현됨\n- 단일 가상롬 저장소 생성\n- APK 가져오기\n- 패키지/ABI 분석\n- armeabi / armeabi-v7a 라이브러리 추출\n- ARM32 ELF 구조 분석\n- 의존 라이브러리 / relocation / undefined symbol 일부 분석\n\n현재 상태\n- 설치된 게임: " + installed.size() + "개\n- 선택된 게임: " + activeLabel + "\n- APK 설치 상태: " + imported + "\n- 선택된 게임 ARM32 라이브러리 수: " + arm32Libs + "\n\n실행 불가 시 보완해야 하는 핵심 엔진\n- ARM32 ELF 로더\n- ARM32 to arm64 실행기 또는 인터프리터\n- 32비트 bionic/linker 호환 계층\n- Android framework/Binder/Surface/Audio bridge\n\n따라서 지금 단계에서는 실행 가능 여부를 미리 스캔하고, 부족한 실행 계층을 구체적으로 파악합니다.";
        String nativeReport = getNativeProbeReport(active);
        EngineAdapter primaryEngine = EngineRegistry.primary();
        EngineReadiness primaryState = primaryEngine.inspect(this, this.vmRoot);
        new AlertDialog.Builder(this)
                .setTitle("실행 전 APK 스캔")
                .setMessage(describeDeviceAbis() + "\n\n" + message
                        + "\n\n기본 실행 엔진\n" + primaryEngine.displayName() + "\n"
                        + primaryState.summary + "\n" + primaryState.details
                        + "\n\n기존 네이티브 진단 브릿지\n" + nativeReport)
                .setPositiveButton("확인", null)
                .show();
    }

    /**
     * Reports whether this device can execute 32-bit ARM code at all.
     *
     * <p>This is the single most important fact for the app's goal. SoCs built only from
     * AArch64-only cores (Cortex-X4 / A720 / A520 and later) cannot decode AArch32 instructions
     * in userspace, so on those devices no amount of container work will run an armeabi-v7a
     * library natively — translation or emulation is the only option. Where a 32-bit ABI is
     * present, running the guest's libraries directly is both possible and far faster than
     * emulating a whole guest OS.
     */
    private String describeDeviceAbis() {
        String[] abis32 = Build.SUPPORTED_32_BIT_ABIS;
        boolean has32 = abis32 != null && abis32.length > 0;
        StringBuilder out = new StringBuilder();
        out.append("기기 ABI 지원\n");
        out.append("- 전체: ").append(joinArray(Build.SUPPORTED_ABIS)).append('\n');
        out.append("- 32비트: ").append(joinArray(abis32)).append('\n');
        out.append("- 64비트: ").append(joinArray(Build.SUPPORTED_64_BIT_ABIS)).append('\n');
        if (has32) {
            out.append("→ 이 기기는 32비트 프로세스를 만들 수 있습니다. ARM32 라이브러리를\n")
                    .append("  네이티브 속도로 실행 가능하므로 전체 시스템 에뮬레이션이 필요하지 않습니다.");
        } else {
            out.append("→ 이 기기는 32비트 ARM을 아예 실행할 수 없습니다(64비트 전용 CPU).\n")
                    .append("  ARM32 코드를 돌리려면 번역 계층이나 에뮬레이션이 반드시 필요합니다.");
        }
        return out.toString();
    }

    private String joinArray(String[] values) {
        if (values == null || values.length == 0) {
            return "없음";
        }
        StringBuilder out = new StringBuilder();
        for (String value : values) {
            if (out.length() > 0) {
                out.append(", ");
            }
            out.append(value);
        }
        return out.toString();
    }

    private String getNativeProbeReport(String installId) {
        if (!NATIVE_RUNTIME_LOADED) {
            return "Native bridge: load failed";
        }
        try {
            return nativeProbeRuntime(this.vmRoot.getAbsolutePath(), installId == null ? "" : installId);
        } catch (RuntimeException e) {
            return "Native bridge: probe failed - " + e.getMessage();
        } catch (UnsatisfiedLinkError e2) {
            return "Native bridge: JNI missing - " + e2.getMessage();
        }
    }

    private void confirmReset() {
        new AlertDialog.Builder(this)
                .setTitle("가상롬 초기화")
                .setMessage("가져온 APK와 추출된 라이브러리, 단일 가상롬 데이터 영역을 삭제합니다.")
                .setPositiveButton("초기화", (dialog, which) -> resetVm())
                .setNegativeButton("취소", null)
                .show();
    }

    private void resetVm() {
        clearDirectory(this.vmRoot);
        this.prefs.edit().clear().apply();
        ensureVmDirs();
        refreshState();
        showToast("가상롬을 초기화했습니다.");
    }

    private void ensureVmDirs() {
        List<File> dirs = new ArrayList<>();
        dirs.add(this.vmRoot);
        dirs.add(this.apkDir);
        dirs.add(this.appsDir);
        dirs.add(this.dataDir);
        dirs.add(this.nativeLibDir);
        dirs.add(this.logsDir);
        dirs.add(this.externalImportDir);
        dirs.add(this.android7ImageDir);
        for (File dir : dirs) {
            if (!dir.exists()) {
                dir.mkdirs();
            }
        }
        syncManifestFilesQuietly();
    }

    private void copyUriToFile(Uri uri, File outFile) throws IOException {
        InputStream input = getContentResolver().openInputStream(uri);
        try {
            OutputStream output = new FileOutputStream(outFile);
            try {
                if (input == null) {
                    throw new IOException("선택한 파일을 열 수 없습니다.");
                }
                copy(input, output);
                output.close();
                if (input != null) {
                    input.close();
                }
            } catch (Throwable th) {
                try {
                    output.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
                throw th;
            }
        } catch (Throwable th3) {
            if (input != null) {
                try {
                    input.close();
                } catch (Throwable th4) {
                    th3.addSuppressed(th4);
                }
            }
            throw th3;
        }
    }

    private void copyFileToFile(File inputFile, File outFile) throws IOException {
        InputStream input = new FileInputStream(inputFile);
        try {
            OutputStream output = new FileOutputStream(outFile);
            try {
                copy(input, output);
                output.close();
                input.close();
            } catch (Throwable th) {
                try {
                    output.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
                throw th;
            }
        } catch (Throwable th3) {
            try {
                input.close();
            } catch (Throwable th4) {
                th3.addSuppressed(th4);
            }
            throw th3;
        }
    }

    private void copy(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[65536];
        while (true) {
            int read = input.read(buffer);
            if (read != -1) {
                output.write(buffer, 0, read);
            } else {
                return;
            }
        }
    }

    private String getDisplayName(Uri uri) {
        int index;
        try {
            Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst() && (index = cursor.getColumnIndex("_display_name")) >= 0) {
                        String string = cursor.getString(index);
                        if (cursor != null) {
                            cursor.close();
                        }
                        return string;
                    }
                } catch (Throwable th) {
                    if (cursor != null) {
                        try {
                            cursor.close();
                        } catch (Throwable th2) {
                            th.addSuppressed(th2);
                        }
                    }
                    throw th;
                }
            }
            if (cursor != null) {
                cursor.close();
            }
        } catch (Exception e) {
        }
        String last = uri.getLastPathSegment();
        return last == null ? "guest.apk" : last;
    }

    private void clearDirectory(File file) {
        File[] children;
        if (!file.exists()) {
            return;
        }
        if (file.isDirectory() && (children = file.listFiles()) != null) {
            int length = children.length;
            for (int i = 0; i < length; i++) {
                File child = children[i];
                clearDirectory(child);
            }
        }
        if (!file.equals(this.vmRoot)) {
            file.delete();
        }
    }

    private long getVersionCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28) {
            return info.getLongVersionCode();
        }
        return info.versionCode;
    }

    private String join(Set<String> values) {
        if (values.isEmpty()) {
            return "없음";
        }
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (builder.length() > 0) {
                builder.append(", ");
            }
            builder.append(value);
        }
        return builder.toString();
    }

    private void writeVmManifest(Set<String> installed) throws IOException {
        try {
            JSONObject manifest = new JSONObject();
            JSONArray apps = new JSONArray();
            for (String installId : installed) {
                apps.put(installId);
            }
            manifest.put("schema", "single-vm");
            manifest.put("version", MANIFEST_SCHEMA_VERSION);
            manifest.put("updated_at", now());
            manifest.put("vm_root", this.vmRoot.getAbsolutePath());
            manifest.put("apps_dir", this.appsDir.getAbsolutePath());
            manifest.put(GuestRunActivity.EXTRA_DATA_DIR, this.dataDir.getAbsolutePath());
            manifest.put(KEY_ACTIVE_PACKAGE, this.prefs.getString(KEY_ACTIVE_PACKAGE, ""));
            manifest.put(KEY_INSTALLED_PACKAGES, apps);
            writeJsonFile(new File(this.vmRoot, "config.json"), manifest);
        } catch (JSONException e) {
            throw new IOException("VM manifest JSON creation failed", e);
        }
    }

    private void writeAppManifest(ApkReport report, String displayName, String installId, File apkFile, File appDir, File appLibDir, File appAssetsDir, File appDataDir, int extractedLibs, int extractedAssets, String installedAt) throws IOException {
        try {
            JSONArray abis = new JSONArray();
            for (String abi : report.abis) {
                abis.put(abi);
            }
            JSONObject manifest = new JSONObject();
            manifest.put("schema", "single-vm-app");
            manifest.put("version", MANIFEST_SCHEMA_VERSION);
            manifest.put(GuestRunActivity.EXTRA_INSTALL_ID, installId);
            manifest.put("display_name", displayName);
            manifest.put(GuestRunActivity.EXTRA_LABEL, emptyToFallback(report.appLabel, displayName));
            manifest.put(GuestRunActivity.EXTRA_PACKAGE, report.packageName);
            manifest.put("version_name", report.versionName);
            manifest.put("version_code", report.versionCode);
            manifest.put("first_activity", report.firstActivity);
            manifest.put("activity_count", report.activityCount);
            manifest.put("permission_count", report.permissionCount);
            manifest.put("dex_count", report.dexCount);
            manifest.put("native_lib_count", report.nativeLibCount);
            manifest.put(GuestRunActivity.EXTRA_ARM32_LIB_COUNT, report.arm32LibCount);
            manifest.put("arm64_lib_count", report.arm64LibCount);
            manifest.put("extracted_lib_count", extractedLibs);
            manifest.put("asset_count", extractedAssets);
            manifest.put("archive_size", report.archiveSize);
            manifest.put(GuestRunActivity.EXTRA_ABIS, abis);
            manifest.put(GuestRunActivity.EXTRA_APK_PATH, apkFile.getAbsolutePath());
            manifest.put("app_dir", appDir.getAbsolutePath());
            manifest.put(GuestRunActivity.EXTRA_LIB_DIR, appLibDir.getAbsolutePath());
            manifest.put("assets_dir", appAssetsDir.getAbsolutePath());
            manifest.put(GuestRunActivity.EXTRA_DATA_DIR, appDataDir.getAbsolutePath());
            manifest.put("installed_at", installedAt);
            writeJsonFile(new File(appDir, "manifest.json"), manifest);
        } catch (JSONException e) {
            throw new IOException("App manifest JSON creation failed", e);
        }
    }

    private void writeJsonFile(File file, JSONObject json) throws IOException {
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("Cannot create manifest directory: " + parent);
        }
        try {
            FileOutputStream out = new FileOutputStream(file);
            try {
                out.write(json.toString(2).getBytes(StandardCharsets.UTF_8));
                out.write(10);
                out.close();
            } catch (Throwable th) {
                try {
                    out.close();
                } catch (Throwable th2) {
                    th.addSuppressed(th2);
                }
                throw th;
            }
        } catch (JSONException e) {
            throw new IOException("JSON formatting failed", e);
        }
    }

    private void syncManifestFilesQuietly() {
        if (this.prefs == null || this.vmRoot == null) {
            return;
        }
        try {
            Set<String> installed = getInstalledPackages();
            writeVmManifest(installed);
            for (String installId : installed) {
                writePrefsBackedAppManifest(installId);
            }
        } catch (IOException e) {
        }
    }

    private void writePrefsBackedAppManifest(String installId) throws IOException {
        String prefix = "app." + installId + ".";
        String appDirPath = this.prefs.getString(prefix + "app_dir", "");
        if (appDirPath.isEmpty()) {
            return;
        }
        try {
            JSONObject manifest = new JSONObject();
            manifest.put("schema", "single-vm-app");
            manifest.put("version", MANIFEST_SCHEMA_VERSION);
            manifest.put(GuestRunActivity.EXTRA_INSTALL_ID, installId);
            manifest.put("display_name", this.prefs.getString(prefix + "display_name", installId));
            manifest.put(GuestRunActivity.EXTRA_LABEL, this.prefs.getString(prefix + GuestRunActivity.EXTRA_LABEL, installId));
            manifest.put(GuestRunActivity.EXTRA_PACKAGE, this.prefs.getString(prefix + GuestRunActivity.EXTRA_PACKAGE, ""));
            manifest.put("version_name", this.prefs.getString(prefix + "version_name", ""));
            manifest.put("version_code", this.prefs.getLong(prefix + "version_code", 0L));
            manifest.put("first_activity", this.prefs.getString(prefix + "first_activity", ""));
            manifest.put("activity_count", this.prefs.getInt(prefix + "activity_count", 0));
            manifest.put("permission_count", this.prefs.getInt(prefix + "permission_count", 0));
            manifest.put("dex_count", this.prefs.getInt(prefix + "dex_count", 0));
            manifest.put("native_lib_count", this.prefs.getInt(prefix + "native_lib_count", 0));
            manifest.put(GuestRunActivity.EXTRA_ARM32_LIB_COUNT, this.prefs.getInt(prefix + GuestRunActivity.EXTRA_ARM32_LIB_COUNT, 0));
            manifest.put("arm64_lib_count", this.prefs.getInt(prefix + "arm64_lib_count", 0));
            manifest.put("extracted_lib_count", this.prefs.getInt(prefix + "extracted_lib_count", 0));
            manifest.put("asset_count", this.prefs.getInt(prefix + "asset_count", 0));
            manifest.put("archive_size", this.prefs.getLong(prefix + "archive_size", 0L));
            manifest.put(GuestRunActivity.EXTRA_ABIS,
                    new JSONArray((Collection<?>) splitCommaList(this.prefs.getString(prefix + GuestRunActivity.EXTRA_ABIS, ""))));
            manifest.put(GuestRunActivity.EXTRA_APK_PATH, this.prefs.getString(prefix + GuestRunActivity.EXTRA_APK_PATH, ""));
            manifest.put("app_dir", appDirPath);
            manifest.put(GuestRunActivity.EXTRA_LIB_DIR, this.prefs.getString(prefix + GuestRunActivity.EXTRA_LIB_DIR, ""));
            manifest.put("assets_dir", this.prefs.getString(prefix + "assets_dir", ""));
            manifest.put(GuestRunActivity.EXTRA_DATA_DIR, this.prefs.getString(prefix + GuestRunActivity.EXTRA_DATA_DIR, ""));
            manifest.put("installed_at", this.prefs.getString(prefix + "installed_at", ""));
            writeJsonFile(new File(appDirPath, "manifest.json"), manifest);
        } catch (JSONException e) {
            throw new IOException("App manifest JSON creation failed", e);
        }
    }

    private List<String> splitCommaList(String value) {
        List<String> out = new ArrayList<>();
        if (value == null || value.trim().isEmpty() || value.contains("?")) {
            return out;
        }
        String[] parts = value.split(",");
        int length = parts.length;
        for (int i = 0; i < length; i++) {
            String part = parts[i];
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                out.add(trimmed);
            }
        }
        return out;
    }

    private Set<String> getInstalledPackages() {
        Set<String> stored = this.prefs.getStringSet(KEY_INSTALLED_PACKAGES, null);
        if (stored == null) {
            return new LinkedHashSet<>();
        }
        return new LinkedHashSet<>(stored);
    }

    private String sanitizePackageName(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if ((c >= 'a' && c <= 'z') || ((c >= 'A' && c <= 'Z') || ((c >= '0' && c <= '9') || c == '.' || c == '_' || c == '-'))) {
                out.append(c);
            } else {
                out.append('_');
            }
        }
        return out.toString();
    }

    private String emptyToFallback(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value;
    }

    private String now() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.KOREA).format(new Date());
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showError(String title, String message) {
        new AlertDialog.Builder(this).setTitle(title).setMessage(message == null ? "알 수 없는 오류" : message).setPositiveButton("확인", (DialogInterface.OnClickListener) null).show();
    }

    private int dp(int value) {
        return (int) ((value * getResources().getDisplayMetrics().density) + 0.5f);
    }

    private static final class ApkReport {
        final LinkedHashSet<String> abis;
        int activityCount;
        String appLabel;
        long archiveSize;
        int arm32LibCount;
        int arm64LibCount;
        int dexCount;
        String firstActivity;
        int nativeLibCount;
        String packageName;
        int permissionCount;
        boolean validApk;
        long versionCode;
        String versionName;

        private ApkReport() {
            this.appLabel = "";
            this.packageName = "";
            this.versionName = "";
            this.firstActivity = "";
            this.abis = new LinkedHashSet<>();
        }
    }
}
