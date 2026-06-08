import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const appTextFieldStyles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  label: {
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  inputWrap: {
    position: "relative",
  },
  input: {
    minHeight: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.brandPrimary,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    backgroundColor: COLORS.surfaceSoft,
    opacity: 0.72,
  },
  inputMultiline: {
    minHeight: 108,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    textAlignVertical: "top",
  },
  inputWithPasswordToggle: {
    paddingRight: 56,
  },
  passwordToggle: {
    position: "absolute",
    right: SPACING.sm,
    top: 7,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  helperText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
  },
  errorText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.danger,
  },

  pressableInput: {
    justifyContent: "center",
  },
  inputText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textTertiary,
  },
  pickerDoneButton: {
    marginTop: SPACING.sm,
    alignSelf: "flex-end",
  },
});