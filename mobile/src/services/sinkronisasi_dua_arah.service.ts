import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";

import {
  getBundleSinkronisasiLokalSejak,
  getInfoAkunSupabaseLokal,
  tandaiSinkronisasiAwalSelesai,
  terapkanBundleCloudKeSQLite,
  type BundleSinkronisasiCloud,
  type BundleSinkronisasiLokal,
  type CloudAnggaranBulananRow,
  type CloudDompetRow,
  type CloudKategoriPemasukanRow,
  type CloudKategoriPengeluaranRow,
  type CloudPemasukanRow,
  type CloudPengeluaranRow,
  type CloudPengingatTagihanRow,
  type CloudTransferDompetRow,
} from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type RingkasanArahSync = {
  profilPengguna: number;
  dompet: number;
  kategoriPemasukan: number;
  kategoriPengeluaran: number;
  pemasukan: number;
  pengeluaran: number;
  pengingatTagihan: number;
  transferDompet: number;
  anggaranBulanan: number;
};

export type RingkasanSinkronisasiDuaArah = {
  mode: "awal" | "lanjutan";
  pushed: RingkasanArahSync;
  pulled: RingkasanArahSync;
  lastSyncAt: string;
  conflictPolicy: string;
};

function getSupabaseClientOrThrow() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi .env dan pastikan project tidak sedang pause."
    );
  }

  return supabase;
}

function toBool(value: number) {
  return Boolean(value);
}

function toDeletedFlag(value: number | null | undefined) {
  return value ? 1 : 0;
}

function getMs(value?: string | null) {
  if (!value) return 0;

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function localMenang(
  localUpdatedAt?: string | null,
  cloudUpdatedAt?: string | null
) {
  return getMs(localUpdatedAt) >= getMs(cloudUpdatedAt);
}

function chunkArray<T>(items: T[], size = 200) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function createEmptyRingkasan(): RingkasanArahSync {
  return {
    profilPengguna: 0,
    dompet: 0,
    kategoriPemasukan: 0,
    kategoriPengeluaran: 0,
    pemasukan: 0,
    pengeluaran: 0,
    pengingatTagihan: 0,
    transferDompet: 0,
    anggaranBulanan: 0,
  };
}

function isCloudBundleKosong(bundle: BundleSinkronisasiCloud) {
  return (
    bundle.dompet.length === 0 &&
    bundle.kategoriPemasukan.length === 0 &&
    bundle.kategoriPengeluaran.length === 0 &&
    bundle.pemasukan.length === 0 &&
    bundle.pengeluaran.length === 0 &&
    bundle.pengingatTagihan.length === 0 &&
    bundle.transferDompet.length === 0 &&
    bundle.anggaranBulanan.length === 0
  );
}

async function upsertInChunks(
  tableName: string,
  rows: Record<string, unknown>[],
  onConflict: string
) {
  const client = getSupabaseClientOrThrow();

  if (rows.length === 0) {
    return 0;
  }

  const chunks = chunkArray(rows, 200);

  for (const chunk of chunks) {
    const { error } = await client
      .from(tableName)
      .upsert(chunk, { onConflict });

    if (error) {
      throw error;
    }
  }

  return rows.length;
}

async function fetchCloudTable<T>(
  tableName: string,
  sinceIso?: string | null
): Promise<T[]> {
  const client = getSupabaseClientOrThrow();

  let query = client.from(tableName).select("*").order("updated_at", {
    ascending: true,
  });

  if (sinceIso) {
    query = query.gt("updated_at", sinceIso);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

async function fetchCloudBundleSince(
  sinceIso?: string | null
): Promise<BundleSinkronisasiCloud> {
  const [
    dompet,
    kategoriPemasukan,
    kategoriPengeluaran,
    pemasukan,
    pengeluaran,
    pengingatTagihan,
    transferDompet,
    anggaranBulanan,
  ] = await Promise.all([
    fetchCloudTable<CloudDompetRow>("dompet", sinceIso),
    fetchCloudTable<CloudKategoriPemasukanRow>(
      "kategori_pemasukan",
      sinceIso
    ),
    fetchCloudTable<CloudKategoriPengeluaranRow>(
      "kategori_pengeluaran",
      sinceIso
    ),
    fetchCloudTable<CloudPemasukanRow>("pemasukan", sinceIso),
    fetchCloudTable<CloudPengeluaranRow>("pengeluaran", sinceIso),
    fetchCloudTable<CloudPengingatTagihanRow>(
      "pengingat_tagihan",
      sinceIso
    ),
    fetchCloudTable<CloudTransferDompetRow>("transfer_dompet", sinceIso),
    fetchCloudTable<CloudAnggaranBulananRow>(
      "anggaran_bulanan",
      sinceIso
    ),
  ]);

  return {
    dompet,
    kategoriPemasukan,
    kategoriPengeluaran,
    pemasukan,
    pengeluaran,
    pengingatTagihan,
    transferDompet,
    anggaranBulanan,
  };
}

function buildCloudUpdatedMap<T extends { id_lokal: string; updated_at: string }>(
  items: T[]
) {
  return new Map(items.map((item) => [item.id_lokal, item.updated_at]));
}

function filterLocalBundleAgainstCloud(
  local: BundleSinkronisasiLokal,
  cloud: BundleSinkronisasiCloud
): BundleSinkronisasiLokal {
  const dompetMap = buildCloudUpdatedMap(cloud.dompet);
  const kategoriPemasukanMap = buildCloudUpdatedMap(cloud.kategoriPemasukan);
  const kategoriPengeluaranMap = buildCloudUpdatedMap(
    cloud.kategoriPengeluaran
  );
  const pemasukanMap = buildCloudUpdatedMap(cloud.pemasukan);
  const pengeluaranMap = buildCloudUpdatedMap(cloud.pengeluaran);
  const pengingatMap = buildCloudUpdatedMap(cloud.pengingatTagihan);
  const transferMap = buildCloudUpdatedMap(cloud.transferDompet);
  const anggaranMap = buildCloudUpdatedMap(cloud.anggaranBulanan);

  return {
    dompet: local.dompet.filter((item) =>
      localMenang(item.updated_at, dompetMap.get(item.id))
    ),

    kategoriPemasukan: local.kategoriPemasukan.filter((item) =>
      localMenang(item.updated_at, kategoriPemasukanMap.get(item.id))
    ),

    kategoriPengeluaran: local.kategoriPengeluaran.filter((item) =>
      localMenang(item.updated_at, kategoriPengeluaranMap.get(item.id))
    ),

    pemasukan: local.pemasukan.filter((item) =>
      localMenang(item.updated_at, pemasukanMap.get(item.id))
    ),

    pengeluaran: local.pengeluaran.filter((item) =>
      localMenang(item.updated_at, pengeluaranMap.get(item.id))
    ),

    pengingatTagihan: local.pengingatTagihan.filter((item) =>
      localMenang(item.updated_at, pengingatMap.get(item.id))
    ),

    transferDompet: local.transferDompet.filter((item) =>
      localMenang(item.updated_at, transferMap.get(item.id))
    ),

    anggaranBulanan: local.anggaranBulanan.filter((item) =>
      localMenang(item.updated_at, anggaranMap.get(item.id))
    ),
  };
}

function getNamaLengkapDariUser(user: User) {
  const raw =
    user.user_metadata?.nama_lengkap ??
    user.user_metadata?.full_name ??
    null;

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function pushLocalBundleKeCloud(
  user: User,
  bundle: BundleSinkronisasiLokal
): Promise<RingkasanArahSync> {
  const client = getSupabaseClientOrThrow();
  const penggunaId = user.id;
  const result = createEmptyRingkasan();

  const { error: profilError } = await client.from("profil_pengguna").upsert(
    {
      id: penggunaId,
      email: user.email ?? null,
      nama_lengkap: getNamaLengkapDariUser(user),
    },
    {
      onConflict: "id",
    }
  );

  if (profilError) {
    throw profilError;
  }

  result.profilPengguna = 1;

  result.dompet = await upsertInChunks(
    "dompet",
    bundle.dompet.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      nama: item.nama,
      jenis: item.jenis,
      tipe_dompet: item.tipe_dompet ?? item.jenis,
      saldo_saat_ini: item.saldo_saat_ini,
      is_default: toBool(item.is_default),
      is_aktif: toBool(item.is_aktif),
      sumber_data: "lokal",
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.kategoriPemasukan = await upsertInChunks(
    "kategori_pemasukan",
    bundle.kategoriPemasukan.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      nama: item.nama,
      ikon: item.ikon,
      warna: item.warna,
      urutan: item.urutan,
      is_bawaan: toBool(item.is_bawaan),
      is_aktif: toBool(item.is_aktif),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.kategoriPengeluaran = await upsertInChunks(
    "kategori_pengeluaran",
    bundle.kategoriPengeluaran.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      nama: item.nama,
      kelompok: item.kelompok,
      ikon: item.ikon,
      warna: item.warna,
      urutan: item.urutan,
      is_bawaan: toBool(item.is_bawaan),
      is_aktif: toBool(item.is_aktif),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.pemasukan = await upsertInChunks(
    "pemasukan",
    bundle.pemasukan.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      dompet_id_lokal: item.dompet_id,
      kategori_id_lokal: item.kategori_id,
      judul: item.judul,
      catatan: item.catatan,
      jumlah: item.jumlah,
      tanggal_transaksi: item.tanggal_transaksi,
      sumber_data: item.sumber_data || "lokal",
      is_deleted: toDeletedFlag(item.is_deleted),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.pengeluaran = await upsertInChunks(
    "pengeluaran",
    bundle.pengeluaran.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      dompet_id_lokal: item.dompet_id,
      kategori_id_lokal: item.kategori_id,
      judul: item.judul,
      catatan: item.catatan,
      jumlah: item.jumlah,
      tanggal_transaksi: item.tanggal_transaksi,
      pakai_dana_darurat: toBool(item.pakai_dana_darurat),
      sumber_data: item.sumber_data || "lokal",
      is_deleted: toDeletedFlag(item.is_deleted),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.pengingatTagihan = await upsertInChunks(
    "pengingat_tagihan",
    bundle.pengingatTagihan.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      judul: item.judul,
      catatan: item.catatan,
      nominal: item.nominal,
      dompet_id_lokal: item.dompet_id,
      tanggal_jatuh_tempo: item.tanggal_jatuh_tempo,
      jam_pengingat: item.jam_pengingat,
      status: item.status,
      pengulangan: item.pengulangan,
      notifikasi_diaktifkan: toBool(item.notifikasi_diaktifkan),
      sumber_data: "lokal",
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.transferDompet = await upsertInChunks(
    "transfer_dompet",
    bundle.transferDompet.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      dompet_sumber_id_lokal: item.dompet_sumber_id,
      dompet_tujuan_id_lokal: item.dompet_tujuan_id,
      jumlah: item.jumlah,
      tanggal_transfer: item.tanggal_transfer,
      catatan: item.catatan,
      sumber_dana_darurat: toBool(item.sumber_dana_darurat),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  result.anggaranBulanan = await upsertInChunks(
    "anggaran_bulanan",
    bundle.anggaranBulanan.map((item) => ({
      pengguna_id: penggunaId,
      id_lokal: item.id,
      bulan: item.bulan,
      nama: item.nama,
      kategori_id_lokal: item.kategori_id,
      batas_nominal: item.batas_nominal,
      ambang_peringatan_persen: item.ambang_peringatan_persen,
      is_aktif: toBool(item.is_aktif),
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    "pengguna_id,id_lokal"
  );

  return result;
}

function hitungPull(bundle: BundleSinkronisasiCloud): RingkasanArahSync {
  return {
    profilPengguna: 1,
    dompet: bundle.dompet.length,
    kategoriPemasukan: bundle.kategoriPemasukan.length,
    kategoriPengeluaran: bundle.kategoriPengeluaran.length,
    pemasukan: bundle.pemasukan.length,
    pengeluaran: bundle.pengeluaran.length,
    pengingatTagihan: bundle.pengingatTagihan.length,
    transferDompet: bundle.transferDompet.length,
    anggaranBulanan: bundle.anggaranBulanan.length,
  };
}

function toFriendlySyncError(error: unknown) {
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();

    if (
      (lower.includes("relation") && lower.includes("does not exist")) ||
      lower.includes("could not find the table")
    ) {
      return new Error(
        "Tabel cloud DompetKu di Supabase belum dibuat. Buka SQL Editor Supabase, jalankan schema database DompetKu, lalu coba sinkronisasi lagi."
      );
    }

    if (lower.includes("row-level security")) {
      return new Error(
        "Aturan keamanan cloud belum cocok. Jalankan SQL schema lengkap, termasuk policy RLS."
      );
    }

    if (lower.includes("project paused") || lower.includes("540")) {
      return new Error(
        "Project Supabase sedang pause. Unpause dulu dari dashboard Supabase."
      );
    }

    return error;
  }

  return new Error("Sinkronisasi cloud gagal. Coba lagi.");
}

export async function sinkronisasiCloudSekarang(
  db: SQLiteDatabase,
  user: User
): Promise<RingkasanSinkronisasiDuaArah> {
  try {
    const info = await getInfoAkunSupabaseLokal(db);
    const lastSyncAt = info.terakhirSinkronisasiAt;

    const mode: "awal" | "lanjutan" =
      !lastSyncAt || info.butuhSinkronisasiAwal ? "awal" : "lanjutan";

    const cloudSebelum = await fetchCloudBundleSince(lastSyncAt);

    const freshDeviceTanpaDataUser =
      !lastSyncAt && !info.adaDataLokalBermakna;

    if (freshDeviceTanpaDataUser && !isCloudBundleKosong(cloudSebelum)) {
      await terapkanBundleCloudKeSQLite(db, cloudSebelum);

      const syncAt = new Date().toISOString();
      await tandaiSinkronisasiAwalSelesai(db, syncAt);

      return {
        mode: "awal",
        pushed: createEmptyRingkasan(),
        pulled: hitungPull(cloudSebelum),
        lastSyncAt: syncAt,
        conflictPolicy:
          "Perangkat baru tanpa data lokal mengambil data cloud terlebih dahulu supaya data lama tidak tertimpa data kosong.",
      };
    }

    const lokalSejak = await getBundleSinkronisasiLokalSejak(db, lastSyncAt);

    const lokalYangMenang = filterLocalBundleAgainstCloud(
      lokalSejak,
      cloudSebelum
    );

    const pushed = await pushLocalBundleKeCloud(user, lokalYangMenang);

    const cloudSesudah = await fetchCloudBundleSince(lastSyncAt);
    await terapkanBundleCloudKeSQLite(db, cloudSesudah);

    const syncAt = new Date().toISOString();
    await tandaiSinkronisasiAwalSelesai(db, syncAt);

    return {
      mode,
      pushed,
      pulled: hitungPull(cloudSesudah),
      lastSyncAt: syncAt,
      conflictPolicy:
        "Data yang lebih baru akan dipakai. Kalau waktunya sama, data dari perangkat ini diprioritaskan.",
    };
  } catch (error) {
    throw toFriendlySyncError(error);
  }
}