import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/ui/button";
import { PressableCard, Section } from "@/components/ui/card";
import { confirmAction } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { colors } from "@/constants/theme";
import {
  useTutor,
  useTutorSessions,
  useUpdateTutor,
  validateTutor,
  type SessionRow,
  type TutorInput,
  type TutorRow,
} from "@/features/tutors/api";
import { TutorFields } from "@/features/tutors/tutor-form";
import { formatDate } from "@/lib/format";
import { uniqueById } from "@/lib/paging";
import { useParentAuth } from "@/providers/auth-provider";

const SESSION_STATUS: Record<SessionRow["status"], { label: string; icon: "radio" | "check-circle" | "x-circle"; color: string }> = {
  active: { label: "בעיצומה", icon: "radio", color: colors.primary },
  completed: { label: "הסתיימה", icon: "check-circle", color: colors.successText },
  failed: { label: "נכשלה", icon: "x-circle", color: colors.destructive },
};

export default function TutorDetail() {
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();
  const { householdId } = useParentAuth();
  const tutor = useTutor(householdId, tutorId);

  if (tutor.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <SkeletonList rows={4} />
      </Screen>
    );
  }
  if (tutor.data === undefined) {
    return (
      <Screen edges={["bottom"]}>
        <LoadError
          message="אופס, לא הצלחנו לטעון את פרטי החונך. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void tutor.refetch()}
        />
      </Screen>
    );
  }
  if (tutor.data === null) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState
          icon="help-circle"
          title="החונך לא נמצא"
          description="ייתכן שהחונך נמחק או שהקישור שגוי."
          action={<Button title="לרשימת החונכים" variant="outline" onPress={() => router.replace("/parent/tutors")} />}
        />
      </Screen>
    );
  }
  return <TutorEditor key={tutor.data.id} householdId={householdId} saved={tutor.data} />;
}

function TutorEditor({ householdId, saved }: { householdId: string; saved: TutorRow }) {
  const toast = useToast();
  const update = useUpdateTutor(householdId, saved.id);
  const remove = useUpdateTutor(householdId, saved.id);
  const sessions = useTutorSessions(householdId, saved.id);
  const [value, setValue] = useState<TutorInput>({
    name: saved.name,
    subject: saved.subject,
    topic: saved.topic,
    personality: saved.personality,
    voice_id: saved.voice_id,
    language: saved.language,
  });
  const [active, setActive] = useState(saved.active);
  const [errors, setErrors] = useState<ReturnType<typeof validateTutor>>({});
  const [error, setError] = useState<string | null>(null);

  const dirty =
    active !== saved.active ||
    (Object.keys(value) as (keyof TutorInput)[]).some((k) => value[k] !== saved[k]);

  const save = async () => {
    if (update.isPending) return;
    const next = validateTutor(value);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setError(null);
    try {
      await update.mutateAsync({
        ...value,
        name: value.name.trim(),
        subject: value.subject.trim(),
        topic: value.topic.trim(),
        active,
      });
      toast.success("הפרטים נשמרו");
    } catch {
      setError("שגיאה בשמירת החונך");
    }
  };

  const sessionRows = uniqueById(sessions.data?.pages.flatMap((p) => p.rows) ?? []);
  const names = Object.assign({}, ...(sessions.data?.pages.map((p) => p.names) ?? [])) as Record<string, string>;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: saved.name }} />
      <Text variant="caption">{saved.active ? saved.subject : `${saved.subject} · לא פעיל`}</Text>
      <TutorFields value={value} onChange={setValue} errors={errors} active={active} onActiveChange={setActive} />
      {error ? <InlineError message={error} /> : null}
      <Button
        title={dirty ? "שמור שינויים" : "אין שינויים לשמירה"}
        loading={update.isPending}
        loadingTitle="שומר..."
        disabled={!dirty}
        onPress={save}
      />

      <Section title="שיחות קודמות" className="border-t border-border pt-5">
        {sessions.isLoading ? (
          <SkeletonList rows={2} />
        ) : !sessions.data ? (
          <LoadError message="לא הצלחנו לטעון את השיחות הקודמות." onRetry={() => void sessions.refetch()} />
        ) : sessionRows.length === 0 ? (
          <EmptyState icon="message-circle" title="עדיין לא היו שיחות עם החונך הזה." />
        ) : (
          <View className="gap-2">
            {sessionRows.map((s) => {
              const st = SESSION_STATUS[s.status] ?? SESSION_STATUS.completed;
              return (
                <PressableCard
                  key={s.id}
                  accessibilityLabel={`שיחה של ${names[s.child_id] ?? "ילד"}, ${formatDate(s.started_at)}, ${st.label}`}
                  onPress={() =>
                    router.push({
                      pathname: "/parent/tutors/[tutorId]/sessions/[sessionId]",
                      params: { tutorId: saved.id, sessionId: s.id },
                    })
                  }
                >
                  <View className="flex-row items-center gap-3">
                    <Feather name={st.icon} size={16} color={st.color} />
                    <View className="flex-1">
                      <Text variant="label">{names[s.child_id] ?? "ילד"}</Text>
                      <Text variant="small">
                        {formatDate(s.started_at)} · {st.label}
                      </Text>
                    </View>
                    <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                  </View>
                </PressableCard>
              );
            })}
            {sessions.hasNextPage ? (
              sessions.isFetchingNextPage ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button title="טען עוד שיחות" variant="outline" onPress={() => void sessions.fetchNextPage()} />
              )
            ) : null}
          </View>
        )}
      </Section>

      {saved.active ? (
        <Section title="אזור מסוכן" className="border-t border-border pt-5">
          <Text variant="caption">הסרת החונך תסתיר אותו מהילדים. אפשר להחזיר אותו בכל שלב דרך המתג &quot;פעיל&quot;.</Text>
          <Button
            title="הסר חונך"
            icon="trash-2"
            variant="destructive"
            loading={remove.isPending}
            loadingTitle="מסיר..."
            onPress={async () => {
              const ok = await confirmAction({
                title: `להסיר את ${saved.name}?`,
                message: "החונך יוסתר מהילדים ולא יופיע להם יותר ברשימת החונכים. ניתן להפעיל אותו מחדש דרך העריכה בכל שלב.",
                confirmLabel: "הסר חונך",
                destructive: true,
              });
              if (!ok) return;
              try {
                // Soft delete, as on the web: only flips `active`.
                await remove.mutateAsync({ active: false });
                toast.success("החונך הוסר");
                router.back();
              } catch {
                toast.error("שגיאה במחיקת החונך");
              }
            }}
          />
        </Section>
      ) : null}
    </Screen>
  );
}
