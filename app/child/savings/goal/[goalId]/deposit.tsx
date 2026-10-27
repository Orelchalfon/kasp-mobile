import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CoinAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { confirmAction, ProgressBar, SegmentedControl } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useDepositToGoal, useSavings, type DepositSource } from "@/features/savings/api";
import { SourcePicker } from "@/features/savings/components";
import { useChildAuth } from "@/providers/auth-provider";

/** Deposit into a goal from the wallet (deposit_to_goal) or savings (deposit_savings_to_goal). */
export default function DepositToGoal() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { householdId, childProfileId } = useChildAuth();
  const toast = useToast();
  const s = useSavings(householdId, childProfileId);
  const deposit = useDepositToGoal(householdId);
  const goal = s.data?.goals.find((g) => g.id === goalId);
  const [source, setSource] = useState<DepositSource | null>(null);
  const [mode, setMode] = useState<"cycle" | "custom">("cycle");
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!s.data) return <LoadingView />;
  if (!goal) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="help-circle" title="המטרה לא נמצאה" />
      </Screen>
    );
  }

  const src = source ?? goal.auto_source;
  const deposited = s.depositedByGoal[goal.id] ?? 0;
  const remaining = Math.max(0, goal.target_amount - deposited);
  const isCompleted = goal.status === "completed";
  const sourceBalance = src === "wallet" ? s.walletBalance : s.savingsBalance;
  const customNum = /^\s*\d+\s*$/.test(customInput) ? Number(customInput) : NaN;
  const customValid = Number.isInteger(customNum) && customNum > 0;
  const amount = mode === "custom" ? (customValid ? customNum : 0) : goal.cycle_amount;
  const overSource = amount > sourceBalance;
  const overTarget = amount > remaining;
  const canDeposit = !isCompleted && amount > 0 && !overSource && !overTarget;
  const sourceWord = src === "wallet" ? "מהארנק" : "מהחיסכון";

  const ctaLabel = isCompleted
    ? "הושלם"
    : mode === "custom" && !customValid
      ? "הזינו סכום"
      : overSource
        ? src === "wallet"
          ? "אין מספיק בארנק"
          : "אין מספיק בחיסכון"
        : overTarget
          ? `נשאר רק ${remaining}`
          : `הפקד ${amount} ${sourceWord}`;

  const submit = async () => {
    if (!canDeposit || deposit.isPending) return;
    const ok = await confirmAction({
      title: `להפקיד ${amount} מטבעות למטרה "${goal.title}"?`,
      message: `המטבעות יעברו ${sourceWord} למטרה. אחרי ההפקדה יישארו לך ${sourceBalance - amount} מטבעות ב${src === "wallet" ? "ארנק" : "חיסכון"}.`,
      confirmLabel: "כן, להפקיד",
    });
    if (!ok) return;
    setError(null);
    try {
      await deposit.mutateAsync({ goalId: goal.id, amount, source: src });
      toast.success("הפקדה הצליחה!");
      router.back();
    } catch {
      setError("ההפקדה לא הצליחה. ייתכן שהיתרה השתנתה — רעננו ונסו שוב.");
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <Button
          title={ctaLabel}
          loading={deposit.isPending}
          loadingTitle="מפקיד..."
          disabled={!canDeposit}
          onPress={submit}
        />
      }
    >
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">{goal.title}</Text>
          <CoinAmount value={goal.target_amount} />
        </View>
        <ProgressBar value={deposited} max={goal.target_amount} label={`${deposited} מתוך ${goal.target_amount}`} />
        <Text variant="small">
          {deposited} מתוך {goal.target_amount} · נשארו {remaining}
        </Text>
      </View>

      <SourcePicker
        value={src}
        onChange={setSource}
        walletBalance={s.walletBalance}
        savingsBalance={s.savingsBalance}
        needed={amount}
        disabled={deposit.isPending}
      />

      <View className="gap-2">
        <Text variant="label">כמה להפקיד?</Text>
        <SegmentedControl
          label="כמה להפקיד?"
          options={[
            { value: "cycle", label: `סכום מחזורי ${goal.cycle_amount}` },
            { value: "custom", label: "סכום אחר" },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === "custom" ? (
          <TextField
            label="סכום מותאם"
            value={customInput}
            onChangeText={setCustomInput}
            keyboardType="number-pad"
            placeholder={`עד ${Math.min(sourceBalance, remaining)}`}
            ltr
            autoFocus
          />
        ) : null}
      </View>
      {error ? <InlineError message={error} /> : null}
    </Screen>
  );
}
