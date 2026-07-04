import type { SQLiteDatabase } from "expo-sqlite";
import type { RingkasanDashboard } from "../types";

type RingkasanDompetRow = {
  total_saldo: number | null;
  total_dana_darurat: number | null;
  jumlah_dompet_aktif: number | null;
};

type RingkasanPemasukanRow = {
  total_pemasukan: number | null;
};

type RingkasanPengeluaranRow = {
  total_pengeluaran: number | null;
};

type RingkasanPengingatRow = {
  jumlah_pengingat_aktif: number | null;
};

export async function getRingkasanDashboard(
  db: SQLiteDatabase
): Promise<RingkasanDashboard> {
  const dompetRow = await db.getFirstAsync<RingkasanDompetRow>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN is_aktif = 1 THEN saldo_saat_ini ELSE 0 END), 0) AS total_saldo,
        COALESCE(SUM(CASE WHEN is_aktif = 1 AND jenis = 'dana_darurat' THEN saldo_saat_ini ELSE 0 END), 0) AS total_dana_darurat,
        COALESCE(SUM(CASE WHEN is_aktif = 1 THEN 1 ELSE 0 END), 0) AS jumlah_dompet_aktif
      FROM dompet
    `
  );

  const pemasukanRow = await db.getFirstAsync<RingkasanPemasukanRow>(
    `
      SELECT
        COALESCE(SUM(jumlah), 0) AS total_pemasukan
      FROM pemasukan
      WHERE is_deleted = 0
    `
  );

  const pengeluaranRow = await db.getFirstAsync<RingkasanPengeluaranRow>(
    `
      SELECT
        COALESCE(SUM(jumlah), 0) AS total_pengeluaran
      FROM pengeluaran
      WHERE is_deleted = 0
    `
  );

  const pengingatRow = await db.getFirstAsync<RingkasanPengingatRow>(
    `
      SELECT
        COALESCE(COUNT(*), 0) AS jumlah_pengingat_aktif
      FROM pengingat_tagihan
      WHERE status = 'aktif'
    `
  );

  return {
    totalSaldo: dompetRow?.total_saldo ?? 0,
    totalDanaDarurat: dompetRow?.total_dana_darurat ?? 0,
    jumlahDompetAktif: dompetRow?.jumlah_dompet_aktif ?? 0,
    totalPemasukan: pemasukanRow?.total_pemasukan ?? 0,
    totalPengeluaran: pengeluaranRow?.total_pengeluaran ?? 0,
    jumlahPengingatAktif: pengingatRow?.jumlah_pengingat_aktif ?? 0,
  };
}

// ============================================================
// FUNGSI BARU: FILTER PERIODE DINAMIS (Level Dewa / Anti-Lag)
// ============================================================

export type FilterPeriodePayload = {
  tahunBulan?: string | null;    // Contoh: "2026-06"
  tanggalMulai?: string | null;  // Contoh: "2026-06-01"
  tanggalSelesai?: string | null;// Contoh: "2026-06-30"
};

export async function getRingkasanFilterPeriode(
  db: SQLiteDatabase,
  payload: FilterPeriodePayload
): Promise<{ totalPemasukan: number; totalPengeluaran: number }> {
  let wherePemasukan = `WHERE is_deleted = 0`;
  let wherePengeluaran = `WHERE is_deleted = 0`;
  const params: Record<string, string> = {};

  if (payload.tahunBulan) {
    wherePemasukan += ` AND tanggal_transaksi LIKE $tahunBulan`;
    wherePengeluaran += ` AND tanggal_transaksi LIKE $tahunBulan`;
    params.$tahunBulan = `${payload.tahunBulan}%`;
  } else {
    // 🔥 SARGABLE: pakai >= dan <= langsung, tambahkan waktu agar presisi
    if (payload.tanggalMulai) {
      wherePemasukan += ` AND tanggal_transaksi >= $tanggalMulai`;
      wherePengeluaran += ` AND tanggal_transaksi >= $tanggalMulai`;
      params.$tanggalMulai = payload.tanggalMulai;
    }
    if (payload.tanggalSelesai) {
      wherePemasukan += ` AND tanggal_transaksi <= $tanggalSelesai`;
      wherePengeluaran += ` AND tanggal_transaksi <= $tanggalSelesai`;
      params.$tanggalSelesai = payload.tanggalSelesai;
    }
  }

  const [pemasukanRow, pengeluaranRow] = await Promise.all([
    db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total FROM pemasukan ${wherePemasukan}`,
      params
    ),
    db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total FROM pengeluaran ${wherePengeluaran}`,
      params
    ),
  ]);

  return {
    totalPemasukan: pemasukanRow?.total ?? 0,
    totalPengeluaran: pengeluaranRow?.total ?? 0,
  };
}