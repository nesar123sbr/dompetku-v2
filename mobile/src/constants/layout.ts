import { Platform } from "react-native";

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  giant: 56,
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const SHADOWS = {
  card: Platform.select({
    ios: {
      shadowColor: "#18213C",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
} as const;

/**
 * Bottom tab DompetKu.
 *
 * Catatan Android:
 * - Gesture navigation biasanya bottomInset kecil.
 * - 3-button navigation biasanya bottomInset besar.
 * - Kalau Android selalu bottom 0, tab bar bisa ketimpa tombol Back/Home/Recent.
 * - Kalau pakai bottomInset mentah, tab bar bisa terlalu melayang.
 *
 * Solusi:
 * - Gesture nav: tab bar tetap nempel bawah.
 * - 3-button nav: tab bar dinaikkan secukupnya supaya tepat di atas tombol sistem.
 */
export const FLOATING_TAB_BAR = {
  minHeight: 66,
  maxHeight: 72,

  minFabSize: 58,
  maxFabSize: 66,

  minHorizontalMargin: 0,
  maxHorizontalMargin: 0,

  androidGestureBottomGap: 0,
  androidThreeButtonInsetThreshold: 28,
  androidThreeButtonBottomOffset: 6,
  androidThreeButtonMaxBottomGap: 42,

  iosMaxBottomGap: 10,

  minContentGap: 14,
  maxContentGap: 24,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getScreenAspectRatio(screenWidth: number, screenHeight: number) {
  if (screenWidth <= 0) {
    return 2;
  }

  return screenHeight / screenWidth;
}

export function getFloatingTabBarHeight(
  screenWidth: number,
  screenHeight: number
) {
  const aspectRatio = getScreenAspectRatio(screenWidth, screenHeight);

  const rawHeight =
    aspectRatio > 2.15
      ? screenHeight * 0.06
      : aspectRatio < 1.85
      ? screenHeight * 0.066
      : screenHeight * 0.063;

  return Math.round(
    clamp(rawHeight, FLOATING_TAB_BAR.minHeight, FLOATING_TAB_BAR.maxHeight)
  );
}

export function getFloatingTabHorizontalMargin(_screenWidth: number) {
  return 0;
}

export function getFloatingTabBarBottom(bottomInset: number) {
  if (Platform.OS === "android") {
    const isThreeButtonNavigation =
      bottomInset >= FLOATING_TAB_BAR.androidThreeButtonInsetThreshold;

    if (!isThreeButtonNavigation) {
      return FLOATING_TAB_BAR.androidGestureBottomGap;
    }

    return Math.round(
      clamp(
        bottomInset - FLOATING_TAB_BAR.androidThreeButtonBottomOffset,
        0,
        FLOATING_TAB_BAR.androidThreeButtonMaxBottomGap
      )
    );
  }

  return Math.round(clamp(bottomInset, 0, FLOATING_TAB_BAR.iosMaxBottomGap));
}

export function getFloatingTabFabSize(
  screenWidth: number,
  screenHeight: number
) {
  const aspectRatio = getScreenAspectRatio(screenWidth, screenHeight);

  const rawSize =
    aspectRatio > 2.15 ? screenWidth * 0.15 : screenWidth * 0.154;

  return Math.round(
    clamp(rawSize, FLOATING_TAB_BAR.minFabSize, FLOATING_TAB_BAR.maxFabSize)
  );
}

export function getFloatingTabContentPadding(
  bottomInset: number,
  screenWidth: number,
  screenHeight: number
) {
  const tabHeight = getFloatingTabBarHeight(screenWidth, screenHeight);
  const tabBottom = getFloatingTabBarBottom(bottomInset);
  const aspectRatio = getScreenAspectRatio(screenWidth, screenHeight);

  const rawContentGap =
    aspectRatio > 2.15 ? screenHeight * 0.024 : screenHeight * 0.02;

  const contentGap = clamp(
    rawContentGap,
    FLOATING_TAB_BAR.minContentGap,
    FLOATING_TAB_BAR.maxContentGap
  );

  return Math.round(tabHeight + tabBottom + contentGap);
}