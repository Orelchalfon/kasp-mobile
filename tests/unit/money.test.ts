import { summarizeMonth } from "@/features/parent/transactions-api";
import { coinsLabel, formatCoins, formatShekels, jerusalemDateKey, toDateInput } from "@/lib/format";
import {
  WALLET_TX_TYPES,
  computeGoalDeposits,
  computeSavingsBalance,
  computeWalletBalance,
  describeTx,
  isWalletTx,
} from "@/lib/transactions";

describe("ledger balances (single ledger, derived by type)", () => {
  // A ₪50 task at 10% savings, a quiz payout, a QR gift, a goal deposit and a transfer.
  const ledger = [
    { type: "task_reward", amount: 50 },
    { type: "wallet_debit", amount: -5 },
    { type: "savings_credit", amount: 5 },
    { type: "quiz_reward", amount: 5 },
    { type: "manual_adjustment", amount: 20 },
    { type: "wallet_debit", amount: -10, goal_id: "g1" },
    { type: "goal_credit", amount: 10, goal_id: "g1" },
    { type: "savings_credit", amount: -3 },
    { type: "goal_credit", amount: 3, goal_id: "g1" },
  ];

  it("wallet counts exactly task_reward, manual_adjustment, wallet_debit, quiz_reward", () => {
    expect([...WALLET_TX_TYPES].sort()).toEqual(
      ["manual_adjustment", "quiz_reward", "task_reward", "wallet_debit"].sort(),
    );
    expect(computeWalletBalance(ledger)).toBe(50 - 5 + 5 + 20 - 10);
  });

  it("goal_credit and savings_credit never count toward the wallet", () => {
    expect(isWalletTx("goal_credit")).toBe(false);
    expect(isWalletTx("savings_credit")).toBe(false);
    expect(isWalletTx("goal_allocation")).toBe(false);
  });

  it("savings pot = sum of savings_credit; goal pot = goal_credit by goal", () => {
    expect(computeSavingsBalance(ledger)).toBe(2);
    expect(computeGoalDeposits(ledger)).toEqual({ g1: 13 });
  });
});

describe("describeTx labels", () => {
  it("labels gifts generically unless a sender name is provided (children never get it)", () => {
    const gift = { type: "manual_adjustment", reference_gift_id: "x" };
    expect(describeTx(gift, undefined, undefined).label).toBe("מתנה");
    expect(describeTx(gift, undefined, undefined, "סבתא").label).toBe("מתנה מסבתא");
    expect(describeTx({ type: "manual_adjustment" }, undefined, undefined).label).toBe("התאמה ידנית");
  });

  it("distinguishes auto-savings, goal deposits and manual transfers", () => {
    expect(describeTx({ type: "savings_credit", reference_task_id: "t" }, "כביסה", undefined).label).toBe(
      "חיסכון אוטומטי מכביסה",
    );
    expect(describeTx({ type: "wallet_debit", goal_id: "g" }, undefined, "אופניים").label).toBe("הפקדה: אופניים");
    expect(describeTx({ type: "wallet_debit" }, undefined, undefined).label).toBe("העברה לחיסכון");
    expect(describeTx({ type: "quiz_reward" }, undefined, undefined).label).toBe("תגמול חידון");
    expect(describeTx({ type: "task_reward" }, "כלים", undefined)).toEqual({ icon: "check-circle", label: "כלים" });
  });
});

describe("formatting (1 coin = ₪1, whole numbers)", () => {
  it("formats signed amounts like CoinAmount", () => {
    expect(formatCoins(50, { signed: true })).toBe("+50");
    expect(formatCoins(-20, { signed: true })).toBe("-20");
    expect(formatCoins(0, { signed: true })).toBe("0");
    expect(formatCoins(1250)).toBe("1,250");
    expect(formatShekels(50)).toBe("₪50");
    expect(coinsLabel(5)).toBe("5 מטבעות");
  });

  it("uses local calendar dates, never UTC-shifted", () => {
    expect(toDateInput(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("computes the Asia/Jerusalem day (the quiz payout boundary)", () => {
    // 22:30 UTC on Oct 18 is already Oct 19 in Israel (UTC+3 in October).
    expect(jerusalemDateKey(new Date(Date.UTC(2026, 9, 18, 22, 30)))).toBe("2026-10-19");
  });
});

describe("monthly summary buckets", () => {
  it("counts only reference_gift_id adjustments as gifts (web counted parent top-ups too)", () => {
    const t = summarizeMonth([
      { type: "task_reward", amount: 30, reference_gift_id: null },
      { type: "quiz_reward", amount: 5, reference_gift_id: null },
      { type: "manual_adjustment", amount: 50, reference_gift_id: "g" },
      { type: "manual_adjustment", amount: 10, reference_gift_id: null },
      { type: "manual_adjustment", amount: -4, reference_gift_id: null },
      { type: "savings_credit", amount: 8, reference_gift_id: null },
      { type: "savings_credit", amount: -2, reference_gift_id: null },
      { type: "goal_credit", amount: 6, reference_gift_id: null },
    ]);
    expect(t).toEqual({ tasks: 30, quizzes: 5, gifts: 50, manual: 10, saved: 8, goals: 6 });
  });
});
