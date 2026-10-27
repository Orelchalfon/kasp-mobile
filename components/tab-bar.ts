import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import { colors, fonts } from "@/constants/theme";

/** Shared bottom-tab styling for the parent and child areas. */
export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.mutedForeground,
  tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
};
