import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { COLORS } from "@/constants";
import { appTextFieldStyles } from "@assets/styles/components/appTextField.styles";

type AppTextFieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  showPasswordToggle?: boolean;
};

export default function AppTextField({
  label,
  helperText,
  errorText,
  containerStyle,
  inputStyle,
  multiline = false,
  secureTextEntry = false,
  showPasswordToggle,
  onFocus,
  onBlur,
  editable = true,
  ...textInputProps
}: AppTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldShowPasswordToggle = Boolean(showPasswordToggle ?? secureTextEntry);
  const shouldSecureTextEntry = secureTextEntry ? !isPasswordVisible : false;

  const handleFocus: NonNullable<TextInputProps["onFocus"]> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: NonNullable<TextInputProps["onBlur"]> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[appTextFieldStyles.container, containerStyle]}>
      <Text style={appTextFieldStyles.label}>{label}</Text>

      <View style={appTextFieldStyles.inputWrap}>
        <TextInput
          {...textInputProps}
          editable={editable}
          multiline={multiline}
          secureTextEntry={shouldSecureTextEntry}
          placeholderTextColor={COLORS.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            appTextFieldStyles.input,
            isFocused && appTextFieldStyles.inputFocused,
            !!errorText && appTextFieldStyles.inputError,
            !editable && appTextFieldStyles.inputDisabled,
            multiline && appTextFieldStyles.inputMultiline,
            shouldShowPasswordToggle && appTextFieldStyles.inputWithPasswordToggle,
            inputStyle,
          ]}
        />

        {shouldShowPasswordToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"
            }
            hitSlop={10}
            style={appTextFieldStyles.passwordToggle}
            onPress={() => setIsPasswordVisible((current) => !current)}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={isFocused ? COLORS.brandPrimary : COLORS.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>

      {!!helperText && !errorText ? (
        <Text style={appTextFieldStyles.helperText}>{helperText}</Text>
      ) : null}

      {!!errorText ? (
        <Text style={appTextFieldStyles.errorText}>{errorText}</Text>
      ) : null}
    </View>
  );
}