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

function getBulanIni() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeBulan(value?: string | null) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return getBulanIni();
}

function getBulanSebelumnya(bulan: string) {
  const [yearRaw, monthRaw] = bulan.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getBulanIni();
  }

  const date = new Date(year, month - 2, 1);
  const previousYear = date.getFullYear();
  const previousMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${previousYear}-${previousMonth}`;
}

function hitungPerubahanPersen(sekarang: number, sebelumnya: number) {
  if (sebelumnya <= 0) {
    return null;
  }

  return (sekarang - sebelumnya) / sebelumnya;
}

export async function getInsightBulananSaatIni(
  db: SQLiteDatabase,
  bulanInput?: string | null
): Promise<InsightBulanan> {
  const bulan = normalizeBulan(bulanInput);
  const bulanLalu = getBulanSebelumnya(bulan);

  const pemasukanBulanIniRow = await db.getFirstAsync<TotalRow>(
    `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM pemasukan
      WHERE is_deleted = 0
        AND strftime('%Y-%m', tanggal_transaksi) = $bulan
    `,
    {
      $bulan: bulan,
    }
  );

  const pengeluaranBulanIniRow = await db.getFirstAsync<TotalRow>(
    `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM pengeluaran
      WHERE is_deleted = 0
        AND strftime('%Y-%m', tanggal_transaksi) = $bulan
    `,
    {
      $bulan: bulan,
    }
  );

  const pemasukanBulanLaluRow = await db.getFirstAsync<TotalRow>(
    `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM pemasukan
      WHERE is_deleted = 0
        AND strftime('%Y-%m', tanggal_transaksi) = $bulan_lalu
    `,
    {
      $bulan_lalu: bulanLalu,
    }
  );

  const pengeluaranBulanLaluRow = await db.getFirstAsync<TotalRow>(
    `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM pengeluaran
      WHERE is_deleted = 0
        AND strftime('%Y-%m', tanggal_transaksi) = $bulan_lalu
    `,
    {
      $bulan_lalu: bulanLalu,
    }
  );

  const kelompokRows = await db.getAllAsync<KelompokRow>(
    `
      SELECT
        kg.kelompok,
        COALESCE(SUM(p.jumlah), 0) AS total
      FROM kategori_pengeluaran kg
      LEFT JOIN pengeluaran p
        ON p.kategori_id = kg.id
       AND p.is_deleted = 0
       AND strftime('%Y-%m', p.tanggal_transaksi) = $bulan
      WHERE kg.is_aktif = 1
      GROUP BY kg.kelompok
      ORDER BY total DESC
    `,
    {
      $bulan: bulan,
    }
  );

  const kategoriRows = await db.getAllAsync<KategoriRow>(
    `
      SELECT
        COALESCE(kg.nama, 'Tanpa kategori') AS nama,
        COALESCE(SUM(p.jumlah), 0) AS total
      FROM pengeluaran p
      LEFT JOIN kategori_pengeluaran kg
        ON kg.id = p.kategori_id
      WHERE p.is_deleted = 0
        AND strftime('%Y-%m', p.tanggal_transaksi) = $bulan
      GROUP BY COALESCE(kg.nama, 'Tanpa kategori')
      ORDER BY total DESC
      LIMIT 5
    `,
    {
      $bulan: bulan,
    }
  );

  const totalPemasukanBulanIni = pemasukanBulanIniRow?.total ?? 0;
  const totalPengeluaranBulanIni = pengeluaranBulanIniRow?.total ?? 0;
  const totalPemasukanBulanLalu = pemasukanBulanLaluRow?.total ?? 0;
  const totalPengeluaranBulanLalu = pengeluaranBulanLaluRow?.total ?? 0;

  const arusKasBersih = totalPemasukanBulanIni - totalPengeluaranBulanIni;

  const rasioPengeluaranTerhadapPemasukan =
    totalPemasukanBulanIni > 0
      ? totalPengeluaranBulanIni / totalPemasukanBulanIni
      : 0;

  const perubahanPengeluaranPersen = hitungPerubahanPersen(
    totalPengeluaranBulanIni,
    totalPengeluaranBulanLalu
  );

  let statusKesehatan: InsightBulanan["statusKesehatan"] = "belum_ada_data";

  if (totalPemasukanBulanIni <= 0 && totalPengeluaranBulanIni <= 0) {
    statusKesehatan = "belum_ada_data";
  } else if (
    totalPemasukanBulanIni > 0 &&
    rasioPengeluaranTerhadapPemasukan <= 0.6
  ) {
    statusKesehatan = "aman";
  } else if (
    totalPemasukanBulanIni > 0 &&
    rasioPengeluaranTerhadapPemasukan <= 0.8
  ) {
    statusKesehatan = "cukup";
  } else if (
    totalPemasukanBulanIni > 0 &&
    rasioPengeluaranTerhadapPemasukan <= 1
  ) {
    statusKesehatan = "waspada";
  } else {
    statusKesehatan = "rawan";
  }

  return {
    totalPemasukanBulanIni,
    totalPengeluaranBulanIni,
    totalPemasukanBulanLalu,
    totalPengeluaranBulanLalu,
    perubahanPengeluaranPersen,
    arusKasBersih,
    rasioPengeluaranTerhadapPemasukan,
    statusKesehatan,
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

// ============================================================
// FUNGSI BARU: INSIGHT BERDASARKAN RENTANG TANGGAL (SARGABLE)
// ============================================================
export async function getInsightRentangPeriode(
  db: SQLiteDatabase,
  payload: { tanggalMulai: string; tanggalSelesai: string }
): Promise<InsightBulanan> {
  // 🔥 Eksekusi 4 Query Paralel
  const [pemasukanRow, pengeluaranRow, kelompokRows, kategoriRows] = await Promise.all([
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
  ]);

  const totalPemasukan = pemasukanRow?.total ?? 0;
  const totalPengeluaran = pengeluaranRow?.total ?? 0;
  const arusKasBersih = totalPemasukan - totalPengeluaran;
  const rasio = totalPemasukan > 0 ? totalPengeluaran / totalPemasukan : 0;

  let status: InsightBulanan["statusKesehatan"] = "belum_ada_data";
  if (totalPemasukan > 0 || totalPengeluaran > 0) {
    if (rasio <= 0.6) status = "aman";
    else if (rasio <= 0.8) status = "cukup";
    else if (rasio <= 1) status = "waspada";
    else status = "rawan";
  }

  return {
    totalPemasukanBulanIni: totalPemasukan,
    totalPengeluaranBulanIni: totalPengeluaran,
    totalPemasukanBulanLalu: 0, // rentang tidak punya bulan lalu
    totalPengeluaranBulanLalu: 0,
    perubahanPengeluaranPersen: null,
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