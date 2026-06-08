import { Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import type { RiwayatTransaksiRow } from "@/database";
import { formatRupiah, formatTanggalIndonesiaPendek } from "@/utils";
import { recentTransactionItemStyles } from "@assets/styles/components/recentTransactionItem.styles";

type RecentTransactionItemProps = {
  item: RiwayatTransaksiRow;
  onEditPress?: (item: RiwayatTransaksiRow) => void;
  onDeletePress?: (item: RiwayatTransaksiRow) => void;
};

export default function RecentTransactionItem({
  item,
  onEditPress,
  onDeletePress,
}: RecentTransactionItemProps) {
  const isIncome = item.jenis_transaksi === "pemasukan";
  const amountLabel = `${isIncome ? "+" : "-"} ${formatRupiah(item.jumlah)}`;

  const metaParts = [
    formatTanggalIndonesiaPendek(item.tanggal_transaksi),
    item.nama_dompet || "Tanpa dompet",
    item.nama_kategori || "Tanpa kategori",
  ];

  return (
    <AppCard style={recentTransactionItemStyles.card}>
      <View style={recentTransactionItemStyles.topRow}>
        <Text style={recentTransactionItemStyles.title}>{item.judul}</Text>

        <Text
          style={
            isIncome
              ? recentTransactionItemStyles.amountIncome
              : recentTransactionItemStyles.amountExpense
          }
        >
          {amountLabel}
        </Text>
      </View>

      <Text style={recentTransactionItemStyles.meta}>
        {metaParts.join(" • ")}
      </Text>

      {item.pakai_dana_darurat ? (
        <Text style={recentTransactionItemStyles.extraInfo}>
          Pengeluaran ini memakai dana darurat
        </Text>
      ) : null}

      {onEditPress || onDeletePress ? (
        <View style={recentTransactionItemStyles.actionRow}>
          {onEditPress ? (
            <View
              style={[
                recentTransactionItemStyles.actionItem,
                onDeletePress && recentTransactionItemStyles.actionItemSpacing,
              ]}
            >
              <AppButton
                title="Ubah"
                variant="secondary"
                onPress={() => onEditPress(item)}
              />
            </View>
          ) : null}

          {onDeletePress ? (
            <View style={recentTransactionItemStyles.actionItem}>
              <AppButton
                title="Hapus"
                variant="danger"
                onPress={() => onDeletePress(item)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}