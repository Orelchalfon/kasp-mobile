import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { LtrText, Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useQuizHome } from "@/features/quiz/api";
import { BAND_LABELS_HE, QUIZ_LENGTH, SUBJECT_LABELS_HE, bandForBirthdate, type QuizSubject } from "@/lib/quiz-bank";
import { useChildAuth } from "@/providers/auth-provider";

const SUBJECT_ICON: Record<QuizSubject, "globe" | "hash" | "book" | "dollar-sign"> = {
  english: "globe",
  math: "hash",
  torah: "book",
  finance: "dollar-sign",
};

export default function ChildEducate() {
  const { householdId, childProfileId, childBirthdate } = useChildAuth();
  const band = bandForBirthdate(childBirthdate);
  const home = useQuizHome(householdId, childProfileId);

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          לימוד
        </Text>
        <Text variant="caption">חידון אחד מכל נושא ביום. עברת — תקבל תגמול אוטומטי.</Text>
      </View>

      {home.isLoading ? (
        <SkeletonList rows={3} />
      ) : !home.data ? (
        <LoadError
          message="אופס, לא הצלחנו לטעון את החידונים. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void home.refetch()}
        />
      ) : home.data.subjects.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="ההורה עדיין לא הגדיר נושאי לימוד."
          description="בקשו ממנו להפעיל לפחות נושא אחד בלוח הבקרה."
        />
      ) : (
        <View className="gap-3">
          {home.data.subjects.map((s) => {
            const earned = home.data.paidToday.has(s);
            return (
              <Card key={s} className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="size-11 items-center justify-center rounded-xl bg-accent">
                    <Feather name={SUBJECT_ICON[s]} size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text variant="heading">{SUBJECT_LABELS_HE[s]}</Text>
                    <Text variant="small">
                      חידון של {QUIZ_LENGTH} שאלות · רמת {BAND_LABELS_HE[band]}
                    </Text>
                  </View>
                  <View
                    accessible
                    accessibilityLabel={`תגמול ${home.data.reward} מטבעות`}
                    className="flex-row items-center gap-1 rounded-full bg-coin/20 px-2 py-1"
                  >
                    <Feather name="disc" size={12} color={colors.coinForeground} />
                    <LtrText variant="small" className="font-sans-semibold text-coin-foreground">
                      {`+${home.data.reward}`}
                    </LtrText>
                  </View>
                </View>
                {earned ? (
                  <View className="flex-row items-center justify-between rounded-xl bg-success/10 px-3 py-2">
                    <View className="flex-row items-center gap-1">
                      <Feather name="check" size={14} color={colors.successText} />
                      <Text variant="label" className="text-success-text">
                        נצבר היום
                      </Text>
                    </View>
                    <Text variant="small" className="text-success-text">
                      חזרו מחר
                    </Text>
                  </View>
                ) : (
                  <Button
                    title="התחל חידון"
                    icon="play"
                    onPress={() => router.push({ pathname: "/child/educate/[subject]", params: { subject: s } })}
                  />
                )}
              </Card>
            );
          })}
          <Text variant="small" className="text-center">
            רענון יומי. אם לא הצלחת — תוכל לנסות שוב מיד.
          </Text>
        </View>
      )}
    </Screen>
  );
}
