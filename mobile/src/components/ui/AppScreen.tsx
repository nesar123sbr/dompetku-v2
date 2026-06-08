import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type KeyboardEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getFloatingTabContentPadding, SPACING } from "@/constants";
import { appScreenStyles } from "@assets/styles/components/appScreen.styles";

type KeyboardAvoidingBehavior = "height" | "position" | "padding";

type AppScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  centered?: boolean;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  withFloatingTabSpace?: boolean;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  keyboardDismissMode?: ScrollViewProps["keyboardDismissMode"];
  automaticallyAdjustKeyboardInsets?: ScrollViewProps["automaticallyAdjustKeyboardInsets"];
  keyboardAware?: boolean;
  keyboardExtraOffset?: number;
  keyboardVerticalOffset?: number;
  keyboardAvoidingBehavior?: KeyboardAvoidingBehavior;
};

function getNumericPaddingBottom(style: StyleProp<ViewStyle>) {
  const flattened = StyleSheet.flatten(style);

  if (!flattened) {
    return 0;
  }

  const paddingBottom = flattened.paddingBottom;

  return typeof paddingBottom === "number" ? paddingBottom : 0;
}

export default function AppScreen({
  children,
  scrollable = false,
  centered = false,
  safeTop = false,
  style,
  contentContainerStyle,
  withFloatingTabSpace = true,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag",
  automaticallyAdjustKeyboardInsets = false,
  keyboardAware = scrollable,
  keyboardExtraOffset = SPACING.giant,
  keyboardVerticalOffset = 0,
  keyboardAvoidingBehavior = Platform.OS === "ios" ? "padding" : "height",
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const shouldUseKeyboardAwareScroll = scrollable && keyboardAware;

  useEffect(() => {
    if (!shouldUseKeyboardAwareScroll) {
      setKeyboardHeight(0);
      return;
    }

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
  }, [insets.bottom, shouldUseKeyboardAwareScroll]);

  const edges = safeTop
    ? (["top", "left", "right"] as const)
    : (["left", "right"] as const);

  const existingPaddingBottom = getNumericPaddingBottom(contentContainerStyle);

  const responsiveBottomPadding = getFloatingTabContentPadding(
    insets.bottom,
    width,
    height
  );

  const baseBottomPadding =
    scrollable && withFloatingTabSpace
      ? Math.max(existingPaddingBottom, responsiveBottomPadding)
      : existingPaddingBottom;

  const finalBottomPadding =
    shouldUseKeyboardAwareScroll && keyboardHeight > 0
      ? Math.max(baseBottomPadding, keyboardHeight + keyboardExtraOffset)
      : baseBottomPadding;

  if (scrollable) {
    const scrollableScreen = (
      <SafeAreaView edges={edges} style={[appScreenStyles.screen, style]}>
        <ScrollView
          style={appScreenStyles.screen}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
          automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
          contentInsetAdjustmentBehavior={
            Platform.OS === "ios" ? "automatic" : undefined
          }
          contentContainerStyle={[
            appScreenStyles.content,
            centered && appScreenStyles.centered,
            contentContainerStyle,
            { paddingBottom: finalBottomPadding },
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );

    if (shouldUseKeyboardAwareScroll) {
      return (
        <KeyboardAvoidingView
          style={appScreenStyles.screen}
          behavior={keyboardAvoidingBehavior}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {scrollableScreen}
        </KeyboardAvoidingView>
      );
    }

    return scrollableScreen;
  }

  return (
    <SafeAreaView edges={edges} style={[appScreenStyles.screen, style]}>
      <View
        style={[
          appScreenStyles.content,
          centered && appScreenStyles.centered,
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}