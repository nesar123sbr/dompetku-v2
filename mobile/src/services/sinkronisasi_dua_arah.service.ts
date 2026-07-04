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

// PERUBAHAN 1: Paksa menjadi boolean murni (true/false) agar Postgres tidak rewel
function toDeletedFlag(value: number | null | undefined) {
  return Boolean(value); 
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

async function fetchCloudTable<T>(
  tableName: string,
  sinceIso?: string | null
): Promise<T[]> {
  const client = getSupabaseClientOrThrow();
  let allData: T[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    let query = client
      .from(tableName)
      .select("*")
      .order("updated_at", { ascending: true })
      .order("id_lokal", { ascending: true }) // ✅ Perbaikan kritis untuk paginasi deterministik
      .range(from, from + step - 1);

    if (sinceIso) {
      query = query.gt("updated_at", sinceIso);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const currentData = (data ?? []) as T[];
    allData = allData.concat(currentData);

    if (currentData.length < step) {
      break;
    }

    from += step;
  }

  return allData;
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
    fetchCloudTable<CloudKategoriPemasukanRow>("kategori_pemasukan", sinceIso),
    fetchCloudTable<CloudKategoriPengeluaranRow>("kategori_pengeluaran", sinceIso),
    fetchCloudTable<CloudPemasukanRow>("pemasukan", sinceIso),
    fetchCloudTable<CloudPengeluaranRow>("pengeluaran", sinceIso),
    fetchCloudTable<CloudPengingatTagihanRow>("pengingat_tagihan", sinceIso),
    fetchCloudTable<CloudTransferDompetRow>("transfer_dompet", sinceIso),
    fetchCloudTable<CloudAnggaranBulananRow>("anggaran_bulanan", sinceIso),
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
  const kategoriPengeluaranMap = buildCloudUpdatedMap(cloud.kategoriPengeluaran);
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

  const payload = {
    profilPengguna: {
      email: user.email ?? null,
      nama_lengkap: getNamaLengkapDariUser(user),
    },
    dompet: bundle.dompet.map((item) => ({
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
    kategoriPemasukan: bundle.kategoriPemasukan.map((item) => ({
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
    kategoriPengeluaran: bundle.kategoriPengeluaran.map((item) => ({
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
    pemasukan: bundle.pemasukan.map((item) => ({
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
    pengeluaran: bundle.pengeluaran.map((item) => ({
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
    pengingatTagihan: bundle.pengingatTagihan.map((item) => ({
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
    transferDompet: bundle.transferDompet.map((item) => ({
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
    anggaranBulanan: bundle.anggaranBulanan.map((item) => ({
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
  };

  const { error } = await client.rpc("sync_bundle", {
    payload: payload,
  });

  if (error) {
    throw error;
  }

  const result = createEmptyRingkasan();
  result.profilPengguna = 1;
  result.dompet = bundle.dompet.length;
  result.kategoriPemasukan = bundle.kategoriPemasukan.length;
  result.kategoriPengeluaran = bundle.kategoriPengeluaran.length;
  result.pemasukan = bundle.pemasukan.length;
  result.pengeluaran = bundle.pengeluaran.length;
  result.pengingatTagihan = bundle.pengingatTagihan.length;
  result.transferDompet = bundle.transferDompet.length;
  result.anggaranBulanan = bundle.anggaranBulanan.length;

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

// PERUBAHAN 2: Fungsi X-Ray untuk mengekspos error mentah ke layar
function toFriendlySyncError(error: unknown) {
  // ✅ Perbaikan kritis: cek tipe data sebelum mengakses properti
  const errObj = typeof error === 'object' && error !== null ? (error as Record<string, any>) : {};
  const msg = errObj?.message || errObj?.error_description || "";

  if (msg) {
    if (__DEV__) {
      return new Error(`[DEV] DB Error: ${msg} | Details: ${errObj?.details || "Tidak ada detail"}`);
    }
    return new Error("Terjadi kendala saat menyinkronkan data. Silakan coba beberapa saat lagi.");
  }

  if (error instanceof Error) {
    if (__DEV__) {
      return error;
    }
    return new Error("Terjadi kendala pada sistem. Sinkronisasi dibatalkan.");
  }

  if (__DEV__) {
    return new Error("Error tak dikenal: " + JSON.stringify(error));
  }
  return new Error("Kendala jaringan atau sistem. Gagal menyinkronkan data.");
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