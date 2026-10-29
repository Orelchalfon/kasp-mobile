import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { confirmAction } from "@/components/ui/controls";
import { LoadError, Skeleton } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { LtrText, Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useChildrenList } from "@/features/children/api";
import { ChildrenList } from "@/features/children/children-list";
import { useDashboard } from "@/features/parent/dashboard-api";
import { QuizSettingsCard, SavingsPercentCard } from "@/features/parent/settings-cards";
import { hhKey } from "@/lib/query-keys";
import { must } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { useParentAuth } from "@/providers/auth-provider";

function useHouseholdName(hh: string) {
  return useQuery({
    queryKey: [...hhKey(hh), "household"],
    queryFn: async () =>
      must(await supabase.from("households").select("name").eq("id", hh).maybeSingle())?.name ?? null,
  });
}

/**
 * Parent profile: account details, the family's children and their configuration,
 * household settings, and the account actions (add child, new task, sign out).
 */
export default function ParentProfile() {
  const { householdId, user, signOut } = useParentAuth();
  const household = useHouseholdName(householdId);
  const children = useChildrenList(householdId);
  const dashboard = useDashboard(householdId);
  const settings = dashboard.data?.settings;

  return (
    <Screen
      refreshing={children.isRefetching || household.isRefetching}
      onRefresh={() => {
        void household.refetch();
        void children.refetch();
        void dashboard.refetch();
      }}
    >
      <Text variant="title" accessibilityRole="header">
        פרופיל
      </Text>

      <Card className="flex-row items-center gap-3">
        <View className="size-14 items-center justify-center rounded-full bg-accent">
          <Feather name="user" size={26} color={colors.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="heading">{household.data ?? (household.isLoading ? " " : "המשפחה שלי")}</Text>
          <Text variant="small">הורה</Text>
          {user.email ? <LtrText variant="small">{user.email}</LtrText> : null}
        </View>
      </Card>

      <View className="flex-row gap-2">
        <Button
          title="ילד חדש"
          icon="user-plus"
          className="flex-1"
          onPress={() => router.push("/parent/children/new")}
        />
        <Button
          title="משימה חדשה"
          icon="plus"
          variant="outline"
          className="flex-1"
          onPress={() => router.push("/parent/tasks/new")}
        />
      </View>

      <Section title="הילדים שלי" description="דמות, תאריך לידה וקוד מתנה לכל ילד">
        <ChildrenList data={children.data} isLoading={children.isLoading} onRetry={() => void children.refetch()} />
      </Section>

      <Section title="הגדרות משפחה" className="border-t border-border pt-5">
        {dashboard.isLoading ? (
          <Skeleton className="h-40" />
        ) : !settings ? (
          <LoadError message="לא הצלחנו לטעון את ההגדרות." onRetry={() => void dashboard.refetch()} />
        ) : (
          <>
            <SavingsPercentCard householdId={householdId} savedPct={settings.savingsPct} />
            <QuizSettingsCard
              householdId={householdId}
              savedSubjects={settings.quizSubjects}
              savedReward={settings.quizReward}
            />
          </>
        )}
      </Section>

      <Button
        title="התנתקות"
        icon="log-out"
        variant="outline"
        className="mt-2"
        onPress={async () => {
          const ok = await confirmAction({ title: "להתנתק מהחשבון?", confirmLabel: "התנתקות" });
          if (ok) await signOut();
        }}
      />
    </Screen>
  );
}
