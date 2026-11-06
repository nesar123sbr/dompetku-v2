import { Redirect, Stack } from "expo-router";

import { AppLoader } from "@/components";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

export default function ProtectedLayout() {
  const { isReady, canAccessApp } = useAuthSession();

  if (!isReady) {
    return <AppLoader label="Mengecek akses..." />;
  }

  if (!canAccessApp) {
    return <Redirect href={ROUTES.AUTH.SIGN_IN} />;
  }

  return (
    <Stack id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pengingat" options={{ headerShown: false }} />
      <Stack.Screen name="riwayat-transaksi" options={{ headerShown: false }} />
      <Stack.Screen name="edit-transaksi" options={{ headerShown: false }} />
      <Stack.Screen name="anggaran" options={{ headerShown: false }} />
      <Stack.Screen name="audit-saldo" options={{ headerShown: false }} />
    </Stack>
  );
}