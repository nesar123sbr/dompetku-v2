import type { Href } from "expo-router";

/**
 * Semua path route aplikasi.
 * Pakai Href supaya typed routes Expo Router bantu cek typo.
 */
export const ROUTES = {
  ROOT: "/" as Href,

  AUTH: {
    SIGN_IN: "/sign-in" as Href,
    SIGN_UP: "/sign-up" as Href,
    VERIFY_EMAIL: "/verify-email" as Href,
    FORGOT_PASSWORD: "/forgot-password" as Href,
    RESET_PASSWORD: "/reset-password" as Href,
  },

  PROTECTED: {
    DASHBOARD: "/dashboard" as Href,
    RIWAYAT: "/riwayat" as Href,
    TRANSAKSI: "/transaksi" as Href,
    WALLET: "/wallet" as Href,
    INSIGHT: "/insight" as Href,
    PROFIL: "/profil" as Href,
    PENGINGAT: "/pengingat" as Href,
    RIWAYAT_TRANSAKSI: "/riwayat-transaksi" as Href,
    EDIT_TRANSAKSI: "/edit-transaksi" as Href,
    ANGGARAN: "/anggaran" as Href,
    AUDIT_SALDO: "/audit-saldo" as Href,
  },
} as const;