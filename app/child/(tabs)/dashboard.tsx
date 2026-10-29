import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { View } from "react-native";

import { SignOutButton } from "@/components/account-button";
import { StatusBadge } from "@/components/child-avatar";
import { BalanceHero, CoinAmount } from "@/components/money";
import { PressableCard, Section } from "@/components/ui/card";
import { EmptyState, InlineError, LoadError, Skeleton, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useChildHome } from "@/features/child/api";
import { useChildAuth } from "@/providers/auth-provider";

export default function ChildDashboard() {
  const { householdId, childProfileId } = useChildAuth();
  const home = useChildHome(householdId, childProfileId);

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <View className="flex-row-reverse items-center justify-end">
        <Text variant="title" accessibilityRole="header">
          ראשי
        </Text>
        <SignOutButton />
      </View>

      {home.isLoading ? (
        <>
          <Skeleton className="h-32" />
          <SkeletonList rows={3} />
        </>
      ) : !home.data ? (
        <LoadError
          message="אופס, לא הצלחנו לטעון את המסך. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void home.refetch()}
        />
      ) : (
        <>
          {home.error ? <InlineError message="לא הצלחנו לרענן. מוצגים הנתונים האחרונים." /> : null}
          <BalanceHero value={home.data.balance} />
          <Section title="המשימות שלי">
            {home.data.tasks.length === 0 ? (
              <EmptyState icon="check-square" title="אין משימות עדיין. ההורים יוסיפו בקרוב!" />
            ) : (
              <View className="gap-2">
                {home.data.tasks.map((t) => (
                  <PressableCard
                    key={t.id}
                    accessibilityLabel={`${t.title}, ${t.reward_amount} מטבעות`}
                    onPress={() => router.push({ pathname: "/child/tasks/[taskId]", params: { taskId: t.id } })}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1 gap-1.5">
                        <Text variant="label" numberOfLines={2}>
                          {t.title}
                        </Text>
                        <StatusBadge status={t.status} />
                      </View>
                      <CoinAmount value={t.reward_amount} />
                      <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                    </View>
                  </PressableCard>
                ))}
              </View>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}
