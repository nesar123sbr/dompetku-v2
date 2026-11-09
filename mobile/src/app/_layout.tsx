import "@/lib/notifications";
import * as Notifications from "expo-notifications";

import { useEffect, useRef } from "react";
import { type ErrorBoundaryProps, type Href, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS } from "@/constants";
import { AuthProvider, useAuthSession } from "@/providers/AuthProvider";
import LocalDatabaseProvider from "@/providers/LocalDatabaseProvider";
import CloudAutoSyncProvider from "@/providers/CloudAutoSyncProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Aman diabaikan kalau splash sudah pernah di-hold.
});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.log("Global ErrorBoundary caught error:", error);

  const handleCopyDetails = async () => {
    const errorDetails = `[DompetKu Error Report]\nMessage: ${error?.message || "Unknown error"}\n\nStack:\n${error?.stack || "No stack trace available"}`;
    try {
      await Share.share({
        title: "Detail Kesalahan DompetKu",
        message: errorDetails,
      });
    } catch {
      Alert.alert("Detail Error", errorDetails);
    }
  };

  return (
    <View style={errorStyles.container}>
      <StatusBar style="dark" />
      <View style={errorStyles.card}>
        <Text style={errorStyles.title}>Terjadi kesalahan</Text>
        <Text style={errorStyles.message}>
          Aplikasi mengalami kendala yang tidak terduga. Silakan periksa detail
          di bawah atau coba lagi untuk memuat ulang halaman.
        </Text>

        <View style={errorStyles.errorBox}>
          <Text style={errorStyles.errorBoxTitle}>Detail Error:</Text>
          <ScrollView style={errorStyles.errorScroll} nestedScrollEnabled>
            <Text selectable style={errorStyles.errorText}>
              {error?.message || String(error)}
            </Text>
            {__DEV__ && error?.stack ? (
              <Text selectable style={errorStyles.stackText}>
                {"\n" + error.stack}
              </Text>
            ) : null}
          </ScrollView>
        </View>

        <View style={errorStyles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              errorStyles.secondaryButton,
              pressed && errorStyles.buttonPressed,
            ]}
            onPress={handleCopyDetails}
          >
            <Text style={errorStyles.secondaryButtonText}>Salin detail</Text>
          </Pressable>

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
    maxWidth: 420,
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
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
    marginBottom: 20,
  },
  errorBoxTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  errorScroll: {
    maxHeight: 140,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontFamily: "monospace",
  },
  stackText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: "monospace",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: COLORS.brandPrimaryDark,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});

function RootNavigator() {
  const { isReady, session, isGuestMode } = useAuthSession();
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const lastHandledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // Aman diabaikan kalau splash sudah terlanjur tersembunyi.
      });
    }
  }, [isReady]);

  // Handle tap notifikasi saat aplikasi dibuka / resume
  useEffect(() => {
    if (!isReady || (!session && !isGuestMode)) {
      return;
    }

    if (lastNotificationResponse) {
      const notificationId =
        lastNotificationResponse.notification.request.identifier;
      if (lastHandledNotificationIdRef.current === notificationId) {
        return;
      }
      lastHandledNotificationIdRef.current = notificationId;

      try {
        const data = lastNotificationResponse.notification.request.content.data;
        if (typeof data?.pathname === "string" && data.pathname.trim().length > 0) {
          router.push(data.pathname as Href);
        }
      } catch (error) {
        console.log("Navigasi lastNotificationResponse error:", error);
      }
    }
  }, [isReady, session, isGuestMode, lastNotificationResponse, router]);

  if (!isReady) {
    return null;
  }

  return <Stack id={undefined} screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <LocalDatabaseProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <CloudAutoSyncProvider>
          <RootNavigator />
        </CloudAutoSyncProvider>
      </AuthProvider>
    </LocalDatabaseProvider>
  );
}
