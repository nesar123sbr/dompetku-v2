import { Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import StatusBadge from "@/components/ui/StatusBadge";
import type { PengingatTagihanListItem } from "@/database";
import {
  formatJamMenit,
  formatLabelPengulangan,
  formatRupiah,
  formatTanggalIndonesiaPendek,
  getTodayDateInput,
} from "@/utils";
import { reminderCardStyles } from "@assets/styles/components/reminderCard.styles";

type ReminderCardProps = {
  item: PengingatTagihanListItem;
  compact?: boolean;
};

function getJatuhTempoBadge(tanggalJatuhTempo: string) {
  const today = getTodayDateInput();

  if (tanggalJatuhTempo < today) {
    return {
      label: "Terlambat",
      variant: "danger" as const,
    };
  }

  if (tanggalJatuhTempo === today) {
    return {
      label: "Hari ini",
      variant: "warning" as const,
    };
  }

  return {
    label: "Mendatang",
    variant: "info" as const,
  };
}

export default function ReminderCard({
  item,
  compact = false,
}: ReminderCardProps) {
  const dueBadge = getJatuhTempoBadge(item.tanggal_jatuh_tempo);

  const notificationBadge = item.notifikasi_diaktifkan
    ? item.lokal_notifikasi_id
      ? { label: "Notifikasi aktif", variant: "success" as const }
      : { label: "Notif belum terjadwal", variant: "warning" as const }
    : { label: "Notif mati", variant: "neutral" as const };

  return (
    <AppCard style={reminderCardStyles.card}>
      <View style={reminderCardStyles.topRow}>
        <View style={reminderCardStyles.titleWrap}>
          <Text style={reminderCardStyles.title}>{item.judul}</Text>

          <View style={reminderCardStyles.badgeRow}>
            <StatusBadge
              label={dueBadge.label}
              variant={dueBadge.variant}
            />

            <StatusBadge
              label={formatLabelPengulangan(item.pengulangan)}
              variant="neutral"
              style={reminderCardStyles.badgeSpacing}
            />

            <StatusBadge
              label={notificationBadge.label}
              variant={notificationBadge.variant}
              style={reminderCardStyles.badgeSpacing}
            />
          </View>
        </View>

        <Text style={reminderCardStyles.amount}>
          {item.nominal > 0 ? formatRupiah(item.nominal) : "-"}
        </Text>
      </View>

      <Text style={reminderCardStyles.meta}>
        {formatTanggalIndonesiaPendek(item.tanggal_jatuh_tempo)} •{" "}
        {formatJamMenit(item.jam_pengingat)}
        {item.nama_dompet ? ` • ${item.nama_dompet}` : ""}
      </Text>

      {item.catatan ? (
        <Text
          numberOfLines={compact ? 2 : undefined}
          style={reminderCardStyles.note}
        >
          Catatan: {item.catatan}
        </Text>
      ) : null}
    </AppCard>
  );
}