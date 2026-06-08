import { Redirect, Stack } from "expo-router";

import { AppLoader } from "@/components";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

export default function ProtectedLayout() {
  const { session, isReady, isGuestMode } = useAuthSession();

  if (!isReady) {
    return <AppLoader label="Mengecek akses..." />;
  }

  const bolehMasuk = Boolean(session) || isGuestMode;

  if (!bolehMasuk) {
    return <Redirect href={ROUTES.AUTH.SIGN_IN} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pengingat" options={{ headerShown: false }} />
      <Stack.Screen name="riwayat-transaksi" options={{ headerShown: false }} />
      <Stack.Screen name="edit-transaksi" options={{ headerShown: false }} />
      <Stack.Screen name="anggaran" options={{ headerShown: false }} />
    </Stack>
  );
}