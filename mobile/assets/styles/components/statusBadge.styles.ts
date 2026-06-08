import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const statusBadgeStyles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },

  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },

  neutralContainer: {
    backgroundColor: COLORS.surfaceSoft,
    borderColor: COLORS.border,
  },
  neutralText: {
    color: COLORS.textSecondary,
  },

  infoContainer: {
    backgroundColor: COLORS.brandPrimarySoft,
    borderColor: COLORS.brandPrimary,
  },
  infoText: {
    color: COLORS.brandPrimaryDark,
  },

  successContainer: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.success,
  },
  successText: {
    color: COLORS.success,
  },

  warningContainer: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
  },
  warningText: {
    color: COLORS.warning,
  },

  dangerContainer: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
  },
  dangerText: {
    color: COLORS.danger,
  },
});