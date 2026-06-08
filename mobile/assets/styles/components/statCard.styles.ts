import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  SPACING,
} from "@/constants";

export const statCardStyles = StyleSheet.create({
  card: {
    minHeight: 116,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  value: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.lg, // 👈 Diubah dari xl menjadi lg
    lineHeight: LINE_HEIGHT.lg, // 👈 Diubah dari xl menjadi lg
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
  },
  helper: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
  },
});