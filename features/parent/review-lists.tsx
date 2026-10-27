import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { View } from "react-native";

import { StatusBadge } from "@/components/child-avatar";
import { CoinAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, PressableCard, Section } from "@/components/ui/card";
import { confirmAction } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/feedback";
import { LtrText, Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import type { GiftRow, OpenTaskRow } from "@/features/parent/dashboard-api";
import { formatDate } from "@/lib/format";
import { giftReasonLabel } from "@/lib/gifts";

export type ReviewAction = { id: string; kind: "approve" | "reject" } | null;

/** Open tasks (assigned + submitted); approve/reject only on submitted ones. */
export function PendingTasks({
  tasks,
  acting,
  onApprove,
  onReject,
}: {
  tasks: OpenTaskRow[];
  acting: ReviewAction;
  onApprove: (task: OpenTaskRow) => void;
  onReject: (task: OpenTaskRow) => void;
}) {
  return (
    <Section title="משימות בתור">
      {tasks.length === 0 ? (
        <EmptyState
          icon="check-square"
          title="אין משימות פתוחות לילד זה."
          action={
            <Button title="צרו משימה חדשה" variant="outline" icon="plus" onPress={() => router.push("/parent/tasks/new")} />
          }
        />
      ) : (
        <View className="gap-2">
          {tasks.map((t) => (
            <TaskReviewCard key={t.id} task={t} acting={acting} onApprove={onApprove} onReject={onReject} />
          ))}
        </View>
      )}
    </Section>
  );
}

function TaskReviewCard({
  task,
  acting,
  onApprove,
  onReject,
}: {
  task: OpenTaskRow;
  acting: ReviewAction;
  onApprove: (task: OpenTaskRow) => void;
  onReject: (task: OpenTaskRow) => void;
}) {
  const busy = acting !== null;
  const kind = acting?.id === task.id ? acting.kind : null;
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <PressableCard
        onPress={() => router.push({ pathname: "/parent/tasks/[taskId]", params: { taskId: task.id } })}
        accessibilityLabel={`פרטי המשימה ${task.title}`}
        className="border-0 p-0"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="label" numberOfLines={2}>
              {task.title}
            </Text>
            <StatusBadge status={task.status} />
          </View>
          <CoinAmount value={task.reward_amount} />
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </View>
      </PressableCard>
      {task.status === "submitted" ? (
        <View className="flex-row gap-2">
          <Button
            title="אשר"
            icon="check"
            variant="success"
            className="flex-1"
            loading={kind === "approve"}
            disabled={busy}
            accessibilityHint={`אישור ותשלום ${task.reward_amount} מטבעות`}
            onPress={() => onApprove(task)}
          />
          <Button
            title="דחה"
            icon="x"
            variant="destructive"
            className="flex-1"
            loading={kind === "reject"}
            disabled={busy}
            onPress={async () => {
              const ok = await confirmAction({
                title: "לדחות את המשימה?",
                message: `המשימה "${task.title}" תסומן כנדחתה והילד לא יזוכה במטבעות.`,
                confirmLabel: "דחה משימה",
                destructive: true,
              });
              if (ok) onReject(task);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

/** QR-code gifts waiting for the parent; approving posts them to the ledger. */
export function PendingGifts({
  gifts,
  acting,
  savingsPct,
  onApprove,
  onReject,
}: {
  gifts: GiftRow[];
  acting: ReviewAction;
  savingsPct: number;
  onApprove: (gift: GiftRow) => void;
  onReject: (gift: GiftRow) => void;
}) {
  if (gifts.length === 0) return null;
  return (
    <Section title="מתנות ממתינות לאישור">
      <View className="gap-2">
        {gifts.map((g) => {
          const busy = acting !== null;
          const kind = acting?.id === g.id ? acting.kind : null;
          const save = Math.floor((g.amount * savingsPct) / 100);
          return (
            <Card key={g.id} className="gap-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-0.5">
                  <Text variant="label">
                    {g.sender_name} · {giftReasonLabel(g.reason)}
                  </Text>
                  {g.sender_email ? <LtrText variant="small">{g.sender_email}</LtrText> : null}
                  <Text variant="small">{formatDate(g.created_at)}</Text>
                </View>
                <CoinAmount value={g.amount} />
              </View>
              <View className="flex-row gap-2">
                <Button
                  title="אשר"
                  icon="check"
                  variant="success"
                  className="flex-1"
                  loading={kind === "approve"}
                  disabled={busy}
                  onPress={async () => {
                    const ok = await confirmAction({
                      title: `קיבלתם ₪${g.amount} מ${g.sender_name}?`,
                      message: `אשרו רק אחרי שהכסף הגיע אליכם. ${
                        save > 0
                          ? `${g.amount - save} מטבעות ייכנסו לארנק ו-${save} לחיסכון.`
                          : `${g.amount} מטבעות ייכנסו לארנק.`
                      }`,
                      confirmLabel: "אישור המתנה",
                    });
                    if (ok) onApprove(g);
                  }}
                />
                <Button
                  title="דחה"
                  icon="x"
                  variant="destructive"
                  className="flex-1"
                  loading={kind === "reject"}
                  disabled={busy}
                  onPress={async () => {
                    const ok = await confirmAction({
                      title: "לדחות את המתנה?",
                      message: `המתנה מ${g.sender_name} תסומן כנדחתה והילד לא יזוכה במטבעות.`,
                      confirmLabel: "דחה מתנה",
                      destructive: true,
                    });
                    if (ok) onReject(g);
                  }}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Section>
  );
}
