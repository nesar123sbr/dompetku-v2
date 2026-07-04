import type { SQLiteDatabase } from "expo-sqlite";

export type LaporanTransaksiRow = {
  jenis: "pemasukan" | "pengeluaran";
  judul: string;
  kategori: string | null;
  dompet: string | null;
  jumlah: number;
  tanggal: string;
  catatan: string | null;
};

export type LaporanBulanan = {
  bulan: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
  transaksi: LaporanTransaksiRow[];
};

type TotalRow = {
  total: number | null;
};

function getBulanIni() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getLaporanBulanan(
  db: SQLiteDatabase,
  bulan = getBulanIni()
): Promise<LaporanBulanan> {
  const [year, monthIndex] = bulan.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  const tanggalMulai = `${bulan}-01`;
  const tanggalSelesai = `${bulan}-${String(lastDay).padStart(2, "0")}`;

  const [pemasukanTotal, pengeluaranTotal, pemasukanRows, pengeluaranRows] =
    await Promise.all([
      db.getFirstAsync<TotalRow>(
        `
          SELECT COALESCE(SUM(jumlah), 0) AS total
          FROM pemasukan
          WHERE is_deleted = 0
            AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai
        `,
        { $mulai: tanggalMulai, $selesai: tanggalSelesai }
      ),
      db.getFirstAsync<TotalRow>(
        `
          SELECT COALESCE(SUM(jumlah), 0) AS total
          FROM pengeluaran
          WHERE is_deleted = 0
            AND tanggal_transaksi >= $mulai AND tanggal_transaksi <= $selesai
        `,
        { $mulai: tanggalMulai, $selesai: tanggalSelesai }
      ),
      db.getAllAsync<LaporanTransaksiRow>(
        `
          SELECT
            'pemasukan' AS jenis,
            p.judul,
            kp.nama AS kategori,
            d.nama AS dompet,
            p.jumlah,
            p.tanggal_transaksi AS tanggal,
            p.catatan
          FROM pemasukan p
          LEFT JOIN kategori_pemasukan kp ON kp.id = p.kategori_id
          LEFT JOIN dompet d ON d.id = p.dompet_id
          WHERE p.is_deleted = 0
            AND p.tanggal_transaksi >= $mulai AND p.tanggal_transaksi <= $selesai
        `,
        { $mulai: tanggalMulai, $selesai: tanggalSelesai }
      ),
      db.getAllAsync<LaporanTransaksiRow>(
        `
          SELECT
            'pengeluaran' AS jenis,
            p.judul,
            kg.nama AS kategori,
            d.nama AS dompet,
            p.jumlah,
            p.tanggal_transaksi AS tanggal,
            p.catatan
          FROM pengeluaran p
          LEFT JOIN kategori_pengeluaran kg ON kg.id = p.kategori_id
          LEFT JOIN dompet d ON d.id = p.dompet_id
          WHERE p.is_deleted = 0
            AND p.tanggal_transaksi >= $mulai AND p.tanggal_transaksi <= $selesai
        `,
        { $mulai: tanggalMulai, $selesai: tanggalSelesai }
      ),
    ]);

  const totalPemasukan = pemasukanTotal?.total ?? 0;
  const totalPengeluaran = pengeluaranTotal?.total ?? 0;

  const transaksi = [...(pemasukanRows ?? []), ...(pengeluaranRows ?? [])].sort(
    (a, b) => b.tanggal.localeCompare(a.tanggal)
  );

  return {
    bulan,
    totalPemasukan,
    totalPengeluaran,
    saldoBersih: totalPemasukan - totalPengeluaran,
    transaksi,
  };
}