import { memo, useCallback, useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  ROUTES,
  SPACING,
} from "@/constants";

type QuickActionSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type QuickActionItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  iconColor: string;
  backgroundColor: string;
  onPress: () => void;
};

const QuickActionItem = memo(function QuickActionItem({
  icon,
  title,
  description,
  iconColor,
  backgroundColor,
  onPress,
}: QuickActionItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [
        quickActionSheetStyles.actionItem,
        pressed && quickActionSheetStyles.actionItemPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          quickActionSheetStyles.actionIcon,
          {
            backgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      <View style={quickActionSheetStyles.actionTextWrap}>
        <Text style={quickActionSheetStyles.actionTitle}>{title}</Text>
        <Text style={quickActionSheetStyles.actionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={22} color={COLORS.textTertiary} />
    </Pressable>
  );
});

export default function QuickActionSheet({
  visible,
  onClose,
}: QuickActionSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavigateTimer = useCallback(() => {
    if (navigateTimerRef.current) {
      clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }
  }, []);

  const navigateTo = useCallback(
    (href: Href) => {
      clearNavigateTimer();
      onClose();

      navigateTimerRef.current = setTimeout(() => {
        router.push(href);
        navigateTimerRef.current = null;
      }, 80);
    },
    [clearNavigateTimer, onClose, router]
  );

  const handleIncomePress = useCallback(() => {
    navigateTo(
      `${ROUTES.PROTECTED.TRANSAKSI}?jenis=pemasukan&intentId=${Date.now()}` as Href
    );
  }, [navigateTo]);

  const handleExpensePress = useCallback(() => {
    navigateTo(
      `${ROUTES.PROTECTED.TRANSAKSI}?jenis=pengeluaran&intentId=${Date.now()}` as Href
    );
  }, [navigateTo]);

  const handleTransferPress = useCallback(() => {
    navigateTo(
      `${ROUTES.PROTECTED.WALLET}?action=transfer&intentId=${Date.now()}` as Href
    );
  }, [navigateTo]);

  useEffect(() => {
    return () => {
      clearNavigateTimer();
    };
  }, [clearNavigateTimer]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={quickActionSheetStyles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup pilihan catat"
          style={quickActionSheetStyles.backdrop}
          onPress={onClose}
        />

        <View
          style={[
            quickActionSheetStyles.sheet,
            {
              paddingBottom: Math.max(SPACING.xxl, insets.bottom + SPACING.xl),
            },
          ]}
        >
          <View style={quickActionSheetStyles.handle} />

          <View style={quickActionSheetStyles.headerRow}>
            <View style={quickActionSheetStyles.headerTextWrap}>
              <Text style={quickActionSheetStyles.title}>Mau catat apa?</Text>
              <Text style={quickActionSheetStyles.subtitle}>
                Pilih aksi cepat. Cocok untuk catat uang dalam beberapa detik.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={10}
              style={quickActionSheetStyles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <View style={quickActionSheetStyles.actionList}>
            <QuickActionItem
              icon="arrow-down"
              title="Uang masuk"
              description="Hasil jualan, gaji, bonus, komisi, atau uang kiriman."
              iconColor={COLORS.income}
              backgroundColor={COLORS.successSoft}
              onPress={handleIncomePress}
            />

            <QuickActionItem
              icon="arrow-up"
              title="Uang keluar"
              description="Belanja, bensin, makan, tagihan, stok, atau kebutuhan lain."
              iconColor={COLORS.expense}
              backgroundColor={COLORS.dangerSoft}
              onPress={handleExpensePress}
            />

            <QuickActionItem
              icon="swap-horizontal"
              title="Pindah dompet"
              description="Pindahkan uang antar cash, bank, e-wallet, tabungan, atau dana darurat."
              iconColor={COLORS.brandPrimary}
              backgroundColor={COLORS.brandPrimarySoft}
              onPress={handleTransferPress}
            />
          </View>

          <Text style={quickActionSheetStyles.helperText}>
            Detail seperti tanggal, dompet, dan catatan tetap bisa dilengkapi di
            halaman berikutnya.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const quickActionSheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 24, 39, 0.48)",
  },
  sheet: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -6,
    },
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    lineHeight: LINE_HEIGHT.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
  },
  actionList: {
    marginTop: SPACING.lg,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionItemPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.995 }],
  },
  actionIcon: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  actionTextWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  actionTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  actionDescription: {
    marginTop: 3,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  helperText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
});