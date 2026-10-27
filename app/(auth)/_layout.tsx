import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/providers/auth-provider";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  // Signed-in users never see the auth screens; "/" routes them by role.
  if (!isLoading && isAuthenticated) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
