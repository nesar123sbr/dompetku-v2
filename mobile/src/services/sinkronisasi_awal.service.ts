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

  // Bungkus semua data lokal ke dalam satu JSON besar (Payload)
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
    anggaranBulanan: [], // Sinkronisasi awal tidak perlu bawa array anggaran bulanan kosong
  };

  // Eksekusi atomik lewat 1 request HTTP
  const { error } = await client.rpc("sync_bundle", {
    payload: payload,
  });

  if (error) {
    throw error;
  }

  await tandaiSinkronisasiAwalSelesai(db);

  return {
    profilPengguna: 1,
    dompet: bundle.dompet.length,
    kategoriPemasukan: bundle.kategoriPemasukan.length,
    kategoriPengeluaran: bundle.kategoriPengeluaran.length,
    pemasukan: bundle.pemasukan.length,
    pengeluaran: bundle.pengeluaran.length,
    pengingatTagihan: bundle.pengingatTagihan.length,
    transferDompet: bundle.transferDompet.length,
  };
}