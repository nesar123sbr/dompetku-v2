import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const dashboardScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
    
  },

  heroCard: {
    position: "relative",
    overflow: "hidden",
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brandPrimary,
    minHeight: 214,
  },
  heroDecorOne: {
    position: "absolute",
    top: -50,
    right: -36,
    width: 150,
    height: 150,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroDecorTwo: {
    position: "absolute",
    bottom: -70,
    left: -48,
    width: 180,
    height: 180,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTitleWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  heroAppName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.white,
  },
  heroGreeting: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroLabel: {
    marginTop: SPACING.xl,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },
  heroAmount: {
    marginTop: SPACING.xs,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
    color: COLORS.white,
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
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroMetaText: {
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.white,
    fontWeight: "600",
  },

  banner: {
    marginTop: SPACING.lg,
  },

  statusCard: {
    flexDirection: "row",
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  statusSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  statusInfo: {
    backgroundColor: COLORS.brandPrimarySoft,
  },
  statusWarning: {
    backgroundColor: COLORS.warningSoft,
  },
  statusDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  statusTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  statusTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  statusDescription: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  statusSuccessText: {
    color: COLORS.success,
  },
  statusInfoText: {
    color: COLORS.brandPrimary,
  },
  statusWarningText: {
    color: COLORS.warning,
  },
  statusDangerText: {
    color: COLORS.danger,
  },

  sectionHeader: {
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

  monthGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  monthCard: {
    width: "48%",
  },
  monthCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.xs,
  },
  incomeIcon: {
    backgroundColor: COLORS.successSoft,
  },
  expenseIcon: {
    backgroundColor: COLORS.dangerSoft,
  },
  monthLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  monthValueIncome: {
    marginTop: SPACING.sm,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.income,
  },
  monthValueExpense: {
    marginTop: SPACING.sm,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.expense,
  },
  monthHelper: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textTertiary,
  },

  netCard: {
    marginTop: SPACING.md,
  },
  netTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  netLabel: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  netValuePositive: {
    marginTop: SPACING.xs,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: COLORS.income,
  },
  netValueNegative: {
    marginTop: SPACING.xs,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: COLORS.expense,
  },
  netIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  netIconPositive: {
    backgroundColor: COLORS.successSoft,
  },
  netIconNegative: {
    backgroundColor: COLORS.dangerSoft,
  },
  netHelper: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  safeMoneyCard: {
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  safeMoneyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  safeMoneyIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  safeMoneyTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  safeMoneyTitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.bold,
  },
  safeMoneySubtitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  safeMoneyAmount: {
    marginTop: SPACING.md,
    fontSize: 24,
    lineHeight: 32,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  safeMoneyHelper: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  quickActionCard: {
    marginTop: SPACING.lg,
  },
  quickActionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  quickActionSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  quickActionRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  quickActionItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  quickActionItemLast: {
    flex: 1,
  },

  shortcutGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
  },
  shortcutItem: {
    width: "23%",
    alignItems: "center",
  },
  shortcutIconPrimary: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  shortcutIconSuccess: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.successSoft,
  },
  shortcutIconWarning: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.warningSoft,
  },
  shortcutIconInfo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
  },
  shortcutLabel: {
    marginTop: SPACING.xs,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },

  warningCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  warningTopRow: {
    flexDirection: "row",
  },
  warningTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningButton: {
    marginTop: SPACING.md,
  },

  reminderList: {
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

  ctaButton: {
    marginTop: SPACING.lg,
  },

  skeletonBox: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  skeletonBoxOnHero: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: RADIUS.sm,
  },
  skeletonLogo: {
    width: 100,
    height: 20,
    marginBottom: 8,
  },
  skeletonGreeting: {
    width: 150,
    height: 16,
    marginBottom: SPACING.xl,
  },
  skeletonHeroLabel: {
    width: 120,
    height: 16,
    marginBottom: SPACING.xs,
  },
  skeletonHeroAmount: {
    width: 210,
    height: 42,
    marginBottom: SPACING.md,
  },
  skeletonPillRow: {
    flexDirection: "row",
    marginTop: SPACING.xs,
  },
  skeletonPillSmall: {
    width: 104,
    height: 26,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.sm,
  },
  skeletonPillLarge: {
    width: 150,
    height: 26,
    borderRadius: RADIUS.pill,
  },
  skeletonStatusCard: {
    marginTop: SPACING.lg,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.border,
  },
  skeletonSectionHeader: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  skeletonSectionTitle: {
    width: 160,
    height: 24,
    marginBottom: SPACING.xs,
  },
  skeletonSectionSubtitle: {
    width: 260,
    height: 16,
  },
  skeletonMonthCard: {
    width: "48%",
    height: 104,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.border,
  },
  skeletonWideCard: {
    marginTop: SPACING.md,
    height: 112,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.border,
  },
});