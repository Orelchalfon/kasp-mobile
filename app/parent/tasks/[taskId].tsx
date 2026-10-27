import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { StatusBadge } from "@/components/child-avatar";
import { CoinAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmAction } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { approveTask, rejectTask, useHouseholdMutation } from "@/features/parent/dashboard-api";
import { useParentTask } from "@/features/parent/tasks-api";
import { useParentAuth } from "@/providers/auth-provider";

export default function ParentTaskDetail() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { householdId } = useParentAuth();
  const toast = useToast();
  const task = useParentTask(householdId, taskId);
  const approve = useHouseholdMutation(householdId, approveTask);
  const reject = useHouseholdMutation(householdId, rejectTask);
  const [error, setError] = useState<string | null>(null);
  const busy = approve.isPending || reject.isPending;

  if (task.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (task.data === undefined) {
    return (
      <Screen edges={["bottom"]}>
        <LoadError message="לא הצלחנו לטעון את המשימה. בדקו את החיבור ונסו שוב." onRetry={() => void task.refetch()} />
      </Screen>
    );
  }
  if (task.data === null) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState
          icon="help-circle"
          title="המשימה לא נמצאה"
          description="ייתכן שהמשימה נמחקה או שהקישור שגוי."
          action={<Button title="ללוח הבקרה" variant="outline" onPress={() => router.replace("/parent/dashboard")} />}
        />
      </Screen>
    );
  }

  const t = task.data;
  return (
    <Screen edges={["bottom"]} refreshing={task.isRefetching} onRefresh={() => void task.refetch()}>
      <Card className="gap-4">
        <Text variant="title" accessibilityRole="header">
          {t.title}
        </Text>
        {t.description ? <Text variant="body">{t.description}</Text> : null}
        <View className="gap-3 border-t border-border pt-3">
          <Row label="ילד">
            <Text variant="label">{t.childName ?? "—"}</Text>
          </Row>
          <Row label="תגמול">
            <CoinAmount value={t.reward_amount} />
          </Row>
          <Row label="סטטוס">
            <StatusBadge status={t.status} />
          </Row>
        </View>
      </Card>

      {error ? <InlineError message={error} /> : null}

      {t.status === "submitted" ? (
        <View className="flex-row gap-2">
          <Button
            title="אשר"
            icon="check"
            variant="success"
            className="flex-1"
            loading={approve.isPending}
            loadingTitle="מאשר..."
            disabled={busy}
            onPress={async () => {
              setError(null);
              try {
                await approve.mutateAsync(t.id);
                toast.success("המשימה אושרה והמטבעות זוכו");
              } catch {
                setError("שגיאה באישור המשימה");
              }
            }}
          />
          <Button
            title="דחה"
            icon="x"
            variant="destructive"
            className="flex-1"
            loading={reject.isPending}
            loadingTitle="דוחה..."
            disabled={busy}
            onPress={async () => {
              const ok = await confirmAction({
                title: "לדחות את המשימה?",
                message: `המשימה "${t.title}" תסומן כנדחתה והילד לא יזוכה במטבעות. לא ניתן לבטל את הדחייה.`,
                confirmLabel: "דחה משימה",
                destructive: true,
              });
              if (!ok) return;
              setError(null);
              try {
                await reject.mutateAsync(t.id);
                toast.success("המשימה נדחתה");
              } catch {
                setError("שגיאה בדחיית המשימה");
              }
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="caption">{label}</Text>
      {children}
    </View>
  );
}
