import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { StatusBadge } from "@/components/child-avatar";
import { CoinAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, InlineError, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useChildTask, useSubmitTask } from "@/features/child/api";
import { useChildAuth } from "@/providers/auth-provider";

export default function ChildTaskDetail() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { householdId } = useChildAuth();
  const toast = useToast();
  const task = useChildTask(householdId, taskId);
  const submit = useSubmitTask(householdId);
  const [error, setError] = useState<string | null>(null);

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
        <LoadError
          message="אופס, לא הצלחנו לטעון את המשימה. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void task.refetch()}
        />
      </Screen>
    );
  }
  if (task.data === null) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState
          icon="help-circle"
          title="המשימה לא נמצאה"
          description="אולי המשימה נמחקה. בואו נחזור לרשימה."
          action={<Button title="למשימות שלי" variant="outline" onPress={() => router.replace("/child/dashboard")} />}
        />
      </Screen>
    );
  }

  const t = task.data;
  return (
    <Screen
      edges={["bottom"]}
      footer={
        t.status === "assigned" ? (
          <Button
            title="סיימתי!"
            icon="check"
            variant="success"
            loading={submit.isPending}
            loadingTitle="שולח..."
            onPress={async () => {
              if (submit.isPending) return;
              setError(null);
              try {
                await submit.mutateAsync(t.id);
                toast.success("המשימה נשלחה לאישור!");
                router.replace("/child/dashboard");
              } catch {
                setError("אופס, לא הצלחנו לשלוח. נסו שוב.");
              }
            }}
          />
        ) : undefined
      }
    >
      <Card className="gap-4">
        <Text variant="title" accessibilityRole="header">
          {t.title}
        </Text>
        {t.description ? <Text variant="body">{t.description}</Text> : null}
        <View className="gap-3 border-t border-border pt-3">
          <View className="flex-row items-center justify-between">
            <Text variant="caption">תגמול</Text>
            <CoinAmount value={t.reward_amount} size="lg" />
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="caption">סטטוס</Text>
            <StatusBadge status={t.status} />
          </View>
        </View>
      </Card>
      {error ? <InlineError message={error} /> : null}
    </Screen>
  );
}
