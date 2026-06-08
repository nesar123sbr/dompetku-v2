import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import StatusBadge from "@/components/ui/StatusBadge";
import type { DompetRow } from "@/database";
import { formatRupiah, formatTipeDompetLabel } from "@/utils";
import { walletCardStyles } from "@assets/styles/components/walletCard.styles";

type WalletCardProps = {
  item: DompetRow;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function getJenisVariant(jenis: DompetRow["jenis"]) {
  switch (jenis) {
    case "utama":
      return "info";
    case "tabungan":
      return "success";
    case "dana_darurat":
      return "warning";
    default:
      return "neutral";
  }
}

function getHelperText(tipe: DompetRow["tipe_dompet"]) {
  switch (tipe) {
    case "tunai":
      return "Uang cash yang kamu pegang langsung.";
    case "bank":
      return "Saldo rekening bank yang kamu pakai.";
    case "ewallet":
      return "Saldo dompet digital seperti DANA, OVO, GoPay, atau lainnya.";
    case "tabungan":
      return "Dana simpanan untuk tujuan tertentu.";
    case "dana_darurat":
      return "Cadangan khusus untuk keadaan mendesak.";
    default:
      return "Dompet tambahan.";
  }
}

export default function WalletCard({
  item,
  selected = false,
  onPress,
  style,
}: WalletCardProps) {
  const tipeLabel = formatTipeDompetLabel(item.tipe_dompet);
  const saldoLabel = formatRupiah(item.saldo_saat_ini);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{
        selected,
        disabled: !onPress,
      }}
      accessibilityLabel={`Dompet ${item.nama}. Jenis ${tipeLabel}. Saldo ${saldoLabel}.`}
      accessibilityHint={onPress ? "Ketuk untuk mengelola dompet ini." : undefined}
      style={({ pressed }) => [
        walletCardStyles.pressable,
        pressed && onPress && walletCardStyles.pressablePressed,
      ]}
    >
      <AppCard
        style={[
          walletCardStyles.card,
          selected && walletCardStyles.cardSelected,
          style,
        ]}
      >
        <View style={walletCardStyles.topRow}>
          <View style={walletCardStyles.titleWrap}>
            <Text style={walletCardStyles.name}>{item.nama}</Text>

            <View style={walletCardStyles.badgeRow}>
              <StatusBadge
                label={tipeLabel}
                variant={getJenisVariant(item.jenis)}
              />

              {item.is_default ? (
                <StatusBadge
                  label="Default"
                  variant="neutral"
                  style={walletCardStyles.badgeSpacing}
                />
              ) : null}
            </View>
          </View>

          <Text style={walletCardStyles.balance}>{saldoLabel}</Text>
        </View>

        <Text style={walletCardStyles.helper}>
          {getHelperText(item.tipe_dompet)}
        </Text>
      </AppCard>
    </Pressable>
  );
}