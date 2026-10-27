import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ChildAvatar } from "@/components/child-avatar";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { EmptyState, InlineError, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useChildrenList, useSaveChildDetails } from "@/features/children/api";
import { AvatarPicker } from "@/features/children/avatar-picker";
import { parseAvatar, serializeAvatar } from "@/lib/avatars";
import { useParentAuth } from "@/providers/auth-provider";

const MIN_BIRTHDATE = new Date(2000, 0, 1);

export default function EditChild() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { householdId } = useParentAuth();
  const list = useChildrenList(householdId);
  const child = list.data?.find((c) => c.id === childId);
  if (list.isLoading) return <LoadingView />;
  if (!child) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="help-circle" title="הילד לא נמצא" />
      </Screen>
    );
  }
  return <EditChildForm householdId={householdId} child={child} />;
}

function EditChildForm({
  householdId,
  child,
}: {
  householdId: string;
  child: { id: string; display_name: string; avatar: string | null; birthdate: string | null };
}) {
  const toast = useToast();
  const save = useSaveChildDetails(householdId);
  const initial = parseAvatar(child.avatar, child.id);
  const [iconKey, setIconKey] = useState(initial.icon.key);
  const [colorKey, setColorKey] = useState(initial.color.key);
  const [birthdate, setBirthdate] = useState<string | null>(child.birthdate);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (save.isPending) return;
    setError(null);
    const avatar = serializeAvatar(iconKey, colorKey);
    // Only send the birthdate when it changed (the web sends whatever the input holds).
    const { failed, attempted } = await save.mutateAsync({
      childId: child.id,
      avatar,
      birthdate: birthdate && birthdate !== child.birthdate ? birthdate : null,
    });
    if (failed.length > 0) {
      setError(
        failed.length < attempted
          ? `חלק מהפרטים נשמרו, אך לא הצלחנו לעדכן את ${failed.join(" ואת ")}. נסו שוב.`
          : "לא הצלחנו לשמור את השינויים. נסו שוב.",
      );
      return;
    }
    toast.success("הפרטים עודכנו");
    router.back();
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title="שמור" loading={save.isPending} loadingTitle="שומר..." onPress={submit} />}
    >
      <Text variant="heading">{child.display_name}</Text>
      <Text variant="caption">בחרו דמות וצבע, ועדכנו את תאריך הלידה לפי הצורך.</Text>
      <ChildAvatar id={child.id} avatar={serializeAvatar(iconKey, colorKey)} size="lg" />
      <AvatarPicker
        iconKey={iconKey}
        colorKey={colorKey}
        onChange={(i, c) => {
          setIconKey(i);
          setColorKey(c);
        }}
      />
      <DateField
        label="תאריך לידה"
        value={birthdate}
        onChange={setBirthdate}
        minimumDate={MIN_BIRTHDATE}
        maximumDate={new Date()}
      />
      {error ? <InlineError message={error} /> : null}
    </Screen>
  );
}
