export type LocalDompetSync = {
  id: string;
  nama: string;
  jenis: "utama" | "tabungan" | "dana_darurat";
  tipe_dompet: string;
  saldo_saat_ini: number;
  saldo_awal: number;
  is_default: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

export type CloudDompetPayload = {
  id_lokal: string;
  nama: string;
  jenis: string;
  tipe_dompet: string;
  saldo_saat_ini: number;
  saldo_awal: number;
  is_default: boolean;
  is_aktif: boolean;
  sumber_data: string;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalKategoriSync = {
  id: string;
  nama: string;
  kelompok?: "kebutuhan" | "rutin" | "fleksibel" | "usaha" | "lainnya";
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: number;
  is_aktif: number;
  created_at: string;
  updated_at: string;
};

export type CloudKategoriPayload = {
  id_lokal: string;
  nama: string;
  kelompok?: string;
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: boolean;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalTransaksiSync = {
  id: string;
  dompet_id: string;
  kategori_id: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  pakai_dana_darurat?: number;
  sumber_data: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

export type CloudTransaksiPayload = {
  id_lokal: string;
  dompet_id_lokal: string;
  kategori_id_lokal: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  pakai_dana_darurat?: boolean;
  sumber_data: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalTransferSync = {
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

export type CloudTransferPayload = {
  id_lokal: string;
  dompet_sumber_id_lokal: string;
  dompet_tujuan_id_lokal: string;
  jumlah: number;
  tanggal_transfer: string;
  catatan: string | null;
  sumber_dana_darurat: boolean;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalAnggaranSync = {
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

export type CloudAnggaranPayload = {
  id_lokal: string;
  bulan: string;
  nama: string;
  kategori_id_lokal: string | null;
  batas_nominal: number;
  ambang_peringatan_persen: number;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalPengingatSync = {
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

export type CloudPengingatPayload = {
  id_lokal: string;
  judul: string;
  catatan: string | null;
  nominal: number;
  dompet_id_lokal: string | null;
  tanggal_jatuh_tempo: string;
  jam_pengingat: string;
  status: string;
  pengulangan: string;
  notifikasi_diaktifkan: boolean;
  sumber_data?: string;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export type LocalKoreksiSync = {
  id: string;
  dompet_id: string;
  nama_dompet_snapshot: string;
  saldo_sebelum: number;
  saldo_sesudah: number;
  selisih: number;
  catatan: string | null;
  sumber: string;
  created_at: string;
  updated_at: string;
};

export type CloudKoreksiPayload = {
  id_lokal: string;
  dompet_id_lokal: string;
  nama_dompet_snapshot: string;
  saldo_sebelum: number;
  saldo_sesudah: number;
  selisih: number;
  catatan: string | null;
  sumber: string;
  created_at: string;
  updated_at: string;
  server_updated_at?: string;
};

export function mapDompetToCloud(row: LocalDompetSync): CloudDompetPayload {
  return {
    id_lokal: row.id,
    nama: row.nama,
    jenis: row.jenis,
    tipe_dompet: row.tipe_dompet || row.jenis,
    saldo_saat_ini: row.saldo_saat_ini,
    saldo_awal: row.saldo_awal ?? 0,
    is_default: Boolean(row.is_default),
    is_aktif: Boolean(row.is_aktif),
    sumber_data: "lokal",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapKategoriPemasukanToCloud(row: LocalKategoriSync): CloudKategoriPayload {
  return {
    id_lokal: row.id,
    nama: row.nama,
    ikon: row.ikon,
    warna: row.warna,
    urutan: row.urutan,
    is_bawaan: Boolean(row.is_bawaan),
    is_aktif: Boolean(row.is_aktif),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapKategoriPengeluaranToCloud(row: LocalKategoriSync): CloudKategoriPayload {
  return {
    id_lokal: row.id,
    nama: row.nama,
    kelompok: row.kelompok ?? "lainnya",
    ikon: row.ikon,
    warna: row.warna,
    urutan: row.urutan,
    is_bawaan: Boolean(row.is_bawaan),
    is_aktif: Boolean(row.is_aktif),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapPemasukanToCloud(row: LocalTransaksiSync): CloudTransaksiPayload {
  return {
    id_lokal: row.id,
    dompet_id_lokal: row.dompet_id,
    kategori_id_lokal: row.kategori_id,
    judul: row.judul,
    catatan: row.catatan,
    jumlah: row.jumlah,
    tanggal_transaksi: row.tanggal_transaksi,
    sumber_data: row.sumber_data || "lokal",
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapPengeluaranToCloud(row: LocalTransaksiSync): CloudTransaksiPayload {
  return {
    id_lokal: row.id,
    dompet_id_lokal: row.dompet_id,
    kategori_id_lokal: row.kategori_id,
    judul: row.judul,
    catatan: row.catatan,
    jumlah: row.jumlah,
    tanggal_transaksi: row.tanggal_transaksi,
    pakai_dana_darurat: Boolean(row.pakai_dana_darurat),
    sumber_data: row.sumber_data || "lokal",
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapTransferToCloud(row: LocalTransferSync): CloudTransferPayload {
  return {
    id_lokal: row.id,
    dompet_sumber_id_lokal: row.dompet_sumber_id,
    dompet_tujuan_id_lokal: row.dompet_tujuan_id,
    jumlah: row.jumlah,
    tanggal_transfer: row.tanggal_transfer,
    catatan: row.catatan,
    sumber_dana_darurat: Boolean(row.sumber_dana_darurat),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapAnggaranToCloud(row: LocalAnggaranSync): CloudAnggaranPayload {
  return {
    id_lokal: row.id,
    bulan: row.bulan,
    nama: row.nama,
    kategori_id_lokal: row.kategori_id,
    batas_nominal: row.batas_nominal,
    ambang_peringatan_persen: row.ambang_peringatan_persen,
    is_aktif: Boolean(row.is_aktif),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapPengingatToCloud(row: LocalPengingatSync): CloudPengingatPayload {
  return {
    id_lokal: row.id,
    judul: row.judul,
    catatan: row.catatan,
    nominal: row.nominal,
    dompet_id_lokal: row.dompet_id,
    tanggal_jatuh_tempo: row.tanggal_jatuh_tempo,
    jam_pengingat: (row.jam_pengingat || "09:00").slice(0, 5),
    status: row.status,
    pengulangan: row.pengulangan,
    notifikasi_diaktifkan: Boolean(row.notifikasi_diaktifkan),
    sumber_data: "lokal",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapKoreksiToCloud(row: LocalKoreksiSync): CloudKoreksiPayload {
  return {
    id_lokal: row.id,
    dompet_id_lokal: row.dompet_id,
    nama_dompet_snapshot: row.nama_dompet_snapshot,
    saldo_sebelum: row.saldo_sebelum,
    saldo_sesudah: row.saldo_sesudah,
    selisih: row.selisih,
    catatan: row.catatan,
    sumber: row.sumber || "manual",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

