import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const optionChipStyles = StyleSheet.create({
  chip: {
    minHeight: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: COLORS.brandPrimary,
    backgroundColor: COLORS.brandPrimarySoft,
  },
  chipPressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  labelSelected: {
    color: COLORS.brandPrimary,
  },
  helper: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
  },
  helperSelected: {
    color: COLORS.brandPrimaryDark,
  },
});