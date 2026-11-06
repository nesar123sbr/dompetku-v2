import type { SQLiteDatabase } from "expo-sqlite";

import type {
  CloudAnggaranPayload,
  CloudDompetPayload,
  CloudKategoriPayload,
  CloudKoreksiPayload,
  CloudPengingatPayload,
  CloudTransaksiPayload,
  CloudTransferPayload,
  LocalAnggaranSync,
  LocalDompetSync,
  LocalKategoriSync,
  LocalKoreksiSync,
  LocalPengingatSync,
  LocalTransaksiSync,
  LocalTransferSync,
} from "./mapper";

export type BundleSinkronisasiLokal = {
  dompet: LocalDompetSync[];
  kategoriPemasukan: LocalKategoriSync[];
  kategoriPengeluaran: LocalKategoriSync[];
  pemasukan: LocalTransaksiSync[];
  pengeluaran: LocalTransaksiSync[];
  transferDompet: LocalTransferSync[];
  anggaranBulanan: LocalAnggaranSync[];
  koreksiSaldoDompet: LocalKoreksiSync[];
  pengingatTagihan: LocalPengingatSync[];
};

export type BundleSinkronisasiCloud = {
  dompet: CloudDompetPayload[];
  kategoriPemasukan: CloudKategoriPayload[];
  kategoriPengeluaran: CloudKategoriPayload[];
  anggaranBulanan: CloudAnggaranPayload[];
  pemasukan: CloudTransaksiPayload[];
  pengeluaran: CloudTransaksiPayload[];
  transferDompet: CloudTransferPayload[];
  koreksiSaldoDompet: CloudKoreksiPayload[];
  pengingatTagihan: CloudPengingatPayload[];
};

export async function getBundleSinkronisasiLokalSejak(
  db: SQLiteDatabase,
  watermark: string
): Promise<BundleSinkronisasiLokal> {
  const dompet = (await db.getAllAsync<LocalDompetSync>(
    `SELECT id, nama, jenis, COALESCE(tipe_dompet, jenis) as tipe_dompet, saldo_saat_ini, COALESCE(saldo_awal, 0) as saldo_awal, is_default, is_aktif, created_at, updated_at
     FROM dompet WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const kategoriPemasukan = (await db.getAllAsync<LocalKategoriSync>(
    `SELECT id, nama, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
     FROM kategori_pemasukan WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const kategoriPengeluaran = (await db.getAllAsync<LocalKategoriSync>(
    `SELECT id, nama, kelompok, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
     FROM kategori_pengeluaran WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const pemasukan = (await db.getAllAsync<LocalTransaksiSync>(
    `SELECT id, dompet_id, kategori_id, judul, catatan, jumlah, tanggal_transaksi, sumber_data, is_deleted, created_at, updated_at
     FROM pemasukan WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const pengeluaran = (await db.getAllAsync<LocalTransaksiSync>(
    `SELECT id, dompet_id, kategori_id, judul, catatan, jumlah, tanggal_transaksi, pakai_dana_darurat, sumber_data, is_deleted, created_at, updated_at
     FROM pengeluaran WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const transferDompet = (await db.getAllAsync<LocalTransferSync>(
    `SELECT id, dompet_sumber_id, dompet_tujuan_id, jumlah, tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at
     FROM transfer_dompet WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const anggaranBulanan = (await db.getAllAsync<LocalAnggaranSync>(
    `SELECT id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
     FROM anggaran_bulanan WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const koreksiSaldoDompet = (await db.getAllAsync<LocalKoreksiSync>(
    `SELECT id, dompet_id, nama_dompet_snapshot, saldo_sebelum, saldo_sesudah, selisih, catatan, sumber, created_at, updated_at
     FROM koreksi_saldo_dompet WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  const pengingatTagihan = (await db.getAllAsync<LocalPengingatSync>(
    `SELECT id, judul, catatan, nominal, dompet_id, tanggal_jatuh_tempo, substr(jam_pengingat, 1, 5) as jam_pengingat, status, pengulangan, notifikasi_diaktifkan, created_at, updated_at
     FROM pengingat_tagihan WHERE updated_at > $watermark`,
    { $watermark: watermark }
  )) ?? [];

  return {
    dompet,
    kategoriPemasukan,
    kategoriPengeluaran,
    pemasukan,
    pengeluaran,
    transferDompet,
    anggaranBulanan,
    koreksiSaldoDompet,
    pengingatTagihan,
  };
}

export async function terapkanBundleCloudKeSQLite(
  db: SQLiteDatabase,
  bundle: BundleSinkronisasiCloud
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Urutan: dompet, kategori, anggaran, transaksi, transfer, koreksi, pengingat.

    // 1. Dompet (JANGAN timpa saldo_saat_ini jika baris sudah ada)
    if (bundle.dompet.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO dompet (
           id, nama, jenis, tipe_dompet, saldo_saat_ini, saldo_awal,
           is_default, is_aktif, created_at, updated_at
         ) VALUES (
           $id, $nama, $jenis, $tipe_dompet, $saldo_awal, $saldo_awal,
           $is_default, $is_aktif, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           nama = excluded.nama,
           jenis = excluded.jenis,
           tipe_dompet = excluded.tipe_dompet,
           saldo_awal = excluded.saldo_awal,
           is_default = excluded.is_default,
           is_aktif = excluded.is_aktif,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > dompet.updated_at`
      );
      try {
        for (const item of bundle.dompet) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $nama: item.nama,
            $jenis: item.jenis,
            $tipe_dompet: item.tipe_dompet || item.jenis,
            $saldo_awal: item.saldo_awal ?? 0,
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
        `INSERT INTO kategori_pemasukan (
           id, nama, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
         ) VALUES (
           $id, $nama, $ikon, $warna, $urutan, $is_bawaan, $is_aktif, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           nama = excluded.nama,
           ikon = excluded.ikon,
           warna = excluded.warna,
           urutan = excluded.urutan,
           is_bawaan = excluded.is_bawaan,
           is_aktif = excluded.is_aktif,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > kategori_pemasukan.updated_at`
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

    // 2b. Kategori Pengeluaran
    if (bundle.kategoriPengeluaran.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO kategori_pengeluaran (
           id, nama, kelompok, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
         ) VALUES (
           $id, $nama, $kelompok, $ikon, $warna, $urutan, $is_bawaan, $is_aktif, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           nama = excluded.nama,
           kelompok = excluded.kelompok,
           ikon = excluded.ikon,
           warna = excluded.warna,
           urutan = excluded.urutan,
           is_bawaan = excluded.is_bawaan,
           is_aktif = excluded.is_aktif,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > kategori_pengeluaran.updated_at`
      );
      try {
        for (const item of bundle.kategoriPengeluaran) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $nama: item.nama,
            $kelompok: item.kelompok || "lainnya",
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

    // 3. Anggaran Bulanan
    if (bundle.anggaranBulanan.length > 0) {
      const sortedAnggaran = [...bundle.anggaranBulanan].sort((a, b) => {
        const aAktif = a.is_aktif ? 1 : 0;
        const bAktif = b.is_aktif ? 1 : 0;
        return aAktif - bAktif;
      });

      const deactStmt = await txn.prepareAsync(
        `UPDATE anggaran_bulanan
         SET is_aktif = 0, updated_at = $updated_at
         WHERE bulan = $bulan
           AND COALESCE(kategori_id, '__semua__') = COALESCE($kategori_id, '__semua__')
           AND id <> $id
           AND is_aktif = 1`
      );

      const stmt = await txn.prepareAsync(
        `INSERT INTO anggaran_bulanan (
           id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen,
           is_aktif, created_at, updated_at
         ) VALUES (
           $id, $bulan, $nama, $kategori_id, $batas, $ambang,
           $is_aktif, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           bulan = excluded.bulan,
           nama = excluded.nama,
           kategori_id = excluded.kategori_id,
           batas_nominal = excluded.batas_nominal,
           ambang_peringatan_persen = excluded.ambang_peringatan_persen,
           is_aktif = excluded.is_aktif,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > anggaran_bulanan.updated_at`
      );
      try {
        for (const item of sortedAnggaran) {
          if (item.is_aktif) {
            await deactStmt.executeAsync({
              $bulan: item.bulan,
              $kategori_id: item.kategori_id_lokal || null,
              $id: item.id_lokal,
              $updated_at: item.updated_at,
            });
          }

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
        await deactStmt.finalizeAsync();
        await stmt.finalizeAsync();
      }
    }

    // 4. Pemasukan
    if (bundle.pemasukan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pemasukan (
           id, dompet_id, kategori_id, judul, catatan, jumlah,
           tanggal_transaksi, sumber_data, is_deleted, created_at, updated_at
         ) VALUES (
           $id, $dompet_id, $kategori_id, $judul, $catatan, $jumlah,
           $tanggal, $sumber, $is_deleted, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           dompet_id = excluded.dompet_id,
           kategori_id = excluded.kategori_id,
           judul = excluded.judul,
           catatan = excluded.catatan,
           jumlah = excluded.jumlah,
           tanggal_transaksi = excluded.tanggal_transaksi,
           sumber_data = excluded.sumber_data,
           is_deleted = excluded.is_deleted,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > pemasukan.updated_at`
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
            $sumber: item.sumber_data || "lokal",
            $is_deleted: item.is_deleted ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 4b. Pengeluaran
    if (bundle.pengeluaran.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pengeluaran (
           id, dompet_id, kategori_id, judul, catatan, jumlah,
           tanggal_transaksi, pakai_dana_darurat, sumber_data, is_deleted, created_at, updated_at
         ) VALUES (
           $id, $dompet_id, $kategori_id, $judul, $catatan, $jumlah,
           $tanggal, $darurat, $sumber, $is_deleted, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           dompet_id = excluded.dompet_id,
           kategori_id = excluded.kategori_id,
           judul = excluded.judul,
           catatan = excluded.catatan,
           jumlah = excluded.jumlah,
           tanggal_transaksi = excluded.tanggal_transaksi,
           pakai_dana_darurat = excluded.pakai_dana_darurat,
           sumber_data = excluded.sumber_data,
           is_deleted = excluded.is_deleted,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > pengeluaran.updated_at`
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
            $sumber: item.sumber_data || "lokal",
            $is_deleted: item.is_deleted ? 1 : 0,
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 5. Transfer Dompet
    if (bundle.transferDompet.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO transfer_dompet (
           id, dompet_sumber_id, dompet_tujuan_id, jumlah,
           tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at
         ) VALUES (
           $id, $sumber_id, $tujuan_id, $jumlah,
           $tanggal, $catatan, $darurat, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           dompet_sumber_id = excluded.dompet_sumber_id,
           dompet_tujuan_id = excluded.dompet_tujuan_id,
           jumlah = excluded.jumlah,
           tanggal_transfer = excluded.tanggal_transfer,
           catatan = excluded.catatan,
           sumber_dana_darurat = excluded.sumber_dana_darurat,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > transfer_dompet.updated_at`
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

    // 6. Koreksi Saldo Dompet (Append-Only)
    if (bundle.koreksiSaldoDompet.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO koreksi_saldo_dompet (
           id, dompet_id, nama_dompet_snapshot, saldo_sebelum, saldo_sesudah,
           selisih, catatan, sumber, created_at, updated_at
         ) VALUES (
           $id, $dompet_id, $nama_dompet_snapshot, $saldo_sebelum, $saldo_sesudah,
           $selisih, $catatan, $sumber, $created_at, $updated_at
         )
         ON CONFLICT(id) DO NOTHING`
      );
      try {
        for (const item of bundle.koreksiSaldoDompet) {
          await stmt.executeAsync({
            $id: item.id_lokal,
            $dompet_id: item.dompet_id_lokal,
            $nama_dompet_snapshot: item.nama_dompet_snapshot,
            $saldo_sebelum: item.saldo_sebelum,
            $saldo_sesudah: item.saldo_sesudah,
            $selisih: item.selisih,
            $catatan: item.catatan,
            $sumber: item.sumber || "manual",
            $created_at: item.created_at,
            $updated_at: item.updated_at,
          });
        }
      } finally {
        await stmt.finalizeAsync();
      }
    }

    // 7. Pengingat Tagihan
    if (bundle.pengingatTagihan.length > 0) {
      const stmt = await txn.prepareAsync(
        `INSERT INTO pengingat_tagihan (
           id, judul, catatan, nominal, dompet_id, tanggal_jatuh_tempo,
           jam_pengingat, status, pengulangan, notifikasi_diaktifkan, created_at, updated_at
         ) VALUES (
           $id, $judul, $catatan, $nominal, $dompet_id, $tanggal,
           $jam, $status, $pengulangan, $notif, $created_at, $updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           judul = excluded.judul,
           catatan = excluded.catatan,
           nominal = excluded.nominal,
           dompet_id = excluded.dompet_id,
           tanggal_jatuh_tempo = excluded.tanggal_jatuh_tempo,
           jam_pengingat = excluded.jam_pengingat,
           status = excluded.status,
           pengulangan = excluded.pengulangan,
           notifikasi_diaktifkan = excluded.notifikasi_diaktifkan,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > pengingat_tagihan.updated_at`
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
            $jam: String(item.jam_pengingat ?? "09:00").slice(0, 5),
            $status: item.status,
            $pengulangan: item.pengulangan,
            $notif: item.notifikasi_diaktifkan ? 1 : 0,
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

