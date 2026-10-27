import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { confirmAction } from "@/components/ui/controls";
import { InlineError, LoadingView } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useMoveToSavings, useSavings } from "@/features/savings/api";
import { formatCoins } from "@/lib/format";
import { useChildAuth } from "@/providers/auth-provider";

/** Wallet -> savings via deposit_to_savings (two steps: amount, then confirm). */
export default function MoveToSavings() {
  const { householdId, childProfileId } = useChildAuth();
  const toast = useToast();
  const s = useSavings(householdId, childProfileId);
  const move = useMoveToSavings(householdId);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!s.data) return <LoadingView />;
  const wallet = s.walletBalance;

  const submit = async () => {
    if (move.isPending) return;
    const num = /^\s*\d+\s*$/.test(input) ? Number(input) : NaN;
    if (!Number.isInteger(num) || num <= 0 || num > wallet) {
      setError(num > wallet ? `אין מספיק בארנק (${wallet})` : "סכום לא תקין");
      return;
    }
    setError(null);
    const ok = await confirmAction({
      title: `להעביר ${num} מטבעות מהארנק לחיסכון?`,
      message: `אחרי ההעברה יישארו בארנק ${wallet - num} מטבעות.`,
      confirmLabel: "כן, להעביר",
    });
    if (!ok) return;
    try {
      await move.mutateAsync(num);
      toast.success("ההעברה הצליחה");
      router.back();
    } catch {
      setError("ההעברה לא הצליחה. ייתכן שהיתרה השתנתה — נסו שוב.");
    }
  };

  return (
    <Screen
      edges={["bottom"]}
      footer={<Button title="המשך" loading={move.isPending} loadingTitle="מעביר..." onPress={submit} />}
    >
      <Text variant="caption">העבירו מטבעות מהארנק לחיסכון שלכם.</Text>
      <TextField
        label="סכום"
        value={input}
        onChangeText={setInput}
        keyboardType="number-pad"
        hint={`בארנק: ${formatCoins(wallet)} מטבעות`}
        error={error}
        ltr
        autoFocus
      />
      <View className="flex-row">
        <Button
          title={`העבר הכל (${formatCoins(wallet)})`}
          variant="ghost"
          size="sm"
          disabled={wallet <= 0}
          onPress={() => setInput(String(wallet))}
        />
      </View>
      {move.isError && !error ? <InlineError message="ההעברה לא הצליחה. נסו שוב." /> : null}
    </Screen>
  );
}
