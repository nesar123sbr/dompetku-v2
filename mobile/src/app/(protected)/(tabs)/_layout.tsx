import { useCallback, useState } from "react";
import { Tabs } from "expo-router";
import { Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo, QuickActionSheet, TabBarIcon } from "@/components";
import { TAB_META } from "@/constants";
import {
  centerTabOptions,
  getTabScreenOptions,
} from "@assets/styles/navigation/tabs.styles";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [showQuickAction, setShowQuickAction] = useState(false);

  const handleOpenQuickAction = useCallback(() => {
    setShowQuickAction(true);
  }, []);

  const handleCloseQuickAction = useCallback(() => {
    setShowQuickAction(false);
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          ...getTabScreenOptions(insets.bottom, width, height),
          headerTitle: () => <BrandLogo variant="header" />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="dashboard"
          options={{
            title: TAB_META.dashboard.label,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                color={color}
                focused={focused}
                activeIcon={TAB_META.dashboard.activeIcon}
                inactiveIcon={TAB_META.dashboard.inactiveIcon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="riwayat"
          options={{
            title: TAB_META.riwayat.label,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                color={color}
                focused={focused}
                activeIcon={TAB_META.riwayat.activeIcon}
                inactiveIcon={TAB_META.riwayat.inactiveIcon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="transaksi"
          options={{
            title: TAB_META.transaksi.label,
            ...centerTabOptions,
            tabBarButton: ({
              children,
              style,
              accessibilityLabel,
              accessibilityState,
              testID,
              onLongPress,
            }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={accessibilityState}
                testID={testID}
                hitSlop={12}
                style={style}
                onPress={handleOpenQuickAction}
                onLongPress={onLongPress}
              >
                {children}
              </Pressable>
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                color={color}
                focused={focused}
                activeIcon={TAB_META.transaksi.activeIcon}
                inactiveIcon={TAB_META.transaksi.inactiveIcon}
                centered
              />
            ),
          }}
        />

        <Tabs.Screen
          name="wallet"
          options={{
            title: TAB_META.wallet.label,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                color={color}
                focused={focused}
                activeIcon={TAB_META.wallet.activeIcon}
                inactiveIcon={TAB_META.wallet.inactiveIcon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profil"
          options={{
            title: TAB_META.profil.label,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                color={color}
                focused={focused}
                activeIcon={TAB_META.profil.activeIcon}
                inactiveIcon={TAB_META.profil.inactiveIcon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="insight"
          options={{
            href: null,
          }}
        />
      </Tabs>

      <QuickActionSheet
        visible={showQuickAction}
        onClose={handleCloseQuickAction}
      />
    </>
  );
}