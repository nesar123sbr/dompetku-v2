import type { SQLiteDatabase } from "expo-sqlite";

type DompetLocalSyncRow = {
  id: string;
  nama: string;
  jenis: "utama" | "tabungan" | "dana_darurat";
  tipe_dompet: string;
  saldo_saat_ini: number;
  is_default: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

type KategoriPemasukanLocalSyncRow = {
  id: string;
  nama: string;
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

type KategoriPengeluaranLocalSyncRow = {
  id: string;
  nama: string;
  kelompok: "kebutuhan" | "rutin" | "fleksibel" | "usaha" | "lainnya";
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

type PemasukanLocalSyncRow = {
  id: string;
  dompet_id: string;
  kategori_id: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  sumber_data: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

type PengeluaranLocalSyncRow = {
  id: string;
  dompet_id: string;
  kategori_id: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  pakai_dana_darurat: number;
  sumber_data: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

type PengingatTagihanLocalSyncRow = {
  id: string;
  judul: string;
  catatan: string | null;
  nominal: number;
  dompet_id: string | null;
  tanggal_jatuh_tempo: string;
  jam_pengingat: string;
  status: "aktif" | "selesai" | "dibatalkan";
  pengulangan: "sekali" | "mingguan" | "bulanan";
  notifikasi_diaktifkan: number;
  created_at: string;
  updated_at: string;
};

type TransferDompetLocalSyncRow = {
  id: string;
  dompet_sumber_id: string;
  dompet_tujuan_id: string;
  jumlah: number;
  tanggal_transfer: string;
  catatan: string | null;
  sumber_dana_darurat: number;
  created_at: string;
  updated_at: string;
};

export type BundleSinkronisasiAwalLokal = {
  dompet: DompetLocalSyncRow[];
  kategoriPemasukan: KategoriPemasukanLocalSyncRow[];
  kategoriPengeluaran: KategoriPengeluaranLocalSyncRow[];
  pemasukan: PemasukanLocalSyncRow[];
  pengeluaran: PengeluaranLocalSyncRow[];
  pengingatTagihan: PengingatTagihanLocalSyncRow[];
  transferDompet: TransferDompetLocalSyncRow[];
};

export async function getBundleSinkronisasiAwalLokal(
  db: SQLiteDatabase
): Promise<BundleSinkronisasiAwalLokal> {
  const [
    dompet,
    kategoriPemasukan,
    kategoriPengeluaran,
    pemasukan,
    pengeluaran,
    pengingatTagihan,
    transferDompet,
  ] = await Promise.all([
    db.getAllAsync<DompetLocalSyncRow>(
      `
        SELECT
          id,
          nama,
          jenis,
          COALESCE(tipe_dompet, jenis) AS tipe_dompet,
          saldo_saat_ini,
          is_default,
          is_aktif,
          created_at,
          updated_at
        FROM dompet
        ORDER BY created_at ASC
      `
    ),

    db.getAllAsync<KategoriPemasukanLocalSyncRow>(
      `
        SELECT
          id,
          nama,
          ikon,
          warna,
          urutan,
          is_bawaan,
          is_aktif,
          created_at,
          updated_at
        FROM kategori_pemasukan
        ORDER BY urutan ASC, created_at ASC
      `
    ),

    db.getAllAsync<KategoriPengeluaranLocalSyncRow>(
      `
        SELECT
          id,
          nama,
          kelompok,
          ikon,
          warna,
          urutan,
          is_bawaan,
          is_aktif,
          created_at,
          updated_at
        FROM kategori_pengeluaran
        ORDER BY urutan ASC, created_at ASC
      `
    ),

    db.getAllAsync<PemasukanLocalSyncRow>(
      `
        SELECT
          id,
          dompet_id,
          kategori_id,
          judul,
          catatan,
          jumlah,
          tanggal_transaksi,
          sumber_data,
          COALESCE(is_deleted, 0) AS is_deleted,
          created_at,
          updated_at
        FROM pemasukan
        ORDER BY created_at ASC
      `
    ),

    db.getAllAsync<PengeluaranLocalSyncRow>(
      `
        SELECT
          id,
          dompet_id,
          kategori_id,
          judul,
          catatan,
          jumlah,
          tanggal_transaksi,
          pakai_dana_darurat,
          sumber_data,
          COALESCE(is_deleted, 0) AS is_deleted,
          created_at,
          updated_at
        FROM pengeluaran
        ORDER BY created_at ASC
      `
    ),

    db.getAllAsync<PengingatTagihanLocalSyncRow>(
      `
        SELECT
          id,
          judul,
          catatan,
          nominal,
          dompet_id,
          tanggal_jatuh_tempo,
          COALESCE(jam_pengingat, '09:00') AS jam_pengingat,
          status,
          pengulangan,
          COALESCE(notifikasi_diaktifkan, 1) AS notifikasi_diaktifkan,
          created_at,
          updated_at
        FROM pengingat_tagihan
        ORDER BY created_at ASC
      `
    ),

    db.getAllAsync<TransferDompetLocalSyncRow>(
      `
        SELECT
          id,
          dompet_sumber_id,
          dompet_tujuan_id,
          jumlah,
          tanggal_transfer,
          catatan,
          sumber_dana_darurat,
          created_at,
          updated_at
        FROM transfer_dompet
        ORDER BY created_at ASC
      `
    ),
  ]);

  return {
    dompet: dompet ?? [],
    kategoriPemasukan: kategoriPemasukan ?? [],
    kategoriPengeluaran: kategoriPengeluaran ?? [],
    pemasukan: pemasukan ?? [],
    pengeluaran: pengeluaran ?? [],
    pengingatTagihan: pengingatTagihan ?? [],
    transferDompet: transferDompet ?? [],
  };
}