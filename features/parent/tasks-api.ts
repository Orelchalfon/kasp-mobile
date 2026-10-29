import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";
import { must, mustList } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export interface ChildOption {
  id: string;
  display_name: string;
}

export function useChildOptions(hh: string) {
  return useQuery({
    queryKey: qk.childOptions(hh),
    queryFn: async (): Promise<ChildOption[]> =>
      mustList(
        await supabase
          .from("child_profiles")
          .select("id, display_name")
          .eq("household_id", hh)
          .order("display_name", { ascending: true }),
      ),
  });
}

export interface NewTaskInput {
  householdId: string;
  parentUserId: string;
  childId: string;
  title: string;
  description: string;
  reward: number;
}

export interface NewTaskErrors {
  child?: string;
  title?: string;
  reward?: string;
}

/** Same rules as kaspii-web/src/routes/parent/tasks.new.tsx (no max, no due date). */
export function validateNewTask(input: { childId: string | null; title: string; rewardInput: string }): {
  errors: NewTaskErrors;
  reward: number | null;
} {
  const errors: NewTaskErrors = {};
  if (!input.childId) errors.child = "בחרו ילד";
  if (!input.title.trim()) errors.title = "כתבו כותרת למשימה";
  const n = /^\s*\d+\s*$/.test(input.rewardInput) ? Number(input.rewardInput) : NaN;
  const reward = Number.isInteger(n) && n > 0 ? n : null;
  if (reward === null) errors.reward = "התגמול חייב להיות מספר שלם גדול מ-0";
  return { errors, reward };
}

/** Plain insert: status defaults to 'assigned' in the DB; RLS scopes it to the household. */
export async function createTask(input: NewTaskInput): Promise<void> {
  must(
    await supabase.from("tasks").insert({
      household_id: input.householdId,
      child_id: input.childId,
      created_by_parent_id: input.parentUserId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      reward_amount: input.reward,
    }),
  );
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  child_id: string;
  childName: string | null;
}

/** null = not found (including a malformed id, Postgres 22P02, as on the web). */
export async function fetchParentTask(taskId: string): Promise<TaskDetail | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, reward_amount, status, child_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw error;
  }
  if (!data) return null;
  const child = await supabase
    .from("child_profiles")
    .select("display_name")
    .eq("id", data.child_id)
    .maybeSingle();
  return { ...data, childName: child.data?.display_name ?? null };
}

export function useParentTask(hh: string, taskId: string) {
  return useQuery({ queryKey: qk.task(hh, taskId), queryFn: () => fetchParentTask(taskId) });
}
