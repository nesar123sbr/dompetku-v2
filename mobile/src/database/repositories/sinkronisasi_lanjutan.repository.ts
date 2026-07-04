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

type AnggaranBulananLocalSyncRow = {
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

export type BundleSinkronisasiLokal = {
  dompet: DompetLocalSyncRow[];
  kategoriPemasukan: KategoriPemasukanLocalSyncRow[];
  kategoriPengeluaran: KategoriPengeluaranLocalSyncRow[];
  pemasukan: PemasukanLocalSyncRow[];
  pengeluaran: PengeluaranLocalSyncRow[];
  pengingatTagihan: PengingatTagihanLocalSyncRow[];
  transferDompet: TransferDompetLocalSyncRow[];
  anggaranBulanan: AnggaranBulananLocalSyncRow[];
};

export type CloudDompetRow = {
  id_lokal: string;
  nama: string;
  jenis: "utama" | "tabungan" | "dana_darurat";
  tipe_dompet: string | null;
  saldo_saat_ini: number;
  is_default: boolean;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type CloudKategoriPemasukanRow = {
  id_lokal: string;
  nama: string;
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: boolean;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type CloudKategoriPengeluaranRow = {
  id_lokal: string;
  nama: string;
  kelompok: "kebutuhan" | "rutin" | "fleksibel" | "usaha" | "lainnya";
  ikon: string | null;
  warna: string | null;
  urutan: number;
  is_bawaan: boolean;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type CloudPemasukanRow = {
  id_lokal: string;
  dompet_id_lokal: string;
  kategori_id_lokal: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  sumber_data: string;
  is_deleted: boolean | null;
  created_at: string;
  updated_at: string;
};

export type CloudPengeluaranRow = {
  id_lokal: string;
  dompet_id_lokal: string;
  kategori_id_lokal: string | null;
  judul: string;
  catatan: string | null;
  jumlah: number;
  tanggal_transaksi: string;
  pakai_dana_darurat: boolean;
  sumber_data: string;
  is_deleted: boolean | null;
  created_at: string;
  updated_at: string;
};

export type CloudPengingatTagihanRow = {
  id_lokal: string;
  judul: string;
  catatan: string | null;
  nominal: number;
  dompet_id_lokal: string | null;
  tanggal_jatuh_tempo: string;
  jam_pengingat: string;
  status: "aktif" | "selesai" | "dibatalkan";
  pengulangan: "sekali" | "mingguan" | "bulanan";
  notifikasi_diaktifkan: boolean;
  created_at: string;
  updated_at: string;
};

export type CloudTransferDompetRow = {
  id_lokal: string;
  dompet_sumber_id_lokal: string;
  dompet_tujuan_id_lokal: string;
  jumlah: number;
  tanggal_transfer: string;
  catatan: string | null;
  sumber_dana_darurat: boolean;
  created_at: string;
  updated_at: string;
};

export type CloudAnggaranBulananRow = {
  id_lokal: string;
  bulan: string;
  nama: string;
  kategori_id_lokal: string | null;
  batas_nominal: number;
  ambang_peringatan_persen: number;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type BundleSinkronisasiCloud = {
  dompet: CloudDompetRow[];
  kategoriPemasukan: CloudKategoriPemasukanRow[];
  kategoriPengeluaran: CloudKategoriPengeluaranRow[];
  pemasukan: CloudPemasukanRow[];
  pengeluaran: CloudPengeluaranRow[];
  pengingatTagihan: CloudPengingatTagihanRow[];
  transferDompet: CloudTransferDompetRow[];
  anggaranBulanan: CloudAnggaranBulananRow[];
};

async function queryAllOrSince<T>(
  db: SQLiteDatabase,
  baseSql: string,
  sinceIso?: string | null
): Promise<T[]> {
  if (!sinceIso) {
    const rows = await db.getAllAsync<T>(baseSql);
    return rows ?? [];
  }

  const sql = `${baseSql}\nWHERE updated_at > $since\nORDER BY updated_at ASC`;

  const rows = await db.getAllAsync<T>(sql, {
    $since: sinceIso,
  });

  return rows ?? [];
}

export async function getBundleSinkronisasiLokalSejak(
  db: SQLiteDatabase,
  sinceIso?: string | null
): Promise<BundleSinkronisasiLokal> {
  const dompet = await queryAllOrSince<DompetLocalSyncRow>(
    db,
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
    `,
    sinceIso
  );

  const kategoriPemasukan =
    await queryAllOrSince<KategoriPemasukanLocalSyncRow>(
      db,
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
      `,
      sinceIso
    );

  const kategoriPengeluaran =
    await queryAllOrSince<KategoriPengeluaranLocalSyncRow>(
      db,
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
      `,
      sinceIso
    );

  const pemasukan = await queryAllOrSince<PemasukanLocalSyncRow>(
    db,
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
    `,
    sinceIso
  );

  const pengeluaran = await queryAllOrSince<PengeluaranLocalSyncRow>(
    db,
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
    `,
    sinceIso
  );

  const pengingatTagihan =
    await queryAllOrSince<PengingatTagihanLocalSyncRow>(
      db,
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
      `,
      sinceIso
    );

  const transferDompet = await queryAllOrSince<TransferDompetLocalSyncRow>(
    db,
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
    `,
    sinceIso
  );

  const anggaranBulanan =
    await queryAllOrSince<AnggaranBulananLocalSyncRow>(
      db,
      `
        SELECT
          id,
          bulan,
          nama,
          kategori_id,
          batas_nominal,
          ambang_peringatan_persen,
          is_aktif,
          created_at,
          updated_at
        FROM anggaran_bulanan
      `,
      sinceIso
    );

  return {
    dompet: dompet ?? [],
    kategoriPemasukan: kategoriPemasukan ?? [],
    kategoriPengeluaran: kategoriPengeluaran ?? [],
    pemasukan: pemasukan ?? [],
    pengeluaran: pengeluaran ?? [],
    pengingatTagihan: pengingatTagihan ?? [],
    transferDompet: transferDompet ?? [],
    anggaranBulanan: anggaranBulanan ?? [],
  };
}

export async function terapkanBundleCloudKeSQLite(
  db: SQLiteDatabase,
  bundle: BundleSinkronisasiCloud
) {
  // ABSOLUT: 1 Transaksi Mutlak dengan Prepared Statements untuk C++ Binding Cepat
  await db.withExclusiveTransactionAsync(async (txn) => {
    
    // 1. Dompet
    if (bundle.dompet.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO dompet (id, nama, jenis, tipe_dompet, saldo_saat_ini, is_default, is_aktif, created_at, updated_at) 
         VALUES ($id, $nama, $jenis, $tipe_dompet, $saldo, $is_default, $is_aktif, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           nama = excluded.nama, jenis = excluded.jenis, tipe_dompet = excluded.tipe_dompet, 
           saldo_saat_ini = excluded.saldo_saat_ini, is_default = excluded.is_default, 
           is_aktif = excluded.is_aktif, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.dompet) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $nama: item.nama,
            $jenis: item.jenis,
            $tipe_dompet: item.tipe_dompet ?? item.jenis,
            $saldo: item.saldo_saat_ini,
            $is_default: item.is_default ? 1 : 0,
            $is_aktif: item.is_aktif ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 2. Kategori Pemasukan
    if (bundle.kategoriPemasukan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO kategori_pemasukan (id, nama, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at) 
         VALUES ($id, $nama, $ikon, $warna, $urutan, $is_bawaan, $is_aktif, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           nama = excluded.nama, ikon = excluded.ikon, warna = excluded.warna, urutan = excluded.urutan, 
           is_bawaan = excluded.is_bawaan, is_aktif = excluded.is_aktif, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.kategoriPemasukan) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $nama: item.nama,
            $ikon: item.ikon,
            $warna: item.warna,
            $urutan: item.urutan,
            $is_bawaan: item.is_bawaan ? 1 : 0,
            $is_aktif: item.is_aktif ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 3. Kategori Pengeluaran
    if (bundle.kategoriPengeluaran.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO kategori_pengeluaran (id, nama, kelompok, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at) 
         VALUES ($id, $nama, $kelompok, $ikon, $warna, $urutan, $is_bawaan, $is_aktif, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           nama = excluded.nama, kelompok = excluded.kelompok, ikon = excluded.ikon, warna = excluded.warna, 
           urutan = excluded.urutan, is_bawaan = excluded.is_bawaan, is_aktif = excluded.is_aktif, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.kategoriPengeluaran) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $nama: item.nama,
            $kelompok: item.kelompok,
            $ikon: item.ikon,
            $warna: item.warna,
            $urutan: item.urutan,
            $is_bawaan: item.is_bawaan ? 1 : 0,
            $is_aktif: item.is_aktif ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 4. Pemasukan
    if (bundle.pemasukan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pemasukan (id, dompet_id, kategori_id, judul, catatan, jumlah, tanggal_transaksi, sumber_data, is_deleted, created_at, updated_at) 
         VALUES ($id, $dompet_id, $kategori_id, $judul, $catatan, $jumlah, $tanggal, $sumber, $is_deleted, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           dompet_id = excluded.dompet_id, kategori_id = excluded.kategori_id, judul = excluded.judul, 
           catatan = excluded.catatan, jumlah = excluded.jumlah, tanggal_transaksi = excluded.tanggal_transaksi, 
           sumber_data = excluded.sumber_data, is_deleted = excluded.is_deleted, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.pemasukan) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $dompet_id: item.dompet_id_lokal,
            $kategori_id: item.kategori_id_lokal,
            $judul: item.judul,
            $catatan: item.catatan,
            $jumlah: item.jumlah,
            $tanggal: item.tanggal_transaksi,
            $sumber: item.sumber_data ?? "lokal",
            $is_deleted: item.is_deleted ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 5. Pengeluaran
    if (bundle.pengeluaran.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pengeluaran (id, dompet_id, kategori_id, judul, catatan, jumlah, tanggal_transaksi, pakai_dana_darurat, sumber_data, is_deleted, created_at, updated_at) 
         VALUES ($id, $dompet_id, $kategori_id, $judul, $catatan, $jumlah, $tanggal, $darurat, $sumber, $is_deleted, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           dompet_id = excluded.dompet_id, kategori_id = excluded.kategori_id, judul = excluded.judul, 
           catatan = excluded.catatan, jumlah = excluded.jumlah, tanggal_transaksi = excluded.tanggal_transaksi, 
           pakai_dana_darurat = excluded.pakai_dana_darurat, sumber_data = excluded.sumber_data, 
           is_deleted = excluded.is_deleted, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.pengeluaran) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $dompet_id: item.dompet_id_lokal,
            $kategori_id: item.kategori_id_lokal,
            $judul: item.judul,
            $catatan: item.catatan,
            $jumlah: item.jumlah,
            $tanggal: item.tanggal_transaksi,
            $darurat: item.pakai_dana_darurat ? 1 : 0,
            $sumber: item.sumber_data ?? "lokal",
            $is_deleted: item.is_deleted ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 6. Pengingat Tagihan
    if (bundle.pengingatTagihan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pengingat_tagihan (id, judul, catatan, nominal, dompet_id, tanggal_jatuh_tempo, status, pengulangan, jam_pengingat, notifikasi_diaktifkan, created_at, updated_at) 
         VALUES ($id, $judul, $catatan, $nominal, $dompet_id, $tanggal, $status, $pengulangan, $jam, $notif, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           judul = excluded.judul, catatan = excluded.catatan, nominal = excluded.nominal, 
           dompet_id = excluded.dompet_id, tanggal_jatuh_tempo = excluded.tanggal_jatuh_tempo, 
           status = excluded.status, pengulangan = excluded.pengulangan, jam_pengingat = excluded.jam_pengingat, 
           notifikasi_diaktifkan = excluded.notifikasi_diaktifkan, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.pengingatTagihan) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $judul: item.judul,
            $catatan: item.catatan,
            $nominal: item.nominal,
            $dompet_id: item.dompet_id_lokal,
            $tanggal: item.tanggal_jatuh_tempo,
            $status: item.status,
            $pengulangan: item.pengulangan,
            $jam: item.jam_pengingat,
            $notif: item.notifikasi_diaktifkan ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 7. Transfer Dompet
    if (bundle.transferDompet.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO transfer_dompet (id, dompet_sumber_id, dompet_tujuan_id, jumlah, tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at) 
         VALUES ($id, $sumber_id, $tujuan_id, $jumlah, $tanggal, $catatan, $darurat, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           dompet_sumber_id = excluded.dompet_sumber_id, dompet_tujuan_id = excluded.dompet_tujuan_id, 
           jumlah = excluded.jumlah, tanggal_transfer = excluded.tanggal_transfer, catatan = excluded.catatan, 
           sumber_dana_darurat = excluded.sumber_dana_darurat, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.transferDompet) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $sumber_id: item.dompet_sumber_id_lokal,
            $tujuan_id: item.dompet_tujuan_id_lokal,
            $jumlah: item.jumlah,
            $tanggal: item.tanggal_transfer,
            $catatan: item.catatan,
            $darurat: item.sumber_dana_darurat ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 8. Anggaran Bulanan
    if (bundle.anggaranBulanan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO anggaran_bulanan (id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at) 
         VALUES ($id, $bulan, $nama, $kategori_id, $batas, $ambang, $is_aktif, $created_at, $updated_at)
         ON CONFLICT(id) DO UPDATE SET 
           bulan = excluded.bulan, nama = excluded.nama, kategori_id = excluded.kategori_id, 
           batas_nominal = excluded.batas_nominal, ambang_peringatan_persen = excluded.ambang_peringatan_persen, 
           is_aktif = excluded.is_aktif, created_at = excluded.created_at, updated_at = excluded.updated_at`
      );
      try {
        for (const item of bundle.anggaranBulanan) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $bulan: item.bulan,
            $nama: item.nama,
            $kategori_id: item.kategori_id_lokal,
            $batas: item.batas_nominal,
            $ambang: item.ambang_peringatan_persen,
            $is_aktif: item.is_aktif ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }
  });
}