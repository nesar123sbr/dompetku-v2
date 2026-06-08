import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type {
  DetailTransaksiEdit,
  DompetRow,
  JenisTransaksi,
  RiwayatTransaksiRow,
  TambahPemasukanPayload,
  TambahPengeluaranPayload,
} from "../types";

type SqlRunner = Pick<
  SQLiteDatabase,
  "runAsync" | "getFirstAsync" | "getAllAsync"
>;

type DompetRingkas = Pick<DompetRow, "id" | "jenis" | "saldo_saat_ini">;

type PemasukanDeleteRow = {
  id: string;
  dompet_id: string;
  jumlah: number;
};

type PengeluaranDeleteRow = {
  id: string;
  dompet_id: string;
  jumlah: number;
};

type UbahTransaksiPayload = {
  id: string;
  jenisTransaksi: JenisTransaksi;
  dompetId: string;
  kategoriId: string | null;
  judul: string;
  catatan?: string;
  jumlah: number;
  tanggalTransaksi: string;
};

type RiwayatTransaksiFilterJenis = "semua" | JenisTransaksi;

export type RingkasanRiwayatTransaksi = {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
  jumlahTransaksi: number;
};

type RingkasanRiwayatTransaksiSqlRow = {
  total_pemasukan: number | null;
  total_pengeluaran: number | null;
  jumlah_transaksi: number | null;
};

async function getDompetAktifById(
  db: SqlRunner,
  dompetId: string
): Promise<DompetRingkas | null> {
  const row = await db.getFirstAsync<DompetRingkas>(
    `
      SELECT
        id,
        jenis,
        saldo_saat_ini
      FROM dompet
      WHERE id = $dompet_id
        AND is_aktif = 1
      LIMIT 1
    `,
    {
      $dompet_id: dompetId,
    }
  );

  return row ?? null;
}

function validateTransaksiInput(payload: {
  judul: string;
  jumlah: number;
}) {
  if (payload.judul.trim().length < 2) {
    throw new Error("Judul transaksi minimal 2 karakter.");
  }

  if (!Number.isFinite(payload.jumlah) || payload.jumlah <= 0) {
    throw new Error("Jumlah transaksi harus lebih dari 0.");
  }
}

export async function tambahPemasukanLokal(
  db: SQLiteDatabase,
  payload: TambahPemasukanPayload
) {
  validateTransaksiInput({
    judul: payload.judul,
    jumlah: payload.jumlah,
  });

  const now = getNowIso();
  const pemasukanId = createLocalId("pem");

  await db.withExclusiveTransactionAsync(async (txn) => {
    const dompet = await getDompetAktifById(txn, payload.dompetId);

    if (!dompet) {
      throw new Error("Dompet pemasukan tidak ditemukan atau tidak aktif.");
    }

    await txn.runAsync(
      `
        INSERT INTO pemasukan (
          id,
          dompet_id,
          kategori_id,
          judul,
          catatan,
          jumlah,
          tanggal_transaksi,
          sumber_data,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $dompet_id,
          $kategori_id,
          $judul,
          $catatan,
          $jumlah,
          $tanggal_transaksi,
          $sumber_data,
          $created_at,
          $updated_at
        )
      `,
      {
        $id: pemasukanId,
        $dompet_id: payload.dompetId,
        $kategori_id: payload.kategoriId,
        $judul: payload.judul.trim(),
        $catatan: payload.catatan?.trim() || null,
        $jumlah: payload.jumlah,
        $tanggal_transaksi: payload.tanggalTransaksi,
        $sumber_data: "lokal",
        $created_at: now,
        $updated_at: now,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini + $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: payload.jumlah,
        $updated_at: now,
        $dompet_id: payload.dompetId,
      }
    );
  });

  return pemasukanId;
}

export async function tambahPengeluaranLokal(
  db: SQLiteDatabase,
  payload: TambahPengeluaranPayload
) {
  validateTransaksiInput({
    judul: payload.judul,
    jumlah: payload.jumlah,
  });

  const now = getNowIso();
  const pengeluaranId = createLocalId("peng");

  await db.withExclusiveTransactionAsync(async (txn) => {
    const dompet = await getDompetAktifById(txn, payload.dompetId);

    if (!dompet) {
      throw new Error("Dompet pengeluaran tidak ditemukan atau tidak aktif.");
    }

    const pakaiDanaDarurat =
      payload.pakaiDanaDarurat || dompet.jenis === "dana_darurat" ? 1 : 0;

    await txn.runAsync(
      `
        INSERT INTO pengeluaran (
          id,
          dompet_id,
          kategori_id,
          judul,
          catatan,
          jumlah,
          tanggal_transaksi,
          pakai_dana_darurat,
          sumber_data,
          created_at,
          updated_at
        ) VALUES (
          $id,
          $dompet_id,
          $kategori_id,
          $judul,
          $catatan,
          $jumlah,
          $tanggal_transaksi,
          $pakai_dana_darurat,
          $sumber_data,
          $created_at,
          $updated_at
        )
      `,
      {
        $id: pengeluaranId,
        $dompet_id: payload.dompetId,
        $kategori_id: payload.kategoriId,
        $judul: payload.judul.trim(),
        $catatan: payload.catatan?.trim() || null,
        $jumlah: payload.jumlah,
        $tanggal_transaksi: payload.tanggalTransaksi,
        $pakai_dana_darurat: pakaiDanaDarurat,
        $sumber_data: "lokal",
        $created_at: now,
        $updated_at: now,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini - $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: payload.jumlah,
        $updated_at: now,
        $dompet_id: payload.dompetId,
      }
    );
  });

  return pengeluaranId;
}

export async function getRiwayatTransaksiTerbaru(
  db: SQLiteDatabase,
  limit = 10
): Promise<RiwayatTransaksiRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const rows = await db.getAllAsync<RiwayatTransaksiRow>(
    `
      SELECT *
      FROM (
        SELECT
          p.id,
          'pemasukan' AS jenis_transaksi,
          p.judul,
          p.jumlah,
          p.tanggal_transaksi,
          d.nama AS nama_dompet,
          kp.nama AS nama_kategori,
          kp.warna AS warna_kategori,
          0 AS pakai_dana_darurat,
          p.created_at
        FROM pemasukan p
        LEFT JOIN dompet d
          ON d.id = p.dompet_id
        LEFT JOIN kategori_pemasukan kp
          ON kp.id = p.kategori_id
        WHERE p.is_deleted = 0

        UNION ALL

        SELECT
          g.id,
          'pengeluaran' AS jenis_transaksi,
          g.judul,
          g.jumlah,
          g.tanggal_transaksi,
          d.nama AS nama_dompet,
          kg.nama AS nama_kategori,
          kg.warna AS warna_kategori,
          g.pakai_dana_darurat,
          g.created_at
        FROM pengeluaran g
        LEFT JOIN dompet d
          ON d.id = g.dompet_id
        LEFT JOIN kategori_pengeluaran kg
          ON kg.id = g.kategori_id
        WHERE g.is_deleted = 0
      ) transaksi
      ORDER BY tanggal_transaksi DESC, created_at DESC
      LIMIT $limit
    `,
    {
      $limit: safeLimit,
    }
  );

  return rows ?? [];
}

export async function hapusTransaksiLokalDanKembalikanSaldo(
  db: SQLiteDatabase,
  payload: {
    id: string;
    jenisTransaksi: JenisTransaksi;
  }
) {
  const now = getNowIso();

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (payload.jenisTransaksi === "pemasukan") {
      const row = await txn.getFirstAsync<PemasukanDeleteRow>(
        `
          SELECT id, dompet_id, jumlah
          FROM pemasukan
          WHERE id = $id
            AND is_deleted = 0
          LIMIT 1
        `,
        {
          $id: payload.id,
        }
      );

      if (!row) {
        throw new Error("Transaksi pemasukan tidak ditemukan.");
      }

      await txn.runAsync(
        `
          UPDATE pemasukan
          SET
            is_deleted = 1,
            updated_at = $updated_at
          WHERE id = $id
            AND is_deleted = 0
        `,
        {
          $id: payload.id,
          $updated_at: now,
        }
      );

      await txn.runAsync(
        `
          UPDATE dompet
          SET
            saldo_saat_ini = saldo_saat_ini - $jumlah,
            updated_at = $updated_at
          WHERE id = $dompet_id
        `,
        {
          $jumlah: row.jumlah,
          $updated_at: now,
          $dompet_id: row.dompet_id,
        }
      );

      return;
    }

    const row = await txn.getFirstAsync<PengeluaranDeleteRow>(
      `
        SELECT id, dompet_id, jumlah
        FROM pengeluaran
        WHERE id = $id
          AND is_deleted = 0
        LIMIT 1
      `,
      {
        $id: payload.id,
      }
    );

    if (!row) {
      throw new Error("Transaksi pengeluaran tidak ditemukan.");
    }

    await txn.runAsync(
      `
        UPDATE pengeluaran
        SET
          is_deleted = 1,
          updated_at = $updated_at
        WHERE id = $id
          AND is_deleted = 0
      `,
      {
        $id: payload.id,
        $updated_at: now,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini + $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: row.jumlah,
        $updated_at: now,
        $dompet_id: row.dompet_id,
      }
    );
  });
}

export async function getDetailTransaksiUntukEdit(
  db: SqlRunner,
  payload: {
    id: string;
    jenisTransaksi: JenisTransaksi;
  }
): Promise<DetailTransaksiEdit | null> {
  if (payload.jenisTransaksi === "pemasukan") {
    const row = await db.getFirstAsync<DetailTransaksiEdit>(
      `
        SELECT
          id,
          'pemasukan' AS jenis_transaksi,
          dompet_id,
          kategori_id,
          judul,
          catatan,
          jumlah,
          tanggal_transaksi
        FROM pemasukan
        WHERE id = $id
          AND is_deleted = 0
        LIMIT 1
      `,
      {
        $id: payload.id,
      }
    );

    return row ?? null;
  }

  const row = await db.getFirstAsync<DetailTransaksiEdit>(
    `
      SELECT
        id,
        'pengeluaran' AS jenis_transaksi,
        dompet_id,
        kategori_id,
        judul,
        catatan,
        jumlah,
        tanggal_transaksi
      FROM pengeluaran
      WHERE id = $id
        AND is_deleted = 0
      LIMIT 1
    `,
    {
      $id: payload.id,
    }
  );

  return row ?? null;
}

export async function ubahTransaksiLokalDanSesuaikanSaldo(
  db: SQLiteDatabase,
  payload: UbahTransaksiPayload
) {
  validateTransaksiInput({
    judul: payload.judul,
    jumlah: payload.jumlah,
  });

  const now = getNowIso();

  await db.withExclusiveTransactionAsync(async (txn) => {
    const old = await getDetailTransaksiUntukEdit(txn, {
      id: payload.id,
      jenisTransaksi: payload.jenisTransaksi,
    });

    if (!old) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const dompetBaru = await getDompetAktifById(txn, payload.dompetId);

    if (!dompetBaru) {
      throw new Error("Dompet tujuan edit tidak ditemukan atau tidak aktif.");
    }

    if (payload.jenisTransaksi === "pemasukan") {
      await txn.runAsync(
        `
          UPDATE dompet
          SET
            saldo_saat_ini = saldo_saat_ini - $jumlah,
            updated_at = $updated_at
          WHERE id = $dompet_id
        `,
        {
          $jumlah: old.jumlah,
          $updated_at: now,
          $dompet_id: old.dompet_id,
        }
      );

      await txn.runAsync(
        `
          UPDATE pemasukan
          SET
            dompet_id = $dompet_id,
            kategori_id = $kategori_id,
            judul = $judul,
            catatan = $catatan,
            jumlah = $jumlah,
            tanggal_transaksi = $tanggal_transaksi,
            updated_at = $updated_at
          WHERE id = $id
            AND is_deleted = 0
        `,
        {
          $id: payload.id,
          $dompet_id: payload.dompetId,
          $kategori_id: payload.kategoriId,
          $judul: payload.judul.trim(),
          $catatan: payload.catatan?.trim() || null,
          $jumlah: payload.jumlah,
          $tanggal_transaksi: payload.tanggalTransaksi,
          $updated_at: now,
        }
      );

      await txn.runAsync(
        `
          UPDATE dompet
          SET
            saldo_saat_ini = saldo_saat_ini + $jumlah,
            updated_at = $updated_at
          WHERE id = $dompet_id
        `,
        {
          $jumlah: payload.jumlah,
          $updated_at: now,
          $dompet_id: payload.dompetId,
        }
      );

      return;
    }

    const pakaiDanaDarurat = dompetBaru.jenis === "dana_darurat" ? 1 : 0;

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini + $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: old.jumlah,
        $updated_at: now,
        $dompet_id: old.dompet_id,
      }
    );

    await txn.runAsync(
      `
        UPDATE pengeluaran
        SET
          dompet_id = $dompet_id,
          kategori_id = $kategori_id,
          judul = $judul,
          catatan = $catatan,
          jumlah = $jumlah,
          tanggal_transaksi = $tanggal_transaksi,
          pakai_dana_darurat = $pakai_dana_darurat,
          updated_at = $updated_at
        WHERE id = $id
          AND is_deleted = 0
      `,
      {
        $id: payload.id,
        $dompet_id: payload.dompetId,
        $kategori_id: payload.kategoriId,
        $judul: payload.judul.trim(),
        $catatan: payload.catatan?.trim() || null,
        $jumlah: payload.jumlah,
        $tanggal_transaksi: payload.tanggalTransaksi,
        $pakai_dana_darurat: pakaiDanaDarurat,
        $updated_at: now,
      }
    );

    await txn.runAsync(
      `
        UPDATE dompet
        SET
          saldo_saat_ini = saldo_saat_ini - $jumlah,
          updated_at = $updated_at
        WHERE id = $dompet_id
      `,
      {
        $jumlah: payload.jumlah,
        $updated_at: now,
        $dompet_id: payload.dompetId,
      }
    );
  });
}

export async function getRiwayatTransaksiPaged(
  db: SQLiteDatabase,
  payload: {
    limit?: number;
    offset?: number;
    keyword?: string;
    jenis?: RiwayatTransaksiFilterJenis;
    tanggalMulai?: string | null;
    tanggalSelesai?: string | null;
  }
): Promise<RiwayatTransaksiRow[]> {
  const limit = Math.max(1, Math.min(payload.limit ?? 30, 100));
  const offset = Math.max(0, payload.offset ?? 0);
  const cleanKeyword = payload.keyword?.trim() ?? "";
  const keyword = `%${cleanKeyword}%`;
  const jenis = payload.jenis ?? "semua";

  const rows = await db.getAllAsync<RiwayatTransaksiRow>(
    `
      SELECT *
      FROM (
        SELECT
          p.id,
          'pemasukan' AS jenis_transaksi,
          p.judul,
          p.jumlah,
          p.tanggal_transaksi,
          d.nama AS nama_dompet,
          kp.nama AS nama_kategori,
          kp.warna AS warna_kategori,
          0 AS pakai_dana_darurat,
          p.created_at
        FROM pemasukan p
        LEFT JOIN dompet d
          ON d.id = p.dompet_id
        LEFT JOIN kategori_pemasukan kp
          ON kp.id = p.kategori_id
        WHERE p.is_deleted = 0
          AND ($jenis = 'semua' OR $jenis = 'pemasukan')
          AND (
            $tanggal_mulai IS NULL
            OR date(p.tanggal_transaksi) >= date($tanggal_mulai)
          )
          AND (
            $tanggal_selesai IS NULL
            OR date(p.tanggal_transaksi) <= date($tanggal_selesai)
          )
          AND (
            $keyword = '%%'
            OR p.judul LIKE $keyword
            OR COALESCE(p.catatan, '') LIKE $keyword
            OR COALESCE(d.nama, '') LIKE $keyword
            OR COALESCE(kp.nama, '') LIKE $keyword
          )

        UNION ALL

        SELECT
          g.id,
          'pengeluaran' AS jenis_transaksi,
          g.judul,
          g.jumlah,
          g.tanggal_transaksi,
          d.nama AS nama_dompet,
          kg.nama AS nama_kategori,
          kg.warna AS warna_kategori,
          g.pakai_dana_darurat,
          g.created_at
        FROM pengeluaran g
        LEFT JOIN dompet d
          ON d.id = g.dompet_id
        LEFT JOIN kategori_pengeluaran kg
          ON kg.id = g.kategori_id
        WHERE g.is_deleted = 0
          AND ($jenis = 'semua' OR $jenis = 'pengeluaran')
          AND (
            $tanggal_mulai IS NULL
            OR date(g.tanggal_transaksi) >= date($tanggal_mulai)
          )
          AND (
            $tanggal_selesai IS NULL
            OR date(g.tanggal_transaksi) <= date($tanggal_selesai)
          )
          AND (
            $keyword = '%%'
            OR g.judul LIKE $keyword
            OR COALESCE(g.catatan, '') LIKE $keyword
            OR COALESCE(d.nama, '') LIKE $keyword
            OR COALESCE(kg.nama, '') LIKE $keyword
          )
      ) transaksi
      ORDER BY tanggal_transaksi DESC, created_at DESC
      LIMIT $limit OFFSET $offset
    `,
    {
      $jenis: jenis,
      $keyword: keyword,
      $tanggal_mulai: payload.tanggalMulai ?? null,
      $tanggal_selesai: payload.tanggalSelesai ?? null,
      $limit: limit,
      $offset: offset,
    }
  );

  return rows ?? [];
}

export async function getRingkasanRiwayatTransaksi(
  db: SQLiteDatabase,
  payload: {
    keyword?: string;
    jenis?: RiwayatTransaksiFilterJenis;
    tanggalMulai?: string | null;
    tanggalSelesai?: string | null;
  }
): Promise<RingkasanRiwayatTransaksi> {
  const cleanKeyword = payload.keyword?.trim() ?? "";
  const keyword = `%${cleanKeyword}%`;
  const jenis = payload.jenis ?? "semua";

  const row = await db.getFirstAsync<RingkasanRiwayatTransaksiSqlRow>(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN jenis_transaksi = 'pemasukan' THEN jumlah
              ELSE 0
            END
          ),
          0
        ) AS total_pemasukan,
        COALESCE(
          SUM(
            CASE
              WHEN jenis_transaksi = 'pengeluaran' THEN jumlah
              ELSE 0
            END
          ),
          0
        ) AS total_pengeluaran,
        COALESCE(COUNT(*), 0) AS jumlah_transaksi
      FROM (
        SELECT
          'pemasukan' AS jenis_transaksi,
          p.jumlah
        FROM pemasukan p
        LEFT JOIN dompet d
          ON d.id = p.dompet_id
        LEFT JOIN kategori_pemasukan kp
          ON kp.id = p.kategori_id
        WHERE p.is_deleted = 0
          AND ($jenis = 'semua' OR $jenis = 'pemasukan')
          AND (
            $tanggal_mulai IS NULL
            OR date(p.tanggal_transaksi) >= date($tanggal_mulai)
          )
          AND (
            $tanggal_selesai IS NULL
            OR date(p.tanggal_transaksi) <= date($tanggal_selesai)
          )
          AND (
            $keyword = '%%'
            OR p.judul LIKE $keyword
            OR COALESCE(p.catatan, '') LIKE $keyword
            OR COALESCE(d.nama, '') LIKE $keyword
            OR COALESCE(kp.nama, '') LIKE $keyword
          )

        UNION ALL

        SELECT
          'pengeluaran' AS jenis_transaksi,
          g.jumlah
        FROM pengeluaran g
        LEFT JOIN dompet d
          ON d.id = g.dompet_id
        LEFT JOIN kategori_pengeluaran kg
          ON kg.id = g.kategori_id
        WHERE g.is_deleted = 0
          AND ($jenis = 'semua' OR $jenis = 'pengeluaran')
          AND (
            $tanggal_mulai IS NULL
            OR date(g.tanggal_transaksi) >= date($tanggal_mulai)
          )
          AND (
            $tanggal_selesai IS NULL
            OR date(g.tanggal_transaksi) <= date($tanggal_selesai)
          )
          AND (
            $keyword = '%%'
            OR g.judul LIKE $keyword
            OR COALESCE(g.catatan, '') LIKE $keyword
            OR COALESCE(d.nama, '') LIKE $keyword
            OR COALESCE(kg.nama, '') LIKE $keyword
          )
      ) transaksi
    `,
    {
      $jenis: jenis,
      $keyword: keyword,
      $tanggal_mulai: payload.tanggalMulai ?? null,
      $tanggal_selesai: payload.tanggalSelesai ?? null,
    }
  );

  const totalPemasukan = row?.total_pemasukan ?? 0;
  const totalPengeluaran = row?.total_pengeluaran ?? 0;

  return {
    totalPemasukan,
    totalPengeluaran,
    saldoBersih: totalPemasukan - totalPengeluaran,
    jumlahTransaksi: row?.jumlah_transaksi ?? 0,
  };
}