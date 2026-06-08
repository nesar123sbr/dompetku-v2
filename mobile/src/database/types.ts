import { MODE_PENGGUNAAN } from "./constants";

export type ModePenggunaan =
  (typeof MODE_PENGGUNAAN)[keyof typeof MODE_PENGGUNAAN];

export type DompetJenis = "utama" | "tabungan" | "dana_darurat";
export type JenisTransaksi = "pemasukan" | "pengeluaran";

export type DompetTipe =
  | "tunai"
  | "bank"
  | "ewallet"
  | "tabungan"
  | "dana_darurat"
  | "lainnya";

export type KelompokKategoriPengeluaran =
  | "kebutuhan"
  | "rutin"
  | "fleksibel"
  | "usaha"
  | "lainnya";

export type StatusDanaDarurat =
  | "belum_ada_data"
  | "belum_aman"
  | "cukup"
  | "aman";

export type PengingatPengulangan = "sekali" | "mingguan" | "bulanan";
export type PengingatStatus = "aktif" | "selesai" | "dibatalkan";

export type DompetRow = {
  id: string;
  nama: string;
  jenis: DompetJenis;
  tipe_dompet: DompetTipe;
  saldo_saat_ini: number;
  is_default: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

export type KategoriPemasukanRow = {
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

export type KategoriPengeluaranRow = {
  id: string;
  nama: string;
  kelompok: KelompokKategoriPengeluaran;
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

export type RingkasanDashboard = {
  totalSaldo: number;
  totalDanaDarurat: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  jumlahDompetAktif: number;
  jumlahPengingatAktif: number;
};

export type RingkasanWalletTab = {
  totalSaldo: number;
  saldoNonDarurat: number;
  saldoTabungan: number;
  saldoDanaDarurat: number;
  jumlahDompetAktif: number;
};

export type RingkasanDanaDarurat = {
  saldoDanaDarurat: number;
  estimasiProteksi30Hari: number;
  targetMinimal: number;
  targetIdeal: number;
  rasioMinimal: number;
  rasioIdeal: number;
  status: StatusDanaDarurat;
};

export type TambahPemasukanPayload = {
  dompetId: string;
  kategoriId: string | null;
  judul: string;
  catatan?: string;
  jumlah: number;
  tanggalTransaksi: string;
};

export type TambahPengeluaranPayload = {
  dompetId: string;
  kategoriId: string | null;
  judul: string;
  catatan?: string;
  jumlah: number;
  tanggalTransaksi: string;
  pakaiDanaDarurat?: boolean;
};

export type RiwayatTransaksiRow = {
  id: string;
  jenis_transaksi: JenisTransaksi;
  judul: string;
  jumlah: number;
  tanggal_transaksi: string;
  nama_dompet: string | null;
  nama_kategori: string | null;
  warna_kategori: string | null;
  pakai_dana_darurat: number;
  created_at: string;
};

export type DetailTransaksiEdit = {
  id: string;
  jenis_transaksi: JenisTransaksi;
  dompet_id: string;
  kategori_id: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
};

export type TransferAntarDompetPayload = {
  dompetSumberId: string;
  dompetTujuanId: string;
  jumlah: number;
  tanggalTransfer: string;
  catatan?: string;
  konfirmasiGunakanDanaDarurat?: boolean;
};

export type RiwayatTransferRow = {
  id: string;
  jumlah: number;
  tanggal_transfer: string;
  catatan: string | null;
  nama_dompet_sumber: string | null;
  nama_dompet_tujuan: string | null;
  sumber_dana_darurat: number;
  created_at: string;
};

export type BuatPengingatTagihanPayload = {
  judul: string;
  catatan?: string;
  nominal: number;
  dompetId?: string | null;
  tanggalJatuhTempo: string;
  jamPengingat: string;
  pengulangan: PengingatPengulangan;
  notifikasiDiaktifkan: boolean;
};

export type PengingatTagihanListItem = {
  id: string;
  judul: string;
  catatan: string | null;
  nominal: number;
  dompet_id: string | null;
  nama_dompet: string | null;
  tanggal_jatuh_tempo: string;
  jam_pengingat: string;
  status: PengingatStatus;
  pengulangan: PengingatPengulangan;
  lokal_notifikasi_id: string | null;
  notifikasi_diaktifkan: number;
  created_at: string;
  updated_at: string;
};

export type RingkasanPengingatTagihan = {
  totalAktif: number;
  jatuhTempoHariIni: number;
  terlambat: number;
  notifikasiAktif: number;
};

export type AnggaranBulananRow = {
  id: string;
  bulan: string;
  nama: string;
  kategori_id: string | null;
  batas_nominal: number;
  ambang_peringatan_persen: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

export type RingkasanAnggaranBulananItem = {
  id: string;
  bulan: string;
  nama: string;
  kategori_id: string | null;
  nama_kategori: string | null;
  batas_nominal: number;
  total_terpakai: number;
  sisa_anggaran: number;
  persentase_terpakai: number;
  status: "aman" | "mendekati_batas" | "melewati_batas";
};