import type { SQLiteDatabase } from "expo-sqlite";
import { createLocalId, getNowIso } from "../helpers";
import type { RingkasanAnggaranBulananItem } from "../types";

type AnggaranRow = {
  id: string;
  bulan: string;
  nama: string;
  kategori_id: string | null;
  nama_kategori: string | null;
  batas_nominal: number;
  ambang_peringatan_persen: number;
  total_terpakai: number | null;
};

type AnggaranKelolaRow = {
  id: string;
  is_aktif: number;
};

function getBulanIni() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function hitungStatus(
  persentase: number,
  ambang: number
): RingkasanAnggaranBulananItem["status"] {
  if (persentase >= 1) {
    return "melewati_batas";
  }

  if (persentase >= ambang) {
    return "mendekati_batas";
  }

  return "aman";
}

export async function simpanAnggaranBulanan(
  db: SQLiteDatabase,
  payload: {
    bulan?: string;
    nama: string;
    kategoriId?: string | null;
    batasNominal: number;
    ambangPeringatanPersen?: number;
  }
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama anggaran minimal 2 karakter.");
  }

  if (payload.batasNominal <= 0) {
    throw new Error("Batas anggaran harus lebih dari 0.");
  }

  const now = getNowIso();
  const bulan = payload.bulan ?? getBulanIni();
  const id = createLocalId("anggaran");

  await db.runAsync(
    `
      INSERT INTO anggaran_bulanan (
        id,
        bulan,
        nama,
        kategori_id,
        batas_nominal,
        ambang_peringatan_persen,
        is_aktif,
        created_at,
        updated_at
      ) VALUES (
        $id,
        $bulan,
        $nama,
        $kategori_id,
        $batas_nominal,
        $ambang,
        1,
        $created_at,
        $updated_at
      )
      ON CONFLICT(bulan, kategori_id) DO UPDATE SET
        nama = excluded.nama,
        batas_nominal = excluded.batas_nominal,
        ambang_peringatan_persen = excluded.ambang_peringatan_persen,
        is_aktif = 1,
        updated_at = excluded.updated_at
    `,
    {
      $id: id,
      $bulan: bulan,
      $nama: nama,
      $kategori_id: payload.kategoriId ?? null,
      $batas_nominal: payload.batasNominal,
      $ambang: payload.ambangPeringatanPersen ?? 0.8,
      $created_at: now,
      $updated_at: now,
    }
  );
}

export async function ubahAnggaranBulananLokal(
  db: SQLiteDatabase,
  payload: {
    id: string;
    nama: string;
    kategoriId?: string | null;
    batasNominal: number;
    ambangPeringatanPersen?: number;
  }
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama anggaran minimal 2 karakter.");
  }

  if (payload.batasNominal <= 0) {
    throw new Error("Batas anggaran harus lebih dari 0.");
  }

  const anggaran = await db.getFirstAsync<AnggaranKelolaRow>(
    `
      SELECT id, is_aktif
      FROM anggaran_bulanan
      WHERE id = $id
      LIMIT 1
    `,
    {
      $id: payload.id,
    }
  );

  if (!anggaran || !anggaran.is_aktif) {
    throw new Error("Anggaran tidak ditemukan atau sudah tidak aktif.");
  }

  const now = getNowIso();

  await db.runAsync(
    `
      UPDATE anggaran_bulanan
      SET
        nama = $nama,
        kategori_id = $kategori_id,
        batas_nominal = $batas_nominal,
        ambang_peringatan_persen = $ambang,
        is_aktif = 1,
        updated_at = $updated_at
      WHERE id = $id
        AND is_aktif = 1
    `,
    {
      $id: payload.id,
      $nama: nama,
      $kategori_id: payload.kategoriId ?? null,
      $batas_nominal: payload.batasNominal,
      $ambang: payload.ambangPeringatanPersen ?? 0.8,
      $updated_at: now,
    }
  );
}

export async function nonaktifkanAnggaranBulananLokal(
  db: SQLiteDatabase,
  id: string
) {
  const anggaran = await db.getFirstAsync<AnggaranKelolaRow>(
    `
      SELECT id, is_aktif
      FROM anggaran_bulanan
      WHERE id = $id
      LIMIT 1
    `,
    {
      $id: id,
    }
  );

  if (!anggaran || !anggaran.is_aktif) {
    throw new Error("Anggaran tidak ditemukan atau sudah tidak aktif.");
  }

  const now = getNowIso();

  await db.runAsync(
    `
      UPDATE anggaran_bulanan
      SET
        is_aktif = 0,
        updated_at = $updated_at
      WHERE id = $id
        AND is_aktif = 1
    `,
    {
      $id: id,
      $updated_at: now,
    }
  );
}

export async function getRingkasanAnggaranBulanan(
  db: SQLiteDatabase,
  bulan = getBulanIni()
): Promise<RingkasanAnggaranBulananItem[]> {
  const rows = await db.getAllAsync<AnggaranRow>(
    `
      SELECT
        a.id,
        a.bulan,
        a.nama,
        a.kategori_id,
        kg.nama AS nama_kategori,
        a.batas_nominal,
        a.ambang_peringatan_persen,
        COALESCE(SUM(p.jumlah), 0) AS total_terpakai
      FROM anggaran_bulanan a
      LEFT JOIN kategori_pengeluaran kg
        ON kg.id = a.kategori_id
      LEFT JOIN pengeluaran p
        ON p.is_deleted = 0
       AND strftime('%Y-%m', p.tanggal_transaksi) = a.bulan
       AND (
         a.kategori_id IS NULL
         OR p.kategori_id = a.kategori_id
       )
      WHERE a.bulan = $bulan
        AND a.is_aktif = 1
      GROUP BY
        a.id,
        a.bulan,
        a.nama,
        a.kategori_id,
        kg.nama,
        a.batas_nominal,
        a.ambang_peringatan_persen
      ORDER BY a.created_at DESC
    `,
    {
      $bulan: bulan,
    }
  );

  return (rows ?? []).map((item) => {
    const totalTerpakai = item.total_terpakai ?? 0;
    const persentase =
      item.batas_nominal > 0 ? totalTerpakai / item.batas_nominal : 0;

    return {
      id: item.id,
      bulan: item.bulan,
      nama: item.nama,
      kategori_id: item.kategori_id,
      nama_kategori: item.nama_kategori,
      batas_nominal: item.batas_nominal,
      total_terpakai: totalTerpakai,
      sisa_anggaran: item.batas_nominal - totalTerpakai,
      persentase_terpakai: persentase,
      status: hitungStatus(persentase, item.ambang_peringatan_persen),
    };
  });
}

export async function getRingkasanAnggaranBulanIni(
  db: SQLiteDatabase
): Promise<RingkasanAnggaranBulananItem[]> {
  return getRingkasanAnggaranBulanan(db);
}