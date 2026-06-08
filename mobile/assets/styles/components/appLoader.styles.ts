import { StyleSheet } from "react-native";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants";

export const appLoaderStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  label: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
});