import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { View } from "react-native";

import { CoinAmount } from "@/components/money";
import { IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useMonthlySummary, monthRange, type MonthTotals } from "@/features/parent/transactions-api";
import { formatMonthYear, formatNumber } from "@/lib/format";

const SOURCES: { key: keyof MonthTotals; label: string; color: string }[] = [
  { key: "tasks", label: "משימות", color: colors.vizTasks },
  { key: "quizzes", label: "חידונים", color: colors.vizQuizzes },
  { key: "gifts", label: "מתנות", color: colors.vizGifts },
  { key: "manual", label: "התאמות ידניות", color: colors.navy },
];

/** "סיכום <חודש>": earnings by source (stacked bar), saved, deposited to goals. */
export function MonthlySummary({ householdId, childId }: { householdId: string; childId: string | null }) {
  const [offset, setOffset] = useState(0);
  const summary = useMonthlySummary(householdId, childId, offset);
  const { start } = monthRange(offset);
  const monthLabel = formatMonthYear(start.getFullYear(), start.getMonth());
  const totals = summary.data;
  const earned = totals ? totals.tasks + totals.quizzes + totals.gifts + totals.manual : 0;
  const parts = totals ? SOURCES.map((s) => ({ ...s, value: totals[s.key] })).filter((p) => p.value > 0) : [];
  const pct = (v: number) => (earned > 0 ? Math.round((v / earned) * 100) : 0);

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between">
        {/* In RTL "previous" (older) points right, "next" points left. */}
        <IconButton icon="chevron-right" label="לחודש הקודם" onPress={() => setOffset((o) => o + 1)} />
        <Text variant="heading" accessibilityRole="header">
          סיכום {monthLabel}
        </Text>
        <IconButton
          icon="chevron-left"
          label={offset === 0 ? "לחודש הבא (אין עדיין)" : "לחודש הבא"}
          disabled={offset === 0}
          onPress={() => setOffset((o) => Math.max(0, o - 1))}
        />
      </View>

      {summary.isLoading ? (
        <Skeleton className="h-28" />
      ) : !totals ? (
        <View className="gap-2">
          <Text variant="caption" className="text-destructive" accessibilityRole="alert">
            לא הצלחנו לטעון את הסיכום לחודש הזה.
          </Text>
          <IconButton icon="rotate-cw" label="נסו שוב" onPress={() => void summary.refetch()} />
        </View>
      ) : (
        <>
          <View className="flex-row gap-2">
            <StatTile label="הרוויחו" value={earned} icon="trending-up" />
            <StatTile label="נכנס לחיסכון" value={totals.saved} icon="archive" />
            <StatTile label="הופקד למטרות" value={totals.goals} icon="target" />
          </View>
          {earned === 0 ? (
            <Text variant="caption">{offset === 0 ? "עדיין אין הכנסות החודש." : "לא היו הכנסות בחודש הזה."}</Text>
          ) : (
            <View className="gap-2">
              <Text variant="small" className="font-sans-medium">
                מאיפה הגיעו המטבעות
              </Text>
              <View
                accessible
                accessibilityLabel={`מקורות ההכנסה ב${monthLabel}: ${parts
                  .map((p) => `${p.label} ${formatNumber(p.value)} (${pct(p.value)}%)`)
                  .join(", ")}`}
                className="h-3 flex-row overflow-hidden rounded-full bg-muted"
              >
                {parts.map((p) => (
                  <View key={p.key} style={{ flex: p.value, backgroundColor: p.color }} />
                ))}
              </View>
              <View className="gap-1">
                {parts.map((p) => (
                  <View key={p.key} className="flex-row items-center gap-2">
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                    <Text variant="small" className="text-foreground">
                      {p.label}: {formatNumber(p.value)} מטבעות ({pct(p.value)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: "trending-up" | "archive" | "target";
}) {
  return (
    <View className="flex-1 gap-1 rounded-xl bg-muted p-3">
      <View className="flex-row items-center gap-1">
        <Feather name={icon} size={12} color={colors.mutedForeground} />
        <Text variant="small" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <CoinAmount value={value} />
    </View>
  );
}
