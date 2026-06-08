import type { SQLiteDatabase } from "expo-sqlite";

import { createLocalId, getNowIso } from "../helpers";
import type {
  BuatPengingatTagihanPayload,
  PengingatTagihanListItem,
  RingkasanPengingatTagihan,
} from "../types";

type RingkasanPengingatRow = {
  total_aktif: number | null;
  jatuh_tempo_hari_ini: number | null;
  terlambat: number | null;
  notifikasi_aktif: number | null;
};

// --- TAMBAHAN TYPE BARU DARI CHATGPT ---
type DompetPembayaranRow = {
  id: string;
  nama: string;
  jenis: string;
  saldo_saat_ini: number;
};

type PengingatPembayaranRow = {
  id: string;
  judul: string;
  catatan: string | null;
  nominal: number;
  status: string;
  pengulangan: string;
};

export type BayarPengingatTagihanPayload = {
  item: PengingatTagihanListItem;
  dompetId: string;
  tanggalTransaksi: string;
  nextTanggalJatuhTempo?: string | null;
};

export type BayarPengingatTagihanResult = {
  pengeluaranId: string;
  dompetId: string;
  dompetNama: string;
  saldoSebelum: number;
  saldoSesudah: number;
};
// ---------------------------------------

export async function getRingkasanPengingatTagihan(
  db: SQLiteDatabase
): Promise<RingkasanPengingatTagihan> {
  const row = await db.getFirstAsync<RingkasanPengingatRow>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'aktif' THEN 1 ELSE 0 END), 0) AS total_aktif,
        COALESCE(SUM(CASE WHEN status = 'aktif' AND date(tanggal_jatuh_tempo) = date('now', 'localtime') THEN 1 ELSE 0 END), 0) AS jatuh_tempo_hari_ini,
        COALESCE(SUM(CASE WHEN status = 'aktif' AND date(tanggal_jatuh_tempo) < date('now', 'localtime') THEN 1 ELSE 0 END), 0) AS terlambat,
        COALESCE(SUM(CASE WHEN status = 'aktif' AND notifikasi_diaktifkan = 1 THEN 1 ELSE 0 END), 0) AS notifikasi_aktif
      FROM pengingat_tagihan
    `
  );

  return {
    totalAktif: row?.total_aktif ?? 0,
    jatuhTempoHariIni: row?.jatuh_tempo_hari_ini ?? 0,
    terlambat: row?.terlambat ?? 0,
    notifikasiAktif: row?.notifikasi_aktif ?? 0,
  };
}

export async function getDaftarPengingatTagihanAktif(
  db: SQLiteDatabase,
  limit = 50
): Promise<PengingatTagihanListItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  const rows = await db.getAllAsync<PengingatTagihanListItem>(
    `
      SELECT
        p.id,
        p.judul,
        p.catatan,
        p.nominal,
        p.dompet_id,
        d.nama AS nama_dompet,
        p.tanggal_jatuh_tempo,
        p.jam_pengingat,
        p.status,
        p.pengulangan,
        p.lokal_notifikasi_id,
        p.notifikasi_diaktifkan,
        p.created_at,
        p.updated_at
      FROM pengingat_tagihan p
      LEFT JOIN dompet d
        ON d.id = p.dompet_id
      WHERE p.status = 'aktif'
      ORDER BY date(p.tanggal_jatuh_tempo) ASC, p.jam_pengingat ASC, p.created_at DESC
      LIMIT ${safeLimit}
    `
  );

  return rows ?? [];
}

export async function getPreviewPengingatDashboard(
  db: SQLiteDatabase,
  limit = 3
): Promise<PengingatTagihanListItem[]> {
  return getDaftarPengingatTagihanAktif(db, limit);
}

export async function getPengingatAktifYangButuhSinkronNotifikasi(
  db: SQLiteDatabase
): Promise<PengingatTagihanListItem[]> {
  const rows = await db.getAllAsync<PengingatTagihanListItem>(
    `
      SELECT
        p.id,
        p.judul,
        p.catatan,
        p.nominal,
        p.dompet_id,
        d.nama AS nama_dompet,
        p.tanggal_jatuh_tempo,
        p.jam_pengingat,
        p.status,
        p.pengulangan,
        p.lokal_notifikasi_id,
        p.notifikasi_diaktifkan,
        p.created_at,
        p.updated_at
      FROM pengingat_tagihan p
      LEFT JOIN dompet d
        ON d.id = p.dompet_id
      WHERE p.status = 'aktif'
        AND p.notifikasi_diaktifkan = 1
        AND (
          p.lokal_notifikasi_id IS NULL
          OR TRIM(p.lokal_notifikasi_id) = ''
        )
      ORDER BY date(p.tanggal_jatuh_tempo) ASC, p.jam_pengingat ASC, p.created_at DESC
    `
  );

  return rows ?? [];
}

export async function buatPengingatTagihanLokal(
  db: SQLiteDatabase,
  payload: BuatPengingatTagihanPayload
): Promise<string> {
  if (payload.nominal < 0) {
    throw new Error("Nominal tagihan tidak boleh negatif.");
  }

  const pengingatId = createLocalId("tagihan");
  const now = getNowIso();

  await db.runAsync(
    `
      INSERT INTO pengingat_tagihan (
        id,
        judul,
        catatan,
        nominal,
        dompet_id,
        tanggal_jatuh_tempo,
        jam_pengingat,
        status,
        pengulangan,
        lokal_notifikasi_id,
        notifikasi_diaktifkan,
        created_at,
        updated_at
      ) VALUES (
        $id,
        $judul,
        $catatan,
        $nominal,
        $dompet_id,
        $tanggal_jatuh_tempo,
        $jam_pengingat,
        'aktif',
        $pengulangan,
        NULL,
        $notifikasi_diaktifkan,
        $created_at,
        $updated_at
      )
    `,
    {
      $id: pengingatId,
      $judul: payload.judul.trim(),
      $catatan: payload.catatan?.trim() || null,
      $nominal: payload.nominal,
      $dompet_id: payload.dompetId || null,
      $tanggal_jatuh_tempo: payload.tanggalJatuhTempo,
      $jam_pengingat: payload.jamPengingat,
      $pengulangan: payload.pengulangan,
      $notifikasi_diaktifkan: payload.notifikasiDiaktifkan ? 1 : 0,
      $created_at: now,
      $updated_at: now,
    }
  );

  return pengingatId;
}

export async function setLokalNotifikasiIdPengingat(
  db: SQLiteDatabase,
  pengingatId: string,
  lokalNotifikasiId: string | null
) {
  await db.runAsync(
    `
      UPDATE pengingat_tagihan
      SET
        lokal_notifikasi_id = $lokal_notifikasi_id,
        updated_at = $updated_at
      WHERE id = $id
    `,
    {
      $lokal_notifikasi_id: lokalNotifikasiId,
      $updated_at: getNowIso(),
      $id: pengingatId,
    }
  );
}

export async function tandaiPengingatSekaliSelesai(
  db: SQLiteDatabase,
  pengingatId: string
) {
  await db.runAsync(
    `
      UPDATE pengingat_tagihan
      SET
        status = 'selesai',
        lokal_notifikasi_id = NULL,
        updated_at = $updated_at
      WHERE id = $id
    `,
    {
      $updated_at: getNowIso(),
      $id: pengingatId,
    }
  );
}

export async function jadwalkanUlangPengingatBerulang(
  db: SQLiteDatabase,
  payload: {
    pengingatId: string;
    nextTanggalJatuhTempo: string;
    nextLokalNotifikasiId: string | null;
  }
) {
  await db.runAsync(
    `
      UPDATE pengingat_tagihan
      SET
        status = 'aktif',
        tanggal_jatuh_tempo = $tanggal_jatuh_tempo,
        lokal_notifikasi_id = $lokal_notifikasi_id,
        updated_at = $updated_at
      WHERE id = $id
    `,
    {
      $tanggal_jatuh_tempo: payload.nextTanggalJatuhTempo,
      $lokal_notifikasi_id: payload.nextLokalNotifikasiId,
      $updated_at: getNowIso(),
      $id: payload.pengingatId,
    }
  );
}

export async function batalkanPengingatTagihan(
  db: SQLiteDatabase,
  pengingatId: string
) {
  await db.runAsync(
    `
      UPDATE pengingat_tagihan
      SET
        status = 'dibatalkan',
        lokal_notifikasi_id = NULL,
        updated_at = $updated_at
      WHERE id = $id
    `,
    {
      $updated_at: getNowIso(),
      $id: pengingatId,
    }
  );
}

// --- TAMBAHAN FUNCTION BARU DARI CHATGPT ---
export async function bayarPengingatTagihanLokal(
  db: SQLiteDatabase,
  payload: BayarPengingatTagihanPayload
): Promise<BayarPengingatTagihanResult> {
  if (!payload.dompetId) {
    throw new Error("Pilih dompet pembayaran terlebih dahulu.");
  }

  if (payload.item.nominal <= 0) {
    throw new Error("Nominal tagihan harus lebih dari 0 agar bisa dibayar.");
  }

  const now = getNowIso();
  const pengeluaranId = createLocalId("peng");
  let result: BayarPengingatTagihanResult | null = null;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const pengingat = await txn.getFirstAsync<PengingatPembayaranRow>(
      `
        SELECT
          id,
          judul,
          catatan,
          nominal,
          status,
          pengulangan
        FROM pengingat_tagihan
        WHERE id = $id
        LIMIT 1
      `,
      {
        $id: payload.item.id,
      }
    );

    if (!pengingat || pengingat.status !== "aktif") {
      throw new Error("Pengingat tagihan tidak ditemukan atau sudah tidak aktif.");
    }

    if (pengingat.nominal <= 0) {
      throw new Error("Nominal tagihan harus lebih dari 0 agar bisa dibayar.");
    }

    const dompet = await txn.getFirstAsync<DompetPembayaranRow>(
      `
        SELECT
          id,
          nama,
          jenis,
          saldo_saat_ini
        FROM dompet
        WHERE id = $id
          AND is_aktif = 1
        LIMIT 1
      `,
      {
        $id: payload.dompetId,
      }
    );

    if (!dompet) {
      throw new Error("Dompet pembayaran tidak ditemukan atau tidak aktif.");
    }

    if (pengingat.nominal > dompet.saldo_saat_ini) {
      throw new Error(
        "Saldo tidak mencukupi. Silakan pilih dompet lain atau lakukan transfer antar dompet terlebih dahulu."
      );
    }

    const pakaiDanaDarurat = dompet.jenis === "dana_darurat" ? 1 : 0;
    const saldoSesudah = dompet.saldo_saat_ini - pengingat.nominal;

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
        $dompet_id: dompet.id,
        $kategori_id: "kat-peng-tagihan",
        $judul: `Bayar tagihan: ${pengingat.judul}`,
        $catatan:
          pengingat.catatan?.trim() || "Pembayaran dari pengingat tagihan",
        $jumlah: pengingat.nominal,
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
        $jumlah: pengingat.nominal,
        $updated_at: now,
        $dompet_id: dompet.id,
      }
    );

    if (pengingat.pengulangan === "sekali") {
      await txn.runAsync(
        `
          UPDATE pengingat_tagihan
          SET
            status = 'selesai',
            lokal_notifikasi_id = NULL,
            updated_at = $updated_at
          WHERE id = $id
            AND status = 'aktif'
        `,
        {
          $updated_at: now,
          $id: pengingat.id,
        }
      );
    } else {
      if (!payload.nextTanggalJatuhTempo) {
        throw new Error("Tanggal jatuh tempo berikutnya tidak valid.");
      }

      await txn.runAsync(
        `
          UPDATE pengingat_tagihan
          SET
            status = 'aktif',
            tanggal_jatuh_tempo = $tanggal_jatuh_tempo,
            lokal_notifikasi_id = NULL,
            updated_at = $updated_at
          WHERE id = $id
            AND status = 'aktif'
        `,
        {
          $tanggal_jatuh_tempo: payload.nextTanggalJatuhTempo,
          $updated_at: now,
          $id: pengingat.id,
        }
      );
    }

    result = {
      pengeluaranId,
      dompetId: dompet.id,
      dompetNama: dompet.nama,
      saldoSebelum: dompet.saldo_saat_ini,
      saldoSesudah,
    };
  });

  if (!result) {
    throw new Error("Pembayaran tagihan belum berhasil diproses.");
  }

  return result;
}