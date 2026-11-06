import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";
import * as Network from "expo-network";

import {
  PENGATURAN_KEY,
  getNilaiPengaturanTeks,
  setNilaiPengaturanTeks,
  hitungUlangSaldoSemuaDompet,
} from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import {
  mapAnggaranToCloud,
  mapDompetToCloud,
  mapKategoriPemasukanToCloud,
  mapKategoriPengeluaranToCloud,
  mapKoreksiToCloud,
  mapPemasukanToCloud,
  mapPengeluaranToCloud,
  mapPengingatToCloud,
  mapTransferToCloud,
  type CloudAnggaranPayload,
  type CloudDompetPayload,
  type CloudKategoriPayload,
  type CloudKoreksiPayload,
  type CloudPengingatPayload,
  type CloudTransaksiPayload,
  type CloudTransferPayload,
} from "./mapper";
import {
  getBundleSinkronisasiLokalSejak,
  terapkanBundleCloudKeSQLite,
  type BundleSinkronisasiCloud,
} from "./repository";
import type {
  RingkasanArahSync,
  RingkasanSinkronisasiDuaArah,
  SyncOptions,
} from "./types";

let activeSyncPromise: Promise<RingkasanSinkronisasiDuaArah> | null = null;

function createEmptySummary(): RingkasanArahSync {
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
    koreksiSaldoDompet: 0,
  };
}

function getSupabaseClientOrThrow() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi .env dan pastikan project aktif."
    );
  }
  return supabase;
}

async function fetchTableKeyset<T extends { server_updated_at?: string; id_lokal: string }>(
  tableName: string,
  userId: string,
  sinceServerUpdatedAt: string
): Promise<T[]> {
  const client = getSupabaseClientOrThrow();
  const PAGE_SIZE = 150;
  const allRows: T[] = [];

  let lastTimestamp = sinceServerUpdatedAt;
  let lastId = "";
  let hasMore = true;

  while (hasMore) {
    let query = client
      .from(tableName)
      .select("*")
      .eq("pengguna_id", userId)
      .order("server_updated_at", { ascending: true })
      .order("id_lokal", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) {
      query = query.or(
        `server_updated_at.gt.${lastTimestamp},and(server_updated_at.eq.${lastTimestamp},id_lokal.gt.${lastId})`
      );
    } else {
      query = query.gte("server_updated_at", lastTimestamp);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...(data as unknown as T[]));

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      const last = data[data.length - 1];
      lastTimestamp = last.server_updated_at;
      lastId = last.id_lokal;
    }
  }

  return allRows;
}

export async function executeSync(
  db: SQLiteDatabase,
  user: User,
  options?: SyncOptions
): Promise<RingkasanSinkronisasiDuaArah> {
  // Service-level mutex: reuse existing active sync
  if (activeSyncPromise) {
    return await activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      // 1. Cek Koneksi Internet
      try {
        const netState = await Network.getNetworkStateAsync();
        const isOnline = Boolean(
          netState.isConnected && netState.isInternetReachable !== false
        );

        if (!isOnline) {
          if (!options?.isManual) {
            // Auto sync: skip diam-diam tanpa exception
            return {
              mode: "lanjutan",
              pushed: createEmptySummary(),
              pulled: createEmptySummary(),
              lastSyncAt: new Date().toISOString(),
              conflictPolicy: "offline_skip",
            };
          }
          throw new Error("Tidak ada koneksi internet. Pastikan perangkat terhubung.");
        }
      } catch (netErr) {
        if (options?.isManual) {
          throw netErr;
        }
        return {
          mode: "lanjutan",
          pushed: createEmptySummary(),
          pulled: createEmptySummary(),
          lastSyncAt: new Date().toISOString(),
          conflictPolicy: "offline_skip",
        };
      }

      const client = getSupabaseClientOrThrow();

      // 2. Tentukan Watermark Push & Waktu Mulai Sync
      const syncStartTime = new Date().toISOString();
      const rawWatermark = await getNilaiPengaturanTeks(
        db,
        PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT
      );
      const pushWatermark = rawWatermark && rawWatermark.trim().length > 0
        ? rawWatermark.trim()
        : "1970-01-01T00:00:00.000Z";

      // 3. Ambil data lokal yang berubah sejak pushWatermark
      const localBundle = await getBundleSinkronisasiLokalSejak(db, pushWatermark);

      const pushedSummary: RingkasanArahSync = {
        profilPengguna: 1,
        dompet: localBundle.dompet.length,
        kategoriPemasukan: localBundle.kategoriPemasukan.length,
        kategoriPengeluaran: localBundle.kategoriPengeluaran.length,
        pemasukan: localBundle.pemasukan.length,
        pengeluaran: localBundle.pengeluaran.length,
        transferDompet: localBundle.transferDompet.length,
        anggaranBulanan: localBundle.anggaranBulanan.length,
        koreksiSaldoDompet: localBundle.koreksiSaldoDompet.length,
        pengingatTagihan: localBundle.pengingatTagihan.length,
      };

      const mappedDompet = localBundle.dompet.map(mapDompetToCloud);
      const mappedKatPem = localBundle.kategoriPemasukan.map(mapKategoriPemasukanToCloud);
      const mappedKatPeng = localBundle.kategoriPengeluaran.map(mapKategoriPengeluaranToCloud);
      const mappedPemasukan = localBundle.pemasukan.map(mapPemasukanToCloud);
      const mappedPengeluaran = localBundle.pengeluaran.map(mapPengeluaranToCloud);
      const mappedTransfer = localBundle.transferDompet.map(mapTransferToCloud);
      const mappedAnggaran = localBundle.anggaranBulanan.map(mapAnggaranToCloud);
      const mappedKoreksi = localBundle.koreksiSaldoDompet.map(mapKoreksiToCloud);
      const mappedPengingat = localBundle.pengingatTagihan.map(mapPengingatToCloud);

      const totalItems =
        mappedDompet.length +
        mappedKatPem.length +
        mappedKatPeng.length +
        mappedPemasukan.length +
        mappedPengeluaran.length +
        mappedTransfer.length +
        mappedAnggaran.length +
        mappedKoreksi.length +
        mappedPengingat.length;

      const userProfile = {
        email: user.email ?? "",
        nama_lengkap:
          user.user_metadata?.nama_lengkap ??
          user.user_metadata?.full_name ??
          "",
      };

      if (totalItems <= 300) {
        // Single batch push (cepat untuk beban data normal)
        const payload = {
          profilPengguna: userProfile,
          dompet: mappedDompet,
          kategoriPemasukan: mappedKatPem,
          kategoriPengeluaran: mappedKatPeng,
          pemasukan: mappedPemasukan,
          pengeluaran: mappedPengeluaran,
          transferDompet: mappedTransfer,
          anggaranBulanan: mappedAnggaran,
          koreksiSaldoDompet: mappedKoreksi,
          pengingatTagihan: mappedPengingat,
        };

        const { error: pushError } = await client.rpc("sync_bundle", { payload });
        if (pushError) {
          throw new Error(`Gagal push sinkronisasi: ${pushError.message}`);
        }
      } else {
        // Multi-batch push berurutan sesuai relasi ketergantungan (FK)
        // 1. Master entities (profil, dompet, kategori)
        const masterPayload = {
          profilPengguna: userProfile,
          dompet: mappedDompet,
          kategoriPemasukan: mappedKatPem,
          kategoriPengeluaran: mappedKatPeng,
          pemasukan: [],
          pengeluaran: [],
          transferDompet: [],
          anggaranBulanan: [],
          koreksiSaldoDompet: [],
          pengingatTagihan: [],
        };
        const { error: masterErr } = await client.rpc("sync_bundle", { payload: masterPayload });
        if (masterErr) throw new Error(`Gagal push master data: ${masterErr.message}`);

        // 2. Transaksi & mutasi dalam chunk maksimal 300 baris
        const CHUNK_SIZE = 300;
        const pushChunk = async (key: string, items: unknown[]) => {
          for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE);
            const chunkPayload = { [key]: chunk };
            const { error: chunkErr } = await client.rpc("sync_bundle", { payload: chunkPayload });
            if (chunkErr) throw new Error(`Gagal push chunk ${key}: ${chunkErr.message}`);
          }
        };

        await pushChunk("pemasukan", mappedPemasukan);
        await pushChunk("pengeluaran", mappedPengeluaran);
        await pushChunk("transferDompet", mappedTransfer);
        await pushChunk("koreksiSaldoDompet", mappedKoreksi);
        await pushChunk("anggaranBulanan", mappedAnggaran);
        await pushChunk("pengingatTagihan", mappedPengingat);
      }

      // 4. Pull data cloud sejak cursor (dengan window overlap 3 menit)
      const savedCursor = await getNilaiPengaturanTeks(
        db,
        PENGATURAN_KEY.CLOUD_SYNC_CURSOR
      );

      let pullWindowStart = "1970-01-01T00:00:00.000Z";
      if (savedCursor && savedCursor.trim().length > 0 && !options?.forceFullResync) {
        const cursorMs = Date.parse(savedCursor.trim());
        if (Number.isFinite(cursorMs)) {
          // Overlap 3 menit
          pullWindowStart = new Date(cursorMs - 3 * 60 * 1000).toISOString();
        }
      }

      const [
        cloudDompet,
        cloudKatPem,
        cloudKatPeng,
        cloudPemasukan,
        cloudPengeluaran,
        cloudTransfer,
        cloudAnggaran,
        cloudKoreksi,
        cloudPengingat,
      ] = await Promise.all([
        fetchTableKeyset<CloudDompetPayload>("dompet", user.id, pullWindowStart),
        fetchTableKeyset<CloudKategoriPayload>("kategori_pemasukan", user.id, pullWindowStart),
        fetchTableKeyset<CloudKategoriPayload>("kategori_pengeluaran", user.id, pullWindowStart),
        fetchTableKeyset<CloudTransaksiPayload>("pemasukan", user.id, pullWindowStart),
        fetchTableKeyset<CloudTransaksiPayload>("pengeluaran", user.id, pullWindowStart),
        fetchTableKeyset<CloudTransferPayload>("transfer_dompet", user.id, pullWindowStart),
        fetchTableKeyset<CloudAnggaranPayload>("anggaran_bulanan", user.id, pullWindowStart),
        fetchTableKeyset<CloudKoreksiPayload>("koreksi_saldo_dompet", user.id, pullWindowStart),
        fetchTableKeyset<CloudPengingatPayload>("pengingat_tagihan", user.id, pullWindowStart),
      ]);

      const cloudBundle: BundleSinkronisasiCloud = {
        dompet: cloudDompet,
        kategoriPemasukan: cloudKatPem,
        kategoriPengeluaran: cloudKatPeng,
        pemasukan: cloudPemasukan,
        pengeluaran: cloudPengeluaran,
        transferDompet: cloudTransfer,
        anggaranBulanan: cloudAnggaran,
        koreksiSaldoDompet: cloudKoreksi,
        pengingatTagihan: cloudPengingat,
      };

      // Terapkan ke SQLite dengan LWW guard (tanpa menimpa saldo_saat_ini)
      await terapkanBundleCloudKeSQLite(db, cloudBundle);

      // 5. Hitung Ulang Saldo Semua Dompet
      await hitungUlangSaldoSemuaDompet(db);

      // 6. Simpan Cursor Baru dan Watermark
      let maxServerTimestamp = 0;
      const allRows = [
        ...cloudDompet,
        ...cloudKatPem,
        ...cloudKatPeng,
        ...cloudPemasukan,
        ...cloudPengeluaran,
        ...cloudTransfer,
        ...cloudAnggaran,
        ...cloudKoreksi,
        ...cloudPengingat,
      ];

      for (const row of allRows) {
        if (row.server_updated_at) {
          const ms = Date.parse(row.server_updated_at);
          if (Number.isFinite(ms) && ms > maxServerTimestamp) {
            maxServerTimestamp = ms;
          }
        }
      }

      if (maxServerTimestamp > 0) {
        await setNilaiPengaturanTeks(
          db,
          PENGATURAN_KEY.CLOUD_SYNC_CURSOR,
          new Date(maxServerTimestamp).toISOString()
        );
      }

      // Watermark push disimpan dari WAKTU MULAI sync
      await setNilaiPengaturanTeks(
        db,
        PENGATURAN_KEY.AKUN_TERAKHIR_SINKRONISASI_AT,
        syncStartTime
      );

      await setNilaiPengaturanTeks(
        db,
        PENGATURAN_KEY.AKUN_PERLU_SINKRONISASI_AWAL,
        "0"
      );

      const pulledSummary: RingkasanArahSync = {
        profilPengguna: 0,
        dompet: cloudDompet.length,
        kategoriPemasukan: cloudKatPem.length,
        kategoriPengeluaran: cloudKatPeng.length,
        pemasukan: cloudPemasukan.length,
        pengeluaran: cloudPengeluaran.length,
        transferDompet: cloudTransfer.length,
        anggaranBulanan: cloudAnggaran.length,
        koreksiSaldoDompet: cloudKoreksi.length,
        pengingatTagihan: cloudPengingat.length,
      };

      return {
        mode: pushWatermark === "1970-01-01T00:00:00.000Z" ? "awal" : "lanjutan",
        pushed: pushedSummary,
        pulled: pulledSummary,
        lastSyncAt: syncStartTime,
        conflictPolicy: "lww_server_updated_at",
      };
    } finally {
      activeSyncPromise = null;
    }
  })();

  return await activeSyncPromise;
}

