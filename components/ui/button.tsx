import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

type IconName = ComponentProps<typeof Feather>["name"];

const variants = {
  primary: { box: "bg-primary", text: "text-primary-foreground", fg: colors.primaryForeground },
  secondary: { box: "bg-accent", text: "text-accent-foreground", fg: colors.accentForeground },
  outline: { box: "border border-solid border-border bg-card", text: "text-foreground", fg: colors.foreground },
  ghost: { box: "bg-transparent", text: "text-primary", fg: colors.primary },
  destructive: { box: "bg-destructive", text: "text-destructive-foreground", fg: "#fffafa" },
  success: { box: "bg-success", text: "text-success-foreground", fg: "#f9fdfa" },
} as const;

const sizes = {
  md: "min-h-12 px-5",
  sm: "min-h-11 px-3",
} as const;

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  icon?: IconName;
  loading?: boolean;
  /** Label shown while loading (e.g. "מאשר..."); keeps the button's accessible name. */
  loadingTitle?: string;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Touch button: ≥44pt, pressed feedback, loading state that blocks double-submits. */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  loadingTitle,
  disabled = false,
  className,
  style,
  accessibilityHint,
}: ButtonProps) {
  const v = variants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: inactive ? 0.5 : pressed ? 0.75 : 1 }, style]}
      className={`flex-row items-center justify-center gap-2 rounded-xl ${v.box} ${sizes[size]} ${inactive ? "opacity-50" : "active:opacity-75"} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Feather name={icon} size={18} color={v.fg} />
      ) : null}
      <View>
        <Text variant="label" className={`text-base font-sans-semibold ${v.text}`}>
          {loading && loadingTitle ? loadingTitle : title}
        </Text>
      </View>
    </Pressable>
  );
}

/** 44×44 icon-only button. `label` is required: it is the only accessible name. */
export function IconButton({
  icon,
  label,
  onPress,
  color = colors.foreground,
  disabled,
  className,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
      className={`size-11 items-center justify-center rounded-full ${disabled ? "opacity-40" : "active:opacity-60"} ${className ?? ""}`}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
}
