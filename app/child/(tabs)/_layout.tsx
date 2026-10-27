import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { tabScreenOptions } from "@/components/tab-bar";

// Same order as the web child nav: ראשי → לימוד → חונך → חיסכון → ארנק.
export default function ChildTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{ title: "ראשי", tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="educate"
        options={{ title: "לימוד", tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="tutors"
        options={{ title: "חונך", tabBarIcon: ({ color, size }) => <Feather name="headphones" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="savings"
        options={{ title: "חיסכון", tabBarIcon: ({ color, size }) => <Feather name="archive" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: "ארנק", tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
