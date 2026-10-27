// Household ledger for /parent/transactions — ported from
// kaspii-web/src/routes/parent/transactions.tsx + components/monthly-summary.tsx.
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";
import { mustList } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export const PAGE_SIZE = 50;

export interface HouseholdTx {
  id: string;
  child_id: string;
  amount: number;
  type: string;
  reference_task_id: string | null;
  reference_gift_id: string | null;
  goal_id: string | null;
  created_at: string | null;
}

export interface TxPage {
  rows: HouseholdTx[];
  hasMore: boolean;
  taskTitles: Record<string, string>;
  goalTitles: Record<string, string>;
  giftSenders: Record<string, string>;
}

async function fetchTitles(rows: HouseholdTx[]) {
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const taskIds = uniq(rows.map((r) => r.reference_task_id));
  const goalIds = uniq(rows.map((r) => r.goal_id));
  const giftIds = uniq(rows.map((r) => r.reference_gift_id));
  const [tasks, goals, gifts] = await Promise.all([
    taskIds.length ? supabase.from("tasks").select("id, title").in("id", taskIds).then(mustList) : [],
    goalIds.length ? supabase.from("goals").select("id, title").in("id", goalIds).then(mustList) : [],
    giftIds.length
      ? supabase.from("gifts").select("id, sender_name").in("id", giftIds).then(mustList)
      : [],
  ]);
  return {
    taskTitles: Object.fromEntries(tasks.map((t) => [t.id, t.title])),
    goalTitles: Object.fromEntries(goals.map((g) => [g.id, g.title])),
    giftSenders: Object.fromEntries(gifts.map((g) => [g.id, g.sender_name])),
  };
}

/**
 * One page: PAGE_SIZE + 1 rows to learn whether another page exists. `id` breaks ties:
 * the 2-3 rows one RPC writes share created_at, so without it their order (and the page
 * split) can change between requests. A row inserted between pages shifts the offsets and
 * repeats a row on the next page; the screen drops it with uniqueById.
 */
export async function fetchTxPage(hh: string, childId: string | null, offset: number): Promise<TxPage> {
  let query = supabase
    .from("transactions")
    .select("id, child_id, amount, type, reference_task_id, reference_gift_id, goal_id, created_at")
    .eq("household_id", hh)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (childId) query = query.eq("child_id", childId);
  const rows = mustList(await query);
  const page = rows.slice(0, PAGE_SIZE);
  return { rows: page, hasMore: rows.length > PAGE_SIZE, ...(await fetchTitles(page)) };
}

export function useHouseholdTransactions(hh: string, childId: string | null) {
  return useInfiniteQuery({
    queryKey: qk.transactions(hh, childId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchTxPage(hh, childId, pageParam),
    getNextPageParam: (last, all) => (last.hasMore ? all.length * PAGE_SIZE : undefined),
  });
}

export interface ChildBalanceRow {
  id: string;
  display_name: string;
  avatar: string | null;
  current_balance: number;
}

/** Wallet totals come from the cached child_profiles.current_balance (as on the web). */
export function useChildBalances(hh: string) {
  return useQuery({
    queryKey: qk.children(hh),
    queryFn: async (): Promise<ChildBalanceRow[]> =>
      mustList(
        await supabase
          .from("child_profiles")
          .select("id, display_name, avatar, current_balance")
          .eq("household_id", hh)
          .order("display_name", { ascending: true }),
      ).map((c) => ({ ...c, current_balance: Number(c.current_balance ?? 0) })),
  });
}

// ---- Monthly summary ----

export interface MonthTotals {
  tasks: number;
  quizzes: number;
  gifts: number;
  manual: number;
  saved: number;
  goals: number;
}

export interface MonthTx {
  amount: number;
  type: string;
  reference_gift_id: string | null;
}

export function monthRange(offset: number, now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth() - offset, 1),
    end: new Date(now.getFullYear(), now.getMonth() - offset + 1, 1),
  };
}

/**
 * Same buckets as the web's monthly summary, with one fix: the web counted every positive
 * manual_adjustment as a "gift", including the parent's own top-ups. Here gifts are only
 * rows tagged with reference_gift_id; other positive adjustments are "manual".
 */
export function summarizeMonth(rows: MonthTx[]): MonthTotals {
  const t: MonthTotals = { tasks: 0, quizzes: 0, gifts: 0, manual: 0, saved: 0, goals: 0 };
  for (const r of rows) {
    const a = Number(r.amount);
    if (r.type === "task_reward") t.tasks += a;
    else if (r.type === "quiz_reward") t.quizzes += a;
    else if (r.type === "manual_adjustment" && a > 0) {
      if (r.reference_gift_id) t.gifts += a;
      else t.manual += a;
    } else if (r.type === "savings_credit" && a > 0) t.saved += a;
    else if (r.type === "goal_credit") t.goals += a;
  }
  return t;
}

export function useMonthlySummary(hh: string, childId: string | null, offset: number) {
  const { start, end } = monthRange(offset);
  return useQuery({
    queryKey: qk.monthlySummary(hh, childId, start.toISOString()),
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("amount, type, reference_gift_id")
        .eq("household_id", hh)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .in("type", ["task_reward", "quiz_reward", "manual_adjustment", "savings_credit", "goal_credit"]);
      if (childId) query = query.eq("child_id", childId);
      return summarizeMonth(mustList(await query));
    },
  });
}
