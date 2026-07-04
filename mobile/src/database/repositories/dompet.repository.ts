import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type { DompetJenis, DompetRow, DompetTipe } from "../types";

type CountRow = {
  total: number | null;
};

type DompetKelolaRow = {
  id: string;
  nama: string;
  is_default: number;
  is_aktif: number;
};

type DompetSaldoKelolaRow = {
  id: string;
  nama: string;
  saldo_saat_ini: number;
  is_aktif: number;
};

export type KoreksiSaldoDompetRow = {
  id: string;
  dompet_id: string;
  nama_dompet_snapshot: string;
  nama_dompet_terkini: string | null;
  saldo_sebelum: number;
  saldo_sesudah: number;
  selisih: number;
  catatan: string | null;
  sumber: string;
  created_at: string;
  updated_at: string;
};

function mapTipeDompetKeJenis(tipe: DompetTipe): DompetJenis {
  if (tipe === "tabungan") {
    return "tabungan";
  }

  if (tipe === "dana_darurat") {
    return "dana_darurat";
  }

  return "utama";
}

async function ensureKoreksiSaldoDompetTable(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS koreksi_saldo_dompet (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_id TEXT NOT NULL,
      nama_dompet_snapshot TEXT NOT NULL,
      saldo_sebelum REAL NOT NULL,
      saldo_sesudah REAL NOT NULL,
      selisih REAL NOT NULL,
      catatan TEXT,
      sumber TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dompet_id) REFERENCES dompet(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_dompet_id
      ON koreksi_saldo_dompet (dompet_id);

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_created_at
      ON koreksi_saldo_dompet (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_updated_at
      ON koreksi_saldo_dompet (updated_at DESC);
  `);
}

export async function getSemuaDompetAktif(
  db: SQLiteDatabase
): Promise<DompetRow[]> {
  const rows = await db.getAllAsync<DompetRow>(
    `
      SELECT
        id,
        nama,
        jenis,
        COALESCE(tipe_dompet,
          CASE
            WHEN jenis = 'tabungan' THEN 'tabungan'
            WHEN jenis = 'dana_darurat' THEN 'dana_darurat'
            ELSE 'tunai'
          END
        ) AS tipe_dompet,
        saldo_saat_ini,
        is_default,
        is_aktif,
        created_at,
        updated_at
      FROM dompet
      WHERE is_aktif = 1
      ORDER BY
        is_default DESC,
        CASE
          WHEN jenis = 'utama' THEN 1
          WHEN jenis = 'tabungan' THEN 2
          WHEN jenis = 'dana_darurat' THEN 3
          ELSE 99
        END,
        nama ASC
    `
  );

  return rows ?? [];
}

export async function getDompetDanaDarurat(
  db: SQLiteDatabase
): Promise<DompetRow | null> {
  const row = await db.getFirstAsync<DompetRow>(
    `
      SELECT
        id,
        nama,
        jenis,
        COALESCE(tipe_dompet, 'dana_darurat') AS tipe_dompet,
        saldo_saat_ini,
        is_default,
        is_aktif,
        created_at,
        updated_at
      FROM dompet
      WHERE is_aktif = 1
        AND jenis = 'dana_darurat'
      LIMIT 1
    `
  );

  return row ?? null;
}

export async function tambahDompetLokal(
  db: SQLiteDatabase,
  payload: {
    nama: string;
    tipeDompet: DompetTipe;
    saldoAwal?: number;
  }
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama dompet minimal 2 karakter.");
  }

  const saldoAwal = payload.saldoAwal ?? 0;

  if (!Number.isFinite(saldoAwal) || saldoAwal < 0) {
    throw new Error("Saldo awal dompet tidak valid.");
  }

  const now = getNowIso();
  const id = createLocalId("dompet");
  const jenis = mapTipeDompetKeJenis(payload.tipeDompet);

  await db.runAsync(
    `
      INSERT INTO dompet (
        id,
        nama,
        jenis,
        tipe_dompet,
        saldo_saat_ini,
        is_default,
        is_aktif,
        created_at,
        updated_at
      ) VALUES (
        $id,
        $nama,
        $jenis,
        $tipe_dompet,
        $saldo_saat_ini,
        0,
        1,
        $created_at,
        $updated_at
      )
    `,
    {
      $id: id,
      $nama: nama,
      $jenis: jenis,
      $tipe_dompet: payload.tipeDompet,
      $saldo_saat_ini: saldoAwal,
      $created_at: now,
      $updated_at: now,
    }
  );

  return id;
}

export async function ubahSaldoDompetLokal(
  db: SQLiteDatabase,
  payload: {
    dompetId: string;
    saldoBaru: number;
    catatan?: string;
  }
) {
  if (!Number.isFinite(payload.saldoBaru) || payload.saldoBaru < 0) {
    throw new Error("Saldo baru dompet tidak valid.");
  }

  await ensureKoreksiSaldoDompetTable(db);
  const now = getNowIso();
  let auditId = "";

  await db.withExclusiveTransactionAsync(async (txn) => {
    const dompet = await txn.getFirstAsync<{
      id: string;
      nama: string;
      saldo_saat_ini: number;
      is_aktif: number;
    }>(
      `
        SELECT id, nama, saldo_saat_ini, is_aktif
        FROM dompet
        WHERE id = $dompet_id AND is_aktif = 1
        LIMIT 1
      `,
      { $dompet_id: payload.dompetId }
    );

    if (!dompet) {
      throw new Error("Dompet tidak ditemukan atau sudah tidak aktif.");
    }

    const saldoSebelum = dompet.saldo_saat_ini;
    const saldoSesudah = payload.saldoBaru;
    const selisih = saldoSesudah - saldoSebelum;

    if (selisih === 0) return;

    auditId = createLocalId("koreksi-saldo");

    await txn.runAsync(
      `
        UPDATE dompet
        SET saldo_saat_ini = $saldo_baru, updated_at = $updated_at
        WHERE id = $dompet_id AND is_aktif = 1
      `,
      {
        $saldo_baru: saldoSesudah,
        $updated_at: now,
        $dompet_id: payload.dompetId,
      }
    );

    await txn.runAsync(
      `
        INSERT INTO koreksi_saldo_dompet (
          id, dompet_id, nama_dompet_snapshot, saldo_sebelum,
          saldo_sesudah, selisih, catatan, sumber, created_at, updated_at
        ) VALUES (
          $id, $dompet_id, $nama_dompet_snapshot, $saldo_sebelum,
          $saldo_sesudah, $selisih, $catatan, $sumber, $created_at, $updated_at
        )
      `,
      {
        $id: auditId,
        $dompet_id: payload.dompetId,
        $nama_dompet_snapshot: dompet.nama,
        $saldo_sebelum: saldoSebelum,
        $saldo_sesudah: saldoSesudah,
        $selisih: selisih,
        $catatan:
          payload.catatan?.trim() ||
          "Koreksi saldo manual dari fitur Kelola Dompet.",
        $sumber: "manual",
        $created_at: now,
        $updated_at: now,
      }
    );
  });

  return auditId || createLocalId("koreksi-saldo");
}

export async function getRiwayatKoreksiSaldoDompet(
  db: SQLiteDatabase,
  payload?: {
    limit?: number;
    offset?: number;
    dompetId?: string | null;
  }
): Promise<KoreksiSaldoDompetRow[]> {
  await ensureKoreksiSaldoDompetTable(db);

  const limit = Math.max(1, Math.min(payload?.limit ?? 50, 100));
  const offset = Math.max(0, payload?.offset ?? 0);
  const dompetId = payload?.dompetId ?? null;

  const rows = await db.getAllAsync<KoreksiSaldoDompetRow>(
    `
      SELECT
        k.id,
        k.dompet_id,
        k.nama_dompet_snapshot,
        d.nama AS nama_dompet_terkini,
        k.saldo_sebelum,
        k.saldo_sesudah,
        k.selisih,
        k.catatan,
        k.sumber,
        k.created_at,
        k.updated_at
      FROM koreksi_saldo_dompet k
      LEFT JOIN dompet d
        ON d.id = k.dompet_id
      WHERE ($dompet_id IS NULL OR k.dompet_id = $dompet_id)
      ORDER BY k.created_at DESC
      LIMIT $limit OFFSET $offset
    `,
    {
      $dompet_id: dompetId,
      $limit: limit,
      $offset: offset,
    }
  );

  return rows ?? [];
}

export async function nonaktifkanDompetLokal(
  db: SQLiteDatabase,
  dompetId: string
) {
  const now = getNowIso();

  await db.withExclusiveTransactionAsync(async (txn) => {
    const countRow = await txn.getFirstAsync<{ total: number | null }>(
      `SELECT COUNT(*) AS total FROM dompet WHERE is_aktif = 1`
    );

    if ((countRow?.total ?? 0) <= 1) {
      throw new Error("Minimal harus ada 1 dompet aktif.");
    }

    const dompet = await txn.getFirstAsync<{
      id: string;
      nama: string;
      is_default: number;
      is_aktif: number;
    }>(
      `SELECT id, nama, is_default, is_aktif FROM dompet WHERE id = $dompet_id LIMIT 1`,
      { $dompet_id: dompetId }
    );

    if (!dompet || !dompet.is_aktif) {
      throw new Error("Dompet tidak ditemukan atau sudah tidak aktif.");
    }

    await txn.runAsync(
      `
        UPDATE dompet
        SET is_aktif = 0, is_default = 0, updated_at = $updated_at
        WHERE id = $dompet_id AND is_aktif = 1
      `,
      { $updated_at: now, $dompet_id: dompetId }
    );

    if (dompet.is_default) {
      const pengganti = await txn.getFirstAsync<{ id: string }>(
        `SELECT id FROM dompet WHERE is_aktif = 1 ORDER BY created_at ASC LIMIT 1`
      );

      if (pengganti?.id) {
        await txn.runAsync(
          `UPDATE dompet SET is_default = 1, updated_at = $updated_at WHERE id = $id`,
          { $updated_at: now, $id: pengganti.id }
        );
      }
    }
  });
}