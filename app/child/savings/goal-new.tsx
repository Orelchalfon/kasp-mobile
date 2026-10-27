import { router } from "expo-router";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { useCreateGoal } from "@/features/savings/api";
import { GoalForm } from "@/features/savings/goal-form";
import { useChildAuth } from "@/providers/auth-provider";

export default function NewGoal() {
  const { householdId, childProfileId, user } = useChildAuth();
  const toast = useToast();
  const create = useCreateGoal(householdId);
  const [error, setError] = useState<string | null>(null);

  return (
    <GoalForm
      submitLabel="צור מטרה"
      submitting={create.isPending}
      submitError={error}
      onSubmit={async (values) => {
        setError(null);
        try {
          await create.mutateAsync({ values, childId: childProfileId, userId: user.id });
          toast.success("המטרה נוצרה");
          router.back();
        } catch {
          setError("שגיאה ביצירת המטרה");
        }
      }}
    />
  );
}
