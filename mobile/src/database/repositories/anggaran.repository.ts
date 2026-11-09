import type { SQLiteDatabase } from "expo-sqlite";
import { assertNominalDalamBatas, getNowIso } from "../helpers";
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
  ambang: number,
): RingkasanAnggaranBulananItem["status"] {
  if (persentase >= 1) {
    return "melewati_batas";
  }

  if (persentase >= ambang) {
    return "mendekati_batas";
  }

  return "aman";
}

export function buatIdAnggaranDeterministik(
  bulan: string,
  kategoriId?: string | null
): string {
  const kat =
    kategoriId && kategoriId.trim() !== "" ? kategoriId.trim() : "semua";
  return `anggaran:${bulan}:${kat}`;
}

export function getBulanSebelumnya(bulan: string): string {
  const [yearStr, monthStr] = bulan.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function simpanAnggaranBulanan(
  db: SQLiteDatabase,
  payload: {
    bulan?: string;
    nama: string;
    kategoriId?: string | null;
    batasNominal: number;
    ambangPeringatanPersen?: number;
  },
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama anggaran minimal 2 karakter.");
  }

  if (payload.batasNominal <= 0) {
    throw new Error("Batas anggaran harus lebih dari 0.");
  }
  assertNominalDalamBatas(payload.batasNominal, "Batas anggaran");

  const now = getNowIso();
  const bulan = payload.bulan ?? getBulanIni();
  const kategoriId = payload.kategoriId ? payload.kategoriId.trim() : null;
  const ambang = payload.ambangPeringatanPersen ?? 0.8;
  const targetId = buatIdAnggaranDeterministik(bulan, kategoriId);

  await db.withExclusiveTransactionAsync(async (txn) => {
    const existing = await txn.getFirstAsync<{ id: string }>(
      `
        SELECT id
        FROM anggaran_bulanan
        WHERE bulan = $bulan
          AND kategori_id IS $kategori_id
        LIMIT 1
      `,
      {
        $bulan: bulan,
        $kategori_id: kategoriId,
      }
    );

    if (existing) {
      await txn.runAsync(
        `
          UPDATE anggaran_bulanan
          SET nama = $nama,
              batas_nominal = $batas_nominal,
              ambang_peringatan_persen = $ambang,
              is_aktif = 1,
              updated_at = $updated_at
          WHERE id = $id
        `,
        {
          $id: existing.id,
          $nama: nama,
          $batas_nominal: payload.batasNominal,
          $ambang: ambang,
          $updated_at: now,
        }
      );
    } else {
      await txn.runAsync(
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
        `,
        {
          $id: targetId,
          $bulan: bulan,
          $nama: nama,
          $kategori_id: kategoriId,
          $batas_nominal: payload.batasNominal,
          $ambang: ambang,
          $created_at: now,
          $updated_at: now,
        }
      );
    }
  });
}

export async function ubahAnggaranBulananLokal(
  db: SQLiteDatabase,
  payload: {
    id: string;
    nama: string;
    kategoriId?: string | null;
    batasNominal: number;
    ambangPeringatanPersen?: number;
  },
) {
  const nama = payload.nama.trim();

  if (nama.length < 2) {
    throw new Error("Nama anggaran minimal 2 karakter.");
  }

  if (payload.batasNominal <= 0) {
    throw new Error("Batas anggaran harus lebih dari 0.");
  }
  assertNominalDalamBatas(payload.batasNominal, "Batas anggaran");

  const anggaran = await db.getFirstAsync<{
    id: string;
    bulan: string;
    kategori_id: string | null;
    is_aktif: number;
  }>(
    `
      SELECT id, bulan, kategori_id, is_aktif
      FROM anggaran_bulanan
      WHERE id = $id
      LIMIT 1
    `,
    {
      $id: payload.id,
    },
  );

  if (!anggaran || !anggaran.is_aktif) {
    throw new Error("Anggaran tidak ditemukan atau sudah tidak aktif.");
  }

  const targetKategoriId = payload.kategoriId ? payload.kategoriId.trim() : null;
  const now = getNowIso();
  const ambang = payload.ambangPeringatanPersen ?? 0.8;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const duplikat = await txn.getFirstAsync<{ id: string }>(
      `
        SELECT id
        FROM anggaran_bulanan
        WHERE id != $id
          AND bulan = $bulan
          AND kategori_id IS $kategori_id
          AND is_aktif = 1
        LIMIT 1
      `,
      {
        $id: payload.id,
        $bulan: anggaran.bulan,
        $kategori_id: targetKategoriId,
      }
    );

    if (duplikat) {
      throw new Error(
        "Sudah ada anggaran untuk kategori ini bulan ini."
      );
    }

    await txn.runAsync(
      `
        UPDATE anggaran_bulanan
        SET nama = $nama,
            kategori_id = $kategori_id,
            batas_nominal = $batas_nominal,
            ambang_peringatan_persen = $ambang,
            is_aktif = 1,
            updated_at = $updated_at
        WHERE id = $id
      `,
      {
        $id: payload.id,
        $nama: nama,
        $kategori_id: targetKategoriId,
        $batas_nominal: payload.batasNominal,
        $ambang: ambang,
        $updated_at: now,
      }
    );
  });
}

export async function nonaktifkanAnggaranBulananLokal(
  db: SQLiteDatabase,
  id: string,
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
    },
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
    },
  );
}

export async function getRingkasanAnggaranBulanan(
  db: SQLiteDatabase,
  bulan = getBulanIni(),
): Promise<RingkasanAnggaranBulananItem[]> {
  const [year, monthIndex] = bulan.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  const tanggalMulai = `${bulan}-01`;
  const tanggalSelesai = `${bulan}-${String(lastDay).padStart(2, "0")}`;

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
       AND p.tanggal_transaksi >= $mulai AND p.tanggal_transaksi <= $selesai
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
      $mulai: tanggalMulai,
      $selesai: tanggalSelesai,
    },
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
  db: SQLiteDatabase,
): Promise<RingkasanAnggaranBulananItem[]> {
  return getRingkasanAnggaranBulanan(db);
}

export async function cekBisaSalinAnggaranBulanLalu(
  db: SQLiteDatabase,
  bulanTarget = getBulanIni()
): Promise<{ bisaSalin: boolean; jumlahBulanLalu: number; bulanLalu: string }> {
  const bulanLalu = getBulanSebelumnya(bulanTarget);

  const [rowSekarang, rowLalu] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM anggaran_bulanan WHERE bulan = $bulan AND is_aktif = 1`,
      { $bulan: bulanTarget }
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM anggaran_bulanan WHERE bulan = $bulan AND is_aktif = 1`,
      { $bulan: bulanLalu }
    ),
  ]);

  const jumlahSekarang = rowSekarang?.total ?? 0;
  const jumlahBulanLalu = rowLalu?.total ?? 0;

  return {
    bisaSalin: jumlahSekarang === 0 && jumlahBulanLalu > 0,
    jumlahBulanLalu,
    bulanLalu,
  };
}

export async function salinAnggaranBulanLalu(
  db: SQLiteDatabase,
  bulanTarget = getBulanIni(),
  bulanSumber?: string
): Promise<{ disalin: number; pesan: string }> {
  const sumber = bulanSumber ?? getBulanSebelumnya(bulanTarget);

  const daftarBulanLalu = await db.getAllAsync<{
    nama: string;
    kategori_id: string | null;
    batas_nominal: number;
    ambang_peringatan_persen: number;
  }>(
    `
      SELECT nama, kategori_id, batas_nominal, ambang_peringatan_persen
      FROM anggaran_bulanan
      WHERE bulan = $bulan AND is_aktif = 1
    `,
    { $bulan: sumber }
  );

  if (!daftarBulanLalu || daftarBulanLalu.length === 0) {
    return {
      disalin: 0,
      pesan: "Tidak ada anggaran aktif di bulan sebelumnya untuk disalin.",
    };
  }

  const now = getNowIso();

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const item of daftarBulanLalu) {
      const targetId = buatIdAnggaranDeterministik(bulanTarget, item.kategori_id);
      const kategoriKey = item.kategori_id ?? "__semua__";

      // Nonaktifkan anggaran aktif yang berbenturan jika ada
      await txn.runAsync(
        `
          UPDATE anggaran_bulanan
          SET is_aktif = 0,
              updated_at = $updated_at
          WHERE bulan = $bulan
            AND COALESCE(kategori_id, '__semua__') = $kategori_key
            AND id != $id
            AND is_aktif = 1
        `,
        {
          $bulan: bulanTarget,
          $kategori_key: kategoriKey,
          $id: targetId,
          $updated_at: now,
        }
      );

      // Upsert
      await txn.runAsync(
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
          ON CONFLICT(id) DO UPDATE SET
            nama = excluded.nama,
            kategori_id = excluded.kategori_id,
            batas_nominal = excluded.batas_nominal,
            ambang_peringatan_persen = excluded.ambang_peringatan_persen,
            is_aktif = 1,
            updated_at = excluded.updated_at
        `,
        {
          $id: targetId,
          $bulan: bulanTarget,
          $nama: item.nama,
          $kategori_id: item.kategori_id,
          $batas_nominal: item.batas_nominal,
          $ambang: item.ambang_peringatan_persen,
          $created_at: now,
          $updated_at: now,
        }
      );
    }
  });

  return {
    disalin: daftarBulanLalu.length,
    pesan: `${daftarBulanLalu.length} anggaran berhasil disalin dari bulan lalu.`,
  };
}
