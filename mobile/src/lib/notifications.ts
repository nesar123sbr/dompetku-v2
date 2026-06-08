import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { formatRupiah } from "@/utils";

export type LocalNotificationPermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};

export const REMINDER_NOTIFICATION_CHANNEL_ID = "pengingat-tagihan-v3";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  ios?: {
    status: number;
  };
};

function isIosNotificationGranted(settings: PermissionSnapshot) {
  const iosStatus = settings.ios?.status;

  return (
    settings.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function buildReminderTriggerDate(
  tanggalJatuhTempo: string,
  jamPengingat: string
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalJatuhTempo)) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(jamPengingat)) {
    return null;
  }

  const [year, month, day] = tanggalJatuhTempo.split("-").map(Number);
  const [hour, minute] = jamPengingat.split(":").map(Number);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export async function ensureReminderNotificationChannelAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    REMINDER_NOTIFICATION_CHANNEL_ID,
    {
      name: "Pengingat Tagihan",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    }
  );
}

export async function getLocalNotificationPermissionSnapshotAsync(): Promise<LocalNotificationPermissionSnapshot> {
  const settings =
    (await Notifications.getPermissionsAsync()) as unknown as PermissionSnapshot;

  const granted =
    Platform.OS === "ios"
      ? isIosNotificationGranted(settings)
      : settings.granted;

  return {
    granted: Boolean(granted),
    canAskAgain: settings.canAskAgain ?? true,
    status: String(settings.status),
  };
}

export async function requestLocalNotificationPermissionsAsync(): Promise<LocalNotificationPermissionSnapshot> {
  await ensureReminderNotificationChannelAsync();

  const current = await getLocalNotificationPermissionSnapshotAsync();

  if (current.granted) {
    return current;
  }

  const next =
    (await Notifications.requestPermissionsAsync()) as unknown as PermissionSnapshot;

  const granted =
    Platform.OS === "ios" ? isIosNotificationGranted(next) : next.granted;

  return {
    granted: Boolean(granted),
    canAskAgain: next.canAskAgain ?? true,
    status: String(next.status),
  };
}

function buildDateTrigger(triggerDate: Date) {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    } as any;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerDate,
  } as any;
}

function buildTimeIntervalTrigger(seconds: number) {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    } as any;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
  } as any;
}

export async function scheduleReminderNotificationAsync(payload: {
  reminderId: string;
  judul: string;
  nominal: number;
  tanggalJatuhTempo: string;
  jamPengingat: string;
  catatan?: string | null;
}) {
  await ensureReminderNotificationChannelAsync();

  const triggerDate = buildReminderTriggerDate(
    payload.tanggalJatuhTempo,
    payload.jamPengingat
  );

  if (!triggerDate) {
    return {
      notificationId: null,
      scheduledDate: null,
      reason: "waktu_tidak_valid",
    };
  }

  if (triggerDate.getTime() <= Date.now() + 3000) {
    return {
      notificationId: null,
      scheduledDate: triggerDate,
      reason: "waktu_terlewat",
    };
  }

  const body =
    payload.nominal > 0
      ? `${formatRupiah(payload.nominal)} jatuh tempo pada ${payload.tanggalJatuhTempo}`
      : `Tagihan jatuh tempo pada ${payload.tanggalJatuhTempo}`;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Pengingat tagihan: ${payload.judul}`,
      body: payload.catatan?.trim()
        ? `${body}\n${payload.catatan.trim()}`
        : body,
      data: {
        pathname: "/pengingat",
        pengingatId: payload.reminderId,
        sumber: "pengingat_tagihan",
      },
    },
    trigger: buildDateTrigger(triggerDate),
  });

  return {
    notificationId,
    scheduledDate: triggerDate,
    reason: null,
  };
}

export async function scheduleTestNotificationInFiveSecondsAsync() {
  await ensureReminderNotificationChannelAsync();

  const permission = await requestLocalNotificationPermissionsAsync();

  if (!permission.granted) {
    return {
      notificationId: null,
      permissionGranted: false,
    };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tes notifikasi DompetKu",
      body: "Kalau ini muncul, notifikasi lokal di perangkat ini sudah berjalan.",
      data: {
        sumber: "tes_notifikasi",
      },
    },
    trigger: buildTimeIntervalTrigger(5),
  });

  return {
    notificationId,
    permissionGranted: true,
  };
}

export async function getScheduledNotificationCountAsync() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}

export async function cancelScheduledNotificationIfExists(
  notificationId?: string | null
) {
  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.log("cancelScheduledNotificationIfExists error:", error);
  }
}

export async function openSystemNotificationSettings() {
  await Linking.openSettings();
}