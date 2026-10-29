import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BalanceHero, TransactionRow } from "@/components/money";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadError, Skeleton, SkeletonList } from "@/components/ui/feedback";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useChildLedger } from "@/features/child/api";
import { computeWalletBalance, isWalletTx } from "@/lib/transactions";
import { useChildAuth } from "@/providers/auth-provider";

const STEP = 30;

export default function ChildWallet() {
  const { householdId, childProfileId } = useChildAuth();
  const ledger = useChildLedger(householdId, childProfileId);
  const [visible, setVisible] = useState(STEP);

  const walletRows = useMemo(() => (ledger.data?.rows ?? []).filter((r) => isWalletTx(r.type)), [ledger.data]);
  const balance = useMemo(() => computeWalletBalance(ledger.data?.rows ?? []), [ledger.data]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={ledger.data ? walletRows.slice(0, visible) : []}
        keyExtractor={(r) => r.id}
        contentContainerClassName="gap-2 px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={ledger.isRefetching}
            onRefresh={() => void ledger.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View className="gap-5 pb-3">
            <Text variant="title" accessibilityRole="header">
              הארנק שלי
            </Text>
            {ledger.isLoading ? <Skeleton className="h-32" /> : ledger.data ? <BalanceHero value={balance} /> : null}
            {ledger.data ? <Text variant="heading">היסטוריית תנועות</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            taskTitle={item.reference_task_id ? ledger.data?.taskTitles[item.reference_task_id] : undefined}
            goalTitle={item.goal_id ? ledger.data?.goalTitles[item.goal_id] : undefined}
          />
        )}
        ListEmptyComponent={
          ledger.isLoading ? (
            <SkeletonList rows={5} />
          ) : !ledger.data ? (
            <LoadError
              message="אופס, לא הצלחנו לטעון את הארנק. בדקו את האינטרנט ונסו שוב."
              onRetry={() => void ledger.refetch()}
            />
          ) : (
            <EmptyState icon="credit-card" title="אין תנועות עדיין. השלימו משימות כדי לצבור מטבעות!" />
          )
        }
        ListFooterComponent={
          walletRows.length > visible ? (
            <View className="pt-2">
              <Button title="טען עוד" variant="outline" onPress={() => setVisible((v) => v + STEP)} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
