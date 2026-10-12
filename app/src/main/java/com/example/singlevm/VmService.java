package com.example.singlevm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * 가상롬을 살려 두는 포그라운드 서비스. ":vm" 프로세스에서 돈다.
 *
 * <p>앱을 열면 {@link MainActivity} 가 이걸 켜고, 서비스가 {@link GuestVm} 의 부팅을 시작한다.
 * 실행 화면은 이미 돌고 있는 가상롬에 화면만 붙이므로, 게임을 누를 때마다 안드로이드를 처음부터
 * 부팅하지 않는다. 화면을 떠나도 꺼지지 않게 하려면 포그라운드 서비스여야 한다 — 그렇지 않으면
 * 시스템이 백그라운드의 ":vm" 프로세스를 곧 회수한다.
 *
 * <p>대가는 메모리 약 1 GB 와 배터리다. 그래서 알림에 "끄기" 를 둔다.
 */
public class VmService extends Service {
    static final String ACTION_START = "com.example.singlevm.vm.START";
    static final String ACTION_STOP = "com.example.singlevm.vm.STOP";
    private static final String CHANNEL_ID = "vm";
    private static final int NOTIFICATION_ID = 7;

    /** 가상롬을 켠다. 이미 켜져 있으면 아무 일도 없다. 포그라운드에 있는 화면에서 부를 것. */
    public static void start(Context context) {
        Intent intent = new Intent(context, VmService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    /** 가상롬을 끈다. 꺼져 있으면 아무 일도 없다. 앱을 닫을 때 부른다. */
    public static void stop(Context context) {
        try {
            context.startService(new Intent(context, VmService.class).setAction(ACTION_STOP));
        } catch (RuntimeException e) {
            // 앱이 이미 백그라운드로 판정돼 startService 가 막히면 onTaskRemoved 가 대신 끈다.
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            // startForegroundService() 로 불렸을 수 있으므로 내려가기 전에 한 번은 올라가야 한다.
            goForeground();
            GuestVm.get(this).stop("알림에서 끄기");
            stopForegroundCompat();
            stopSelf();
            return START_NOT_STICKY;
        }
        goForeground();
        GuestVm vm = GuestVm.get(this);
        // 가상롬이 스스로 꺼지면(게스트 종료, QEMU 오류) 서비스도 따라 내려가 알림을 치운다.
        vm.setOnExit(() -> {
            stopForegroundCompat();
            stopSelf();
        });
        // 부팅 준비(사전 검사, 렌더러 준비, 명령줄 조립)는 디스크를 읽으므로 메인 스레드 밖에서.
        new Thread(vm::ensureStarted, "single-vm-start").start();
        // 프로세스가 죽었다 살아나도 가상롬을 몰래 다시 켜지 않는다. 다음에 앱을 열 때 켠다.
        return START_NOT_STICKY;
    }

    /**
     * 사용자가 최근 앱 목록에서 앱을 밀어 치우면 여기로 온다. 앱이 없는데 가상롬만 백그라운드에서
     * 메모리 1 GB 를 쥐고 돌면 안 되므로 같이 끈다. ":vm" 프로세스는 앱 프로세스와 별개라 앱이
     * 죽어도 저절로 따라 죽지 않는다 — 그래서 명시적으로 끈다.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        GuestVm.get(this).stop("앱 종료");
        stopForegroundCompat();
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        GuestVm.get(this).stop("서비스 종료");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void goForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @SuppressWarnings("deprecation")
    private void stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    @SuppressWarnings("deprecation")
    private Notification buildNotification() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT
                | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent open = PendingIntent.getActivity(this, 0,
                new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), flags);
        PendingIntent stop = PendingIntent.getService(this, 1,
                new Intent(this, VmService.class).setAction(ACTION_STOP), flags);
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID, "가상롬", NotificationManager.IMPORTANCE_LOW);
                channel.setDescription("가상롬이 켜져 있는 동안 표시됩니다.");
                manager.createNotificationChannel(channel);
            }
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        return builder
                .setSmallIcon(R.drawable.ic_cmd_scan)
                .setContentTitle("가상롬 실행 중")
                .setContentText("Android 7 · 게임을 바로 실행할 수 있습니다")
                .setContentIntent(open)
                .setOngoing(true)
                .addAction(new Notification.Action.Builder(null, "끄기", stop).build())
                .build();
    }
}
