import { Pressable, ScrollView, View } from "react-native";

import { ChildAvatar } from "@/components/child-avatar";
import { Text } from "@/components/ui/text";
import type { ChildRow } from "@/features/parent/dashboard-api";

/** Horizontal child selector with a badge for items awaiting the parent's review. */
export function ChildrenPicker({
  childrenList,
  selectedId,
  pendingByChild,
  onSelect,
}: {
  childrenList: ChildRow[];
  selectedId: string | null;
  pendingByChild: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 py-1"
      accessibilityRole="tablist"
      accessibilityLabel="ילדים"
    >
      {childrenList.map((child) => {
        const selected = child.id === selectedId;
        const pending = pendingByChild[child.id] ?? 0;
        return (
          <Pressable
            key={child.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${child.display_name}${pending > 0 ? `, ${pending} ממתינות לאישור` : ""}`}
            onPress={() => onSelect(child.id)}
            className={`min-w-24 items-center gap-1.5 rounded-2xl border px-3 py-3 ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
          >
            <View>
              <ChildAvatar id={child.id} avatar={child.avatar} />
              {pending > 0 ? (
                <View className="absolute -end-1 -top-1 min-w-5 items-center rounded-full bg-destructive px-1">
                  <Text variant="small" className="font-sans-bold text-destructive-foreground">
                    {pending}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="label" numberOfLines={1} className={selected ? "text-accent-foreground" : ""}>
              {child.display_name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
