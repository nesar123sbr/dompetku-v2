import { Redirect } from "expo-router";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

export default function IndexPage() {
  const { canAccessApp } = useAuthSession();

  if (canAccessApp) {
    return <Redirect href={ROUTES.PROTECTED.DASHBOARD} />;
  }

  return <Redirect href={ROUTES.AUTH.SIGN_IN} />;
}