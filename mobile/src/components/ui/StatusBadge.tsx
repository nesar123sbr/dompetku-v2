import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { statusBadgeStyles } from "@assets/styles/components/statusBadge.styles";

type StatusBadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
  style?: StyleProp<ViewStyle>;
};

export default function StatusBadge({
  label,
  variant = "neutral",
  style,
}: StatusBadgeProps) {
  const containerVariant =
    variant === "info"
      ? statusBadgeStyles.infoContainer
      : variant === "success"
      ? statusBadgeStyles.successContainer
      : variant === "warning"
      ? statusBadgeStyles.warningContainer
      : variant === "danger"
      ? statusBadgeStyles.dangerContainer
      : statusBadgeStyles.neutralContainer;

  const textVariant =
    variant === "info"
      ? statusBadgeStyles.infoText
      : variant === "success"
      ? statusBadgeStyles.successText
      : variant === "warning"
      ? statusBadgeStyles.warningText
      : variant === "danger"
      ? statusBadgeStyles.dangerText
      : statusBadgeStyles.neutralText;

  return (
    <View style={[statusBadgeStyles.container, containerVariant, style]}>
      <Text style={[statusBadgeStyles.label, textVariant]}>{label}</Text>
    </View>
  );
}