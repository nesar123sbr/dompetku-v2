import { StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING } from "@/constants";

export const appCardStyles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
});