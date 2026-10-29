import type { ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";

import { Text } from "@/components/ui/text";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-border bg-card p-4 ${className ?? ""}`}
      style={{ borderCurve: "continuous" }}
      {...props}
    />
  );
}

/** A titled group of content on a screen (settings card, list section). */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`gap-3 ${className ?? ""}`}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text variant="caption">{description}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

/** Tappable row card with pressed feedback. */
export function PressableCard({
  onPress,
  accessibilityLabel,
  children,
  className,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ borderCurve: "continuous" }}
      className={`rounded-2xl border border-border bg-card p-4 active:opacity-70 ${className ?? ""}`}
    >
      {children}
    </Pressable>
  );
}
