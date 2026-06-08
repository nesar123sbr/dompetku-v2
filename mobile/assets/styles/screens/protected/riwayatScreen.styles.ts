import { StyleSheet } from "react-native";

import { COLORS, FONT_WEIGHT, RADIUS, SPACING } from "@/constants";

export const riwayatScreenStyles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingTop: SPACING.md,
  },

  listWrap: {
    flex: 1,
    minHeight: 320,
  },
  listContent: {
    paddingBottom: 0,
  },

  topButton: {
    marginBottom: SPACING.lg,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brandPrimary,
    overflow: "hidden",
  },
  heroIcon: {
    width: 52,
    height: 52,
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
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    color: COLORS.white,
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.84)",
  },

  searchCard: {
    minHeight: 56,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    minHeight: 56,
    marginLeft: SPACING.sm,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSoft,
  },

  filterCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
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
  filterTitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SPACING.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.brandPrimarySoft,
    borderColor: COLORS.brandPrimary,
  },
  filterChipIncome: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.income,
  },
  filterChipExpense: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.expense,
  },
  filterChipPressed: {
    opacity: 0.85,
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  filterChipTextActive: {
    color: COLORS.brandPrimary,
  },
  filterChipTextIncome: {
    color: COLORS.income,
  },
  filterChipTextExpense: {
    color: COLORS.expense,
  },

  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  periodChip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 40,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodChipActive: {
    backgroundColor: COLORS.brandPrimarySoft,
    borderColor: COLORS.brandPrimary,
  },
  periodChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  periodChipTextActive: {
    color: COLORS.brandPrimary,
  },
  customMonthWrap: {
    marginTop: SPACING.xs,
  },
  resetFilterButton: {
    marginTop: SPACING.sm,
  },

  summaryCard: {
    marginTop: SPACING.lg,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  summarySubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  summaryCountPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandPrimarySoft,
  },
  summaryCountText: {
    marginLeft: 4,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.brandPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  summaryGrid: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  summaryItem: {
    flex: 1,
    marginRight: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
  },
  summaryItemLast: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  summaryValueIncome: {
    marginTop: SPACING.xs,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.income,
  },
  summaryValueExpense: {
    marginTop: SPACING.xs,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.expense,
  },
  netSummary: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netSummaryPositive: {
    backgroundColor: COLORS.successSoft,
  },
  netSummaryNegative: {
    backgroundColor: COLORS.dangerSoft,
  },
  netLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  netValuePositive: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.income,
    fontWeight: "800",
  },
  netValueNegative: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.expense,
    fontWeight: "800",
  },

  errorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.semibold,
  },

  listHeader: {
    marginTop: 32,
    marginBottom: SPACING.xs,
  },
  listTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  listSubtitle: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  dateHeader: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },

  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
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
  transactionCardPressed: {
    opacity: 0.86,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  transactionIconIncome: {
    backgroundColor: COLORS.successSoft,
  },
  transactionIconExpense: {
    backgroundColor: COLORS.dangerSoft,
  },
  transactionBody: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  transactionMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  emergencyText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.semibold,
  },
  transactionAmountIncome: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.income,
    fontWeight: "800",
  },
  transactionAmountExpense: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.expense,
    fontWeight: "800",
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
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
  },
  emptyText: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: SPACING.lg,
    alignSelf: "stretch",
  },

  loadingMoreText: {
    marginVertical: SPACING.md,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  bottomSpacer: {
    height: 48,
  },
});