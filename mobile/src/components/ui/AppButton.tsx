import { Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { appButtonStyles } from "@assets/styles/components/appButton.styles";

type AppButtonVariant = "primary" | "secondary" | "danger";

type AppButtonProps = PressableProps & {
  title: string;
  variant?: AppButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function AppButton({
  title,
  variant = "primary",
  style,
  textStyle,
  disabled = false,
  ...pressableProps
}: AppButtonProps) {
  const buttonVariantStyle =
    variant === "secondary"
      ? appButtonStyles.secondaryButton
      : variant === "danger"
      ? appButtonStyles.dangerButton
      : appButtonStyles.primaryButton;

  const textVariantStyle =
    variant === "secondary"
      ? appButtonStyles.secondaryText
      : variant === "danger"
      ? appButtonStyles.dangerText
      : appButtonStyles.primaryText;

  return (
    <Pressable
      disabled={disabled}
      {...pressableProps}
      style={({ pressed }) => [
        appButtonStyles.buttonBase,
        buttonVariantStyle,
        disabled && appButtonStyles.disabledButton,
        pressed && !disabled && appButtonStyles.pressedButton,
        style,
      ]}
    >
      <Text style={[textVariantStyle, textStyle]}>{title}</Text>
    </Pressable>
  );
}