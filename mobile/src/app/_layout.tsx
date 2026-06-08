import "@/lib/notifications";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, useAuthSession } from "@/providers/AuthProvider";
import LocalDatabaseProvider from "@/providers/LocalDatabaseProvider";
import CloudAutoSyncProvider from "@/providers/CloudAutoSyncProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Aman diabaikan kalau splash sudah pernah di-hold.
});

function RootNavigator() {
  const { isReady } = useAuthSession();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // Aman diabaikan kalau splash sudah terlanjur tersembunyi.
      });
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <LocalDatabaseProvider>
      <AuthProvider>
        <CloudAutoSyncProvider>
          <RootNavigator />
        </CloudAutoSyncProvider>
      </AuthProvider>
    </LocalDatabaseProvider>
  );
}