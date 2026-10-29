// Data + review actions for the parent dashboard. Ported from
// kaspii-web/src/components/parent-dashboard/use-parent-dashboard-data.ts: same queries,
// balances derived from the ledger by `type`, approve via approve_task_and_pay,
// reject via a direct tasks update, gifts via approve_gift_and_pay / reject_gift.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchAllRows, fetchByIds } from "@/lib/paging";
import { isQuizSubject, type QuizSubject } from "@/lib/quiz-bank";
import { hhKey, qk } from "@/lib/query-keys";
import { must, mustList, RpcError, unwrapJson } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { isWalletTx } from "@/lib/transactions";

export interface ChildRow {
  id: string;
  display_name: string;
  avatar: string | null;
}
export interface LedgerRow {
  id: string;
  child_id: string;
  amount: number;
  reference_task_id: string | null;
  reference_gift_id: string | null;
  goal_id: string | null;
  created_at: string | null;
  type: string;
}
export interface GiftRow {
  id: string;
  child_id: string;
  sender_name: string;
  sender_email: string | null;
  reason: string;
  amount: number;
  created_at: string;
}
export interface OpenTaskRow {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  child_id: string;
  created_at: string | null;
}
export interface HouseholdSettings {
  savingsPct: number;
  quizSubjects: QuizSubject[];
  quizReward: number;
}

export interface DashboardData {
  children: ChildRow[];
  ledger: LedgerRow[];
  tasks: OpenTaskRow[];
  gifts: GiftRow[];
  settings: HouseholdSettings;
  taskTitles: Record<string, string>;
}

export function parseSettings(
  row: { savings_percentage: number; quiz_subjects: string[]; quiz_reward_amount: number } | null,
): HouseholdSettings {
  return {
    savingsPct: row?.savings_percentage ?? 0,
    quizSubjects: (row?.quiz_subjects ?? []).filter(isQuizSubject),
    quizReward: row?.quiz_reward_amount ?? 5,
  };
}

/** Wallet rows shown per child on the dashboard; task titles are only fetched for these. */
export const RECENT_TX_LIMIT = 20;

export async function fetchDashboard(hh: string): Promise<DashboardData> {
  const [children, ledger, tasks, settings, gifts] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, display_name, avatar")
      .eq("household_id", hh)
      .order("display_name", { ascending: true })
      .then(mustList),
    // Every row: balances are summed from the ledger, so a capped read would be wrong.
    fetchAllRows((from, to) =>
      supabase
        .from("transactions")
        .select("id, child_id, amount, reference_task_id, reference_gift_id, goal_id, created_at, type", {
          count: "exact",
        })
        .eq("household_id", hh)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
    supabase
      .from("tasks")
      .select("id, title, reward_amount, status, child_id, created_at")
      .eq("household_id", hh)
      .in("status", ["assigned", "submitted"])
      .order("created_at", { ascending: false })
      .then(mustList),
    supabase
      .from("household_settings")
      .select("savings_percentage, quiz_subjects, quiz_reward_amount")
      .eq("household_id", hh)
      .maybeSingle()
      .then(must),
    supabase
      .from("gifts")
      .select("id, child_id, sender_name, sender_email, reason, amount, created_at")
      .eq("household_id", hh)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .then(mustList),
  ]);

  const shown: Record<string, number> = {};
  const taskIds = new Set<string>();
  for (const t of ledger) {
    if (!isWalletTx(t.type) || (shown[t.child_id] ?? 0) >= RECENT_TX_LIMIT) continue;
    shown[t.child_id] = (shown[t.child_id] ?? 0) + 1;
    if (t.reference_task_id) taskIds.add(t.reference_task_id);
  }
  const taskTitles: Record<string, string> = {};
  const titleRows = await fetchByIds([...taskIds], (ids) =>
    supabase.from("tasks").select("id, title").in("id", ids).then(mustList),
  );
  for (const t of titleRows) taskTitles[t.id] = t.title;

  return {
    children,
    ledger,
    tasks,
    gifts,
    settings: parseSettings(settings),
    taskTitles,
  };
}

export function useDashboard(hh: string) {
  return useQuery({ queryKey: qk.dashboard(hh), queryFn: () => fetchDashboard(hh) });
}

/** Wallet / savings per child, pending-review counts — derived like the web. */
export function useDashboardDerived(data: DashboardData | undefined) {
  return useMemo(() => {
    const balances: Record<string, number> = {};
    const savings: Record<string, number> = {};
    const pending: Record<string, number> = {};
    if (!data) return { balances, savings, pending };
    for (const c of data.children) {
      balances[c.id] = 0;
      savings[c.id] = 0;
    }
    for (const tx of data.ledger) {
      if (isWalletTx(tx.type)) balances[tx.child_id] = (balances[tx.child_id] ?? 0) + tx.amount;
      else if (tx.type === "savings_credit") savings[tx.child_id] = (savings[tx.child_id] ?? 0) + tx.amount;
    }
    for (const t of data.tasks) {
      if (t.status === "submitted") pending[t.child_id] = (pending[t.child_id] ?? 0) + 1;
    }
    for (const g of data.gifts) pending[g.child_id] = (pending[g.child_id] ?? 0) + 1;
    return { balances, savings, pending };
  }, [data]);
}

// ---- Mutations (no retries, no offline queueing: see lib/query-client.ts) ----

export async function approveTask(taskId: string): Promise<void> {
  const { data, error } = await supabase.rpc("approve_task_and_pay", { p_task_id: taskId });
  must({ data, error });
}

/**
 * Same direct update as the web. Guarded on status='submitted' so a task that was
 * approved concurrently can't be flipped to rejected after it was paid.
 */
export async function rejectTask(taskId: string): Promise<void> {
  const rows = mustList(
    await supabase
      .from("tasks")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("status", "submitted")
      .select("id"),
  );
  if (rows.length === 0) throw new RpcError("Task is not submitted");
}

export async function approveGift(giftId: string) {
  return unwrapJson<{ success: boolean; already_approved?: boolean }>(
    await supabase.rpc("approve_gift_and_pay", { _gift_id: giftId }),
  );
}

export async function rejectGift(giftId: string) {
  return unwrapJson<{ success: boolean }>(await supabase.rpc("reject_gift", { _gift_id: giftId }));
}

export async function manualAdjustment(childId: string, amount: number) {
  return unwrapJson<{ success: boolean; amount: number }>(
    await supabase.rpc("manual_adjustment", { _child_id: childId, _amount: amount }),
  );
}

/** Invalidate everything in the household after any money move or task change. */
export function useHouseholdMutation<TVars, TResult>(
  hh: string,
  fn: (vars: TVars) => Promise<TResult>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }),
  });
}
