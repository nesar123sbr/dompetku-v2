import type { SQLiteDatabase } from "expo-sqlite";

import {
  batalkanPengingatTagihan,
  bayarPengingatTagihanLokal,
  buatPengingatTagihanLokal,
  getPengingatAktifYangButuhSinkronNotifikasi,
  jadwalkanUlangPengingatBerulang,
  resetSemuaLokalNotifikasiId,
  setLokalNotifikasiIdPengingat,
  tandaiPengingatSekaliSelesai,
  type BayarPengingatTagihanResult,
  type BuatPengingatTagihanPayload,
  type PengingatPengulangan,
  type PengingatTagihanListItem,
} from "@/database";
import {
  batalkanSemuaNotifikasiTerjadwal,
  cancelScheduledNotificationIfExists,
  getLocalNotificationPermissionSnapshotAsync,
  requestLocalNotificationPermissionsAsync,
  scheduleReminderNotificationAsync,
} from "@/lib/notifications";

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToDateInput(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

export function addMonthsClamped(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);

  const firstTargetMonthDate = new Date(year, month - 1 + months, 1);
  const lastDayOfTargetMonth = new Date(
    firstTargetMonthDate.getFullYear(),
    firstTargetMonthDate.getMonth() + 1,
    0
  ).getDate();

  const targetDay = Math.min(day, lastDayOfTargetMonth);

  const result = new Date(
    firstTargetMonthDate.getFullYear(),
    firstTargetMonthDate.getMonth(),
    targetDay
  );

  return toDateInput(result);
}

export function getNextTanggalJatuhTempo(
  tanggalJatuhTempo: string,
  pengulangan: PengingatPengulangan
) {
  if (pengulangan === "sekali") {
    return tanggalJatuhTempo;
  }

  const todayStr = toDateInput(new Date());
  let nextDate = tanggalJatuhTempo;

  do {
    if (pengulangan === "mingguan") {
      nextDate = addDaysToDateInput(nextDate, 7);
    } else if (pengulangan === "bulanan") {
      nextDate = addMonthsClamped(nextDate, 1);
    } else {
      break;
    }
  } while (nextDate <= todayStr);

  return nextDate;
}



export async function buatPengingatTagihanDenganNotifikasi(
  db: SQLiteDatabase,
  payload: BuatPengingatTagihanPayload
) {
  const pengingatId = await buatPengingatTagihanLokal(db, payload);

  if (!payload.notifikasiDiaktifkan) {
    return {
      pengingatId,
      permissionGranted: false,
      notificationScheduled: false,
      skippedReason: null,
    };
  }

  try {
    const permission = await requestLocalNotificationPermissionsAsync();

    if (!permission.granted) {
      return {
        pengingatId,
        permissionGranted: false,
        notificationScheduled: false,
        skippedReason: "izin_notifikasi_belum_diberikan",
      };
    }

    const scheduleResult = await scheduleReminderNotificationAsync({
      reminderId: pengingatId,
      judul: payload.judul,
      nominal: payload.nominal,
      tanggalJatuhTempo: payload.tanggalJatuhTempo,
      jamPengingat: payload.jamPengingat,
      catatan: payload.catatan,
    });

    if (scheduleResult.notificationId) {
      await setLokalNotifikasiIdPengingat(
        db,
        pengingatId,
        scheduleResult.notificationId
      );
    }

    return {
      pengingatId,
      permissionGranted: true,
      notificationScheduled: Boolean(scheduleResult.notificationId),
      skippedReason: scheduleResult.reason,
    };
  } catch (error) {
    console.log("buatPengingatTagihanDenganNotifikasi error:", error);

    return {
      pengingatId,
      permissionGranted: true,
      notificationScheduled: false,
      skippedReason: "jadwal_notifikasi_gagal",
    };
  }
}

async function sinkronkanNotifikasiInternal(
  db: SQLiteDatabase,
  requestPermission: boolean
) {
  const permission = requestPermission
    ? await requestLocalNotificationPermissionsAsync()
    : await getLocalNotificationPermissionSnapshotAsync();

  if (!permission.granted) {
    return {
      permissionGranted: false,
      scheduledCount: 0,
      skippedPastCount: 0,
    };
  }

  const reminders = await getPengingatAktifYangButuhSinkronNotifikasi(db);

  let scheduledCount = 0;
  let skippedPastCount = 0;

  for (const item of reminders) {
    try {
      const scheduleResult = await scheduleReminderNotificationAsync({
        reminderId: item.id,
        judul: item.judul,
        nominal: item.nominal,
        tanggalJatuhTempo: item.tanggal_jatuh_tempo,
        jamPengingat: item.jam_pengingat,
        catatan: item.catatan,
      });

      if (scheduleResult.notificationId) {
        await setLokalNotifikasiIdPengingat(
          db,
          item.id,
          scheduleResult.notificationId
        );
        scheduledCount += 1;
      } else if (scheduleResult.reason === "waktu_terlewat") {
        skippedPastCount += 1;
      }
    } catch (error) {
      console.log("sinkronkanNotifikasiInternal item error:", error);
    }
  }

  return {
    permissionGranted: true,
    scheduledCount,
    skippedPastCount,
  };
}

export async function sinkronkanNotifikasiPengingatAktif(
  db: SQLiteDatabase
) {
  return sinkronkanNotifikasiInternal(db, true);
}

export async function sinkronkanUlangNotifikasiSetelahSync(
  db: SQLiteDatabase
) {
  const permission = await getLocalNotificationPermissionSnapshotAsync();

  if (!permission.granted) {
    return;
  }

  await batalkanSemuaNotifikasiTerjadwal();
  await resetSemuaLokalNotifikasiId(db);

  await sinkronkanNotifikasiInternal(db, false);
}

export async function tandaiPengingatTagihanSelesai(
  db: SQLiteDatabase,
  item: PengingatTagihanListItem,
  dompetId: string
) {
  const shouldRollForward = item.pengulangan !== "sekali";
  const nextTanggalJatuhTempo = shouldRollForward
    ? getNextTanggalJatuhTempo(item.tanggal_jatuh_tempo, item.pengulangan)
    : null;

  const paymentResult: BayarPengingatTagihanResult =
    await bayarPengingatTagihanLokal(db, {
      item,
      dompetId,
      tanggalTransaksi: toDateInput(new Date()),
      nextTanggalJatuhTempo,
    });

  await cancelScheduledNotificationIfExists(item.lokal_notifikasi_id);

  let notificationScheduled = false;

  if (shouldRollForward && Boolean(item.notifikasi_diaktifkan)) {
    try {
      const permission = await requestLocalNotificationPermissionsAsync();

      if (permission.granted && nextTanggalJatuhTempo) {
        const scheduleResult = await scheduleReminderNotificationAsync({
          reminderId: item.id,
          judul: item.judul,
          nominal: item.nominal,
          tanggalJatuhTempo: nextTanggalJatuhTempo,
          jamPengingat: item.jam_pengingat,
          catatan: item.catatan,
        });

        if (scheduleResult.notificationId) {
          await setLokalNotifikasiIdPengingat(
            db,
            item.id,
            scheduleResult.notificationId
          );
          notificationScheduled = true;
        }
      }
    } catch (error) {
      console.log("jadwal ulang reminder error:", error);
    }
  }

  return {
    rolledForward: shouldRollForward,
    nextTanggalJatuhTempo,
    notificationScheduled,
    paymentRecorded: true,
    paymentSkippedReason: null,
    ...paymentResult,
  };
}

export async function batalkanPengingatTagihanDenganNotifikasi(
  db: SQLiteDatabase,
  item: PengingatTagihanListItem
) {
  await cancelScheduledNotificationIfExists(item.lokal_notifikasi_id);
  await batalkanPengingatTagihan(db, item.id);
}

export async function tandaiPengingatTanpaNominalSelesai(
  db: SQLiteDatabase,
  item: PengingatTagihanListItem
) {
  await cancelScheduledNotificationIfExists(item.lokal_notifikasi_id);

  const shouldRollForward = item.pengulangan !== "sekali";
  let nextTanggalJatuhTempo: string | null = null;
  let nextLokalNotifikasiId: string | null = null;
  let notificationScheduled = false;

  if (shouldRollForward) {
    nextTanggalJatuhTempo = getNextTanggalJatuhTempo(
      item.tanggal_jatuh_tempo,
      item.pengulangan
    );

    if (Boolean(item.notifikasi_diaktifkan)) {
      try {
        const permission = await requestLocalNotificationPermissionsAsync();
        if (permission.granted && nextTanggalJatuhTempo) {
          const scheduleResult = await scheduleReminderNotificationAsync({
            reminderId: item.id,
            judul: item.judul,
            nominal: item.nominal,
            tanggalJatuhTempo: nextTanggalJatuhTempo,
            jamPengingat: item.jam_pengingat,
            catatan: item.catatan,
          });

          if (scheduleResult.notificationId) {
            nextLokalNotifikasiId = scheduleResult.notificationId;
            notificationScheduled = true;
          }
        }
      } catch (err) {
        console.log(
          "jadwalkan ulang notifikasi reminder tanpa nominal error:",
          err
        );
      }
    }

    await jadwalkanUlangPengingatBerulang(db, {
      pengingatId: item.id,
      nextTanggalJatuhTempo,
      nextLokalNotifikasiId,
    });
  } else {
    await tandaiPengingatSekaliSelesai(db, item.id);
  }

  return {
    rolledForward: shouldRollForward,
    nextTanggalJatuhTempo,
    notificationScheduled,
  };
}