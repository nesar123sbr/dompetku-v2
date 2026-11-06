import type { SQLiteDatabase } from "expo-sqlite";
import {
  DATABASE_VERSION,
  MODE_PENGGUNAAN,
  PENGATURAN_KEY,
} from "./constants";
import { getNowIso } from "./helpers";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

export async function columnExists(
  db: SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  );
  return columns.some((c) => c.name.toLowerCase() === column.toLowerCase());
}

async function createVersion1Tables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pengaturan_aplikasi (
      kunci TEXT PRIMARY KEY NOT NULL,
      nilai_teks TEXT,
      nilai_angka REAL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dompet (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      jenis TEXT NOT NULL CHECK (jenis IN ('utama', 'tabungan', 'dana_darurat')),
      saldo_saat_ini REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kategori_pemasukan (
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

    CREATE TABLE IF NOT EXISTS kategori_pengeluaran (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      kelompok TEXT NOT NULL DEFAULT 'lainnya' CHECK (kelompok IN ('kebutuhan', 'rutin', 'fleksibel', 'usaha', 'lainnya')),
      ikon TEXT,
      warna TEXT,
      urutan INTEGER NOT NULL DEFAULT 0,
      is_bawaan INTEGER NOT NULL DEFAULT 1,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pemasukan (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_id TEXT NOT NULL,
      kategori_id TEXT,
      judul TEXT NOT NULL,
      catatan TEXT,
      jumlah REAL NOT NULL CHECK (jumlah > 0),
      tanggal_transaksi TEXT NOT NULL,
      sumber_data TEXT NOT NULL DEFAULT 'lokal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dompet_id) REFERENCES dompet(id) ON DELETE RESTRICT,
      FOREIGN KEY (kategori_id) REFERENCES kategori_pemasukan(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pengeluaran (
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
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dompet_id) REFERENCES dompet(id) ON DELETE RESTRICT,
      FOREIGN KEY (kategori_id) REFERENCES kategori_pengeluaran(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pengingat_tagihan (
      id TEXT PRIMARY KEY NOT NULL,
      judul TEXT NOT NULL,
      catatan TEXT,
      nominal REAL NOT NULL DEFAULT 0,
      dompet_id TEXT,
      tanggal_jatuh_tempo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dibatalkan')),
      pengulangan TEXT NOT NULL DEFAULT 'sekali' CHECK (pengulangan IN ('sekali', 'mingguan', 'bulanan')),
      lokal_notifikasi_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dompet_id) REFERENCES dompet(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pemasukan_tanggal
      ON pemasukan (tanggal_transaksi DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal
      ON pengeluaran (tanggal_transaksi DESC);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_dompet
      ON pemasukan (dompet_id);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_dompet
      ON pengeluaran (dompet_id);

    CREATE INDEX IF NOT EXISTS idx_pengingat_status_tanggal
      ON pengingat_tagihan (status, tanggal_jatuh_tempo);
  `);
}

async function createVersion2Tables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transfer_dompet (
      id TEXT PRIMARY KEY NOT NULL,
      dompet_sumber_id TEXT NOT NULL,
      dompet_tujuan_id TEXT NOT NULL,
      jumlah REAL NOT NULL CHECK (jumlah > 0),
      tanggal_transfer TEXT NOT NULL,
      catatan TEXT,
      sumber_dana_darurat INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (dompet_sumber_id <> dompet_tujuan_id),
      FOREIGN KEY (dompet_sumber_id) REFERENCES dompet(id) ON DELETE RESTRICT,
      FOREIGN KEY (dompet_tujuan_id) REFERENCES dompet(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_tanggal
      ON transfer_dompet (tanggal_transfer DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_sumber
      ON transfer_dompet (dompet_sumber_id);

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_tujuan
      ON transfer_dompet (dompet_tujuan_id);
  `);
}

async function createVersion3ReminderColumns(db: SQLiteDatabase) {
  if (!(await columnExists(db, "pengingat_tagihan", "jam_pengingat"))) {
    await db.execAsync(`
      ALTER TABLE pengingat_tagihan
      ADD COLUMN jam_pengingat TEXT NOT NULL DEFAULT '09:00';
    `);
  }

  if (!(await columnExists(db, "pengingat_tagihan", "notifikasi_diaktifkan"))) {
    await db.execAsync(`
      ALTER TABLE pengingat_tagihan
      ADD COLUMN notifikasi_diaktifkan INTEGER NOT NULL DEFAULT 1;
    `);
  }
}

async function createVersion4BudgetTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS anggaran_bulanan (
      id TEXT PRIMARY KEY NOT NULL,
      bulan TEXT NOT NULL,
      nama TEXT NOT NULL,
      kategori_id TEXT,
      batas_nominal REAL NOT NULL CHECK (batas_nominal > 0),
      ambang_peringatan_persen REAL NOT NULL DEFAULT 0.8,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (bulan, kategori_id),
      FOREIGN KEY (kategori_id) REFERENCES kategori_pengeluaran(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_bulan
      ON anggaran_bulanan (bulan, is_aktif);

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_kategori
      ON anggaran_bulanan (kategori_id);
  `);
}

async function createVersion5WalletTypeColumn(db: SQLiteDatabase) {
  if (!(await columnExists(db, "dompet", "tipe_dompet"))) {
    await db.execAsync(`
      ALTER TABLE dompet
      ADD COLUMN tipe_dompet TEXT NOT NULL DEFAULT 'tunai';
    `);
  }

  await db.execAsync(`
    UPDATE dompet
    SET tipe_dompet =
      CASE
        WHEN jenis = 'tabungan' THEN 'tabungan'
        WHEN jenis = 'dana_darurat' THEN 'dana_darurat'
        ELSE 'tunai'
      END
    WHERE tipe_dompet IS NULL
       OR TRIM(tipe_dompet) = ''
       OR tipe_dompet = 'tunai';
  `);
}

async function createVersion6PerformanceIndexes(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_pemasukan_judul
      ON pemasukan (judul);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_judul
      ON pengeluaran (judul);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_kategori
      ON pemasukan (kategori_id);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_kategori
      ON pengeluaran (kategori_id);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_created_at
      ON pemasukan (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_created_at
      ON pengeluaran (created_at DESC);
  `);
}

async function createVersion7Tombstone(db: SQLiteDatabase) {
  if (!(await columnExists(db, "pemasukan", "is_deleted"))) {
    await db.execAsync(`
      ALTER TABLE pemasukan
      ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
    `);
  }

  if (!(await columnExists(db, "pengeluaran", "is_deleted"))) {
    await db.execAsync(`
      ALTER TABLE pengeluaran
      ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
    `);
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_pemasukan_deleted
      ON pemasukan (is_deleted);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_deleted
      ON pengeluaran (is_deleted);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_deleted_tanggal
      ON pemasukan (is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_deleted_tanggal
      ON pengeluaran (is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_deleted_updated
      ON pemasukan (is_deleted, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_deleted_updated
      ON pengeluaran (is_deleted, updated_at DESC);
  `);
}

async function createVersion8DatabaseHardening(db: SQLiteDatabase) {
  await db.execAsync(`
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
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dompet_id) REFERENCES dompet(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_dompet_id
      ON koreksi_saldo_dompet (dompet_id);

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_created_at
      ON koreksi_saldo_dompet (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_updated_at
      ON koreksi_saldo_dompet (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_dompet_tanggal
      ON pemasukan (dompet_id, is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_dompet_tanggal
      ON pengeluaran (dompet_id, is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_kategori_tanggal
      ON pemasukan (kategori_id, is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_kategori_tanggal
      ON pengeluaran (kategori_id, is_deleted, tanggal_transaksi DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pemasukan_deleted_dompet_kategori_tanggal
      ON pemasukan (is_deleted, dompet_id, kategori_id, tanggal_transaksi DESC);

    CREATE INDEX IF NOT EXISTS idx_pengeluaran_deleted_dompet_kategori_tanggal
      ON pengeluaran (is_deleted, dompet_id, kategori_id, tanggal_transaksi DESC);

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_sumber_tanggal
      ON transfer_dompet (dompet_sumber_id, tanggal_transfer DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_tujuan_tanggal
      ON transfer_dompet (dompet_tujuan_id, tanggal_transfer DESC, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_transfer_dompet_updated_at
      ON transfer_dompet (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_dompet_aktif_updated
      ON dompet (is_aktif, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_kategori_pemasukan_aktif_updated
      ON kategori_pemasukan (is_aktif, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_kategori_pengeluaran_aktif_updated
      ON kategori_pengeluaran (is_aktif, updated_at DESC);
  `);
}

async function createVersion9(db: SQLiteDatabase) {
  // 1. Migrasi pengaturan pemilik data lokal
  await db.execAsync(`
    INSERT OR IGNORE INTO pengaturan_aplikasi (kunci, nilai_teks, updated_at)
    SELECT 'pemilik_data_lokal_user_id', nilai_teks, updated_at
    FROM pengaturan_aplikasi
    WHERE kunci = 'akun_supabase_user_id'
      AND nilai_teks IS NOT NULL
      AND TRIM(nilai_teks) != '';
  `);

  // 2. Rebuild tabel anggaran_bulanan tanpa UNIQUE(bulan, kategori_id)
  await db.execAsync(`
    DROP TABLE IF EXISTS anggaran_bulanan_v9;

    CREATE TABLE anggaran_bulanan_v9 (
      id TEXT PRIMARY KEY NOT NULL,
      bulan TEXT NOT NULL,
      nama TEXT NOT NULL,
      kategori_id TEXT,
      batas_nominal REAL NOT NULL CHECK (batas_nominal > 0),
      ambang_peringatan_persen REAL NOT NULL DEFAULT 0.8,
      is_aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (kategori_id) REFERENCES kategori_pengeluaran(id) ON DELETE SET NULL
    );

    INSERT INTO anggaran_bulanan_v9 (
      id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    )
    SELECT
      id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    FROM anggaran_bulanan;

    DROP TABLE anggaran_bulanan;

    ALTER TABLE anggaran_bulanan_v9 RENAME TO anggaran_bulanan;

    UPDATE anggaran_bulanan
    SET is_aktif = 0
    WHERE is_aktif = 1
      AND id NOT IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY bulan, COALESCE(kategori_id, '')
                   ORDER BY updated_at DESC, id DESC
                 ) as rn
          FROM anggaran_bulanan
          WHERE is_aktif = 1
        )
        WHERE rn = 1
      );

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_bulan
      ON anggaran_bulanan (bulan, is_aktif);

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_kategori
      ON anggaran_bulanan (kategori_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_anggaran_aktif_unik
      ON anggaran_bulanan (bulan, COALESCE(kategori_id, ''))
      WHERE is_aktif = 1;
  `);

  // 5. Normalisasi jam_pengingat pengingat_tagihan
  await db.execAsync(`
    UPDATE pengingat_tagihan
    SET jam_pengingat = substr(jam_pengingat, 1, 5)
    WHERE length(jam_pengingat) > 5;
  `);
}

async function createVersion10(db: SQLiteDatabase) {
  // 1. Tambah kolom saldo_awal pada dompet jika belum ada
  const tableInfo = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(dompet)"
  );
  const hasSaldoAwal = tableInfo.some((col) => col.name === "saldo_awal");
  if (!hasSaldoAwal) {
    await db.execAsync(
      "ALTER TABLE dompet ADD COLUMN saldo_awal REAL NOT NULL DEFAULT 0;"
    );
  }

  // 2. Backfill saldo_awal per dompet:
  // saldo_awal = saldo_saat_ini - (Σpemasukan - Σpengeluaran + Σtransfer_masuk - Σtransfer_keluar + Σkoreksi_selisih)
  const dompets = await db.getAllAsync<{
    id: string;
    saldo_saat_ini: number;
    total_pemasukan: number;
    total_pengeluaran: number;
    total_transfer_masuk: number;
    total_transfer_keluar: number;
    total_koreksi: number;
  }>(`
    SELECT
      d.id,
      d.saldo_saat_ini,
      COALESCE((SELECT SUM(jumlah) FROM pemasukan WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pemasukan,
      COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE dompet_id = d.id AND is_deleted = 0), 0) AS total_pengeluaran,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_tujuan_id = d.id), 0) AS total_transfer_masuk,
      COALESCE((SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_sumber_id = d.id), 0) AS total_transfer_keluar,
      COALESCE((SELECT SUM(selisih) FROM koreksi_saldo_dompet WHERE dompet_id = d.id), 0) AS total_koreksi
    FROM dompet d;
  `);

  for (const d of dompets) {
    const netMutasi =
      d.total_pemasukan -
      d.total_pengeluaran +
      d.total_transfer_masuk -
      d.total_transfer_keluar +
      d.total_koreksi;
    const saldoAwal = Math.round(d.saldo_saat_ini - netMutasi);
    await db.runAsync(
      "UPDATE dompet SET saldo_awal = $saldo_awal WHERE id = $id",
      {
        $saldo_awal: saldoAwal,
        $id: d.id,
      }
    );
  }
}

async function createVersion11(db: SQLiteDatabase) {
  const now = getNowIso();
  // 1. Rebuild tabel anggaran_bulanan tanpa UNIQUE inline
  await db.execAsync(`
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
      updated_at TEXT NOT NULL,
      FOREIGN KEY (kategori_id) REFERENCES kategori_pengeluaran(id) ON DELETE SET NULL
    );

    INSERT INTO anggaran_bulanan_v11 (
      id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    )
    SELECT
      id, bulan, nama, kategori_id, batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    FROM anggaran_bulanan;

    DROP TABLE anggaran_bulanan;

    ALTER TABLE anggaran_bulanan_v11 RENAME TO anggaran_bulanan;
  `);

  // 2. Dedupe: per (bulan, COALESCE(kategori_id, '__semua__')) pertahankan 1 baris aktif dengan updated_at terbaru,
  // nonaktifkan sisanya dan bump updated_at agar ikut ter-push
  await db.runAsync(
    `
      UPDATE anggaran_bulanan
      SET is_aktif = 0,
          updated_at = $now
      WHERE is_aktif = 1
        AND id NOT IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY bulan, COALESCE(kategori_id, '__semua__')
                     ORDER BY updated_at DESC, id DESC
                   ) as rn
            FROM anggaran_bulanan
            WHERE is_aktif = 1
          )
          WHERE rn = 1
        );
    `,
    { $now: now }
  );

  // 3. Buat partial unique index dengan sentinel '__semua__'
  await db.execAsync(`
    DROP INDEX IF EXISTS idx_anggaran_aktif_unik;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_anggaran_aktif_unik
      ON anggaran_bulanan (bulan, COALESCE(kategori_id, '__semua__'))
      WHERE is_aktif = 1;

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_bulan
      ON anggaran_bulanan (bulan, is_aktif);

    CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_kategori
      ON anggaran_bulanan (kategori_id);
  `);
}

async function seedDefaultSettings(db: SQLiteDatabase) {
  await db.runAsync(
    `
      INSERT OR IGNORE INTO pengaturan_aplikasi (
        kunci,
        nilai_teks,
        updated_at
      ) VALUES (
        $kunci,
        $nilai_teks,
        $updated_at
      )
    `,
    {
      $kunci: PENGATURAN_KEY.MODE_PENGGUNAAN,
      $nilai_teks: MODE_PENGGUNAAN.NONE,
      $updated_at: getNowIso(),
    }
  );
}

async function seedDefaultWallets(db: SQLiteDatabase) {
  const wallets = [
    {
      $id: "dompet-utama",
      $nama: "Dompet Utama",
      $jenis: "utama",
      $tipe_dompet: "tunai",
      $saldo: 0,
      $saldo_awal: 0,
      $is_default: 1,
      $is_aktif: 1,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "tabungan-utama",
      $nama: "Tabungan",
      $jenis: "tabungan",
      $tipe_dompet: "tabungan",
      $saldo: 0,
      $saldo_awal: 0,
      $is_default: 0,
      $is_aktif: 1,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "dana-darurat",
      $nama: "Dana Darurat",
      $jenis: "dana_darurat",
      $tipe_dompet: "dana_darurat",
      $saldo: 0,
      $saldo_awal: 0,
      $is_default: 0,
      $is_aktif: 1,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
  ] as const;

  for (const item of wallets) {
    await db.runAsync(
      `
        INSERT OR IGNORE INTO dompet (
          id,
          nama,
          jenis,
          tipe_dompet,
          saldo_saat_ini,
          saldo_awal,
          is_default,
          is_aktif,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $nama,
          $jenis,
          $tipe_dompet,
          $saldo,
          $saldo_awal,
          $is_default,
          $is_aktif,
          $created_at,
          $updated_at
        )
      `,
      item
    );
  }
}

async function seedDefaultKategoriPemasukan(db: SQLiteDatabase) {
  const kategori = [
    {
      $id: "kat-pem-gaji",
      $nama: "Gaji",
      $ikon: "cash",
      $warna: "#16A34A",
      $urutan: 1,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-pem-penjualan",
      $nama: "Penjualan",
      $ikon: "storefront",
      $warna: "#0EA5E9",
      $urutan: 2,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-pem-bonus",
      $nama: "Bonus",
      $ikon: "gift",
      $warna: "#6B63FF",
      $urutan: 3,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-pem-lainnya",
      $nama: "Lainnya",
      $ikon: "ellipsis-horizontal",
      $warna: "#8A91A8",
      $urutan: 99,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
  ] as const;

  for (const item of kategori) {
    await db.runAsync(
      `
        INSERT OR IGNORE INTO kategori_pemasukan (
          id,
          nama,
          ikon,
          warna,
          urutan,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $nama,
          $ikon,
          $warna,
          $urutan,
          $created_at,
          $updated_at
        )
      `,
      item
    );
  }
}

async function seedDefaultKategoriPengeluaran(db: SQLiteDatabase) {
  const kategori = [
    {
      $id: "kat-peng-makan",
      $nama: "Makan & Minum",
      $kelompok: "kebutuhan",
      $ikon: "restaurant",
      $warna: "#F97316",
      $urutan: 1,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-belanja-harian",
      $nama: "Belanja Harian",
      $kelompok: "kebutuhan",
      $ikon: "basket",
      $warna: "#F59E0B",
      $urutan: 2,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-transportasi",
      $nama: "Transportasi",
      $kelompok: "rutin",
      $ikon: "bus",
      $warna: "#0EA5E9",
      $urutan: 3,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-tagihan",
      $nama: "Tagihan",
      $kelompok: "rutin",
      $ikon: "receipt",
      $warna: "#DC2626",
      $urutan: 4,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-stok-warung",
      $nama: "Stok Warung",
      $kelompok: "usaha",
      $ikon: "cube",
      $warna: "#16A34A",
      $urutan: 5,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-hiburan",
      $nama: "Hiburan",
      $kelompok: "fleksibel",
      $ikon: "game-controller",
      $warna: "#6B63FF",
      $urutan: 6,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
    {
      $id: "kat-peng-lainnya",
      $nama: "Lainnya",
      $kelompok: "lainnya",
      $ikon: "ellipsis-horizontal",
      $warna: "#8A91A8",
      $urutan: 99,
      $created_at: EPOCH_ISO,
      $updated_at: EPOCH_ISO,
    },
  ] as const;

  for (const item of kategori) {
    await db.runAsync(
      `
        INSERT OR IGNORE INTO kategori_pengeluaran (
          id,
          nama,
          kelompok,
          ikon,
          warna,
          urutan,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $nama,
          $kelompok,
          $ikon,
          $warna,
          $urutan,
          $created_at,
          $updated_at
        )
      `,
      item
    );
  }
}

export async function seedDefaultData(db: SQLiteDatabase) {
  await seedDefaultSettings(db);
  await seedDefaultWallets(db);
  await seedDefaultKategoriPemasukan(db);
  await seedDefaultKategoriPengeluaran(db);
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL");
  await db.execAsync("PRAGMA foreign_keys = ON");

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );

  const currentVersion = row?.user_version ?? 0;
  let nextVersion = currentVersion;

  if (nextVersion < 1) {
    await db.withTransactionAsync(async () => {
      await createVersion1Tables(db);
      await db.execAsync("PRAGMA user_version = 1");
    });
    nextVersion = 1;
  }

  if (nextVersion < 2) {
    await db.withTransactionAsync(async () => {
      await createVersion2Tables(db);
      await db.execAsync("PRAGMA user_version = 2");
    });
    nextVersion = 2;
  }

  if (nextVersion < 3) {
    await db.withTransactionAsync(async () => {
      await createVersion3ReminderColumns(db);
      await db.execAsync("PRAGMA user_version = 3");
    });
    nextVersion = 3;
  }

  if (nextVersion < 4) {
    await db.withTransactionAsync(async () => {
      await createVersion4BudgetTables(db);
      await db.execAsync("PRAGMA user_version = 4");
    });
    nextVersion = 4;
  }

  if (nextVersion < 5) {
    await db.withTransactionAsync(async () => {
      await createVersion5WalletTypeColumn(db);
      await db.execAsync("PRAGMA user_version = 5");
    });
    nextVersion = 5;
  }

  if (nextVersion < 6) {
    await db.withTransactionAsync(async () => {
      await createVersion6PerformanceIndexes(db);
      await db.execAsync("PRAGMA user_version = 6");
    });
    nextVersion = 6;
  }

  if (nextVersion < 7) {
    await db.withTransactionAsync(async () => {
      await createVersion7Tombstone(db);
      await db.execAsync("PRAGMA user_version = 7");
    });
    nextVersion = 7;
  }

  if (nextVersion < 8) {
    await db.withTransactionAsync(async () => {
      await createVersion8DatabaseHardening(db);
      await db.execAsync("PRAGMA user_version = 8");
    });
    nextVersion = 8;
  }

  if (nextVersion < 9) {
    await db.withTransactionAsync(async () => {
      await createVersion9(db);
      await db.execAsync("PRAGMA user_version = 9");
    });
    nextVersion = 9;
  }

  if (nextVersion < 10) {
    await db.withTransactionAsync(async () => {
      await createVersion10(db);
      await db.execAsync("PRAGMA user_version = 10");
    });
    nextVersion = 10;
  }

  if (nextVersion < 11) {
    await db.withTransactionAsync(async () => {
      await createVersion11(db);
      await db.execAsync("PRAGMA user_version = 11");
    });
    nextVersion = 11;
  }

  // Seed data hanya pada database baru (currentVersion === 0)
  // Pada upgrade, pastikan pengaturan dasar & kategori bawaan ada tanpa menimpa data pengguna
  if (currentVersion === 0) {
    await seedDefaultData(db);
  } else if (currentVersion < DATABASE_VERSION) {
    await seedDefaultSettings(db);
    await seedDefaultKategoriPemasukan(db);
    await seedDefaultKategoriPengeluaran(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}