import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { EmptyState, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useSessionTranscript } from "@/features/tutors/api";
import { formatDate } from "@/lib/format";
import { useParentAuth } from "@/providers/auth-provider";

function durationLabel(start: string, end: string | null): string | null {
  if (!end) return null;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 1) return "פחות מדקה";
  return minutes === 1 ? "דקה אחת" : `${minutes} דקות`;
}

export default function SessionTranscript() {
  const { sessionId } = useLocalSearchParams<{ tutorId: string; sessionId: string }>();
  const { householdId } = useParentAuth();
  const q = useSessionTranscript(householdId, sessionId);

  if (q.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (q.data === undefined) {
    return (
      <Screen edges={["bottom"]}>
        <LoadError message="לא הצלחנו לטעון את התמליל. בדקו את החיבור ונסו שוב." onRetry={() => void q.refetch()} />
      </Screen>
    );
  }
  if (q.data === null) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="help-circle" title="השיחה לא נמצאה" />
      </Screen>
    );
  }
  const s = q.data;
  const duration = durationLabel(s.started_at, s.ended_at);
  return (
    <Screen edges={["bottom"]} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Stack.Screen options={{ title: s.tutorName ? `שיחה עם ${s.tutorName}` : "תמליל שיחה" }} />
      <Text variant="caption">
        {s.childName} · {formatDate(s.started_at)}
        {duration ? ` · ${duration}` : ""}
      </Text>
      {s.transcript.length === 0 ? (
        <EmptyState icon="message-circle" title="אין תמליל זמין לשיחה הזו." />
      ) : (
        <View accessibilityLabel="תמליל השיחה" className="gap-2">
          {s.transcript.map((m, i) => {
            const isTutor = m.role === "assistant";
            return (
              <View
                key={i}
                className={`max-w-[85%] gap-0.5 rounded-2xl px-4 py-2 ${isTutor ? "self-start bg-accent" : "self-end bg-card border border-border"}`}
              >
                <Text variant="small" className="font-sans-semibold text-foreground">
                  {isTutor ? `${s.tutorName || "החונך"}:` : `${s.childName || "הילד"}:`}
                </Text>
                <Text variant="body">{m.content}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
