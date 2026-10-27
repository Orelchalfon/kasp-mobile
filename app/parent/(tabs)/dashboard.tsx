import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CoinAmount, TransactionRow } from "@/components/money";
import { Button, IconButton } from "@/components/ui/button";
import { Section } from "@/components/ui/card";
import { EmptyState, InlineError, LoadError, Skeleton } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { colors } from "@/constants/theme";
import { ChildrenPicker } from "@/features/parent/children-picker";
import {
  approveGift,
  approveTask,
  rejectGift,
  rejectTask,
  useDashboard,
  useDashboardDerived,
  useHouseholdMutation,
} from "@/features/parent/dashboard-api";
import { PendingGifts, PendingTasks, type ReviewAction } from "@/features/parent/review-lists";
import { giftErrorMessage } from "@/lib/gifts";
import { RpcError } from "@/lib/rpc";
import { isWalletTx } from "@/lib/transactions";
import { useParentAuth } from "@/providers/auth-provider";

const RECENT_TX_LIMIT = 20;

export default function ParentDashboard() {
  const { householdId } = useParentAuth();
  const toast = useToast();
  const { data, error, isLoading, isRefetching, refetch } = useDashboard(householdId);
  const { balances, savings, pending } = useDashboardDerived(data);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState<ReviewAction>(null);

  const approveTaskM = useHouseholdMutation(householdId, approveTask);
  const rejectTaskM = useHouseholdMutation(householdId, rejectTask);
  const approveGiftM = useHouseholdMutation(householdId, approveGift);
  const rejectGiftM = useHouseholdMutation(householdId, rejectGift);

  const run = async (
    action: NonNullable<ReviewAction>,
    fn: () => Promise<unknown>,
    ok: string,
    fail: (e: unknown) => string,
  ) => {
    if (acting) return;
    setActing(action);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(fail(e));
    } finally {
      setActing(null);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Text variant="title" accessibilityRole="header">לוח בקרה</Text>
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <Text variant="title" accessibilityRole="header">לוח בקרה</Text>
        <LoadError
          message="אופס, לא הצלחנו לטעון את לוח הבקרה. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const selected = data.children.find((c) => c.id === selectedId) ?? data.children[0] ?? null;
  const childTasks = selected ? data.tasks.filter((t) => t.child_id === selected.id) : [];
  const childGifts = selected ? data.gifts.filter((g) => g.child_id === selected.id) : [];
  const childTx = selected
    ? data.ledger.filter((t) => t.child_id === selected.id && isWalletTx(t.type)).slice(0, RECENT_TX_LIMIT)
    : [];

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Text variant="title" accessibilityRole="header">לוח בקרה</Text>

      {error ? <InlineError message="לא הצלחנו לרענן. מוצגים הנתונים האחרונים." /> : null}

      <Section title="ילדים">
        {data.children.length === 0 ? (
          <EmptyState
            icon="user-plus"
            title="עדיין לא הוספתם ילדים."
            description="מוסיפים ילד מלשונית הפרופיל."
            action={<Button title="הוסיפו ילד ראשון" onPress={() => router.push("/parent/children/new")} />}
          />
        ) : (
          <ChildrenPicker
            childrenList={data.children}
            selectedId={selected?.id ?? null}
            pendingByChild={pending}
            onSelect={setSelectedId}
          />
        )}
      </Section>

      {selected ? (
        <View className="gap-6 border-t border-border pt-5">
          <View className="gap-3">
            <Text variant="title" className="text-xl" accessibilityRole="header">
              {selected.display_name}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1 rounded-2xl bg-card p-4">
                <Text variant="caption">יתרה בארנק</Text>
                <View className="flex-row items-center justify-between">
                  <CoinAmount value={balances[selected.id] ?? 0} size="lg" />
                  <IconButton
                    icon="edit-2"
                    label={`עדכון יתרה ידני עבור ${selected.display_name}`}
                    color={colors.primary}
                    onPress={() =>
                      router.push({ pathname: "/parent/adjust/[childId]", params: { childId: selected.id } })
                    }
                  />
                </View>
              </View>
              <View className="flex-1 gap-1 rounded-2xl bg-card p-4">
                <Text variant="caption">חיסכון</Text>
                <View className="min-h-11 justify-center">
                  <CoinAmount value={savings[selected.id] ?? 0} size="lg" />
                </View>
              </View>
            </View>
          </View>

          <PendingGifts
            gifts={childGifts}
            acting={acting}
            savingsPct={data.settings.savingsPct}
            onApprove={(g) =>
              run(
                { id: g.id, kind: "approve" },
                () => approveGiftM.mutateAsync(g.id),
                "המתנה אושרה והמטבעות זוכו",
                (e) => giftErrorMessage(e instanceof RpcError ? e.reason : ""),
              )
            }
            onReject={(g) =>
              run(
                { id: g.id, kind: "reject" },
                () => rejectGiftM.mutateAsync(g.id),
                "המתנה נדחתה",
                (e) => giftErrorMessage(e instanceof RpcError ? e.reason : ""),
              )
            }
          />

          <PendingTasks
            tasks={childTasks}
            acting={acting}
            onApprove={(t) =>
              run({ id: t.id, kind: "approve" }, () => approveTaskM.mutateAsync(t.id), "המשימה אושרה והמטבעות זוכו", () =>
                "שגיאה באישור המשימה",
              )
            }
            onReject={(t) =>
              run({ id: t.id, kind: "reject" }, () => rejectTaskM.mutateAsync(t.id), "המשימה נדחתה", () =>
                "שגיאה בדחיית המשימה",
              )
            }
          />

          <Section
            title="תנועות"
            action={
              <Button title="לכל התנועות" variant="ghost" size="sm" onPress={() => router.push("/parent/transactions")} />
            }
          >
            {childTx.length === 0 ? (
              <EmptyState icon="list" title="אין תנועות עדיין." />
            ) : (
              <View className="gap-2">
                {childTx.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    taskTitle={tx.reference_task_id ? data.taskTitles[tx.reference_task_id] : undefined}
                  />
                ))}
              </View>
            )}
          </Section>
        </View>
      ) : null}

    </Screen>
  );
}
