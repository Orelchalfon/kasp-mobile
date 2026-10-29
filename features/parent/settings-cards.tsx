// "אחוז חיסכון אוטומטי" and "לימוד וחידונים" cards. Same writes as the web:
// household_settings upsert on household_id. Each card owns its draft and resets to the
// saved values whenever the server values change (the web re-keys them on reload).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { SUBJECTS, SUBJECT_LABELS_HE, type QuizSubject } from "@/lib/quiz-bank";
import { hhKey } from "@/lib/query-keys";
import { must } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export function parseIntInRange(input: string, min: number, max: number): number | null {
  if (!/^\s*-?\d+\s*$/.test(input)) return null;
  const n = Number(input);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function SavingsPercentCard({ householdId, savedPct }: { householdId: string; savedPct: number }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [input, setInput] = useState(String(savedPct));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setInput(String(savedPct)), [savedPct]);

  const save = useMutation({
    mutationFn: async (pct: number) =>
      must(
        await supabase
          .from("household_settings")
          .upsert({ household_id: householdId, savings_percentage: pct }, { onConflict: "household_id" }),
      ),
    onSuccess: () => toast.success("אחוז החיסכון עודכן"),
    onError: () => toast.error("שגיאה בשמירה"),
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(householdId) }),
  });

  const submit = () => {
    const n = parseIntInRange(input, 0, 100);
    if (n === null) {
      setError("אחוז חייב להיות מספר שלם בין 0 ל-100");
      return;
    }
    setError(null);
    save.mutate(n);
  };

  return (
    <Card className="gap-3">
      <View className="gap-1">
        <Text variant="heading">אחוז חיסכון אוטומטי</Text>
        <Text variant="caption">
          כל אישור משימה יעביר אחוז זה מהתגמול לחיסכון של הילד
          {savedPct > 0 ? ` (כרגע ${savedPct}%)` : ""}
        </Text>
      </View>
      <TextField
        label="אחוז (0-100)"
        value={input}
        onChangeText={setInput}
        keyboardType="number-pad"
        error={error}
        ltr
      />
      <Button
        title="שמור"
        loading={save.isPending}
        loadingTitle="שומר..."
        disabled={input === String(savedPct)}
        onPress={submit}
      />
    </Card>
  );
}

export function QuizSettingsCard({
  householdId,
  savedSubjects,
  savedReward,
}: {
  householdId: string;
  savedSubjects: QuizSubject[];
  savedReward: number;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [subjects, setSubjects] = useState<QuizSubject[]>(savedSubjects);
  const [rewardInput, setRewardInput] = useState(String(savedReward));
  const [error, setError] = useState<string | null>(null);
  const savedKey = `${savedSubjects.join(",")}|${savedReward}`;
  useEffect(() => {
    setSubjects(savedSubjects);
    setRewardInput(String(savedReward));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const dirty =
    rewardInput !== String(savedReward) ||
    subjects.length !== savedSubjects.length ||
    subjects.some((s) => !savedSubjects.includes(s));

  const save = useMutation({
    mutationFn: async (vars: { subjects: QuizSubject[]; reward: number }) =>
      must(
        await supabase.from("household_settings").upsert(
          { household_id: householdId, quiz_subjects: vars.subjects, quiz_reward_amount: vars.reward },
          { onConflict: "household_id" },
        ),
      ),
    onSuccess: () => toast.success("הגדרות הלימוד נשמרו"),
    onError: () => toast.error("שגיאה בשמירה"),
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(householdId) }),
  });

  const submit = () => {
    const n = parseIntInRange(rewardInput, 0, 1000);
    if (n === null) {
      setError("תגמול חייב להיות מספר שלם בין 0 ל-1000");
      return;
    }
    setError(null);
    // Keep the canonical subject order, like the web's checkbox list.
    save.mutate({ subjects: SUBJECTS.filter((s) => subjects.includes(s)), reward: n });
  };

  const toggle = (s: QuizSubject) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <Card className="gap-3">
      <View className="gap-1">
        <Text variant="heading">לימוד וחידונים</Text>
        <Text variant="caption">
          בחרו נושאים והגדירו תגמול לחידון שעבר בהצלחה. הילד יוכל לזכות בתגמול פעם ביום לכל נושא.
          אחוז החיסכון של המשפחה יחול גם על תגמולי חידון.
        </Text>
      </View>
      <Text variant="label">נושאים פעילים</Text>
      <View className="flex-row flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const checked = subjects.includes(s);
          return (
            <Pressable
              key={s}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => toggle(s)}
              className={`min-h-11 flex-row items-center gap-2 rounded-full border px-4 ${checked ? "border-primary bg-accent" : "border-border bg-card"}`}
            >
              <Feather
                name={checked ? "check-square" : "square"}
                size={16}
                color={checked ? colors.primary : colors.mutedForeground}
              />
              <Text variant="label">{SUBJECT_LABELS_HE[s]}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label="תגמול לחידון שעבר (מטבעות)"
        value={rewardInput}
        onChangeText={setRewardInput}
        keyboardType="number-pad"
        error={error}
        ltr
      />
      <Button title="שמור" loading={save.isPending} loadingTitle="שומר..." disabled={!dirty} onPress={submit} />
    </Card>
  );
}
