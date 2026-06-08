import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  getFloatingTabBarBottom,
  getFloatingTabBarHeight,
  getFloatingTabHorizontalMargin,
} from "@/constants";

export function getTabScreenOptions(
  bottomInset: number,
  screenWidth: number,
  screenHeight: number
) {
  const tabHeight = getFloatingTabBarHeight(screenWidth, screenHeight);
  const tabBottom = getFloatingTabBarBottom(bottomInset);
  const horizontalMargin = getFloatingTabHorizontalMargin(screenWidth);
  const isCompactWidth = screenWidth < 380;

  return {
    headerStyle: {
      backgroundColor: COLORS.background,
      height: 86,
    },
    headerShadowVisible: false,
    headerTitleAlign: "left",
    headerTitleContainerStyle: {
      left: 20,
      right: 20,
    },

    tabBarStyle: {
      position: "absolute",
      left: horizontalMargin,
      right: horizontalMargin,
      bottom: tabBottom,
      height: tabHeight,
      paddingTop: 7,
      paddingBottom: 5,
      borderTopWidth: 0,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: COLORS.surface,
      overflow: "visible",
      elevation: 14,
      shadowColor: "#111827",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: -2,
      },
    },

    tabBarActiveTintColor: COLORS.brandPrimary,
    tabBarInactiveTintColor: COLORS.textTertiary,

    tabBarLabelStyle: {
      fontSize: isCompactWidth ? 11 : FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      paddingBottom: 0,
    },

    tabBarIconStyle: {
      marginTop: 1,
    },

    tabBarItemStyle: {
      paddingVertical: 2,
    },

    tabBarHideOnKeyboard: true,

    sceneStyle: {
      backgroundColor: COLORS.background,
    },
  } as const;
}

export const centerTabOptions = {
  tabBarShowLabel: false,
  tabBarItemStyle: {
    paddingTop: 0,
    zIndex: 20,
  },
  tabBarIconStyle: {
    marginTop: 0,
  },
} as const;