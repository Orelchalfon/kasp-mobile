import { Pressable, Text as RNText, View } from "react-native";

import { Text } from "@/components/ui/text";
import { AVATAR_COLORS, AVATAR_ICONS } from "@/lib/avatars";

/** Icon + color picker for `child_profiles.avatar` (catalog in lib/avatars.ts). */
export function AvatarPicker({
  iconKey,
  colorKey,
  onChange,
}: {
  iconKey: string;
  colorKey: string;
  onChange: (iconKey: string, colorKey: string) => void;
}) {
  const color = AVATAR_COLORS.find((c) => c.key === colorKey) ?? AVATAR_COLORS[0];
  return (
    <View className="gap-3">
      <Text variant="label">בחרו דמות</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="בחרו דמות" className="flex-row flex-wrap gap-2">
        {AVATAR_ICONS.map((icon) => {
          const selected = icon.key === iconKey;
          return (
            <Pressable
              key={icon.key}
              accessibilityRole="radio"
              accessibilityLabel={icon.labelHe}
              accessibilityState={{ selected }}
              onPress={() => onChange(icon.key, colorKey)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.bg,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? color.solid : "#e2e5e9",
              }}
            >
              <RNText style={{ fontSize: 26 }}>{icon.emoji}</RNText>
            </Pressable>
          );
        })}
      </View>
      <Text variant="label">צבע</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="צבע" className="flex-row flex-wrap gap-3">
        {AVATAR_COLORS.map((c) => {
          const selected = c.key === colorKey;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="radio"
              accessibilityLabel={c.labelHe}
              accessibilityState={{ selected }}
              onPress={() => onChange(iconKey, c.key)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.solid,
                borderWidth: selected ? 3 : 0,
                borderColor: "#131a29",
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
