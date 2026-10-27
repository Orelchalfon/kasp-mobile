import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { tabScreenOptions } from "@/components/tab-bar";

export default function ParentTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{ title: "ראשי", tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="tutors"
        options={{ title: "חונכים", tabBarIcon: ({ color, size }) => <Feather name="headphones" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: "תנועות", tabBarIcon: ({ color, size }) => <Feather name="list" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "פרופיל", tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
