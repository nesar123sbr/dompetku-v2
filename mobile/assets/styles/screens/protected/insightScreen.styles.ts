import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const insightScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
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

  notice: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  monthCard: {
    marginTop: SPACING.lg,
  },

  healthCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  healthSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  healthInfo: {
    backgroundColor: COLORS.brandPrimarySoft,
  },
  healthWarning: {
    backgroundColor: COLORS.warningSoft,
  },
  healthDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  healthNeutral: {
    backgroundColor: COLORS.surface,
  },
  healthTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  healthIcon: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    marginRight: SPACING.md,
  },
  healthTextWrap: {
    flex: 1,
  },
  healthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  healthTitle: {
    flex: 1,
    marginRight: SPACING.sm,
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
  },
  healthDescription: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
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

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  summaryCardHalf: {
    width: "48%",
    marginBottom: SPACING.md,
  },
  summaryCardFull: {
    width: "100%",
  },
  summaryIconIncome: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.successSoft,
  },
  summaryIconExpense: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerSoft,
  },
  summaryLabel: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  summaryValueIncome: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.income,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  summaryValueExpense: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.expense,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netValuePositive: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    color: COLORS.income,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  netValueNegative: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    color: COLORS.expense,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  netIconPositive: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.successSoft,
  },
  netIconNegative: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerSoft,
  },

  wideCard: {
    marginTop: SPACING.md,
  },
  barItem: {
    marginBottom: SPACING.lg,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  barValueIncome: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.income,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  barValueExpense: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.expense,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  barTrack: {
    overflow: "hidden",
    height: 12,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSoft,
  },
  barFillIncome: {
    height: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.income,
  },
  barFillExpense: {
    height: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.expense,
  },
  ratioBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
  },
  ratioTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  ratioText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  comparisonTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  comparisonGrid: {
    flexDirection: "row",
    marginTop: SPACING.md,
  },
  comparisonItem: {
    flex: 1,
    marginRight: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
  },
  comparisonLabel: {
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  comparisonValue: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.extrabold,
  },

  categoryItem: {
    marginBottom: SPACING.lg,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.sm,
  },
  categoryName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  categoryAmount: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  categoryTrack: {
    overflow: "hidden",
    height: 9,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSoft,
  },
  categoryFill: {
    height: "100%",
    borderRadius: RADIUS.pill,
  },

  budgetItem: {
    marginBottom: SPACING.lg,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  budgetTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  budgetName: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  budgetMeta: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  budgetTrack: {
    overflow: "hidden",
    height: 10,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSoft,
  },
  budgetFill: {
    height: "100%",
    borderRadius: RADIUS.pill,
  },
  progressFillSuccess: {
    backgroundColor: COLORS.income,
  },
  progressFillWarning: {
    backgroundColor: COLORS.warning,
  },
  progressFillDanger: {
    backgroundColor: COLORS.expense,
  },

  adviceCard: {
    marginTop: SPACING.md,
  },
  adviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  adviceIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brandPrimarySoft,
    marginRight: SPACING.sm,
  },
  adviceText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  exportCard: {
    marginTop: SPACING.md,
  },
  paragraph: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  exportRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  exportItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  exportItemLast: {
    flex: 1,
  },
  exportMessage: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.brandPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  emptyCard: {
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  emptyButton: {
    marginTop: SPACING.lg,
  },
});