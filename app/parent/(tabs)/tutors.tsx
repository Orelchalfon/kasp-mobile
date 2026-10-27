import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { PressableCard } from "@/components/ui/card";
import { EmptyState, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useTutors } from "@/features/tutors/api";
import { PERSONALITY_LABELS_HE } from "@/lib/tutors";
import { useParentAuth } from "@/providers/auth-provider";

export default function ParentTutors() {
  const { householdId } = useParentAuth();
  const tutors = useTutors(householdId, false);
  const [showInactive, setShowInactive] = useState(false);
  const all = tutors.data ?? [];
  const inactiveCount = all.filter((t) => !t.active).length;
  const visible = showInactive ? all : all.filter((t) => t.active);

  return (
    <Screen refreshing={tutors.isRefetching} onRefresh={() => void tutors.refetch()}>
      <View className="flex-row items-center justify-between">
        <Text variant="title" accessibilityRole="header">
          חונכים
        </Text>
        <Button title="חונך חדש" icon="plus" size="sm" onPress={() => router.push("/parent/tutors/new")} />
      </View>
      {tutors.isLoading ? (
        <SkeletonList rows={3} />
      ) : !tutors.data ? (
        <LoadError
          message="אופס, לא הצלחנו לטעון את רשימת החונכים. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void tutors.refetch()}
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon="headphones"
          title="עדיין לא יצרתם חונכים."
          action={<Button title="צרו חונך ראשון" onPress={() => router.push("/parent/tutors/new")} />}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="eye-off"
          title="כל החונכים הוסרו."
          action={<Button title={`הצג חונכים שהוסרו (${inactiveCount})`} variant="outline" onPress={() => setShowInactive(true)} />}
        />
      ) : (
        <View className="gap-2">
          {visible.map((t) => (
            <PressableCard
              key={t.id}
              accessibilityLabel={`${t.name}, ${t.subject}${t.active ? "" : ", לא פעיל"}`}
              onPress={() => router.push({ pathname: "/parent/tutors/[tutorId]", params: { tutorId: t.id } })}
            >
              <View className="flex-row items-center gap-3">
                <View className="size-11 items-center justify-center rounded-xl bg-accent">
                  <Feather name="headphones" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text variant="heading">{t.name}</Text>
                  <Text variant="small" numberOfLines={1}>
                    {t.subject} · {t.topic}
                  </Text>
                  <Text variant="small">{PERSONALITY_LABELS_HE[t.personality]}</Text>
                </View>
                {!t.active ? (
                  <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text variant="small">לא פעיל</Text>
                  </View>
                ) : null}
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              </View>
            </PressableCard>
          ))}
          {inactiveCount > 0 ? (
            <Button
              title={showInactive ? "הסתר חונכים שהוסרו" : `הצג גם חונכים שהוסרו (${inactiveCount})`}
              variant="ghost"
              onPress={() => setShowInactive((s) => !s)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
