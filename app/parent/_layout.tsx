import { Stack } from "expo-router";

import { RoleGuard } from "@/components/role-guard";
import { colors, fonts } from "@/constants/theme";

export default function ParentLayout() {
  return (
    <RoleGuard role="parent">
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: fonts.semibold },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/new" options={{ title: "משימה חדשה" }} />
        <Stack.Screen name="tasks/[taskId]" options={{ title: "פרטי משימה" }} />
        <Stack.Screen name="children/new" options={{ title: "ילד חדש" }} />
        <Stack.Screen name="children/[childId]/edit" options={{ title: "עריכת פרטי ילד", presentation: "modal" }} />
        <Stack.Screen name="children/[childId]/gift-code" options={{ title: "קוד מתנה", presentation: "modal" }} />
        <Stack.Screen name="adjust/[childId]" options={{ title: "עדכון יתרה", presentation: "modal" }} />
        <Stack.Screen name="tutors/new" options={{ title: "חונך חדש" }} />
        <Stack.Screen name="tutors/[tutorId]/index" options={{ title: "חונך" }} />
        <Stack.Screen name="tutors/[tutorId]/sessions/[sessionId]" options={{ title: "תמליל שיחה" }} />
      </Stack>
    </RoleGuard>
  );
}
