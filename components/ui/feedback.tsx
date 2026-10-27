import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

/** A failed load. Rendered in place of content — never an empty state. */
export function LoadError({
  message = "לא הצלחנו לטעון את הנתונים.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View className="gap-3" accessibilityRole="alert">
      <View className="flex-row items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        <Feather name="alert-circle" size={18} color={colors.destructive} />
        <Text variant="body" className="flex-1 text-destructive">
          {message}
        </Text>
      </View>
      <Button title="נסו שוב" icon="rotate-cw" variant="outline" onPress={onRetry} />
    </View>
  );
}

/** Inline, non-blocking error (e.g. a refresh failed while cached data is shown). */
export function InlineError({ message }: { message: string }) {
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
    >
      <Feather name="alert-circle" size={16} color={colors.destructive} />
      <Text variant="caption" className="flex-1 text-destructive">
        {message}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: ComponentProps<typeof Feather>["name"];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10">
      <View className="size-12 items-center justify-center rounded-full bg-accent">
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text variant="caption" className="text-center">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2 self-stretch">{action}</View> : null}
    </View>
  );
}

export function LoadingView({ label = "טוען..." }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/** Placeholder block for skeleton layouts. */
export function Skeleton({ className }: { className?: string }) {
  return <View className={`rounded-xl bg-muted ${className ?? ""}`} accessibilityElementsHidden />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View className="gap-3" accessibilityLabel="טוען...">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </View>
  );
}
