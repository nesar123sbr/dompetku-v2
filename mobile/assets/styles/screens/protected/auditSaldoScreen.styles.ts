import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const auditSaldoScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
  },
  backButton: {
    marginBottom: SPACING.lg,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brandPrimary,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    marginRight: SPACING.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxl,
    lineHeight: LINE_HEIGHT.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: "rgba(255,255,255,0.86)",
  },

  infoCard: {
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brandPrimary,
  },
  infoTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  infoText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  sectionHeader: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  auditCard: {
    marginTop: SPACING.md,
  },
  auditTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  auditIconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    marginRight: SPACING.sm,
  },
  auditTitleWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  auditTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  auditDate: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textSecondary,
  },

  amountBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  amountRowStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  amountLabelStrong: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  amountValue: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  amountValueStrong: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  amountPositive: {
    color: COLORS.success,
  },
  amountNegative: {
    color: COLORS.danger,
  },
  amountNeutral: {
    color: COLORS.textPrimary,
  },
  noteText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  emptyCard: {
    marginTop: SPACING.md,
    alignItems: "center",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
  },
  emptyText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  loadMoreButton: {
    marginTop: SPACING.lg,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.semibold,
  },
});