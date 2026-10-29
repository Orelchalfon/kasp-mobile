import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Switch, View } from "react-native";

import { CoinAmount } from "@/components/money";
import { Button, IconButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/controls";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import {
  periodLabel,
  sourceFromLabel,
  type DepositSource,
  type GoalRow,
} from "@/features/savings/api";
import { coinsLabel, formatCoins, formatDayMonth } from "@/lib/format";

/** Savings pot + auto-savings note + wallet chip + "העבר לחיסכון". */
export function SavingsHero({
  savingsBalance,
  walletBalance,
  savingsPct,
}: {
  savingsBalance: number;
  walletBalance: number;
  savingsPct: number;
}) {
  return (
    <View className="gap-4 rounded-3xl bg-primary p-6" style={{ borderCurve: "continuous" }}>
      <View accessible accessibilityLabel={`החיסכון שלי: ${coinsLabel(savingsBalance)}`} className="items-center gap-1">
        <Text variant="label" className="text-primary-foreground/80">
          החיסכון שלי
        </Text>
        <View className="flex-row items-center gap-2">
          <Feather name="archive" size={26} color={colors.coin} />
          <Text className="text-4xl font-sans-bold text-primary-foreground">{formatCoins(savingsBalance)}</Text>
        </View>
        <Text variant="small" className="text-primary-foreground/80">
          {savingsPct > 0 ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול` : "כרגע אין העברה אוטומטית מהתגמולים"}
        </Text>
      </View>
      <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-white/15 px-4 py-2">
        <View accessible accessibilityLabel={`בארנק: ${coinsLabel(walletBalance)}`} className="flex-row items-center gap-2">
          <Feather name="credit-card" size={16} color={colors.primaryForeground} />
          <Text variant="label" className="text-primary-foreground">
            בארנק {formatCoins(walletBalance)}
          </Text>
        </View>
        <Button
          title="העבר לחיסכון"
          variant="secondary"
          size="sm"
          icon="arrow-left"
          disabled={walletBalance <= 0}
          onPress={() => router.push("/child/savings/move")}
        />
      </View>
    </View>
  );
}

const SOURCES: { value: DepositSource; name: string; icon: "credit-card" | "archive" }[] = [
  { value: "wallet", name: "ארנק", icon: "credit-card" },
  { value: "savings", name: "חיסכון", icon: "archive" },
];

/** Large wallet/savings tiles with available balance and a "לא מספיק" flag. */
export function SourcePicker({
  value,
  onChange,
  walletBalance,
  savingsBalance,
  needed,
  label = "מאיפה להפקיד?",
  disabled,
}: {
  value: DepositSource;
  onChange: (v: DepositSource) => void;
  walletBalance?: number;
  savingsBalance?: number;
  needed?: number;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
        {SOURCES.map((s) => {
          const selected = s.value === value;
          const available = s.value === "wallet" ? walletBalance : savingsBalance;
          const short = available !== undefined && needed !== undefined && needed > available;
          return (
            <Pressable
              key={s.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={`${s.name}${available !== undefined ? `, זמין ${available}` : ""}${short ? ", לא מספיק" : ""}`}
              disabled={disabled}
              onPress={() => onChange(s.value)}
              className={`min-h-16 flex-1 gap-1 rounded-2xl border-2 p-3 ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
            >
              <View className="flex-row items-center gap-2">
                <Feather name={s.icon} size={18} color={selected ? colors.primary : colors.mutedForeground} />
                <Text variant="label">{s.name}</Text>
              </View>
              {available !== undefined ? (
                <Text variant="small">זמין {formatCoins(available)}</Text>
              ) : null}
              {short ? (
                <Text variant="small" className="font-sans-medium text-destructive">
                  לא מספיק
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** "הפקדה אוטומטית" switch + source, shared by the new/edit goal screens. */
export function AutoDepositFields({
  enabled,
  onEnabledChange,
  source,
  onSourceChange,
  cycleAmount,
  period,
  resetsSchedule = true,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  source: DepositSource;
  onSourceChange: (v: DepositSource) => void;
  cycleAmount: string;
  period: keyof typeof periodLabel;
  resetsSchedule?: boolean;
}) {
  const amountText = cycleAmount.trim() || "הסכום המחזורי";
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">הפקדה אוטומטית</Text>
          <Text variant="small">בלי ללחוץ — הכסף נכנס למטרה לבד</Text>
        </View>
        <Switch
          accessibilityLabel="הפקדה אוטומטית"
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.card}
        />
      </View>
      {enabled ? (
        <>
          <SourcePicker value={source} onChange={onSourceChange} label="מאיפה לקחת?" />
          <Text variant="small">
            {amountText} יופקדו אוטומטית כל {periodLabel[period]} {sourceFromLabel[source]}.
            {resetsSchedule ? ` ההפקדה הראשונה בעוד ${periodLabel[period]}.` : ""} אם לא יהיה מספיק — ננסה
            שוב כל יום.
          </Text>
        </>
      ) : null}
    </View>
  );
}

export function GoalCard({ goal, deposited }: { goal: GoalRow; deposited: number }) {
  const isCompleted = goal.status === "completed";
  const pct = goal.target_amount > 0 ? Math.min(100, Math.round((deposited / goal.target_amount) * 100)) : 0;
  const waiting = goal.last_auto_status === "insufficient";
  const next = goal.next_auto_deposit_on ? formatDayMonth(`${goal.next_auto_deposit_on}T12:00:00`) : null;

  return (
    <View className={`gap-3 rounded-2xl border border-border bg-card p-4 ${isCompleted ? "opacity-70" : ""}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          {isCompleted ? (
            <View className="flex-row items-center gap-1 rounded-full bg-success/15 px-2 py-0.5">
              <Feather name="check-circle" size={12} color={colors.successText} />
              <Text variant="small" className="font-sans-semibold text-success-text">
                הושלם
              </Text>
            </View>
          ) : null}
          <Text variant="heading">{goal.title}</Text>
          {!isCompleted ? (
            <IconButton
              icon="edit-2"
              label={`עריכת המטרה ${goal.title}`}
              color={colors.mutedForeground}
              onPress={() =>
                router.push({ pathname: "/child/savings/goal/[goalId]/edit", params: { goalId: goal.id } })
              }
            />
          ) : null}
        </View>
        <CoinAmount value={goal.target_amount} />
      </View>

      <ProgressBar value={deposited} max={goal.target_amount} label={`${pct}% הושלמו`} />

      <View className="flex-row items-center justify-between">
        <Text variant="small">
          <Text variant="small" className="font-sans-semibold text-foreground">
            {formatCoins(deposited)}
          </Text>{" "}
          מתוך {formatCoins(goal.target_amount)}
        </Text>
        {!goal.auto_deposit ? (
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text variant="small">
              {goal.cycle_amount} כל {periodLabel[goal.cycle_period]}
            </Text>
          </View>
        ) : null}
      </View>

      {goal.auto_deposit && !isCompleted ? (
        <View className={`flex-row flex-wrap items-center gap-1.5 rounded-lg px-3 py-2 ${waiting ? "bg-warning/20" : "bg-primary/10"}`}>
          <Feather name="repeat" size={12} color={colors.foreground} />
          <Text variant="small" className="font-sans-semibold text-foreground">
            אוטומטי:
          </Text>
          <Text variant="small" className="text-foreground">
            {goal.cycle_amount} כל {periodLabel[goal.cycle_period]} {sourceFromLabel[goal.auto_source]}
          </Text>
          {waiting ? (
            <Text variant="small" className="font-sans-medium text-warning-foreground">
              · ממתין ליתרה — ננסה שוב מחר
            </Text>
          ) : next ? (
            <Text variant="small">· הבא ב־{next}</Text>
          ) : null}
        </View>
      ) : null}

      {!isCompleted ? (
        <Button
          title="הפקדה למטרה"
          icon="plus-circle"
          variant="secondary"
          onPress={() => router.push({ pathname: "/child/savings/goal/[goalId]/deposit", params: { goalId: goal.id } })}
        />
      ) : null}
    </View>
  );
}
