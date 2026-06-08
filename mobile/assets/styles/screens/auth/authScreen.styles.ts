import { StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from "@/constants";

export const authScreenStyles = StyleSheet.create({
  card: {
    marginTop: SPACING.sm,
  },

  statusCard: {
    marginTop: SPACING.sm,
  },

  noticeCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.brandPrimarySoft,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.brandPrimary,
  },

  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  cardText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textSecondary,
  },

  listItem: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    color: COLORS.textSecondary,
  },

  infoLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  infoValue: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textSecondary,
  },

  inlineNote: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.62)",
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    color: COLORS.textSecondary,
  },

  primaryButton: {
    marginTop: SPACING.lg,
  },

  secondaryButton: {
    marginTop: SPACING.md,
  },

  tertiaryButton: {
    marginTop: SPACING.md,
  },

  helperText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    color: COLORS.textTertiary,
    textAlign: "center",
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
});