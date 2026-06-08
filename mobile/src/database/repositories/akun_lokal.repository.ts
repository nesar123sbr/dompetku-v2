import type { SQLiteDatabase } from "expo-sqlite";

import { MODE_PENGGUNAAN, PENGATURAN_KEY } from "../constants";
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