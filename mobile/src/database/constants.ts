export const DATABASE_NAME = "dompetku.db"; // TEPAT SAMA DENGAN SEBELUMNYA
export const DATABASE_VERSION = 8; // NAIK VERSI

export const MODE_PENGGUNAAN = {
  NONE: "none",
  GUEST: "guest",
  AUTHENTICATED: "authenticated",
} as const;

export const PENGATURAN_KEY = {
  MODE_PENGGUNAAN: "mode_penggunaan",

  AKUN_SUPABASE_USER_ID: "akun_supabase_user_id",
  AKUN_SUPABASE_EMAIL: "akun_supabase_email",
  AKUN_SUPABASE_NAMA: "akun_supabase_nama",
  AKUN_PERLU_SINKRONISASI_AWAL: "akun_perlu_sinkronisasi_awal",
  AKUN_TERAKHIR_SINKRONISASI_AT: "akun_terakhir_sinkronisasi_at",
} as const;