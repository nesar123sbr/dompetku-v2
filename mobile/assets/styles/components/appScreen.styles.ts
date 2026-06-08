import { StyleSheet } from "react-native";
import { COLORS, SPACING } from "@/constants";

export const appScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxxl,
  },
  centered: {
    justifyContent: "center",
  },
});