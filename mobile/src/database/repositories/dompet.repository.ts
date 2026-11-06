import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type { DompetJenis, DompetRow, DompetTipe } from "../types";

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

function formatRupiah(value: number) {
  const nominal = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
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
        COALESCE(saldo_awal, 0) AS saldo_awal,
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
        COALESCE(saldo_awal, 0) AS saldo_awal,
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
        saldo_awal,
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
        $saldo_awal,
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
      $saldo_awal: saldoAwal,
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
      saldo_saat_ini: number;
      is_default: number;
      is_aktif: number;
    }>(
      `SELECT id, nama, saldo_saat_ini, is_default, is_aktif FROM dompet WHERE id = $dompet_id LIMIT 1`,
      { $dompet_id: dompetId }
    );

    if (!dompet || !dompet.is_aktif) {
      throw new Error("Dompet tidak ditemukan atau sudah tidak aktif.");
    }

    if (Math.abs(dompet.saldo_saat_ini ?? 0) > 0) {
      throw new Error(
        "Saldo dompet masih " +
          formatRupiah(dompet.saldo_saat_ini) +
          ". Pindahkan dulu ke dompet lain lewat Pindah dompet, atau ubah saldo menjadi 0 sebelum menghapus."
      );
    }

    const activeReminder = await txn.getFirstAsync<{ id: string; judul: string }>(
      `SELECT id, judul FROM pengingat_tagihan WHERE dompet_id = $dompet_id AND status = 'aktif' LIMIT 1`,
      { $dompet_id: dompetId }
    );

    if (activeReminder) {
      throw new Error(
        `Masih ada pengingat tagihan aktif ("${activeReminder.judul}") yang terhubung ke dompet ini. Ubah atau batalkan pengingat tersebut terlebih dahulu sebelum menghapus dompet.`
      );
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

export type HasilHitungUlangSaldo = {
  dompetId: string;
  nama: string;
  saldoSebelum: number;
  saldoBaru: number;
  selisih: number;
};

export async function hitungUlangSaldoSemuaDompet(
  db: SQLiteDatabase
): Promise<HasilHitungUlangSaldo[]> {
  const hasil: HasilHitungUlangSaldo[] = [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    const rows = await txn.getAllAsync<{
      id: string;
      nama: string;
      saldo_saat_ini: number;
      saldo_awal: number;
      total_pemasukan: number;
      total_pengeluaran: number;
      total_transfer_masuk: number;
      total_transfer_keluar: number;
      total_koreksi: number;
    }>(`
      SELECT
        d.id,
        d.nama,
        d.saldo_saat_ini,
        COALESCE(d.saldo_awal, 0) AS saldo_awal,
        COALESCE((SELECT SUM(jumlah) FROM pemasukan WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pemasukan,
        COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pengeluaran,
        COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_tujuan_id = d.id), 0) AS total_transfer_masuk,
        COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_sumber_id = d.id), 0) AS total_transfer_keluar,
        COALESCE((SELECT SUM(selisih) FROM koreksi_saldo_dompet WHERE dompet_id = d.id), 0) AS total_koreksi
      FROM dompet d;
    `);

    for (const r of rows) {
      const netMutasi =
        r.total_pemasukan -
        r.total_pengeluaran +
        r.total_transfer_masuk -
        r.total_transfer_keluar +
        r.total_koreksi;
      const saldoBaru = Math.round(r.saldo_awal + netMutasi);
      const selisih = saldoBaru - r.saldo_saat_ini;

      if (selisih !== 0) {
        await txn.runAsync(
          "UPDATE dompet SET saldo_saat_ini = $saldo_baru, updated_at = $now WHERE id = $id",
          {
            $saldo_baru: saldoBaru,
            $now: getNowIso(),
            $id: r.id,
          }
        );
      }

      hasil.push({
        dompetId: r.id,
        nama: r.nama,
        saldoSebelum: r.saldo_saat_ini,
        saldoBaru,
        selisih,
      });
    }
  });

  return hasil;
}

export type IntegritasSaldoItem = {
  dompetId: string;
  nama: string;
  saldoCache: number;
  saldoDihitung: number;
  selisih: number;
};

export type IntegritasSaldoResult = {
  isValid: boolean;
  item: IntegritasSaldoItem[];
};

export async function periksaIntegritasSaldo(
  db: SQLiteDatabase
): Promise<IntegritasSaldoResult> {
  const rows = await db.getAllAsync<{
    id: string;
    nama: string;
    saldo_saat_ini: number;
    saldo_awal: number;
    total_pemasukan: number;
    total_pengeluaran: number;
    total_transfer_masuk: number;
    total_transfer_keluar: number;
    total_koreksi: number;
  }>(`
    SELECT
      d.id,
      d.nama,
      d.saldo_saat_ini,
      COALESCE(d.saldo_awal, 0) AS saldo_awal,
      COALESCE((SELECT SUM(jumlah) FROM pemasukan WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pemasukan,
      COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pengeluaran,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_tujuan_id = d.id), 0) AS total_transfer_masuk,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_sumber_id = d.id), 0) AS total_transfer_keluar,
      COALESCE((SELECT SUM(selisih) FROM koreksi_saldo_dompet WHERE dompet_id = d.id), 0) AS total_koreksi
    FROM dompet d;
  `);

  const item = (rows ?? []).map((r) => {
    const netMutasi =
      r.total_pemasukan -
      r.total_pengeluaran +
      r.total_transfer_masuk -
      r.total_transfer_keluar +
      r.total_koreksi;
    const saldoDihitung = Math.round(r.saldo_awal + netMutasi);
    const selisih = r.saldo_saat_ini - saldoDihitung;
    return {
      dompetId: r.id,
      nama: r.nama,
      saldoCache: r.saldo_saat_ini,
      saldoDihitung,
      selisih,
    };
  });

  const isValid = item.every((i) => i.selisih === 0);
  return { isValid, item };
}