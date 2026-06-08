import type { AccessibilityActionEvent } from "react-native";
import { Pressable, Text } from "react-native";

import { optionChipStyles } from "@assets/styles/components/optionChip.styles";

type OptionChipProps = {
  label: string;
  helperText?: string;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function OptionChip({
  label,
  helperText,
  selected = false,
  onPress,
  onLongPress,
}: OptionChipProps) {
  const accessibilityLabel = helperText ? `${label}. ${helperText}` : label;

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === "longpress") {
      onLongPress?.();
    }
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        onLongPress
          ? "Ketuk untuk memilih. Tekan dan tahan untuk opsi lanjutan."
          : "Ketuk untuk memilih."
      }
      accessibilityActions={
        onLongPress
          ? [{ name: "longpress", label: "Opsi lanjutan" }]
          : undefined
      }
      onAccessibilityAction={handleAccessibilityAction}
      style={({ pressed }) => [
        optionChipStyles.chip,
        selected && optionChipStyles.chipSelected,
        pressed && optionChipStyles.chipPressed,
      ]}
    >
      <Text
        style={[
          optionChipStyles.label,
          selected && optionChipStyles.labelSelected,
        ]}
      >
        {label}
      </Text>

      {!!helperText ? (
        <Text
          style={[
            optionChipStyles.helper,
            selected && optionChipStyles.helperSelected,
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </Pressable>
  );
}