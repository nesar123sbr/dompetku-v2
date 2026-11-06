import "@/lib/notifications";
import * as Notifications from "expo-notifications";

import { useEffect } from "react";
import { type ErrorBoundaryProps, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants";
import { AuthProvider, useAuthSession } from "@/providers/AuthProvider";
import LocalDatabaseProvider from "@/providers/LocalDatabaseProvider";
import CloudAutoSyncProvider from "@/providers/CloudAutoSyncProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Aman diabaikan kalau splash sudah pernah di-hold.
});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.log("Global ErrorBoundary caught error:", error);

  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.card}>
        <Text style={errorStyles.title}>Terjadi kesalahan</Text>
        <Text style={errorStyles.message}>
          Aplikasi mengalami kendala yang tidak terduga. Silakan coba lagi untuk memuat ulang halaman.
        </Text>
        <Pressable
          style={({ pressed }) => [
            errorStyles.button,
            pressed && errorStyles.buttonPressed,
          ]}
          onPress={retry}
        >
          <Text style={errorStyles.buttonText}>Coba lagi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonPressed: {
    backgroundColor: COLORS.brandPrimaryDark,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
});

function RootNavigator() {
  const { isReady } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // Aman diabaikan kalau splash sudah terlanjur tersembunyi.
      });
    }
  }, [isReady]);

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response.notification.request.content.data;
          const targetPath =
            (data?.pathname as string) || "/(protected)/pengingat";
          router.push(targetPath as any);
        } catch (error) {
          console.log("Navigasi notifikasi response error:", error);
        }
      });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!isReady) {
    return null;
  }

  return <Stack id={undefined} screenOptions={{ headerShown: false }} />;
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
