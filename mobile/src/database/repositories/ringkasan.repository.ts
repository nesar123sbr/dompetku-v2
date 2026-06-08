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