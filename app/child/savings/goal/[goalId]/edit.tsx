import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { EmptyState, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { useSavings, useUpdateGoal } from "@/features/savings/api";
import { GoalForm } from "@/features/savings/goal-form";
import { RpcError } from "@/lib/rpc";
import { useChildAuth } from "@/providers/auth-provider";

export default function EditGoal() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { householdId, childProfileId } = useChildAuth();
  const toast = useToast();
  const s = useSavings(householdId, childProfileId);
  const update = useUpdateGoal(householdId);
  const [error, setError] = useState<string | null>(null);

  if (!s.data) return <LoadingView />;
  const goal = s.data.goals.find((g) => g.id === goalId);
  if (!goal || goal.status !== "active") {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="lock" title="אי אפשר לערוך את המטרה הזו" description="מטרה שהושלמה אינה ניתנת לעריכה." />
      </Screen>
    );
  }
  const deposited = s.depositedByGoal[goal.id] ?? 0;

  return (
    <GoalForm
      goal={goal}
      deposited={deposited}
      submitLabel="שמור שינויים"
      submitting={update.isPending}
      submitError={error}
      onSubmit={async (values) => {
        setError(null);
        const completes = values.target_amount === deposited;
        try {
          await update.mutateAsync({ goalId: goal.id, values, completes });
          toast.success(completes ? "המטרה הושלמה!" : "המטרה עודכנה");
          router.back();
        } catch (e) {
          setError(
            e instanceof RpcError && e.reason === "Goal changed"
              ? "המטרה השתנתה — רעננו ונסו שוב"
              : "השמירה לא הצליחה. נסו שוב.",
          );
        }
      }}
    />
  );
}
