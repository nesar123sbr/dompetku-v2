import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type TabItem = {
  label: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
};

export const TAB_META: Record<
  "dashboard" | "riwayat" | "transaksi" | "wallet" | "insight" | "profil",
  TabItem
> = {
  dashboard: {
    label: "Beranda",
    activeIcon: "home",
    inactiveIcon: "home-outline",
  },

  riwayat: {
    label: "Riwayat",
    activeIcon: "receipt",
    inactiveIcon: "receipt-outline",
  },

  transaksi: {
    label: "Catat",
    activeIcon: "add",
    inactiveIcon: "add",
  },

  wallet: {
    label: "Dompet",
    activeIcon: "wallet",
    inactiveIcon: "wallet-outline",
  },

  insight: {
    label: "Laporan",
    activeIcon: "bar-chart",
    inactiveIcon: "bar-chart-outline",
  },

  profil: {
    label: "Menu",
    activeIcon: "menu",
    inactiveIcon: "menu-outline",
  },
} as const;