import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ChildAvatar } from "@/components/child-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipRow, confirmAction } from "@/components/ui/controls";
import { EmptyState, InlineError, LoadError, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useGiftTarget, useSubmitGift } from "@/features/gifts/api";
import {
  GIFT_MAX,
  GIFT_QUICK_AMOUNTS,
  GIFT_REASONS,
  GIFT_REASON_LABELS,
  SENDER_NAME_MAX,
  giftErrorMessage,
  isGiftToken,
  newGiftRequestId,
  rememberGiveReturn,
  type GiftReason,
} from "@/lib/gifts";
import { RpcError } from "@/lib/rpc";
import { useAuth } from "@/providers/auth-provider";

/** Opened from a gift link (kasp://give/<token>) by any adult; children are blocked. */
export default function GiveGift() {
  const { token = "" } = useLocalSearchParams<{ token: string }>();
  const auth = useAuth();
  const valid = isGiftToken(token);
  const target = useGiftTarget(token, valid);

  if (!valid || target.data === null) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState
          icon="slash"
          title="הקוד לא תקף"
          description="הקוד לא תקף, או שההורים החליפו אותו בקוד חדש. בקשו מהם לשלוח לכם את הקוד העדכני."
        />
      </Screen>
    );
  }
  if (target.isLoading || auth.isLoading) return <LoadingView />;
  if (!target.data) {
    return (
      <Screen edges={["bottom"]}>
        <LoadError message="לא הצלחנו לטעון את הקוד. בדקו את האינטרנט ונסו שוב." onRetry={() => void target.refetch()} />
      </Screen>
    );
  }

  const name = target.data.display_name;
  return (
    <Screen edges={["bottom"]}>
      <View className="items-center gap-2">
        <ChildAvatar id={token} avatar={target.data.avatar} size="lg" />
        <Text variant="title" accessibilityRole="header">
          מתנה ל{name}
        </Text>
        <Text variant="caption" className="text-center">
          המטבעות יגיעו ל{name} אחרי שההורים יאשרו שקיבלו את הכסף.
        </Text>
      </View>
      <View className="flex-row items-start gap-2 rounded-xl bg-accent p-3">
        <Feather name="info" size={16} color={colors.accentForeground} />
        <Text variant="small" className="flex-1 text-accent-foreground">
          Kasp לא מעבירה כסף אמיתי. את הכסף עצמו נותנים להורים (מזומן, ביט וכדומה), וכל מטבע שווה ₪1.
        </Text>
      </View>

      {!auth.isAuthenticated ? (
        <Card className="gap-3">
          <Text variant="body">כדי לשלוח מתנה צריך חשבון Kasp עם כתובת מייל מאומתת.</Text>
          <Button
            title="התחברות"
            icon="log-in"
            onPress={async () => {
              await rememberGiveReturn(token);
              router.push("/(auth)/sign-in");
            }}
          />
          <Button
            title="הרשמה"
            variant="outline"
            onPress={async () => {
              await rememberGiveReturn(token);
              router.push("/(auth)/sign-up");
            }}
          />
        </Card>
      ) : auth.role === "child" ? (
        <InlineError message="רק מבוגרים יכולים לשלוח מתנות." />
      ) : (
        <GiftForm
          token={token}
          childName={name}
          defaultSender={typeof auth.user?.user_metadata?.full_name === "string" ? auth.user.user_metadata.full_name : ""}
        />
      )}
    </Screen>
  );
}

function GiftForm({ token, childName, defaultSender }: { token: string; childName: string; defaultSender: string }) {
  const submit = useSubmitGift();
  const [senderName, setSenderName] = useState(defaultSender);
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState<GiftReason | null>(null);
  const [errors, setErrors] = useState<{ name?: string; amount?: string; reason?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [sentAmount, setSentAmount] = useState<number | null>(null);
  // One id per gift: a double tap or a retry of the same gift is deduplicated server-side.
  const [requestId, setRequestId] = useState(newGiftRequestId);

  const n = /^\s*\d+\s*$/.test(amountInput) ? Number(amountInput) : NaN;
  const amount = Number.isInteger(n) && n >= 1 && n <= GIFT_MAX ? n : null;

  const send = async () => {
    if (submit.isPending) return;
    const errs: typeof errors = {};
    if (!senderName.trim()) errs.name = "הזינו שם שיוצג להורים";
    if (amount === null) errs.amount = `סכום שלם בין 1 ל-${GIFT_MAX}`;
    if (!reason) errs.reason = "בחרו סיבה למתנה";
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length > 0 || amount === null || !reason) return;
    const ok = await confirmAction({
      title: `לשלוח ל${childName} מתנה של ₪${amount}?`,
      message: "המתנה תמתין לאישור ההורים. הם יאשרו אותה אחרי שיקבלו מכם את הכסף.",
      confirmLabel: "שליחה",
    });
    if (!ok) return;
    try {
      await submit.mutateAsync({ token, amount, reason, senderName: senderName.trim(), requestId });
      setSentAmount(amount);
    } catch (e) {
      setError(giftErrorMessage(e instanceof RpcError ? e.reason : ""));
    }
  };

  if (sentAmount !== null) {
    return (
      <Card className="items-center gap-3 py-8" accessibilityLiveRegion="polite">
        <Feather name="check-circle" size={48} color={colors.success} />
        <Text variant="heading" className="text-center">
          המתנה נשלחה לאישור ההורים
        </Text>
        <Text variant="caption" className="text-center">
          אחרי שההורים יאשרו, {sentAmount} מטבעות יגיעו ל{childName}. זכרו להעביר להם את הכסף עצמו.
        </Text>
        <Button
          title="שליחת מתנה נוספת"
          icon="gift"
          variant="outline"
          onPress={() => {
            setSentAmount(null);
            setAmountInput("");
            setReason(null);
            setRequestId(newGiftRequestId());
          }}
        />
      </Card>
    );
  }

  return (
    <View className="gap-5">
      <TextField
        label="השם שלכם (יוצג להורים)"
        value={senderName}
        onChangeText={setSenderName}
        placeholder="למשל: דוד דני"
        maxLength={SENDER_NAME_MAX}
        error={errors.name}
      />
      <View className="gap-2">
        <Text variant="label">סכום (מטבעות = ₪)</Text>
        <ChipRow
          label="סכומים מהירים"
          options={GIFT_QUICK_AMOUNTS.map((a) => ({ value: a, label: `₪${a}` }))}
          value={amount}
          onChange={(a) => setAmountInput(String(a))}
        />
        <TextField
          label="או סכום אחר"
          value={amountInput}
          onChangeText={setAmountInput}
          keyboardType="number-pad"
          error={errors.amount}
          ltr
        />
      </View>
      <View className="gap-2">
        <Text variant="label">לרגל מה?</Text>
        <ChipRow
          label="לרגל מה?"
          options={GIFT_REASONS.map((r) => ({ value: r, label: GIFT_REASON_LABELS[r] }))}
          value={reason}
          onChange={setReason}
        />
        {errors.reason ? (
          <Text variant="small" className="text-destructive">
            {errors.reason}
          </Text>
        ) : null}
      </View>
      {error ? <InlineError message={error} /> : null}
      <Button title="שליחת מתנה" icon="gift" loading={submit.isPending} loadingTitle="שולח..." onPress={send} />
    </View>
  );
}
