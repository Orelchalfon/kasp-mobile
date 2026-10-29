import { router } from "expo-router";
import { useState } from "react";

import { ChildAvatar } from "@/components/child-avatar";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { InlineError } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { isEmailLike, PASSWORD_MIN_LENGTH } from "@/features/auth/auth-errors";
import { createChildErrorMessage, useCreateChild } from "@/features/children/api";
import { AvatarPicker } from "@/features/children/avatar-picker";
import { DEFAULT_COLOR_KEY, DEFAULT_ICON_KEY, serializeAvatar } from "@/lib/avatars";
import { RpcError } from "@/lib/rpc";
import { useParentAuth } from "@/providers/auth-provider";

const MIN_BIRTHDATE = new Date(2000, 0, 1);

/**
 * Creates the child's own login (email + password). Same fields and limits as the web's
 * /parent/children/new; the account is created server-side by the create-child Edge Function.
 */
export default function NewChild() {
  const { householdId } = useParentAuth();
  const toast = useToast();
  const create = useCreateChild(householdId);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState(DEFAULT_ICON_KEY);
  const [colorKey, setColorKey] = useState(DEFAULT_COLOR_KEY);
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    if (create.isPending) return;
    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length > 100) next.name = "הזינו שם (עד 100 תווים)";
    if (!birthdate) next.birthdate = "בחרו תאריך לידה";
    if (!isEmailLike(email) || email.length > 255) next.email = "כתובת אימייל לא תקינה";
    if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) next.password = "סיסמה של 6 תווים לפחות";
    setErrors(next);
    if (Object.keys(next).length > 0 || !birthdate) return;
    setFormError(null);
    try {
      await create.mutateAsync({
        email: email.trim(),
        password,
        displayName: name.trim(),
        birthdate,
        avatar: serializeAvatar(iconKey, colorKey),
      });
      toast.success("הילד נוסף בהצלחה");
      router.replace("/parent/profile");
    } catch (e) {
      setFormError(createChildErrorMessage(e instanceof RpcError ? e.reason : ""));
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title="הוספת ילד" loading={create.isPending} loadingTitle="יוצר..." onPress={submit} />}
    >
      <TextField label="שם הילד" value={name} onChangeText={setName} error={errors.name} maxLength={100} />
      <ChildAvatar id="new" avatar={serializeAvatar(iconKey, colorKey)} size="lg" />
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
        error={errors.birthdate}
      />
      <Text variant="caption">פרטי ההתחברות של הילד לאפליקציה:</Text>
      <TextField
        label="אימייל של הילד"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        error={errors.email}
        ltr
      />
      <TextField
        label="סיסמה"
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="new-password"
        hint="לפחות 6 תווים"
        error={errors.password}
      />
      {formError ? <InlineError message={formError} /> : null}
    </Screen>
  );
}
