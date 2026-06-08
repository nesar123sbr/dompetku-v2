import { Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import StatusBadge from "@/components/ui/StatusBadge";
import type { RiwayatTransferRow } from "@/database";
import {
  formatRupiah,
  formatTanggalIndonesiaPendek,
} from "@/utils";
import { transferHistoryItemStyles } from "@assets/styles/components/transferHistoryItem.styles";

type TransferHistoryItemProps = {
  item: RiwayatTransferRow;
};

export default function TransferHistoryItem({
  item,
}: TransferHistoryItemProps) {
  const title = `${item.nama_dompet_sumber || "Tanpa sumber"} → ${
    item.nama_dompet_tujuan || "Tanpa tujuan"
  }`;

  return (
    <AppCard style={transferHistoryItemStyles.card}>
      <View style={transferHistoryItemStyles.topRow}>
        <Text style={transferHistoryItemStyles.title}>{title}</Text>
        <Text style={transferHistoryItemStyles.amount}>
          {formatRupiah(item.jumlah)}
        </Text>
      </View>

      <Text style={transferHistoryItemStyles.meta}>
        {formatTanggalIndonesiaPendek(item.tanggal_transfer)} • Transfer antar dompet
      </Text>

      {!!item.catatan ? (
        <Text style={transferHistoryItemStyles.note}>
          Catatan: {item.catatan}
        </Text>
      ) : null}

      {item.sumber_dana_darurat ? (
        <StatusBadge
          label="Dari dana darurat"
          variant="warning"
          style={transferHistoryItemStyles.badge}
        />
      ) : null}
    </AppCard>
  );
}