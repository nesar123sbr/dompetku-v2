import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const pengingatScreenStyles = StyleSheet.create({
  topButton: {
    marginBottom: SPACING.lg,
  },

  notice: {
    marginBottom: SPACING.lg,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  statItem: {
    width: "48%",
    marginBottom: SPACING.md,
  },

  section: {
    marginTop: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  permissionCard: {
    marginTop: SPACING.md,
  },
  permissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  permissionTitle: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  permissionText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
  },
  actionItem: {
    width: "48%",
  },

  formCard: {
    marginTop: SPACING.md,
  },
  formSectionTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  formSectionHelper: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
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
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  warningWrap: {
    marginTop: SPACING.lg,
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

  listItemWrap: {
    marginTop: SPACING.md,
  },

  emptyCard: {
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
    paymentModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  paymentModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 24, 39, 0.48)",
  },
  paymentSheet: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
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
  paymentHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  paymentHeaderTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  paymentTitle: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  paymentSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  paymentCloseButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
  },
  paymentCloseText: {
    fontSize: 28,
    lineHeight: 30,
    color: COLORS.textSecondary,
  },
  paymentSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.brandPrimarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentSummaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  paymentSummaryTitle: {
    marginTop: 2,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentSummaryAmount: {
    marginLeft: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.expense,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentSectionTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentWalletList: {
    marginTop: SPACING.sm,
  },
  paymentWalletItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentWalletItemActive: {
    borderColor: COLORS.brandPrimary,
    backgroundColor: COLORS.brandPrimarySoft,
  },
  paymentWalletItemDanger: {
    borderColor: COLORS.dangerSoft,
  },
  paymentWalletItemPressed: {
    opacity: 0.85,
  },
  paymentWalletTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  paymentWalletName: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentWalletMeta: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
  },
  paymentWalletRight: {
    alignItems: "flex-end",
  },
  paymentWalletBalance: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentWalletBalanceDanger: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentWalletWarning: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
  },
  paymentErrorText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.semibold,
  },
  paymentSubmitButton: {
    marginTop: SPACING.lg,
  },
});