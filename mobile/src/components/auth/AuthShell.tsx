import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  View,
  type KeyboardEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeading from "@/components/ui/AppHeading";
import AppScreen from "@/components/ui/AppScreen";
import BrandLogo from "@/components/brand/BrandLogo";
import { SPACING } from "@/constants";
import { brandLogoStyles } from "@assets/styles/components/brandLogo.styles";
import { authShellStyles } from "@assets/styles/components/authShell.styles";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  children,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const keyboardHideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    function handleKeyboardShow(event: KeyboardEvent) {
      const height = event.endCoordinates?.height ?? 0;

      setKeyboardHeight(Math.max(height - insets.bottom, 0));
    }

    function handleKeyboardHide() {
      setKeyboardHeight(0);
    }

    const showSubscription = Keyboard.addListener(
      keyboardShowEvent,
      handleKeyboardShow
    );

    const hideSubscription = Keyboard.addListener(
      keyboardHideEvent,
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const keyboardBottomPadding =
    keyboardHeight > 0 ? keyboardHeight + SPACING.giant : SPACING.xxxl;

  return (
    <KeyboardAvoidingView
      style={authShellStyles.keyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={authShellStyles.keyboardDismissArea}>
          <AppScreen
            scrollable
            safeTop
            withFloatingTabSpace={false}
            keyboardAware={false} // hapus kalo muncul problem, nih patch kecil
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentContainerStyle={[
              authShellStyles.content,
              { paddingBottom: keyboardBottomPadding },
            ]}
          >
            <View style={brandLogoStyles.authWrapper}>
              <BrandLogo variant="auth" />
            </View>

            <AppHeading title={title} subtitle={subtitle} />

            <View style={authShellStyles.body}>{children}</View>
          </AppScreen>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}