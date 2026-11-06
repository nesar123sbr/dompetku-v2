import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

function setupV1toV7(db) {
  // Version 1
  db.exec(`
    CREATE TABLE pengaturan_aplikasi (
      kunci TEXT PRIMARY KEY NOT NULL,
      nilai_teks TEXT,
      nilai_angka REAL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE dompet (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      jenis TEXT NOT NULL CHECK (jenis IN ('utama', 'tabungan', 'dana_darurat')),
      saldo_saat_ini REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE kategori_pemasukan (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      ikon TEXT,
      warna TEXT,
      urutan INTEGER NOT NULL DEFAULT 0,
      is_bawaan INTEGER NOT NULL DEFAULT 1,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE kategori_pengeluaran (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      kelompok TEXT NOT NULL DEFAULT 'lainnya',
      ikon TEXT,
      warna TEXT,
      urutan INTEGER NOT NULL DEFAULT 0,
      is_bawaan INTEGER NOT NULL DEFAULT 1,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE pemasukan (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_id TEXT NOT NULL,
      kategori_id TEXT,
      judul TEXT NOT NULL,
      catatan TEXT,
      jumlah REAL NOT NULL CHECK (jumlah > 0),
      tanggal_transaksi TEXT NOT NULL,
      sumber_data TEXT NOT NULL DEFAULT 'lokal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE pengeluaran (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_id TEXT NOT NULL,
      kategori_id TEXT,
      judul TEXT NOT NULL,
      catatan TEXT,
      jumlah REAL NOT NULL CHECK (jumlah > 0),
      tanggal_transaksi TEXT NOT NULL,
      pakai_dana_darurat INTEGER NOT NULL DEFAULT 0,
      sumber_data TEXT NOT NULL DEFAULT 'lokal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE pengingat_tagihan (
      id TEXT PRIMARY KEY NOT NULL,
      judul TEXT NOT NULL,
      catatan TEXT,
      nominal REAL NOT NULL DEFAULT 0,
      dompet_id TEXT,
      tanggal_jatuh_tempo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif',
      pengulangan TEXT NOT NULL DEFAULT 'sekali',
      lokal_notifikasi_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Version 2: transfer_dompet
  db.exec(`
    CREATE TABLE transfer_dompet (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_sumber_id TEXT NOT NULL,
      dompet_tujuan_id TEXT NOT NULL,
      jumlah REAL NOT NULL CHECK (jumlah > 0),
      tanggal_transfer TEXT NOT NULL,
      catatan TEXT,
      sumber_dana_darurat INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Version 3: reminder columns
  db.exec(`
    ALTER TABLE pengingat_tagihan ADD COLUMN jam_pengingat TEXT NOT NULL DEFAULT '09:00';
    ALTER TABLE pengingat_tagihan ADD COLUMN notifikasi_diaktifkan INTEGER NOT NULL DEFAULT 1;
  `);

  // Version 4: budget tables
  db.exec(`
    CREATE TABLE anggaran_bulanan (
      id TEXT PRIMARY KEY NOT NULL,
      bulan TEXT NOT NULL,
      nama TEXT NOT NULL,
      kategori_id TEXT,
      batas_nominal REAL NOT NULL CHECK (batas_nominal > 0),
      ambang_peringatan_persen REAL NOT NULL DEFAULT 0.8,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (bulan, kategori_id)
    );
  `);

  // Version 5: wallet type
  db.exec(`
    ALTER TABLE dompet ADD COLUMN tipe_dompet TEXT NOT NULL DEFAULT 'tunai';
  `);

  // Version 7: tombstone
  db.exec(`
    ALTER TABLE pemasukan ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE pengeluaran ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
  `);

  db.exec("PRAGMA user_version = 7");
}

function applyV8toV11(db) {
  // v8: koreksi_saldo_dompet
  db.exec(`
    CREATE TABLE IF NOT EXISTS koreksi_saldo_dompet (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_id TEXT NOT NULL,
      nama_dompet_snapshot TEXT NOT NULL,
      saldo_sebelum REAL NOT NULL,
      saldo_sesudah REAL NOT NULL,
      selisih REAL NOT NULL,
      catatan TEXT,
      sumber TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    PRAGMA user_version = 8;
  `);

  // v9: setting owner & budget cleanup
  db.exec(`
    INSERT OR IGNORE INTO pengaturan_aplikasi (kunci, nilai_teks, updated_at)
    SELECT 'pemilik_data_lokal_user_id', nilai_teks, updated_at
    FROM pengaturan_aplikasi
    WHERE kunci = 'akun_supabase_user_id';
    PRAGMA user_version = 9;
  `);

  // v10: saldo_awal on dompet
  const dompetCols = db.prepare("PRAGMA table_info(dompet)").all();
  if (!dompetCols.some((c) => c.name === "saldo_awal")) {
    db.exec("ALTER TABLE dompet ADD COLUMN saldo_awal REAL NOT NULL DEFAULT 0;");
  }

  // Backfill saldo_awal
  const dompets = db.prepare(`
    SELECT
      d.id,
      d.saldo_saat_ini,
      COALESCE((SELECT SUM(jumlah) FROM pemasukan WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pemasukan,
      COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pengeluaran,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_tujuan_id = d.id), 0) AS total_transfer_masuk,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_sumber_id = d.id), 0) AS total_transfer_keluar,
      COALESCE((SELECT SUM(selisih) FROM koreksi_saldo_dompet WHERE dompet_id = d.id), 0) AS total_koreksi
    FROM dompet d
  `).all();

  for (const d of dompets) {
    const netMutasi =
      d.total_pemasukan -
      d.total_pengeluaran +
      d.total_transfer_masuk -
      d.total_transfer_keluar +
      d.total_koreksi;
    const saldoAwal = Math.round(d.saldo_saat_ini - netMutasi);
    db.prepare("UPDATE dompet SET saldo_awal = ? WHERE id = ?").run(saldoAwal, d.id);
  }
  db.exec("PRAGMA user_version = 10;");

  // v11: partial unique index on anggaran_bulanan
  db.exec(`
    DROP TABLE IF EXISTS anggaran_bulanan_v11;
    CREATE TABLE anggaran_bulanan_v11 (
      id TEXT PRIMARY KEY NOT NULL,
      bulan TEXT NOT NULL,
      nama TEXT NOT NULL,
      kategori_id TEXT,
      batas_nominal REAL NOT NULL CHECK (batas_nominal > 0),
      ambang_peringatan_persen REAL NOT NULL DEFAULT 0.8,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO anggaran_bulanan_v11 SELECT * FROM anggaran_bulanan;
    DROP TABLE anggaran_bulanan;
    ALTER TABLE anggaran_bulanan_v11 RENAME TO anggaran_bulanan;
    CREATE UNIQUE INDEX idx_anggaran_aktif_unik ON anggaran_bulanan (bulan, COALESCE(kategori_id, '__semua__')) WHERE is_aktif = 1;
    PRAGMA user_version = 11;
  `);
}

test("Simulasi Migrasi: Upgrade DB dari v7 ke v11 mempertahankan integritas saldo dan data pengguna", () => {
  const db = new DatabaseSync(":memory:");
  setupV1toV7(db);

  // Masukkan data pengguna versi lama (v7)
  db.prepare(`
    INSERT INTO dompet (id, nama, jenis, saldo_saat_ini, is_default, is_aktif, created_at, updated_at)
    VALUES ('wallet-1', 'Dompet Pribadi', 'utama', 750000, 1, 1, '2026-01-01', '2026-01-01')
  `).run();

  db.prepare(`
    INSERT INTO pemasukan (id, dompet_id, judul, jumlah, tanggal_transaksi, created_at, updated_at)
    VALUES ('in-1', 'wallet-1', 'Gaji Januari', 1000000, '2026-01-05', '2026-01-05', '2026-01-05')
  `).run();

  db.prepare(`
    INSERT INTO pengeluaran (id, dompet_id, judul, jumlah, tanggal_transaksi, created_at, updated_at)
    VALUES ('out-1', 'wallet-1', 'Belanja', 250000, '2026-01-10', '2026-01-10', '2026-01-10')
  `).run();

  // Jalankan migrasi v8..v11
  applyV8toV11(db);

  // Verifikasi versi database
  const userVersion = db.prepare("PRAGMA user_version").get().user_version;
  assert.equal(userVersion, 11);

  // Verifikasi saldo_awal dihitung dengan presisi
  // saldo_awal = 750.000 - (1.000.000 - 250.000) = 0
  const wallet = db.prepare("SELECT * FROM dompet WHERE id = 'wallet-1'").get();
  assert.equal(wallet.saldo_saat_ini, 750000);
  assert.equal(wallet.saldo_awal, 0);

  // Verifikasi kolom baru di tabel pengingat dan dompet
  const reminderCols = db.prepare("PRAGMA table_info(pengingat_tagihan)").all();
  assert.ok(reminderCols.some((c) => c.name === "jam_pengingat"));
  assert.ok(reminderCols.some((c) => c.name === "notifikasi_diaktifkan"));

  const koreksiTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='koreksi_saldo_dompet'").get();
  assert.ok(koreksiTable, "Tabel koreksi_saldo_dompet harus ada");

  // Verifikasi partial index anggaran
  const indexInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_anggaran_aktif_unik'").get();
  assert.ok(indexInfo, "Index idx_anggaran_aktif_unik harus terbentuk");
});
