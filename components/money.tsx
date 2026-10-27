import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";

import { LtrText, Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { coinsLabel, formatCoins, formatDate } from "@/lib/format";
import { describeTx, type DescribeTxInput } from "@/lib/transactions";

const sizeMap = {
  sm: { text: "text-sm", icon: 14 },
  md: { text: "text-base", icon: 16 },
  lg: { text: "text-xl", icon: 20 },
  xl: { text: "text-4xl", icon: 32 },
} as const;

const toneMap = {
  default: "text-coin-foreground",
  success: "text-success-text",
  muted: "text-muted-foreground",
  primary: "text-primary-foreground",
  destructive: "text-destructive",
} as const;

/** Coin icon + integer amount (1 coin = ₪1). Screen readers get "50 מטבעות". */
export function CoinAmount({
  value,
  signed = false,
  size = "md",
  tone = "default",
}: {
  value: number;
  signed?: boolean;
  size?: keyof typeof sizeMap;
  tone?: keyof typeof toneMap;
}) {
  const s = sizeMap[size];
  const label = signed && value > 0 ? `+${coinsLabel(value)}` : coinsLabel(value);
  return (
    <View accessible accessibilityLabel={label} className="flex-row items-center gap-1">
      <Feather name="disc" size={s.icon} color={colors.coin} />
      <LtrText className={`font-sans-bold ${s.text} ${toneMap[tone]}`}>
        {formatCoins(value, { signed })}
      </LtrText>
    </View>
  );
}

/** The blue balance card on the child home / wallet / savings screens. */
export function BalanceHero({
  value,
  label = "היתרה שלי",
  footnote,
}: {
  value: number;
  label?: string;
  footnote?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${coinsLabel(value)}`}
      className="items-center gap-1 rounded-3xl bg-primary px-6 py-7"
      style={{ borderCurve: "continuous" }}
    >
      <Text variant="label" className="text-primary-foreground/80">
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        <Feather name="disc" size={30} color={colors.coin} />
        <LtrText className="text-4xl font-sans-bold text-primary-foreground">
          {formatCoins(value)}
        </LtrText>
      </View>
      {footnote ? (
        <Text variant="small" className="text-primary-foreground/80">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

export interface TransactionRowTx extends DescribeTxInput {
  id: string;
  amount: number;
  created_at: string | null;
}

/** One ledger row: direction, label (describeTx), date, signed amount. */
export function TransactionRow({
  tx,
  taskTitle,
  goalTitle,
  giftSender,
  leading,
  secondaryLabel,
}: {
  tx: TransactionRowTx;
  taskTitle?: string;
  goalTitle?: string;
  giftSender?: string;
  leading?: ReactNode;
  secondaryLabel?: string;
}) {
  const positive = tx.amount > 0;
  const { icon, label } = describeTx(tx, taskTitle, goalTitle, giftSender);
  const date = tx.created_at ? formatDate(tx.created_at) : "—";
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${positive ? "+" : ""}${coinsLabel(tx.amount)}, ${secondaryLabel ? `${secondaryLabel}, ` : ""}${date}`}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
    >
      {leading ?? (
        <View
          className={`size-9 items-center justify-center rounded-full ${positive ? "bg-success/10" : "bg-destructive/10"}`}
        >
          <Feather
            name={positive ? "arrow-down-left" : "arrow-up-right"}
            size={16}
            color={positive ? colors.success : colors.destructive}
          />
        </View>
      )}
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <View className="flex-1">
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="small">{secondaryLabel ? `${secondaryLabel} · ${date}` : date}</Text>
      </View>
      <CoinAmount value={tx.amount} signed tone={positive ? "success" : "destructive"} />
    </View>
  );
}
