import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const profilScreenStyles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
    
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
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: COLORS.white,
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: "rgba(255,255,255,0.86)",
  },

  noticeWrap: {
    marginTop: SPACING.lg,
  },

  accountCard: {
    marginTop: SPACING.lg,
  },
  accountTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  accountAvatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brandPrimarySoft,
    marginRight: SPACING.sm,
  },
  accountInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  accountLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  accountName: {
    marginTop: 2,
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  accountEmail: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  accountDescription: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  accountButton: {
    marginTop: SPACING.lg,
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
    marginBottom: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  menuItem: {
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
  menuItemPressed: {
    opacity: 0.86,
  },
  menuItemDisabled: {
    opacity: 0.55,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandPrimarySoft,
    marginRight: SPACING.sm,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuTitle: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  menuDescription: {
    marginTop: 3,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  exportCard: {
    marginTop: SPACING.sm,
  },
  exportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  exportTextWrap: {
    flex: 1,
  },
  exportButtonRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },
  exportButtonItem: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  exportButtonItemLast: {
    flex: 1,
  },

  localCard: {
    marginTop: SPACING.sm,
  },
  localTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
  },
  localRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: SPACING.md,
  },
  localLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },
  localValue: {
    flex: 1.2,
    textAlign: "right",
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  guideCard: {
    marginTop: SPACING.sm,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  guideTextWrap: {
    flex: 1,
  },
  guideStep: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  aboutCard: {
    marginTop: SPACING.sm,
  },
  aboutText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  actionButton: {
    marginTop: SPACING.md,
  },
  secondaryActionButton: {
    marginTop: SPACING.sm,
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
});