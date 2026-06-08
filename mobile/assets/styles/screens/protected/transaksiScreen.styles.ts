import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const transaksiScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
    
  },

  heroCard: {
    overflow: "hidden",
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  heroIncome: {
    backgroundColor: COLORS.success,
  },
  heroExpense: {
    backgroundColor: COLORS.danger,
  },
  heroEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.82)",
    fontWeight: FONT_WEIGHT.bold,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: SPACING.xs,
    fontSize: 26,
    lineHeight: 34,
    color: COLORS.white,
    fontWeight: "800",
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: "rgba(255,255,255,0.88)",
  },

  notice: {
    marginBottom: SPACING.lg,
  },

  formCard: {
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sectionHelper: {
    marginTop: SPACING.xs,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textTertiary,
  },

  modeRow: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  modeItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  modeItemLast: {
    flex: 1,
  },

  primaryInputWrap: {
    marginTop: SPACING.lg,
  },
  amountInput: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  chipItem: {
    width: "48%",
    marginRight: "2%",
    marginBottom: SPACING.sm,
  },
  chipItemWide: {
    width: "100%",
    marginBottom: SPACING.sm,
  },

  inlineButton: {
    marginTop: SPACING.sm,
  },

  categoryFormWrap: {
    marginTop: SPACING.lg,
  },
  categoryActionRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  categoryActionItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  categoryActionItemLast: {
    flex: 1,
  },

  quickInfoCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickInfoTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  quickInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: SPACING.sm,
  },
  quickInfoLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  quickInfoValue: {
    flex: 1.3,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  detailToggleButton: {
    marginTop: SPACING.md,
  },
  detailCard: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  previewCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  previewLabel: {
    flex: 1,
    marginRight: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  warningWrap: {
    marginTop: SPACING.lg,
  },
  warningBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
  },
  warningText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.semibold,
  },
  successText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.semibold,
  },

  submitButton: {
    marginTop: SPACING.lg,
  },

  recentSection: {
    marginTop: SPACING.xxl,
  },
  recentTitle: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  recentSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentItemPressed: {
    opacity: 0.86,
  },
  recentIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  recentIconIncome: {
    backgroundColor: COLORS.successSoft,
  },
  recentIconExpense: {
    backgroundColor: COLORS.dangerSoft,
  },
  recentBody: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  recentItemTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  recentMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  recentEmergency: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.semibold,
  },
  recentAmountIncome: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.income,
    fontWeight: "800",
  },
  recentAmountExpense: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.expense,
    fontWeight: "800",
  },

  emptyCard: {
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
});