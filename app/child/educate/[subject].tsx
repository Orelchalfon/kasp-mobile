import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/controls";
import { EmptyState, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { LtrText, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { colors } from "@/constants/theme";
import { useCompleteQuiz, useQuizHome, type QuizResult } from "@/features/quiz/api";
import {
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  bandForBirthdate,
  getRandomQuiz,
  isQuizSubject,
  type QuizQuestion,
  type QuizSubject,
} from "@/lib/quiz-bank";
import { useChildAuth } from "@/providers/auth-provider";

export default function QuizScreen() {
  const params = useLocalSearchParams<{ subject: string }>();
  const { householdId, childProfileId, childBirthdate } = useChildAuth();
  const home = useQuizHome(householdId, childProfileId);
  const subject = isQuizSubject(params.subject) ? params.subject : null;

  if (home.isLoading) return <LoadingView label="טוען חידון..." />;
  // Same gate as the web: the subject must be enabled by the parent.
  if (!subject || (home.data && !home.data.subjects.includes(subject))) {
    return (
      <Screen edges={["bottom"]}>
        <Stack.Screen options={{ title: "החידון לא זמין" }} />
        <EmptyState
          icon="slash"
          title="הנושא הזה לא פעיל כרגע."
          description="בקשו מההורה להפעיל אותו."
          action={<Button title="חזרה ללימוד" variant="outline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }
  return <Quiz subject={subject} band={bandForBirthdate(childBirthdate)} householdId={householdId} />;
}

function Quiz({ subject, band, householdId }: { subject: QuizSubject; band: ReturnType<typeof bandForBirthdate>; householdId: string }) {
  const toast = useToast();
  const complete = useCompleteQuiz(householdId);
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => getRandomQuiz(subject, band, QUIZ_LENGTH));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>(() => Array(QUIZ_LENGTH).fill(null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const subjectLabel = SUBJECT_LABELS_HE[subject];
  const total = questions.length;

  const restart = () => {
    const qs = getRandomQuiz(subject, band, QUIZ_LENGTH);
    setQuestions(qs);
    setPicked(Array(qs.length).fill(null));
    setIdx(0);
    setResult(null);
  };

  const submit = async () => {
    if (complete.isPending) return;
    const correct = picked.reduce<number>((acc, c, i) => (c !== null && c === questions[i]?.correctIndex ? acc + 1 : acc), 0);
    try {
      setResult(await complete.mutateAsync({ subject, correct, total }));
    } catch {
      toast.error("שגיאה בשליחת התוצאות");
    }
  };

  if (result) {
    return (
      <Screen edges={["bottom"]} contentClassName="items-center gap-4 pt-10">
        <Stack.Screen options={{ title: `חידון ב${subjectLabel}` }} />
        <ResultView result={result} subjectLabel={subjectLabel} total={total} onRetry={restart} />
      </Screen>
    );
  }

  const q = questions[idx];
  const answered = picked.filter((p) => p !== null).length;
  const hasPicked = picked[idx] !== null;
  const isLast = idx === total - 1;

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <View className="flex-row gap-2">
          <Button
            title="הקודם"
            variant="outline"
            icon="arrow-right"
            className="flex-1"
            disabled={idx === 0 || complete.isPending}
            onPress={() => setIdx((i) => i - 1)}
          />
          {isLast ? (
            <Button
              title="סיים"
              icon="check"
              className="flex-1"
              loading={complete.isPending}
              loadingTitle="שולח..."
              disabled={!hasPicked || answered < total}
              onPress={submit}
            />
          ) : (
            <Button title="הבא" className="flex-1" disabled={!hasPicked} onPress={() => setIdx((i) => i + 1)} />
          )}
        </View>
      }
    >
      <Stack.Screen options={{ title: `חידון ב${subjectLabel}` }} />
      <ProgressBar value={answered} max={total} label={`ענית על ${answered} מתוך ${total} שאלות`} />
      <Text variant="caption">
        שאלה {idx + 1} מתוך {total}
      </Text>
      <Text variant="title" className="text-xl" accessibilityRole="header">
        {q.prompt}
      </Text>
      <View accessibilityRole="radiogroup" className="gap-2">
        {q.choices.map((choice, ci) => {
          const selected = picked[idx] === ci;
          return (
            <Pressable
              key={ci}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: complete.isPending }}
              disabled={complete.isPending}
              onPress={() => setPicked((p) => p.map((v, i) => (i === idx ? ci : v)))}
              className={`min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
            >
              <Feather name={selected ? "check-circle" : "circle"} size={20} color={selected ? colors.primary : colors.mutedForeground} />
              <Text variant="body" className="flex-1">
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function ResultView({
  result,
  subjectLabel,
  total,
  onRetry,
}: {
  result: QuizResult;
  subjectLabel: string;
  total: number;
  onRetry: () => void;
}) {
  if (result.passed && result.paid) {
    return (
      <>
        <Feather name="award" size={56} color={colors.coin} />
        <Text variant="title" accessibilityRole="header">
          כל הכבוד!
        </Text>
        <Text variant="caption">עברת את החידון ב{subjectLabel}.</Text>
        <View className="w-full flex-row gap-3">
          <Delta label="לארנק" value={result.wallet_delta} />
          {result.savings_delta > 0 ? <Delta label="לחיסכון" value={result.savings_delta} /> : null}
        </View>
        <View className="w-full gap-2">
          <Button title="לארנק שלי" onPress={() => router.replace("/child/wallet")} />
          <Button title="חזרה ללימוד" variant="outline" onPress={() => router.back()} />
        </View>
      </>
    );
  }
  if (result.passed) {
    return (
      <>
        <Feather name="smile" size={56} color={colors.primary} />
        <Text variant="title" accessibilityRole="header">
          כל הכבוד!
        </Text>
        <Text variant="caption" className="text-center">
          עברת את החידון ב{subjectLabel}. היום כבר נצבר תגמול בנושא הזה — אפשר לנסות שוב מחר.
        </Text>
        <Button title="חזרה ללימוד" variant="outline" className="w-full" onPress={() => router.back()} />
      </>
    );
  }
  const passMark = Math.ceil((QUIZ_PASS_THRESHOLD_PCT / 100) * total);
  return (
    <>
      <Feather name="refresh-cw" size={48} color={colors.warning} />
      <Text variant="title" accessibilityRole="header">
        כמעט שם
      </Text>
      <Text variant="caption" className="text-center">
        ענית נכון על {result.correct} מתוך {total}. צריך לפחות {passMark} כדי לעבור — בוא ננסה שוב.
      </Text>
      <View className="w-full gap-2">
        <Button title="נסה שוב" icon="rotate-cw" onPress={onRetry} />
        <Button title="חזרה ללימוד" variant="outline" onPress={() => router.back()} />
      </View>
    </>
  );
}

function Delta({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl bg-success/10 p-4">
      <Text variant="caption">{label}</Text>
      <LtrText className="text-2xl font-sans-bold text-success-text">{`+${value}`}</LtrText>
    </View>
  );
}
