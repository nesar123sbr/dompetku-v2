import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type {
  DompetRow,
  RingkasanDanaDarurat,
  RingkasanWalletTab,
  RiwayatTransferRow,
  TransferAntarDompetPayload,
} from "../types";

type SqlRunner = Pick<
  SQLiteDatabase,
  "runAsync" | "getFirstAsync" | "getAllAsync"
>;

type DompetRingkas = Pick<
  DompetRow,
  "id" | "nama" | "jenis" | "saldo_saat_ini"
>;

type WalletSummaryRow = {
  total_saldo: number | null;
  saldo_non_darurat: number | null;
  saldo_tabungan: number | null;
  saldo_dana_darurat: number | null;
  jumlah_dompet_aktif: number | null;
};

type DanaDaruratSaldoRow = {
  saldo_dana_darurat: number | null;
};

type DanaDaruratEstimasiRow = {
  estimasi_proteksi_30_hari: number | null;
};

async function getDompetAktifRingkasById(
  db: SqlRunner,
  dompetId: string
): Promise<DompetRingkas | null> {
  const row = await db.getFirstAsync<DompetRingkas>(
    `
      SELECT
        id,
        nama,
        jenis,
        saldo_saat_ini
      FROM dompet
      WHERE id = $dompet_id
        AND is_aktif = 1
      LIMIT 1
    `,
    {
      $dompet_id: dompetId,
    }
  );

  return row ?? null;
}

export async function getRingkasanWalletTab(
  db: SQLiteDatabase
): Promise<RingkasanWalletTab> {
  const row = await db.getFirstAsync<WalletSummaryRow>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN is_aktif = 1 THEN saldo_saat_ini ELSE 0 END), 0) AS total_saldo,
        COALESCE(SUM(CASE WHEN is_aktif = 1 AND jenis <> 'dana_darurat' THEN saldo_saat_ini ELSE 0 END), 0) AS saldo_non_darurat,
        COALESCE(SUM(CASE WHEN is_aktif = 1 AND jenis = 'tabungan' THEN saldo_saat_ini ELSE 0 END), 0) AS saldo_tabungan,
        COALESCE(SUM(CASE WHEN is_aktif = 1 AND jenis = 'dana_darurat' THEN saldo_saat_ini ELSE 0 END), 0) AS saldo_dana_darurat,
        COALESCE(SUM(CASE WHEN is_aktif = 1 THEN 1 ELSE 0 END), 0) AS jumlah_dompet_aktif
      FROM dompet
    `
  );

  return {
    totalSaldo: row?.total_saldo ?? 0,
    saldoNonDarurat: row?.saldo_non_darurat ?? 0,
    saldoTabungan: row?.saldo_tabungan ?? 0,
    saldoDanaDarurat: row?.saldo_dana_darurat ?? 0,
    jumlahDompetAktif: row?.jumlah_dompet_aktif ?? 0,
  };
}

export async function getRingkasanDanaDarurat(
  db: SQLiteDatabase
): Promise<RingkasanDanaDarurat> {
  const saldoRow = await db.getFirstAsync<DanaDaruratSaldoRow>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN is_aktif = 1 AND jenis = 'dana_darurat' THEN saldo_saat_ini ELSE 0 END), 0) AS saldo_dana_darurat
      FROM dompet
    `
  );

  const estimasiRow = await db.getFirstAsync<DanaDaruratEstimasiRow>(
    `
      SELECT
        COALESCE(SUM(g.jumlah), 0) AS estimasi_proteksi_30_hari
      FROM pengeluaran g
      LEFT JOIN kategori_pengeluaran kg
        ON kg.id = g.kategori_id
      WHERE g.is_deleted = 0
        AND date(g.tanggal_transaksi) >= date('now', '-30 day')
        AND kg.kelompok IN ('kebutuhan', 'rutin')
    `
  );

  const saldoDanaDarurat = saldoRow?.saldo_dana_darurat ?? 0;
  const estimasiProteksi30Hari = estimasiRow?.estimasi_proteksi_30_hari ?? 0;

  const targetMinimal = estimasiProteksi30Hari;
  const targetIdeal = estimasiProteksi30Hari * 3;

  const rasioMinimal =
    targetMinimal > 0 ? saldoDanaDarurat / targetMinimal : 0;

  const rasioIdeal = targetIdeal > 0 ? saldoDanaDarurat / targetIdeal : 0;

  let status: RingkasanDanaDarurat["status"] = "belum_ada_data";

  if (estimasiProteksi30Hari <= 0) {
    status = "belum_ada_data";
  } else if (saldoDanaDarurat < targetMinimal) {
    status = "belum_aman";
  } else if (saldoDanaDarurat < targetIdeal) {
    status = "cukup";
  } else {
    status = "aman";
  }

  return {
    saldoDanaDarurat,
    estimasiProteksi30Hari,
    targetMinimal,
    targetIdeal,
    rasioMinimal,
    rasioIdeal,
    status,
  };
}

export async function transferAntarDompetLokal(
  db: SQLiteDatabase,
  payload: TransferAntarDompetPayload
) {
  if (payload.jumlah <= 0) {
    throw new Error("Jumlah transfer harus lebih dari 0.");
  }

  if (payload.dompetSumberId === payload.dompetTujuanId) {
    throw new Error("Dompet sumber dan tujuan tidak boleh sama.");
  }

  const now = getNowIso();
  const transferId = createLocalId("trf");

  await db.withExclusiveTransactionAsync(async (txn) => {
    const dompetSumber = await getDompetAktifRingkasById(
      txn,
      payload.dompetSumberId
    );

    const dompetTujuan = await getDompetAktifRingkasById(
      txn,
      payload.dompetTujuanId
    );

    if (!dompetSumber) {
      throw new Error("Dompet sumber tidak ditemukan atau tidak aktif.");
    }

    if (!dompetTujuan) {
      throw new Error("Dompet tujuan tidak ditemukan atau tidak aktif.");
    }

    if (dompetSumber.saldo_saat_ini < payload.jumlah) {
      throw new Error("Saldo dompet sumber tidak cukup untuk transfer.");
    }

    const sumberDanaDarurat =
      dompetSumber.jenis === "dana_darurat" ? 1 : 0;

    if (sumberDanaDarurat && !payload.konfirmasiGunakanDanaDarurat) {
      throw new Error(
        "Penggunaan dana darurat harus dikonfirmasi terlebih dahulu."
      );
    }

    await txn.runAsync(
      `
        INSERT INTO transfer_dompet (
          id,
          dompet_sumber_id,
          dompet_tujuan_id,
          jumlah,
          tanggal_transfer,
          catatan,
          sumber_dana_darurat,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $dompet_sumber_id,
          $dompet_tujuan_id,
          $jumlah,
          $tanggal_transfer,
          $catatan,
          $sumber_dana_darurat,
          $created_at,
          $updated_at
        )
      `,
      {
        $id: transferId,
        $dompet_sumber_id: payload.dompetSumberId,
        $dompet_tujuan_id: payload.dompetTujuanId,
        $jumlah: payload.jumlah,
        $tanggal_transfer: payload.tanggalTransfer,
        $catatan: payload.catatan?.trim() || null,
        $sumber_dana_darurat: sumberDanaDarurat,
        $created_at: now,
        $updated_at: now,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini - $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: payload.jumlah,
        $updated_at: now,
        $dompet_id: payload.dompetSumberId,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini + $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: payload.jumlah,
        $updated_at: now,
        $dompet_id: payload.dompetTujuanId,
      }
    );
  });

  return transferId;
}

export async function getRiwayatTransferTerbaru(
  db: SQLiteDatabase,
  limit = 8
): Promise<RiwayatTransferRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const rows = await db.getAllAsync<RiwayatTransferRow>(
    `
      SELECT
        t.id,
        t.jumlah,
        t.tanggal_transfer,
        t.catatan,
        ds.nama AS nama_dompet_sumber,
        dt.nama AS nama_dompet_tujuan,
        t.sumber_dana_darurat,
        t.created_at
      FROM transfer_dompet t
      LEFT JOIN dompet ds
        ON ds.id = t.dompet_sumber_id
      LEFT JOIN dompet dt
        ON dt.id = t.dompet_tujuan_id
      ORDER BY t.tanggal_transfer DESC, t.created_at DESC
      LIMIT $limit
    `,
    {
      $limit: safeLimit,
    }
  );

  return rows ?? [];
}