import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { ChipRow } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useHouseholdMutation } from "@/features/parent/dashboard-api";
import { createTask, useChildOptions, validateNewTask, type NewTaskErrors } from "@/features/parent/tasks-api";
import { useParentAuth } from "@/providers/auth-provider";

export default function NewTask() {
  const { householdId, user } = useParentAuth();
  const toast = useToast();
  const children = useChildOptions(householdId);
  const [childId, setChildId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardInput, setRewardInput] = useState("");
  const [errors, setErrors] = useState<NewTaskErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = useHouseholdMutation(householdId, createTask);

  const list = children.data ?? [];
  const selectedChild = childId ?? (list.length === 1 ? list[0].id : null);

  const submit = async () => {
    if (create.isPending) return;
    const { errors: next, reward } = validateNewTask({ childId: selectedChild, title, rewardInput });
    setErrors(next);
    if (Object.keys(next).length > 0 || reward === null || !selectedChild) return;
    setFormError(null);
    try {
      await create.mutateAsync({
        householdId,
        parentUserId: user.id,
        childId: selectedChild,
        title,
        description,
        reward,
      });
      toast.success("המשימה נוצרה בהצלחה");
      router.back();
    } catch {
      setFormError("שגיאה ביצירת משימה");
    }
  };

  if (children.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <SkeletonList rows={4} />
      </Screen>
    );
  }
  if (!children.data) {
    return (
      <Screen edges={["bottom"]}>
        <LoadError
          message="אופס, לא הצלחנו לטעון את רשימת הילדים. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void children.refetch()}
        />
      </Screen>
    );
  }
  if (list.length === 0) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState
          icon="user-plus"
          title="צריך להוסיף ילד לפני יצירת משימה."
          action={<Button title="הוסיפו ילד" onPress={() => router.replace("/parent/children/new")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title="צור משימה" loading={create.isPending} loadingTitle="יוצר..." onPress={submit} />}
    >
      <View className="gap-2">
        <Text variant="label">ילד</Text>
        <ChipRow
          label="ילד"
          options={list.map((c) => ({ value: c.id, label: c.display_name }))}
          value={selectedChild}
          onChange={setChildId}
        />
        {errors.child ? (
          <Text variant="small" className="text-destructive">
            {errors.child}
          </Text>
        ) : null}
      </View>
      <TextField label="כותרת המשימה" value={title} onChangeText={setTitle} placeholder="לסדר את החדר" error={errors.title} />
      <TextField
        label="תיאור (אופציונלי)"
        value={description}
        onChangeText={setDescription}
        placeholder="פרטים נוספים על המשימה..."
        multiline
      />
      <TextField
        label="תגמול במטבעות"
        value={rewardInput}
        onChangeText={setRewardInput}
        keyboardType="number-pad"
        hint="כמה מטבעות הילד יקבל אחרי שהמשימה תאושר"
        error={errors.reward}
        ltr
      />
      {formError ? <InlineError message={formError} /> : null}
    </Screen>
  );
}
