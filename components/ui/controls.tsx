import { Alert, Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";

/** Single-choice segmented control (the web's ToggleGroup). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name. */
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={`min-h-11 flex-1 items-center justify-center rounded-lg px-2 ${selected ? "bg-card" : ""}`}
          >
            <Text
              variant="label"
              className={selected ? "text-foreground" : "text-muted-foreground"}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal chips for filters (child filter, quick amounts). */
export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={`min-h-11 items-center justify-center rounded-full border px-4 ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
          >
            <Text variant="label" className={selected ? "text-accent-foreground" : "text-foreground"}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Width-based bar: fills from the start edge, which is the right edge in RTL. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      className="h-3 overflow-hidden rounded-full bg-muted"
    >
      <View className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
    </View>
  );
}

/**
 * Native confirmation for consequential actions (money moves, rejections, rotations).
 * Resolves true only when the user taps the confirm button.
 */
export function confirmAction(opts: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancelLabel ?? "ביטול", style: "cancel", onPress: () => resolve(false) },
        {
          text: opts.confirmLabel,
          style: opts.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
