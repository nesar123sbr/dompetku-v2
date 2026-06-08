import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const appButtonStyles = StyleSheet.create({
  buttonBase: {
    minHeight: 56,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.brandPrimary,
  },
  secondaryButton: {
    backgroundColor: COLORS.brandPrimarySoft,
  },
  dangerButton: {
    backgroundColor: COLORS.dangerSoft,
  },
  pressedButton: {
    opacity: 0.92,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  secondaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brandPrimary,
  },
  dangerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.danger,
  },
});