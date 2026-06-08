import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type {
  KategoriPemasukanRow,
  KategoriPengeluaranRow,
  KelompokKategoriPengeluaran,
} from "../types";

type JenisKategori = "pemasukan" | "pengeluaran";

type KategoriTableName = "kategori_pemasukan" | "kategori_pengeluaran";

type KategoriKelolaRow = {
  id: string;
  nama: string;
  is_bawaan: number;
};

function getKategoriTableName(jenis: JenisKategori): KategoriTableName {
  return jenis === "pemasukan"
    ? "kategori_pemasukan"
    : "kategori_pengeluaran";
}

async function ensureNamaKategoriUnik(
  db: SQLiteDatabase,
  payload: {
    nama: string;
    jenis: JenisKategori;
    excludeId?: string;
  }
) {
  const tableName = getKategoriTableName(payload.jenis);

  const row = await db.getFirstAsync<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE is_aktif = 1
        AND LOWER(TRIM(nama)) = LOWER(TRIM($nama))
        ${payload.excludeId ? "AND id <> $exclude_id" : ""}
    `,
    {
      $nama: payload.nama,
      $exclude_id: payload.excludeId ?? "",
    }
  );

  if ((row?.total ?? 0) > 0) {
    throw new Error("Nama kategori sudah dipakai.");
  }
}

async function getKategoriKelolaById(
  db: SQLiteDatabase,
  payload: {
    id: string;
    jenis: JenisKategori;
  }
): Promise<KategoriKelolaRow | null> {
  const tableName = getKategoriTableName(payload.jenis);

  const row = await db.getFirstAsync<KategoriKelolaRow>(
    `
      SELECT id, nama, is_bawaan
      FROM ${tableName}
      WHERE id = $id
        AND is_aktif = 1
      LIMIT 1
    `,
    {
      $id: payload.id,
    }
  );

  return row ?? null;
}

async function getNextUrutanKategori(
  db: SQLiteDatabase,
  tableName: KategoriTableName
) {
  const row = await db.getFirstAsync<{ next_urutan: number | null }>(
    `
      SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan
      FROM ${tableName}
    `
  );

  return row?.next_urutan ?? 100;
}

export async function getKategoriPemasukanAktif(
  db: SQLiteDatabase
): Promise<KategoriPemasukanRow[]> {
  const rows = await db.getAllAsync<KategoriPemasukanRow>(
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
      WHERE is_aktif = 1
      ORDER BY urutan ASC, nama ASC
    `
  );

  return rows ?? [];
}

export async function getKategoriPengeluaranAktif(
  db: SQLiteDatabase
): Promise<KategoriPengeluaranRow[]> {
  const rows = await db.getAllAsync<KategoriPengeluaranRow>(
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
      WHERE is_aktif = 1
      ORDER BY urutan ASC, nama ASC
    `
  );

  return rows ?? [];
}

export async function tambahKategoriPemasukanLokal(
  db: SQLiteDatabase,
  payload: {
    nama: string;
  }
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama kategori minimal 2 karakter.");
  }

  await ensureNamaKategoriUnik(db, {
    nama,
    jenis: "pemasukan",
  });

  const now = getNowIso();
  const id = createLocalId("kat-pem");
  const urutan = await getNextUrutanKategori(db, "kategori_pemasukan");

  await db.runAsync(
    `
      INSERT INTO kategori_pemasukan (
        id,
        nama,
        ikon,
        warna,
        urutan,
        is_bawaan,
        is_aktif,
        created_at,
        updated_at
      ) VALUES (
        $id,
        $nama,
        'pricetag',
        '#6B63FF',
        $urutan,
        0,
        1,
        $created_at,
        $updated_at
      )
    `,
    {
      $id: id,
      $nama: nama,
      $urutan: urutan,
      $created_at: now,
      $updated_at: now,
    }
  );

  return id;
}

export async function tambahKategoriPengeluaranLokal(
  db: SQLiteDatabase,
  payload: {
    nama: string;
    kelompok: KelompokKategoriPengeluaran;
  }
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama kategori minimal 2 karakter.");
  }

  await ensureNamaKategoriUnik(db, {
    nama,
    jenis: "pengeluaran",
  });

  const now = getNowIso();
  const id = createLocalId("kat-peng");
  const urutan = await getNextUrutanKategori(db, "kategori_pengeluaran");

  await db.runAsync(
    `
      INSERT INTO kategori_pengeluaran (
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
      ) VALUES (
        $id,
        $nama,
        $kelompok,
        'pricetag',
        '#8A91A8',
        $urutan,
        0,
        1,
        $created_at,
        $updated_at
      )
    `,
    {
      $id: id,
      $nama: nama,
      $kelompok: payload.kelompok,
      $urutan: urutan,
      $created_at: now,
      $updated_at: now,
    }
  );

  return id;
}

export async function ubahKategoriLokal(
  db: SQLiteDatabase,
  payload: {
    id: string;
    jenis: JenisKategori;
    namaBaru: string;
  }
) {
  const namaBaru = payload.namaBaru.trim();

  if (namaBaru.length < 2) {
    throw new Error("Nama kategori minimal 2 karakter.");
  }

  const kategori = await getKategoriKelolaById(db, {
    id: payload.id,
    jenis: payload.jenis,
  });

  if (!kategori) {
    throw new Error("Kategori tidak ditemukan.");
  }

  if (kategori.is_bawaan) {
    throw new Error("Kategori bawaan aplikasi tidak bisa diubah.");
  }

  await ensureNamaKategoriUnik(db, {
    nama: namaBaru,
    jenis: payload.jenis,
    excludeId: payload.id,
  });

  const tableName = getKategoriTableName(payload.jenis);
  const now = getNowIso();

  await db.runAsync(
    `
      UPDATE ${tableName}
      SET
        nama = $nama,
        updated_at = $updated_at
      WHERE id = $id
        AND is_bawaan = 0
        AND is_aktif = 1
    `,
    {
      $id: payload.id,
      $nama: namaBaru,
      $updated_at: now,
    }
  );
}

export async function hapusKategoriLokal(
  db: SQLiteDatabase,
  payload: {
    id: string;
    jenis: JenisKategori;
  }
) {
  const kategori = await getKategoriKelolaById(db, {
    id: payload.id,
    jenis: payload.jenis,
  });

  if (!kategori) {
    throw new Error("Kategori tidak ditemukan.");
  }

  if (kategori.is_bawaan) {
    throw new Error("Kategori bawaan aplikasi tidak bisa dihapus.");
  }

  const tableName = getKategoriTableName(payload.jenis);

  const transactionTableName =
    payload.jenis === "pemasukan" ? "pemasukan" : "pengeluaran";

  const usage = await db.getFirstAsync<{ total: number | null }>(
    `
      SELECT COUNT(*) AS total
      FROM ${transactionTableName}
      WHERE kategori_id = $id
    `,
    {
      $id: payload.id,
    }
  );

  if ((usage?.total ?? 0) > 0) {
    throw new Error(
      "Kategori ini sudah dipakai di transaksi. Supaya riwayat tetap aman, kategori tidak bisa dihapus, tapi masih bisa diubah namanya."
    );
  }

  const now = getNowIso();

  await db.runAsync(
    `
      UPDATE ${tableName}
      SET
        is_aktif = 0,
        updated_at = $updated_at
      WHERE id = $id
        AND is_bawaan = 0
        AND is_aktif = 1
    `,
    {
      $id: payload.id,
      $updated_at: now,
    }
  );
}