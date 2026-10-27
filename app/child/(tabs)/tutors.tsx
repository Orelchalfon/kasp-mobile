import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useTutors } from "@/features/tutors/api";
import { PERSONALITY_LABELS_HE } from "@/lib/tutors";
import { useChildAuth } from "@/providers/auth-provider";

export default function ChildTutors() {
  const { householdId } = useChildAuth();
  const tutors = useTutors(householdId, true);

  return (
    <Screen refreshing={tutors.isRefetching} onRefresh={() => void tutors.refetch()}>
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          חונך AI
        </Text>
        <Text variant="caption">בחרו חונך והתחילו שיחת קול.</Text>
      </View>
      {tutors.isLoading ? (
        <SkeletonList rows={3} />
      ) : !tutors.data ? (
        <LoadError
          message="אופס, לא הצלחנו לטעון את החונכים. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void tutors.refetch()}
        />
      ) : tutors.data.length === 0 ? (
        <EmptyState
          icon="headphones"
          title="ההורה עדיין לא הוסיף חונכים."
          description="בקשו ממנו ליצור חונך חדש בלוח הבקרה."
        />
      ) : (
        <View className="gap-3">
          {tutors.data.map((t) => (
            <Card key={t.id} className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="size-11 items-center justify-center rounded-xl bg-accent">
                  <Feather name="headphones" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text variant="heading">{t.name}</Text>
                  <Text variant="small">
                    {t.subject} · {PERSONALITY_LABELS_HE[t.personality]}
                  </Text>
                </View>
              </View>
              <Text variant="caption">{t.topic}</Text>
              <Button
                title="התחל שיחה"
                icon="phone"
                accessibilityHint={`שיחה עם ${t.name}`}
                onPress={() => router.push({ pathname: "/child/tutors/[tutorId]", params: { tutorId: t.id } })}
              />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
