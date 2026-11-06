import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";
import { syncCloudNow } from "./sync";

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

export async function sinkronisasiAwalDataLokalKeSupabase(
  db: SQLiteDatabase,
  user: User
): Promise<SinkronisasiAwalSummary> {
  const result = await syncCloudNow(db, user, { forceFullResync: true, isManual: true });
  return {
    profilPengguna: result.pushed.profilPengguna,
    dompet: result.pushed.dompet,
    kategoriPemasukan: result.pushed.kategoriPemasukan,
    kategoriPengeluaran: result.pushed.kategoriPengeluaran,
    pemasukan: result.pushed.pemasukan,
    pengeluaran: result.pushed.pengeluaran,
    pengingatTagihan: result.pushed.pengingatTagihan,
    transferDompet: result.pushed.transferDompet,
  };
}
