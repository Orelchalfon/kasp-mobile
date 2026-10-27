// Child home / task / wallet data — ported from kaspii-web/src/routes/child/{dashboard,
// tasks.$taskId,wallet}.tsx. Balances are derived from the child's own ledger by type.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchAllRows, fetchByIds } from "@/lib/paging";
import { hhKey, qk } from "@/lib/query-keys";
import { mustList, RpcError } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { computeWalletBalance } from "@/lib/transactions";

export interface ChildTask {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  created_at: string | null;
}

export function useChildHome(hh: string, childId: string) {
  return useQuery({
    queryKey: qk.childHome(hh, childId),
    queryFn: async () => {
      const [tx, tasks] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase
            .from("transactions")
            .select("id, amount, type", { count: "exact" })
            .eq("child_id", childId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        ),
        supabase
          .from("tasks")
          .select("id, title, reward_amount, status, created_at")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .then(mustList),
      ]);
      return { balance: computeWalletBalance(tx), tasks: tasks as ChildTask[] };
    },
  });
}

export interface ChildLedgerRow {
  id: string;
  amount: number;
  type: string;
  reference_task_id: string | null;
  reference_gift_id: string | null;
  goal_id: string | null;
  created_at: string | null;
}

/**
 * The child's full ledger plus task/goal titles. Gift rows show a generic "מתנה":
 * children can't read `gifts` (no RLS policy), so sender names never reach them.
 */
export function useChildLedger(hh: string, childId: string) {
  return useQuery({
    queryKey: qk.childLedger(hh, childId),
    queryFn: async () => {
      const rows = await fetchAllRows((from, to) =>
        supabase
          .from("transactions")
          .select("id, amount, type, reference_task_id, reference_gift_id, goal_id, created_at", { count: "exact" })
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      );
      const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
      const [tasks, goals] = await Promise.all([
        fetchByIds(uniq(rows.map((r) => r.reference_task_id)), (ids) =>
          supabase.from("tasks").select("id, title").in("id", ids).then(mustList),
        ),
        fetchByIds(uniq(rows.map((r) => r.goal_id)), (ids) =>
          supabase.from("goals").select("id, title").in("id", ids).then(mustList),
        ),
      ]);
      return {
        rows: rows as ChildLedgerRow[],
        taskTitles: Object.fromEntries(tasks.map((t) => [t.id, t.title])) as Record<string, string>,
        goalTitles: Object.fromEntries(goals.map((g) => [g.id, g.title])) as Record<string, string>,
      };
    },
  });
}

export interface ChildTaskDetail {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
}

export function useChildTask(hh: string, taskId: string) {
  return useQuery({
    queryKey: qk.task(hh, taskId),
    queryFn: async (): Promise<ChildTaskDetail | null> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, reward_amount, status")
        .eq("id", taskId)
        .maybeSingle();
      if (error) {
        if (error.code === "22P02") return null;
        throw error;
      }
      return data;
    },
  });
}

/**
 * "סיימתי!": the same direct update as the web (assigned -> submitted). No proof photo:
 * the live schema has no proof column or Storage bucket, and approval doesn't require one.
 * Guarded on status='assigned' so a double tap or stale screen can't resubmit.
 */
export async function submitTask(taskId: string): Promise<void> {
  const rows = mustList(
    await supabase
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("status", "assigned")
      .select("id"),
  );
  if (rows.length === 0) throw new RpcError("Task is not assigned");
}

export function useSubmitTask(hh: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitTask,
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }),
  });
}
