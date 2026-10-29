import { Link } from "expo-router";
import { useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { BrandHeader } from "@/features/auth/brand-header";
import { isEmailLike, signInErrorMessage } from "@/features/auth/auth-errors";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { LtrText, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const toast = useToast();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");

  const handleSubmit = async () => {
    if (loading) return;
    if (!isEmailLike(email) || !password) {
      setError("הזינו אימייל וסיסמה");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(signInErrorMessage(authError));
      passwordRef.current?.focus();
      return;
    }
    toast.success("התחברת בהצלחה");
    // The (auth) layout redirects to "/", which routes by role (or back to a gift link).
  };

  const handleForgotPassword = async () => {
    if (!isEmailLike(email)) {
      setError("הזינו אימייל ואז לחצו על 'שכחתי סיסמה'");
      return;
    }
    setError(null);
    setResetState("sending");
    // The reset page lives on the web app (already allow-listed in Supabase Auth);
    // after choosing a new password the user signs in here as usual.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${env.webOrigin}/auth/reset-password`,
    });
    if (resetError) {
      setResetState("idle");
      setError("שגיאה בשליחת מייל איפוס. נסו שוב.");
      return;
    }
    setResetState("sent");
    toast.success("נשלח מייל לאיפוס סיסמה");
  };

  return (
    <Screen contentClassName="gap-6 pt-10">
      <BrandHeader title="התחברות" subtitle="הכנסו לחשבון Kasp שלכם" />

      <View className="gap-4">
        <TextField
          label="אימייל"
          value={email}
          onChangeText={setEmail}
          placeholder="parent@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
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
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        {error ? <InlineError message={error} /> : null}

        <Button
          title="שכחתי סיסמה"
          variant="ghost"
          size="sm"
          icon={resetState === "sent" ? "check" : "key"}
          loading={resetState === "sending"}
          loadingTitle="שולח..."
          disabled={resetState === "sent"}
          onPress={handleForgotPassword}
          className="self-start"
        />
        {resetState === "sent" ? (
          <View accessibilityLiveRegion="polite" className="gap-1">
            <Text variant="caption">שלחנו קישור לאיפוס סיסמה אל</Text>
            <LtrText variant="label">{email.trim()}</LtrText>
            <Text variant="caption">בדקו את תיבת הדואר (וגם בספאם).</Text>
          </View>
        ) : null}

        <Button title="התחברות" loading={loading} loadingTitle="מתחבר..." onPress={handleSubmit} />
      </View>

      <View className="flex-row items-center justify-center gap-1">
        <Text variant="caption">אין לכם חשבון?</Text>
        <Link href="/(auth)/sign-up" replace asChild>
          <Button title="הרשמה" variant="ghost" size="sm" />
        </Link>
      </View>
    </Screen>
  );
}
