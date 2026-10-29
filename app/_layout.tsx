import "@/global.css";

import {
  Rubik_300Light,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/rubik";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/ui/toast";
import { colors, fonts } from "@/constants/theme";
import { createQueryClient, wireQueryLifecycle } from "@/lib/query-client";
import { ensureRtl } from "@/lib/rtl";
import { AuthProvider, useAuth } from "@/providers/auth-provider";

SplashScreen.preventAutoHideAsync().catch(() => {});

ensureRtl();
wireQueryLifecycle();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    "sans-light": Rubik_300Light,
    "sans-regular": Rubik_400Regular,
    "sans-medium": Rubik_500Medium,
    "sans-semibold": Rubik_600SemiBold,
    "sans-bold": Rubik_700Bold,
    "sans-extrabold": Rubik_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootStack />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { isLoading } = useAuth();

  // Keep the splash up until the persisted session (and role) are known, so cold starts
  // and deep links never flash the sign-in screen for a signed-in user.
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="no-access" />
      <Stack.Screen name="parent" />
      <Stack.Screen name="child" />
      <Stack.Screen
        name="give/[token]"
        options={{ headerShown: true, title: "שליחת מתנה", presentation: "card" }}
      />
    </Stack>
  );
}
