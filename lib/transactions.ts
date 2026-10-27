// Ported from kaspii-web/src/lib/transactions.ts — keep in sync.
// The only change: `describeTx` returns an icon *name* (Feather glyph) instead of a
// lucide-react component, so it stays a pure module usable from tests and screens.
import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export type TxIconName = ComponentProps<typeof Feather>["name"];

/** Wallet = these types only. `goal_credit` / `savings_credit` live in other pots. */
export const WALLET_TX_TYPES = [
  "task_reward",
  "manual_adjustment",
  "wallet_debit",
  "quiz_reward",
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

const WALLET_TX_SET = new Set<string>(WALLET_TX_TYPES);

export function isWalletTx(type: string): boolean {
  return WALLET_TX_SET.has(type);
}

export interface BalanceTx {
  amount: number;
  type: string;
  goal_id?: string | null;
}

export function computeWalletBalance(txs: BalanceTx[]): number {
  return txs.reduce((sum, t) => (isWalletTx(t.type) ? sum + t.amount : sum), 0);
}

export function computeSavingsBalance(txs: BalanceTx[]): number {
  return txs.reduce((sum, t) => (t.type === "savings_credit" ? sum + t.amount : sum), 0);
}

export function computeGoalDeposits(txs: BalanceTx[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === "goal_credit" && t.goal_id) {
      m[t.goal_id] = (m[t.goal_id] ?? 0) + t.amount;
    }
  }
  return m;
}

export interface DescribeTxInput {
  type: string;
  reference_task_id?: string | null;
  goal_id?: string | null;
  /** Set on QR-code gift rows (manual_adjustment + its savings split). */
  reference_gift_id?: string | null;
}

export interface TxDescription {
  icon: TxIconName;
  label: string;
}

export function describeTx(
  tx: DescribeTxInput,
  taskTitle: string | undefined,
  goalTitle: string | undefined,
  /** Gift sender's name — parent views only; children never receive it. */
  giftSender?: string,
): TxDescription {
  switch (tx.type) {
    case "task_reward":
      return { icon: "check-circle", label: taskTitle ?? "תגמול ממשימה" };
    case "manual_adjustment":
      if (tx.reference_gift_id) {
        return { icon: "gift", label: giftSender ? `מתנה מ${giftSender}` : "מתנה" };
      }
      return { icon: "edit-2", label: "התאמה ידנית" };
    case "wallet_debit":
    case "savings_credit":
      if (tx.reference_gift_id) return { icon: "archive", label: "חיסכון אוטומטי ממתנה" };
      if (tx.goal_id) {
        return { icon: "target", label: goalTitle ? `הפקדה: ${goalTitle}` : "הפקדה למטרה" };
      }
      if (tx.reference_task_id) {
        return {
          icon: "archive",
          label: taskTitle ? `חיסכון אוטומטי מ${taskTitle}` : "חיסכון אוטומטי",
        };
      }
      return { icon: "archive", label: "העברה לחיסכון" };
    case "goal_credit":
      return { icon: "target", label: goalTitle ? `מטרה: ${goalTitle}` : "הפקדה למטרה" };
    case "quiz_reward":
      return { icon: "book-open", label: "תגמול חידון" };
    default:
      return { icon: "circle", label: "תנועה" };
  }
}
