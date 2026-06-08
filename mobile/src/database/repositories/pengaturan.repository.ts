import type { SQLiteDatabase } from "expo-sqlite";
import {
  MODE_PENGGUNAAN,
  PENGATURAN_KEY,
} from "../constants";
import type { ModePenggunaan } from "../types";
import { getNowIso } from "../helpers";

type PengaturanRow = {
  nilai_teks: string | null;
};

export async function getNilaiPengaturanTeks(
  db: SQLiteDatabase,
  kunci: string
) {
  const row = await db.getFirstAsync<PengaturanRow>(
    `
      SELECT nilai_teks
      FROM pengaturan_aplikasi
      WHERE kunci = $kunci
      LIMIT 1
    `,
    {
      $kunci: kunci,
    }
  );

  return row?.nilai_teks ?? null;
}

export async function setNilaiPengaturanTeks(
  db: SQLiteDatabase,
  kunci: string,
  nilai: string
) {
  await db.runAsync(
    `
      INSERT INTO pengaturan_aplikasi (
        kunci,
        nilai_teks,
        updated_at
      ) VALUES (
        $kunci,
        $nilai_teks,
        $updated_at
      )
      ON CONFLICT(kunci) DO UPDATE SET
        nilai_teks = excluded.nilai_teks,
        updated_at = excluded.updated_at
    `,
    {
      $kunci: kunci,
      $nilai_teks: nilai,
      $updated_at: getNowIso(),
    }
  );
}

export async function getModePenggunaan(
  db: SQLiteDatabase
): Promise<ModePenggunaan> {
  const value = await getNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.MODE_PENGGUNAAN
  );

  if (
    value === MODE_PENGGUNAAN.NONE ||
    value === MODE_PENGGUNAAN.GUEST ||
    value === MODE_PENGGUNAAN.AUTHENTICATED
  ) {
    return value;
  }

  return MODE_PENGGUNAAN.NONE;
}

export async function setModePenggunaan(
  db: SQLiteDatabase,
  mode: ModePenggunaan
) {
  await setNilaiPengaturanTeks(
    db,
    PENGATURAN_KEY.MODE_PENGGUNAAN,
    mode
  );
}