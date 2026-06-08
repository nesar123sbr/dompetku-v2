import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";

import {
  getBundleSinkronisasiAwalLokal,
  tandaiSinkronisasiAwalSelesai,
} from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type SinkronisasiAwalSummary = {
  profilPengguna: number;
  dompet: number;
  kategoriPemasukan: number;
  kategoriPengeluaran: number;
  pemasukan: number;
  pengeluaran: number;
  pengingatTagihan: number;
  transferDompet: number;
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

function chunkArray<T>(items: T[], size = 200) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
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

export async function sinkronisasiAwalDataLokalKeSupabase(
  db: SQLiteDatabase,
  user: User
): Promise<SinkronisasiAwalSummary> {
  const client = getSupabaseClientOrThrow();
  const penggunaId = user.id;
  const bundle = await getBundleSinkronisasiAwalLokal(db);

  const summary: SinkronisasiAwalSummary = {
    profilPengguna: 0,
    dompet: 0,
    kategoriPemasukan: 0,
    kategoriPengeluaran: 0,
    pemasukan: 0,
    pengeluaran: 0,
    pengingatTagihan: 0,
    transferDompet: 0,
  };

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

  summary.profilPengguna = 1;

  summary.dompet = await upsertInChunks(
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

  summary.kategoriPemasukan = await upsertInChunks(
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

  summary.kategoriPengeluaran = await upsertInChunks(
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

  summary.pemasukan = await upsertInChunks(
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

  summary.pengeluaran = await upsertInChunks(
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

  summary.pengingatTagihan = await upsertInChunks(
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

  summary.transferDompet = await upsertInChunks(
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

  await tandaiSinkronisasiAwalSelesai(db);

  return summary;
}