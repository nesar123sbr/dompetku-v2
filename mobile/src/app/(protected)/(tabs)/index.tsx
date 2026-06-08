import { Redirect } from "expo-router";
import { ROUTES } from "@/constants";

export default function TabsIndexPage() {
  return <Redirect href={ROUTES.PROTECTED.DASHBOARD} />;
}