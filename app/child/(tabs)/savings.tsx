import { router } from "expo-router";
import { View } from "react-native";

import { TransactionRow } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/card";
import { EmptyState, InlineError, LoadError, Skeleton, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useSavings } from "@/features/savings/api";
import { GoalCard, SavingsHero } from "@/features/savings/components";
import { useChildAuth } from "@/providers/auth-provider";

export default function ChildSavings() {
  const { householdId, childProfileId } = useChildAuth();
  const s = useSavings(householdId, childProfileId);

  return (
    <Screen refreshing={s.isRefetching} onRefresh={() => void s.refetch()}>
      <Text variant="title" accessibilityRole="header">
        חיסכון
      </Text>
      {s.isLoading ? (
        <>
          <Skeleton className="h-44" />
          <SkeletonList rows={3} />
        </>
      ) : !s.data ? (
        <LoadError
          message="אופס, לא הצלחנו לטעון את החיסכון. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void s.refetch()}
        />
      ) : (
        <>
          {s.error ? <InlineError message="לא הצלחנו לרענן. מוצגים הנתונים האחרונים." /> : null}
          <SavingsHero savingsBalance={s.savingsBalance} walletBalance={s.walletBalance} savingsPct={s.data.savingsPct} />

          <Section
            title="המטרות שלי"
            action={
              s.data.goals.length > 0 ? (
                <Button title="הוסף מטרה" icon="plus" size="sm" variant="outline" onPress={() => router.push("/child/savings/goal-new")} />
              ) : undefined
            }
          >
            {s.data.goals.length === 0 ? (
              <EmptyState
                icon="target"
                title="עדיין אין מטרות. על מה תרצו לחסוך?"
                action={<Button title="הוסיפו מטרה ראשונה" icon="plus" onPress={() => router.push("/child/savings/goal-new")} />}
              />
            ) : (
              <View className="gap-3">
                {s.data.goals.map((g) => (
                  <GoalCard key={g.id} goal={g} deposited={s.depositedByGoal[g.id] ?? 0} />
                ))}
              </View>
            )}
          </Section>

          {s.recentSavings.length > 0 ? (
            <Section title="חיסכון אחרון">
              <View className="gap-2">
                {s.recentSavings.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    taskTitle={tx.reference_task_id ? s.data.taskTitles[tx.reference_task_id] : undefined}
                    goalTitle={tx.goal_id ? s.goalTitles[tx.goal_id] : undefined}
                  />
                ))}
              </View>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
