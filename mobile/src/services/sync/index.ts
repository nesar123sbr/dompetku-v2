import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";
import { executeSync } from "./engine";
import type { RingkasanSinkronisasiDuaArah, SyncOptions } from "./types";

export * from "./types";
export * from "./mapper";
export * from "./repository";
export * from "./engine";

/**
 * Antarmuka standar sinkronisasi cloud dua arah (drop-in replacement).
 */
export async function syncCloudNow(
  db: SQLiteDatabase,
  user: User,
  options?: SyncOptions
): Promise<RingkasanSinkronisasiDuaArah> {
  return executeSync(db, user, options);
}

export const sinkronisasiCloudSekarang = syncCloudNow;

