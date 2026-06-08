import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ColorValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, FONT_WEIGHT, getFloatingTabFabSize } from "@/constants";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type TabBarIconProps = {
  focused: boolean;
  color: ColorValue;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
  size?: number;
  centered?: boolean;
};

export default function TabBarIcon({
  focused,
  color,
  activeIcon,
  inactiveIcon,
  size = 22,
  centered = false,
}: TabBarIconProps) {
  const { width, height } = useWindowDimensions();

  if (centered) {
    const gradientColors = focused
      ? ([COLORS.brandPrimaryDark, COLORS.brandSecondary] as const)
      : ([COLORS.brandPrimary, COLORS.brandPrimaryDark] as const);

    const outerRingSize = getFloatingTabFabSize(width, height);
    const innerButtonSize = Math.round(outerRingSize * 0.84);
    const centerWrapSize = outerRingSize + 10;
    const floatOffset = -Math.round(outerRingSize * 0.28);
    const iconSize = Math.round(innerButtonSize * 0.4);

    return (
      <View
        style={[
          tabBarIconStyles.centerWrap,
          {
            width: centerWrapSize,
            height: centerWrapSize,
            transform: [{ translateY: floatOffset }],
          },
        ]}
      >
        <View
          style={[
            tabBarIconStyles.centerOuterRing,
            {
              width: outerRingSize,
              height: outerRingSize,
              borderRadius: outerRingSize / 2,
            },
            focused && tabBarIconStyles.centerOuterRingFocused,
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              tabBarIconStyles.centerButton,
              {
                width: innerButtonSize,
                height: innerButtonSize,
                borderRadius: innerButtonSize / 2,
              },
            ]}
          >
            <Ionicons name="add" size={iconSize} color={COLORS.white} />
            <Text style={tabBarIconStyles.centerLabel}>Catat</Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  const iconColor = typeof color === "string" ? color : COLORS.textSecondary;

  return (
    <Ionicons
      name={focused ? activeIcon : inactiveIcon}
      size={size}
      color={iconColor}
    />
  );
}

const tabBarIconStyles = StyleSheet.create({
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerOuterRing: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.brandPrimary,
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 9,
  },
  centerOuterRingFocused: {
    shadowOpacity: 0.34,
  },
  centerButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    marginTop: -3,
    fontSize: 10,
    lineHeight: 13,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
});