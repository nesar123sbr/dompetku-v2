import type { SQLiteDatabase } from "expo-sqlite";

export type InsightKelompokPengeluaranItem = {
  kelompok: "kebutuhan" | "rutin" | "fleksibel" | "usaha" | "lainnya";
  total: number;
};

export type InsightKategoriTeratasItem = {
  nama: string;
  total: number;
};

export type InsightBulanan = {
  totalPemasukanBulanIni: number;
  totalPengeluaranBulanIni: number;
  totalPemasukanBulanLalu: number;
  totalPengeluaranBulanLalu: number;
  perubahanPengeluaranPersen: number | null;
  arusKasBersih: number;
  rasioPengeluaranTerhadapPemasukan: number;
  statusKesehatan: "belum_ada_data" | "aman" | "cukup" | "waspada" | "rawan";
  kelompokPengeluaran: InsightKelompokPengeluaranItem[];
  kategoriTeratas: InsightKategoriTeratasItem[];
};

type TotalRow = {
  total: number | null;
};

type KelompokRow = {
  kelompok: InsightKelompokPengeluaranItem["kelompok"];
  total: number | null;
};

type KategoriRow = {
  nama: string;
  total: number | null;
};

// ============================================================
// FUNGSI BARU: INSIGHT BERDASARKAN RENTANG TANGGAL (SARGABLE)
// ============================================================
export async function getInsightRentangPeriode(
  db: SQLiteDatabase,
  payload: { tanggalMulai: string; tanggalSelesai: string }
): Promise<InsightBulanan> {
  const tMulai = new Date(`${payload.tanggalMulai}T00:00:00`);
  const tSelesai = new Date(`${payload.tanggalSelesai}T00:00:00`);
  const diffDays = Math.max(
    1,
    Math.round(
      Math.abs(tSelesai.getTime() - tMulai.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  const prevSelesaiDate = new Date(tMulai.getTime() - 24 * 60 * 60 * 1000);
  const prevMulaiDate = new Date(
    prevSelesaiDate.getTime() - (diffDays - 1) * 24 * 60 * 60 * 1000
  );

  const prevMulaiStr = `${prevMulaiDate.getFullYear()}-${String(
    prevMulaiDate.getMonth() + 1
  ).padStart(2, "0")}-${String(prevMulaiDate.getDate()).padStart(2, "0")}`;
  const prevSelesaiStr = `${prevSelesaiDate.getFullYear()}-${String(
    prevSelesaiDate.getMonth() + 1
  ).padStart(2, "0")}-${String(prevSelesaiDate.getDate()).padStart(2, "0")}`;

  const [
    pemasukanRow,
    pengeluaranRow,
    kelompokRows,
    kategoriRows,
    prevPemasukanRow,
    prevPengeluaranRow,
  ] = await Promise.all([
    db.getFirstAsync<TotalRow>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM pemasukan
       WHERE is_deleted = 0
         AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai`,
      { $mulai: payload.tanggalMulai, $selesai: payload.tanggalSelesai }
    ),
    db.getFirstAsync<TotalRow>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM pengeluaran
       WHERE is_deleted = 0
         AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai`,
      { $mulai: payload.tanggalMulai, $selesai: payload.tanggalSelesai }
    ),
    db.getAllAsync<KelompokRow>(
      `SELECT kg.kelompok, COALESCE(SUM(p.jumlah), 0) AS total
       FROM kategori_pengeluaran kg
       LEFT JOIN pengeluaran p ON p.kategori_id = kg.id AND p.is_deleted = 0
         AND p.tanggal_transaksi >= $mulai AND p.tanggal_transaksi <= $selesai
       WHERE kg.is_aktif = 1
       GROUP BY kg.kelompok
       ORDER BY total DESC`,
      { $mulai: payload.tanggalMulai, $selesai: payload.tanggalSelesai }
    ),
    db.getAllAsync<KategoriRow>(
      `SELECT COALESCE(kg.nama, 'Tanpa kategori') AS nama, COALESCE(SUM(p.jumlah), 0) AS total
       FROM pengeluaran p
       LEFT JOIN kategori_pengeluaran kg ON kg.id = p.kategori_id
       WHERE p.is_deleted = 0
         AND p.tanggal_transaksi >= $mulai AND p.tanggal_transaksi <= $selesai
       GROUP BY COALESCE(kg.nama, 'Tanpa kategori')
       ORDER BY total DESC
       LIMIT 5`,
      { $mulai: payload.tanggalMulai, $selesai: payload.tanggalSelesai }
    ),
    db.getFirstAsync<TotalRow>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM pemasukan
       WHERE is_deleted = 0
         AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai`,
      { $mulai: prevMulaiStr, $selesai: prevSelesaiStr }
    ),
    db.getFirstAsync<TotalRow>(
      `SELECT COALESCE(SUM(jumlah), 0) AS total
       FROM pengeluaran
       WHERE is_deleted = 0
         AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai`,
      { $mulai: prevMulaiStr, $selesai: prevSelesaiStr }
    ),
  ]);

  const totalPemasukan = pemasukanRow?.total ?? 0;
  const totalPengeluaran = pengeluaranRow?.total ?? 0;
  const totalPemasukanLalu = prevPemasukanRow?.total ?? 0;
  const totalPengeluaranLalu = prevPengeluaranRow?.total ?? 0;

  const arusKasBersih = totalPemasukan - totalPengeluaran;
  const rasio = totalPemasukan > 0 ? totalPengeluaran / totalPemasukan : 0;

  let status: InsightBulanan["statusKesehatan"] = "belum_ada_data";
  if (totalPemasukan > 0 || totalPengeluaran > 0) {
    if (rasio <= 0.6) status = "aman";
    else if (rasio <= 0.8) status = "cukup";
    else if (rasio <= 1) status = "waspada";
    else status = "rawan";
  }

  const perubahanPengeluaranPersen =
    totalPengeluaranLalu > 0
      ? (totalPengeluaran - totalPengeluaranLalu) / totalPengeluaranLalu
      : null;

  return {
    totalPemasukanBulanIni: totalPemasukan,
    totalPengeluaranBulanIni: totalPengeluaran,
    totalPemasukanBulanLalu: totalPemasukanLalu,
    totalPengeluaranBulanLalu: totalPengeluaranLalu,
    perubahanPengeluaranPersen,
    arusKasBersih,
    rasioPengeluaranTerhadapPemasukan: rasio,
    statusKesehatan: status,
    kelompokPengeluaran: (kelompokRows ?? []).map((item) => ({
      kelompok: item.kelompok,
      total: item.total ?? 0,
    })),
    kategoriTeratas: (kategoriRows ?? []).map((item) => ({
      nama: item.nama,
      total: item.total ?? 0,
    })),
  };
}