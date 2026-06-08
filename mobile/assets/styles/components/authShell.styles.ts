import { StyleSheet } from "react-native";
import { SPACING } from "@/constants";

export const authShellStyles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },

  keyboardDismissArea: {
    flex: 1,
  },

  content: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  logoWrap: {
    alignItems: "center",
  },

  body: {
    marginTop: SPACING.sm,
  },
});