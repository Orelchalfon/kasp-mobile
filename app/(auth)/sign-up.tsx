import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { LtrText, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { colors } from "@/constants/theme";
import { isEmailLike, PASSWORD_MIN_LENGTH, signUpErrorMessage } from "@/features/auth/auth-errors";
import { BrandHeader } from "@/features/auth/brand-header";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

// Supabase rate-limits confirmation emails per address (~60 s).
const RESEND_COOLDOWN_S = 60;
const confirmRedirectTo = () => `${env.webOrigin}/auth/callback`;

/**
 * Parent sign-up (children are created by a parent). Same contract as the web:
 * auth.signUp with `household_name` metadata; the `handle_new_user` DB trigger creates
 * the household + parent role. The client never inserts those rows.
 */
export default function SignUp() {
  const toast = useToast();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!householdName.trim()) next.householdName = "הזינו שם למשפחה";
    if (!isEmailLike(email)) next.email = "כתובת אימייל לא תקינה";
    if (password.length < PASSWORD_MIN_LENGTH) next.password = "לפחות 6 תווים";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;
    setFormError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: confirmRedirectTo(),
        data: { household_name: householdName.trim() },
      },
    });
    setLoading(false);
    if (error || !data.user) {
      setFormError(signUpErrorMessage(error ?? {}));
      return;
    }
    setPassword("");
    if (data.session) {
      // Email confirmation is off on the project: already signed in.
      toast.success("החשבון נוצר בהצלחה");
      router.replace("/");
      return;
    }
    toast.success("נשלח מייל אימות לכתובת שהזנת");
    setEmailSent(true);
    setCooldown(RESEND_COOLDOWN_S);
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: confirmRedirectTo() },
    });
    setResending(false);
    if (error) {
      const rateLimited = error.status === 429 || error.message.toLowerCase().includes("rate");
      toast.error(
        rateLimited ? "שלחנו מייל ממש עכשיו. נסו שוב בעוד דקה." : "לא הצלחנו לשלוח שוב. נסו שוב.",
      );
      if (rateLimited) setCooldown(RESEND_COOLDOWN_S);
      return;
    }
    toast.success("שלחנו שוב את מייל האימות");
    setCooldown(RESEND_COOLDOWN_S);
  };

  if (emailSent) {
    return (
      <Screen contentClassName="items-center gap-4 pt-16">
        <View className="size-14 items-center justify-center rounded-2xl bg-accent">
          <Feather name="mail" size={28} color={colors.primary} />
        </View>
        <Text variant="title" className="text-center" accessibilityRole="header">
          בדקו את המייל
        </Text>
        <View className="items-center gap-1" accessibilityLiveRegion="polite">
          <Text variant="caption" className="text-center">
            שלחנו קישור אימות אל
          </Text>
          <LtrText variant="label">{email.trim()}</LtrText>
          <Text variant="caption" className="text-center">
            לחצו על הקישור כדי להפעיל את החשבון, ואז התחברו כאן. לא רואים את המייל? בדקו בספאם.
          </Text>
        </View>
        <View className="w-full gap-3">
          <Button
            title={cooldown > 0 ? `שלח שוב (${cooldown})` : "שלח שוב"}
            icon="rotate-cw"
            loading={resending}
            loadingTitle="שולח..."
            disabled={cooldown > 0}
            onPress={handleResend}
          />
          <Link href="/(auth)/sign-in" replace asChild>
            <Button title="חזרה להתחברות" variant="outline" icon="log-in" />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-6 pt-10">
      <BrandHeader title="הרשמה" subtitle="פתחו חשבון משפחתי חדש ב-Kasp" />
      <View className="gap-4">
        <TextField
          label="שם המשפחה"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="משפחת כהן"
          error={errors.householdName}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="אימייל"
          value={email}
          onChangeText={setEmail}
          placeholder="parent@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          ltr
        />
        <TextField
          ref={passwordRef}
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint="לפחות 6 תווים"
          error={errors.password}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        {formError ? <InlineError message={formError} /> : null}
        <Button title="יצירת חשבון" loading={loading} loadingTitle="נרשם..." onPress={handleSubmit} />
      </View>
      <View className="flex-row items-center justify-center gap-1">
        <Text variant="caption">כבר יש לכם חשבון?</Text>
        <Link href="/(auth)/sign-in" replace asChild>
          <Button title="התחברות" variant="ghost" size="sm" />
        </Link>
      </View>
    </Screen>
  );
}
