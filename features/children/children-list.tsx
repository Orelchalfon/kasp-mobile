import { router } from "expo-router";
import { View } from "react-native";

import { ChildAvatar } from "@/components/child-avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadError, SkeletonList } from "@/components/ui/feedback";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import type { ChildProfileRow } from "@/features/children/api";
import { BAND_LABELS_HE, DEFAULT_BAND, ageInYears, bandForBirthdate } from "@/lib/quiz-bank";

function ageLine(birthdate: string | null): string {
  const age = birthdate ? ageInYears(birthdate) : null;
  if (!birthdate || age === null) return `תאריך לידה לא הוגדר · רמת ${BAND_LABELS_HE[DEFAULT_BAND]}`;
  return `גיל ${age} · ${BAND_LABELS_HE[bandForBirthdate(birthdate)]}`;
}

/**
 * The parent's children with their per-child configuration: avatar + birthdate (edit) and
 * the QR gift code. Ported from kaspii-web/src/routes/parent/children.index.tsx.
 */
export function ChildrenList({
  data,
  isLoading,
  onRetry,
}: {
  data: ChildProfileRow[] | undefined;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (isLoading) return <SkeletonList rows={2} />;
  if (!data) {
    return (
      <LoadError message="אופס, לא הצלחנו לטעון את רשימת הילדים. בדקו את האינטרנט ונסו שוב." onRetry={onRetry} />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="עדיין לא הוספתם ילדים."
        action={<Button title="הוסיפו ילד ראשון" onPress={() => router.push("/parent/children/new")} />}
      />
    );
  }
  return (
    <View className="gap-2">
      {data.map((child) => (
        <Card key={child.id} className="flex-row items-center gap-3">
          <ChildAvatar id={child.id} avatar={child.avatar} name={child.display_name} />
          <View className="flex-1">
            <Text variant="heading">{child.display_name}</Text>
            <Text variant="small">{ageLine(child.birthdate)}</Text>
          </View>
          <IconButton
            icon="gift"
            label={`קוד מתנה של ${child.display_name}`}
            color={colors.primary}
            onPress={() => router.push({ pathname: "/parent/children/[childId]/gift-code", params: { childId: child.id } })}
          />
          <IconButton
            icon="edit-2"
            label={`עריכת ${child.display_name}`}
            onPress={() => router.push({ pathname: "/parent/children/[childId]/edit", params: { childId: child.id } })}
          />
        </Card>
      ))}
    </View>
  );
}
