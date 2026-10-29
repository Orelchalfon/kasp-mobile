import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

/**
 * Screen container: safe areas, keyboard avoidance, 16pt gutters and optional
 * pull-to-refresh. Screens under a stack header pass edges={["bottom"]}; tab roots
 * with their own header text keep the default top edge.
 */
export function Screen({
  children,
  scroll = true,
  edges = ["top", "bottom"],
  refreshing,
  onRefresh,
  footer,
  contentClassName,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned below the scroll area (primary action), above the home indicator. */
  footer?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName={`gap-5 px-4 pb-8 pt-4 ${contentClassName ?? ""}`}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 px-4 pt-4 ${contentClassName ?? ""}`}>{children}</View>
        )}
        {footer ? <View className="border-t border-border bg-card px-4 py-3">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
