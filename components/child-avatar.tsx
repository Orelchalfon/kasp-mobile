import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Text as AppText } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { parseAvatar } from "@/lib/avatars";

const SIZES = { sm: { box: 36, emoji: 18 }, md: { box: 48, emoji: 24 }, lg: { box: 64, emoji: 32 } };

/** Emoji-on-tint avatar from `child_profiles.avatar` ("icon|color"), deterministic fallback by id. */
export function ChildAvatar({
  id,
  avatar,
  name,
  size = "md",
}: {
  id: string;
  avatar: string | null | undefined;
  name?: string;
  size?: keyof typeof SIZES;
}) {
  const { icon, color } = parseAvatar(avatar, id);
  const s = SIZES[size];
  return (
    <View
      accessible
      accessibilityLabel={name ? `${name} (${icon.labelHe})` : icon.labelHe}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box / 2,
        backgroundColor: color.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Emoji renders in the system emoji font; RN Text, not the Rubik wrapper. */}
      <Text style={{ fontSize: s.emoji }}>{icon.emoji}</Text>
    </View>
  );
}

const STATUS = {
  assigned: { label: "ממתינה", icon: "clock", box: "bg-secondary", text: "text-secondary-foreground", fg: colors.mutedForeground },
  submitted: { label: "הוגשה", icon: "loader", box: "bg-warning/20", text: "text-warning-foreground", fg: "#8a5a00" },
  approved: { label: "אושרה", icon: "check-circle", box: "bg-success/15", text: "text-success-text", fg: colors.successText },
  rejected: { label: "נדחתה", icon: "x-circle", box: "bg-destructive/15", text: "text-destructive", fg: colors.destructive },
} as const;

export type TaskStatus = keyof typeof STATUS;

export function StatusBadge({ status }: { status: string }) {
  const c = (STATUS as Record<string, (typeof STATUS)[TaskStatus]>)[status];
  if (!c) {
    return (
      <View className="rounded-full bg-muted px-2.5 py-1">
        <AppText variant="small">{status}</AppText>
      </View>
    );
  }
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${c.box}`}>
      <Feather name={c.icon} size={12} color={c.fg} />
      <AppText variant="small" className={`font-sans-medium ${c.text}`}>
        {c.label}
      </AppText>
    </View>
  );
}
