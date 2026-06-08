import { StyleSheet } from "react-native";
import { SPACING } from "@/constants";

export const brandLogoStyles = StyleSheet.create({
  authWrapper: {
    alignItems: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },

  authImage: {
    width: 104,
    aspectRatio: 1,
  },

  headerImage: {
    width: 156,
    height: 44,
  },
});