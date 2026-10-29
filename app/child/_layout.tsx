import { Stack } from "expo-router";

import { RoleGuard } from "@/components/role-guard";
import { colors, fonts } from "@/constants/theme";

export default function ChildLayout() {
  return (
    <RoleGuard role="child">
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
        <Stack.Screen name="tasks/[taskId]" options={{ title: "המשימה שלי" }} />
        <Stack.Screen name="educate/[subject]" options={{ title: "חידון" }} />
        <Stack.Screen name="tutors/[tutorId]" options={{ title: "שיחה עם חונך", presentation: "fullScreenModal" }} />
        <Stack.Screen name="savings/move" options={{ title: "העברה לחיסכון", presentation: "modal" }} />
        <Stack.Screen name="savings/goal-new" options={{ title: "מטרה חדשה", presentation: "modal" }} />
        <Stack.Screen name="savings/goal/[goalId]/edit" options={{ title: "עריכת מטרה", presentation: "modal" }} />
        <Stack.Screen name="savings/goal/[goalId]/deposit" options={{ title: "הפקדה למטרה", presentation: "modal" }} />
      </Stack>
    </RoleGuard>
  );
}
