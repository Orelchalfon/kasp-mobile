import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { InlineError } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import type { CyclePeriod, DepositSource, GoalRow } from "@/features/savings/api";
import { AutoDepositFields } from "@/features/savings/components";
import {
  goalEditSchema,
  goalSchema,
  zodIssuesToErrors,
  type GoalFormErrors,
  type GoalFormValues,
} from "@/features/savings/goal-schema";

/** Shared add/edit goal form (the web's add-goal-dialog / edit-goal-dialog). */
export function GoalForm({
  goal,
  deposited = 0,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
}: {
  /** Present when editing. */
  goal?: GoalRow;
  deposited?: number;
  submitLabel: string;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: GoalFormValues) => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : "");
  const [cycle, setCycle] = useState(goal ? String(goal.cycle_amount) : "");
  const [period, setPeriod] = useState<CyclePeriod>(goal?.cycle_period ?? "week");
  const [auto, setAuto] = useState(goal?.auto_deposit ?? false);
  const [autoSource, setAutoSource] = useState<DepositSource>(goal?.auto_source ?? "wallet");
  const [errors, setErrors] = useState<GoalFormErrors>({});

  const submit = () => {
    if (submitting) return;
    const schema = goal ? goalEditSchema(deposited) : goalSchema;
    const parsed = schema.safeParse({
      title,
      target_amount: target,
      cycle_amount: cycle,
      cycle_period: period,
      auto_deposit: auto,
      auto_source: autoSource,
    });
    if (!parsed.success) {
      setErrors(zodIssuesToErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title={submitLabel} loading={submitting} loadingTitle="שומר..." onPress={submit} />}
    >
      <Text variant="caption">
        {goal ? "אפשר לשנות את השם, היעד והסכום המחזורי." : "הגדירו יעד חיסכון וסכום קבוע להפקדה."}
      </Text>
      {submitError ? <InlineError message={submitError} /> : null}
      <TextField label="שם המטרה" value={title} onChangeText={setTitle} placeholder="אופניים חדשות" maxLength={60} error={errors.title} />
      <TextField
        label="יעד (מטבעות)"
        value={target}
        onChangeText={setTarget}
        keyboardType="number-pad"
        error={errors.target_amount}
        hint={goal && deposited > 0 ? `כבר הופקדו ${deposited} — זה היעד המינימלי` : undefined}
        ltr
      />
      <TextField label="סכום מחזורי" value={cycle} onChangeText={setCycle} keyboardType="number-pad" error={errors.cycle_amount} ltr />
      <View className="gap-2">
        <Text variant="label">תדירות</Text>
        <SegmentedControl
          label="תדירות"
          options={[
            { value: "day", label: "יום" },
            { value: "week", label: "שבוע" },
            { value: "month", label: "חודש" },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </View>
      <AutoDepositFields
        enabled={auto}
        onEnabledChange={setAuto}
        source={autoSource}
        onSourceChange={setAutoSource}
        cycleAmount={cycle}
        period={period}
        resetsSchedule={!goal || !goal.auto_deposit || period !== goal.cycle_period}
      />
    </Screen>
  );
}
