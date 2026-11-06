import type { SQLiteDatabase } from "expo-sqlite";

import { batalkanSemuaNotifikasiTerjadwal } from "@/lib/notifications";
import { MODE_PENGGUNAAN, PENGATURAN_KEY } from "../constants";
import { seedDefaultData } from "../migrations";
import type { ModePenggunaan } from "../types";
import {
  getNilaiPengaturanTeks,
  setModePenggunaan,
  setNilaiPengaturanTeks,
} from "./pengaturan.repository";

export type AkunSupabaseLokalInfo = {
  authUserId: string | null;
  authEmail: string | null;
  authNama: string | null;
  butuhSinkronisasiAwal: boolean;
  adaDataLokalBermakna: boolean;
  terakhirSinkronisasiAt: string | null;
};

type CountRow = {
  total: number | null;
};

function emptyToNull(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

async function getCount(db: SQLiteDatabase, tableName: string) {
  const row = await db.getFirstAsync<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM ${tableName}
    `
  );

  return row?.total ?? 0;
}

export async function getApakahAdaDataLokalBermakna(db: SQLiteDatabase) {
  const pemasukanTotal = await getCount(db, "pemasukan");
  const pengeluaranTotal = await getCount(db, "pengeluaran");
  const transferTotal = await getCount(db, "transfer_dompet");
  const pengingatTotal = await getCount(db, "pengingat_tagihan");

  const total =
    pemasukanTotal + pengeluaranTotal + transferTotal + pengingatTotal;

  return total > 0;
}

export async function getInfoAkunSupabaseLokal(
  db: SQLiteDatabase
): Promise<AkunSupabaseLokalInfo> {
  const authUserId = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_USER_ID
  );

  const authEmail = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_EMAIL
  );

  const authNama = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_NAMA
  );

  const sinkronisasiAwal = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL
  );

  const adaDataLokal = await getApakahAdaDataLokalBermakna(db);

  const terakhirSinkronisasiAt = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT
  );

  return {
    authUserId: emptyToNull(authUserId),
    authEmail: emptyToNull(authEmail),
    authNama: emptyToNull(authNama),
    butuhSinkronisasiAwal: sinkronisasiAwal === "1",
    adaDataLokalBermakna: adaDataLokal,
    terakhirSinkronisasiAt: emptyToNull(terakhirSinkronisasiAt),
  };
}

export async function catatAkunSupabaseLokal(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    email: string | null;
    nama: string | null;
    butuhSinkronisasiAwal: boolean;
  },
  options?: {
    preserveExistingPending?: boolean;
  }
): Promise<AkunSupabaseLokalInfo> {
  let nextPending = payload.butuhSinkronisasiAwal;

  if (options?.preserveExistingPending) {
    const currentPending = await getNilaiPengaturanTeks(
      db,
      PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL
    );

    if (currentPending === "1") {
      nextPending = true;
    }
  }

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_USER_ID,
    payload.userId
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_EMAIL,
    payload.email ?? ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_NAMA,
    payload.nama ?? ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL,
    nextPending ? "1" : "0"
  );

  await setModePenggunaan(db, MODE_PENGGUNAAN.AUTHENTICATED);

  return getInfoAkunSupabaseLokal(db);
}

export async function tandaiSinkronisasiAwalSelesai(
  db: SQLiteDatabase,
  atIso?: string
) {
  const timestamp = atIso ?? new Date().toISOString();

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL,
    "0"
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT,
    timestamp
  );

  return getInfoAkunSupabaseLokal(db);
}

export async function bersihkanAkunSupabaseLokal(db: SQLiteDatabase) {
  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_USER_ID,
    ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_EMAIL,
    ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_SUPABASE_NAMA,
    ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL,
    "0"
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT,
    ""
  );

  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.AKUN_CURSOR_PULL_CLOUD,
    ""
  );
}

export async function getPemilikDataLokal(
  db: SQLiteDatabase
): Promise<string | null> {
  const owner = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.DATA_OWNER_USER_ID
  );
  if (owner && owner.trim().length > 0) {
    return owner.trim();
  }

  const legacyOwner = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.PEMILIK_DATA_LOKAL_USER_ID
  );
  if (legacyOwner && legacyOwner.trim().length > 0) {
    return legacyOwner.trim();
  }

  return null;
}

export async function setPemilikDataLokal(
  db: SQLiteDatabase,
  userId: string | null
): Promise<void> {
  const clean = userId ? userId.trim() : "";
  await setNilaiPengaturanTeks(db, PENGATURAN_KEY.DATA_OWNER_USER_ID, clean);
  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.PEMILIK_DATA_LOKAL_USER_ID,
    clean
  );
}

export async function hapusSemuaDataLokal(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM pemasukan;
      DELETE FROM pengeluaran;
      DELETE FROM transfer_dompet;
      DELETE FROM koreksi_saldo_dompet;
      DELETE FROM anggaran_bulanan;
      DELETE FROM pengingat_tagihan;
      DELETE FROM kategori_pengeluaran;
      DELETE FROM kategori_pemasukan;
      DELETE FROM dompet;
    `);

    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_SUPABASE_USER_ID,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_SUPABASE_EMAIL,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_SUPABASE_NAMA,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL,
      "0"
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.AKUN_CURSOR_PULL_CLOUD,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.CLOUD_SYNC_CURSOR,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.PEMILIK_DATA_LOKAL_USER_ID,
      ""
    );
    await setNilaiPengaturanTeks(
      txn,
      PENGATURAN_KEY.DATA_OWNER_USER_ID,
      ""
    );
    await setModePenggunaan(txn, MODE_PENGGUNAAN.NONE);
  });

  await seedDefaultData(db);

  try {
    await batalkanSemuaNotifikasiTerjadwal();
  } catch (error) {
    console.log("batalkanSemuaNotifikasiTerjadwal error:", error);
  }
}

export async function selaraskanPemilikDataLokal(
  db: SQLiteDatabase,
  userId: string
): Promise<{ dataDibersihkan: boolean }> {
  const pemilik = await getPemilikDataLokal(db);

  if (pemilik && pemilik !== userId) {
    await hapusSemuaDataLokal(db);
    await setPemilikDataLokal(db, userId);
    return { dataDibersihkan: true };
  }

  if (!pemilik) {
    await setPemilikDataLokal(db, userId);
  }

  return { dataDibersihkan: false };
}

export async function turunkanModeSetelahKeluarAkun(
  db: SQLiteDatabase
): Promise<ModePenggunaan> {
  const hasLocalData = await getApakahAdaDataLokalBermakna(db);

  await bersihkanAkunSupabaseLokal(db);

  const nextMode = hasLocalData
    ? MODE_PENGGUNAAN.GUEST
    : MODE_PENGGUNAAN.NONE;

  await setModePenggunaan(db, nextMode);

  return nextMode;
}