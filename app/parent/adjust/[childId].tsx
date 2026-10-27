import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CoinAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { confirmAction, SegmentedControl } from "@/components/ui/controls";
import { InlineError, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import {
  manualAdjustment,
  useDashboard,
  useDashboardDerived,
  useHouseholdMutation,
} from "@/features/parent/dashboard-api";
import { RpcError } from "@/lib/rpc";
import { useParentAuth } from "@/providers/auth-provider";

type Direction = "add" | "subtract";

/** Manual "+/−" on a child's wallet via the manual_adjustment RPC (parent-only, server-checked). */
export default function ManualAdjustment() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { householdId } = useParentAuth();
  const toast = useToast();
  const dashboard = useDashboard(householdId);
  const { balances } = useDashboardDerived(dashboard.data);
  const adjust = useHouseholdMutation(householdId, (amount: number) => manualAdjustment(childId, amount));
  const [direction, setDirection] = useState<Direction>("add");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const child = dashboard.data?.children.find((c) => c.id === childId);
  if (!dashboard.data) return <LoadingView />;
  if (!child) {
    return (
      <Screen edges={["bottom"]}>
        <Text variant="body">הילד לא נמצא.</Text>
      </Screen>
    );
  }

  const parsed = /^\s*\d+\s*$/.test(amountInput) ? Number(amountInput) : NaN;
  const amount = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const submit = async () => {
    if (adjust.isPending) return;
    if (amount === null) {
      setError("סכום חייב להיות מספר שלם חיובי");
      return;
    }
    if (direction === "subtract") {
      const ok = await confirmAction({
        title: `להפחית ${amount} מטבעות מ${child.display_name}?`,
        message: "המטבעות יירדו מהארנק של הילד ויופיעו אצלו כהתאמה ידנית.",
        confirmLabel: "הפחת",
        destructive: true,
      });
      if (!ok) return;
    }
    setError(null);
    try {
      await adjust.mutateAsync(direction === "subtract" ? -amount : amount);
      toast.success("היתרה עודכנה");
      router.back();
    } catch (e) {
      setError(
        e instanceof RpcError && e.reason.toLowerCase().includes("negative")
          ? "הפעולה תגרום ליתרה שלילית. בחרו סכום קטן יותר."
          : "לא ניתן לבצע את הפעולה. נסו שוב.",
      );
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <Button
          title={direction === "subtract" ? "הפחתת מטבעות" : "הוספת מטבעות"}
          variant={direction === "subtract" ? "destructive" : "primary"}
          loading={adjust.isPending}
          loadingTitle="מעדכן..."
          onPress={submit}
        />
      }
    >
      <View className="gap-1">
        <Text variant="heading">{child.display_name}</Text>
        <Text variant="caption">הוסיפו או הפחיתו מטבעות מהארנק של הילד באופן ידני.</Text>
      </View>
      <View className="flex-row items-center justify-between rounded-2xl bg-card p-4">
        <Text variant="caption">יתרה נוכחית</Text>
        <CoinAmount value={balances[child.id] ?? 0} size="lg" />
      </View>
      <SegmentedControl
        label="סוג העדכון"
        options={[
          { value: "add", label: "הוסף" },
          { value: "subtract", label: "הפחת" },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <TextField label="סכום" value={amountInput} onChangeText={setAmountInput} keyboardType="number-pad" ltr />
      {error ? <InlineError message={error} /> : null}
    </Screen>
  );
}
