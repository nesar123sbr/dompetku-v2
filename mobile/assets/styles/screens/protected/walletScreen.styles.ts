import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const walletScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
    
  },

  notice: {
    marginBottom: SPACING.lg,
  },

  heroCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.brandPrimary,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  heroLabel: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  heroAmount: {
    marginTop: SPACING.xs,
    fontSize: 28,
    lineHeight: 36,
    color: COLORS.brandPrimary,
    fontWeight: "800",
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.md,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSoft,
  },
  heroMetaText: {
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
  },
  typeCard: {
    width: "48%",
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  typeLabel: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  typeValue: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },

  actionCard: {
    marginTop: SPACING.sm,
  },
  actionTitle: {
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  actionSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  actionItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  actionItemLast: {
    flex: 1,
  },

  focusPanel: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.brandPrimary,
    shadowColor: COLORS.brandPrimary,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },
  focusPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  focusPanelTitleWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  focusPanelTitle: {
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  focusPanelSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  closePanelButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSoft,
  },

  section: {
    marginTop: SPACING.xxl,
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

  formSectionTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  formSectionHelper: {
    marginTop: SPACING.xs,
    fontSize: 12,
    lineHeight: 16,
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
    marginRight: SPACING.md,
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

  manageHero: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  manageName: {
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  manageType: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  manageBalance: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: "800",
    color: COLORS.brandPrimary,
  },
  manageActionRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
  },
  manageActionItem: {
    flex: 1,
  },
  manageActionItemSpacing: {
    marginRight: SPACING.sm,
  },

  walletItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  walletItemSelected: {
    borderColor: COLORS.brandPrimary,
    backgroundColor: COLORS.brandPrimarySoft,
  },
  walletItemPressed: {
    opacity: 0.88,
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
    marginRight: SPACING.sm,
  },
  walletIconEmergency: {
    backgroundColor: COLORS.warningSoft,
  },
  walletBody: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  walletName: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  walletMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  walletRight: {
    alignItems: "flex-end",
  },
  walletBalance: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  walletActionText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.brandPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  emergencyCard: {
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.warningSoft,
    marginRight: SPACING.sm,
  },
  emergencyTextWrap: {
    flex: 1,
  },
  emergencyTitle: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  emergencyDescription: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FONT_WEIGHT.semibold,
  },

  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  metricLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  warningWrap: {
    marginTop: SPACING.lg,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.bold,
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

  emptyCard: {
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
});