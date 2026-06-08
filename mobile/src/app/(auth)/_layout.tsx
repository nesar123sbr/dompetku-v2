import { Redirect, Stack } from "expo-router";
import { AppLoader } from "@/components";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

export default function AuthLayout() {
  const { session, isReady } = useAuthSession();

  if (!isReady) {
    return <AppLoader label="Menyiapkan autentikasi..." />;
  }

  if (session) {
    return <Redirect href={ROUTES.PROTECTED.DASHBOARD} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}