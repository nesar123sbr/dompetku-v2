import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const editTransaksiScreenStyles = StyleSheet.create({
  topButton: {
    marginBottom: SPACING.lg,
  },
  card: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sectionHelper: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textTertiary,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  chipItem: {
    width: "48%",
    marginRight: "2%",
    marginBottom: SPACING.sm,
  },
  previewCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  previewLabel: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  previewNote: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.semibold,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.danger,
    fontWeight: FONT_WEIGHT.semibold,
  },
  successText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.semibold,
  },
  button: {
    marginTop: SPACING.lg,
  },
});