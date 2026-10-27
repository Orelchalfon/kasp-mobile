import { Feather } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { Text } from "@/components/ui/text";
import { colors, fonts } from "@/constants/theme";

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  /** Emails, passwords, numbers: type left-to-right inside the RTL layout. */
  ltr?: boolean;
  /** Adds a show/hide toggle and hides the value. */
  password?: boolean;
  className?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, ltr, password, className, style, multiline, ...props },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const borderClass = error ? "border-destructive" : "border-input";
  return (
    <View className={`gap-1.5 ${className ?? ""}`}>
      <Text variant="label">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-card ${borderClass} ${multiline ? "min-h-24" : "min-h-12"}`}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={password ? hidden : undefined}
          multiline={multiline}
          className="flex-1 px-4 py-3 text-base text-foreground"
          style={[
            {
              fontFamily: fonts.regular,
              // Alignment is left to the layout direction (start = right in RTL); only the
              // character order of LTR content is pinned. textAlign left/right is avoided
              // on purpose: RN swaps it in RTL (doLeftAndRightSwapInRTL).
              writingDirection: ltr || password ? "ltr" : "rtl",
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
          {...props}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "הצגת הסיסמה" : "הסתרת הסיסמה"}
            onPress={() => setHidden((h) => !h)}
            className="size-11 items-center justify-center"
          >
            <Feather name={hidden ? "eye" : "eye-off"} size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" className="text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small">{hint}</Text>
      ) : null}
    </View>
  );
});
