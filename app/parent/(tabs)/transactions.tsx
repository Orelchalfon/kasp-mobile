import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChildAvatar } from "@/components/child-avatar";
import { CoinAmount, TransactionRow } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipRow } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { MonthlySummary } from "@/features/parent/monthly-summary";
import { useChildBalances, useHouseholdTransactions } from "@/features/parent/transactions-api";
import { uniqueById } from "@/lib/paging";
import { useParentAuth } from "@/providers/auth-provider";

const ALL = "all";

export default function ParentTransactions() {
  const { householdId } = useParentAuth();
  const [filter, setFilter] = useState<string>(ALL);
  const childId = filter === ALL ? null : filter;
  const children = useChildBalances(householdId);
  const tx = useHouseholdTransactions(householdId, childId);

  const rows = useMemo(() => uniqueById(tx.data?.pages.flatMap((p) => p.rows) ?? []), [tx.data]);
  const lookups = useMemo(() => {
    const merged = { taskTitles: {} as Record<string, string>, goalTitles: {} as Record<string, string>, giftSenders: {} as Record<string, string> };
    for (const p of tx.data?.pages ?? []) {
      Object.assign(merged.taskTitles, p.taskTitles);
      Object.assign(merged.goalTitles, p.goalTitles);
      Object.assign(merged.giftSenders, p.giftSenders);
    }
    return merged;
  }, [tx.data]);

  const childList = children.data ?? [];
  const childById = Object.fromEntries(childList.map((c) => [c.id, c]));
  const visible = childId ? childList.filter((c) => c.id === childId) : childList;
  const grandTotal = visible.reduce((s, c) => s + c.current_balance, 0);

  const header = (
    <View className="gap-5 pb-3">
      <Text variant="title" accessibilityRole="header">
        תנועות
      </Text>
      {childList.length > 1 ? (
        <ChipRow
          label="סינון לפי ילד"
          options={[{ value: ALL, label: "כל הילדים" }, ...childList.map((c) => ({ value: c.id, label: c.display_name }))]}
          value={filter}
          onChange={setFilter}
        />
      ) : null}
      <MonthlySummary householdId={householdId} childId={childId} />
      {children.data ? (
        <Card className="gap-3">
          <Text variant="heading">יתרת ארנק לפי ילד</Text>
          {visible.map((c) => (
            <View key={c.id} className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <ChildAvatar id={c.id} avatar={c.avatar} size="sm" />
                <Text variant="label">{c.display_name}</Text>
              </View>
              <CoinAmount value={c.current_balance} />
            </View>
          ))}
          {childId === null && visible.length > 1 ? (
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <Text variant="label" className="font-sans-bold">
                סה״כ ארנקים
              </Text>
              <CoinAmount value={grandTotal} size="lg" />
            </View>
          ) : null}
        </Card>
      ) : null}
      {tx.error && tx.data ? <InlineError message="לא הצלחנו לטעון את כל התנועות." /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={tx.data ? rows : []}
        keyExtractor={(r) => r.id}
        contentContainerClassName="gap-2 px-4 pb-8 pt-4"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={tx.isRefetching && !tx.isFetchingNextPage}
            onRefresh={() => {
              void tx.refetch();
              void children.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const child = childById[item.child_id];
          return (
            <TransactionRow
              tx={item}
              taskTitle={item.reference_task_id ? lookups.taskTitles[item.reference_task_id] : undefined}
              goalTitle={item.goal_id ? lookups.goalTitles[item.goal_id] : undefined}
              giftSender={item.reference_gift_id ? lookups.giftSenders[item.reference_gift_id] : undefined}
              secondaryLabel={child?.display_name}
              leading={child ? <ChildAvatar id={child.id} avatar={child.avatar} size="sm" /> : undefined}
            />
          );
        }}
        ListEmptyComponent={
          tx.isLoading ? (
            <SkeletonList rows={5} />
          ) : !tx.data ? (
            <LoadError
              message="לא הצלחנו לטעון את התנועות. בדקו את החיבור ונסו שוב."
              onRetry={() => void tx.refetch()}
            />
          ) : (
            <EmptyState
              icon="list"
              title="אין תנועות עדיין."
              action={
                filter === ALL ? (
                  <Button title="צרו משימה ראשונה" variant="outline" onPress={() => router.push("/parent/tasks/new")} />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={
          tx.hasNextPage ? (
            <View className="pt-2">
              {tx.isFetchingNextPage ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button title="טען עוד" variant="outline" onPress={() => void tx.fetchNextPage()} />
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
