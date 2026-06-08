import { Redirect } from "expo-router";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

export default function IndexPage() {
  const { session, isGuestMode } = useAuthSession();

  if (session || isGuestMode) {
    return <Redirect href={ROUTES.PROTECTED.DASHBOARD} />;
  }

  return <Redirect href={ROUTES.AUTH.SIGN_IN} />;
}