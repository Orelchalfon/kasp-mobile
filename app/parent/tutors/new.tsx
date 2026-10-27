import { router } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useCreateTutor, validateTutor, type TutorInput } from "@/features/tutors/api";
import { TutorFields } from "@/features/tutors/tutor-form";
import { DEFAULT_LANGUAGE, DEFAULT_VOICE_ID } from "@/lib/tutors";
import { useParentAuth } from "@/providers/auth-provider";

export default function NewTutor() {
  const { householdId, user } = useParentAuth();
  const toast = useToast();
  const create = useCreateTutor(householdId, user.id);
  const [value, setValue] = useState<TutorInput>({
    name: "",
    subject: "",
    topic: "",
    personality: "friendly",
    voice_id: DEFAULT_VOICE_ID,
    language: DEFAULT_LANGUAGE,
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateTutor>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    if (create.isPending) return;
    const next = validateTutor(value);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(null);
    try {
      await create.mutateAsync(value);
      toast.success("החונך נוצר בהצלחה");
      router.back();
    } catch {
      setFormError("שגיאה ביצירת חונך");
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title="צור חונך" loading={create.isPending} loadingTitle="יוצר..." onPress={submit} />}
    >
      <Text variant="caption">חונך קולי שהילדים יוכלו לשוחח איתו</Text>
      <TutorFields value={value} onChange={setValue} errors={errors} />
      {formError ? <InlineError message={formError} /> : null}
    </Screen>
  );
}
