// Child savings + goals — ported from kaspii-web/src/components/savings/use-savings-data.ts
// and the deposit/goal dialogs. All money moves go through the existing RPCs
// (deposit_to_savings, deposit_to_goal, deposit_savings_to_goal); goal create/edit are
// the same direct table writes the web makes (allowed by RLS, schedule owned by a trigger).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { GoalFormValues } from "@/features/savings/goal-schema";
import { hhKey, qk } from "@/lib/query-keys";
import { must, mustList, RpcError, unwrapJson } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { computeGoalDeposits, computeSavingsBalance, computeWalletBalance } from "@/lib/transactions";

export type CyclePeriod = "day" | "week" | "month";
export type DepositSource = "wallet" | "savings";

export interface GoalRow {
  id: string;
  title: string;
  target_amount: number;
  cycle_amount: number;
  cycle_period: CyclePeriod;
  status: "active" | "completed" | "cancelled";
  auto_deposit: boolean;
  auto_source: DepositSource;
  /** Asia/Jerusalem date (YYYY-MM-DD) of the next auto deposit; set by a DB trigger. */
  next_auto_deposit_on: string | null;
  last_auto_status: "deposited" | "insufficient" | null;
}

export interface SavingsTx {
  id: string;
  amount: number;
  type: string;
  goal_id: string | null;
  reference_task_id: string | null;
  reference_gift_id: string | null;
  created_at: string | null;
}

export const periodLabel: Record<CyclePeriod, string> = { day: "יום", week: "שבוע", month: "חודש" };
export const sourceFromLabel: Record<DepositSource, string> = { wallet: "מהארנק", savings: "מהחיסכון" };

async function fetchSavings(hh: string, childId: string) {
  const [goals, txs, settings] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, title, target_amount, cycle_amount, cycle_period, status, auto_deposit, auto_source, next_auto_deposit_on, last_auto_status",
      )
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .then(mustList),
    supabase
      .from("transactions")
      .select("id, amount, type, goal_id, reference_task_id, reference_gift_id, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .then(mustList),
    supabase.from("household_settings").select("savings_percentage").eq("household_id", hh).maybeSingle().then(must),
  ]);
  const taskIds = [
    ...new Set(
      txs.filter((t) => t.type === "savings_credit" && t.reference_task_id).map((t) => t.reference_task_id as string),
    ),
  ];
  const taskTitles: Record<string, string> = {};
  if (taskIds.length > 0) {
    for (const t of await supabase.from("tasks").select("id, title").in("id", taskIds).then(mustList)) {
      taskTitles[t.id] = t.title;
    }
  }
  return {
    goals: goals as GoalRow[],
    txs: txs as SavingsTx[],
    savingsPct: settings?.savings_percentage ?? 0,
    taskTitles,
  };
}

export function useSavings(hh: string, childId: string) {
  const query = useQuery({ queryKey: qk.savings(hh, childId), queryFn: () => fetchSavings(hh, childId) });
  const derived = useMemo(() => {
    const txs = query.data?.txs ?? [];
    const goals = query.data?.goals ?? [];
    return {
      walletBalance: computeWalletBalance(txs),
      savingsBalance: computeSavingsBalance(txs),
      depositedByGoal: computeGoalDeposits(txs),
      recentSavings: txs.filter((t) => t.type === "savings_credit").slice(0, 5),
      goalTitles: Object.fromEntries(goals.map((g) => [g.id, g.title])) as Record<string, string>,
    };
  }, [query.data]);
  return { ...query, ...derived };
}

function useHouseholdInvalidating<TVars, TResult>(hh: string, fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }) });
}

/** Wallet -> savings (child-only RPC; the caller is resolved from auth.uid()). */
export async function moveToSavings(amount: number) {
  return unwrapJson<{ success: boolean; wallet: number; savings: number }>(
    await supabase.rpc("deposit_to_savings", { _amount: amount }),
  );
}

export async function depositToGoal(vars: { goalId: string; amount: number; source: DepositSource }) {
  return unwrapJson<{ success: boolean; deposited: number; target: number }>(
    vars.source === "wallet"
      ? await supabase.rpc("deposit_to_goal", { _goal_id: vars.goalId, _amount: vars.amount })
      : await supabase.rpc("deposit_savings_to_goal", { _goal_id: vars.goalId, _amount: vars.amount }),
  );
}

export function useMoveToSavings(hh: string) {
  return useHouseholdInvalidating(hh, moveToSavings);
}

export function useDepositToGoal(hh: string) {
  return useHouseholdInvalidating(hh, depositToGoal);
}

export function useCreateGoal(hh: string) {
  return useHouseholdInvalidating(
    hh,
    async (vars: { values: GoalFormValues; childId: string; userId: string }) =>
      must(
        await supabase.from("goals").insert({
          household_id: hh,
          child_id: vars.childId,
          title: vars.values.title,
          target_amount: vars.values.target_amount,
          cycle_amount: vars.values.cycle_amount,
          cycle_period: vars.values.cycle_period,
          auto_deposit: vars.values.auto_deposit,
          auto_source: vars.values.auto_source,
          created_by: vars.userId,
        }),
      ),
  );
}

/**
 * Same update as edit-goal-dialog.tsx: guarded on status='active' so a goal a concurrent
 * deposit just completed isn't overwritten; target == deposited completes the goal.
 */
export function useUpdateGoal(hh: string) {
  return useHouseholdInvalidating(
    hh,
    async (vars: { goalId: string; values: GoalFormValues; completes: boolean }) => {
      const rows = mustList(
        await supabase
          .from("goals")
          .update({
            title: vars.values.title,
            target_amount: vars.values.target_amount,
            cycle_amount: vars.values.cycle_amount,
            cycle_period: vars.values.cycle_period,
            auto_deposit: vars.values.auto_deposit,
            auto_source: vars.values.auto_source,
            ...(vars.completes ? { status: "completed" } : {}),
          })
          .eq("id", vars.goalId)
          .eq("status", "active")
          .select("id"),
      );
      if (rows.length === 0) throw new RpcError("Goal changed");
    },
  );
}
