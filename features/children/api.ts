// Children management — ported from kaspii-web/src/routes/parent/children.{index,new}.tsx
// and components/gifts/child-gift-qr-dialog.tsx.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { env } from "@/lib/env";
import { hhKey, qk } from "@/lib/query-keys";
import { mustList, RpcError, unwrapJson } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export interface ChildProfileRow {
  id: string;
  display_name: string;
  user_id: string;
  birthdate: string | null;
  avatar: string | null;
}

export function useChildrenList(hh: string) {
  return useQuery({
    queryKey: [...qk.children(hh), "profiles"],
    queryFn: async (): Promise<ChildProfileRow[]> =>
      mustList(
        await supabase
          .from("child_profiles")
          .select("id, display_name, user_id, birthdate, avatar")
          .eq("household_id", hh)
          .order("display_name", { ascending: true }),
      ),
  });
}

/**
 * Avatar then (optionally) birthdate, through the parent-only RPCs (parents get no
 * direct UPDATE on child_profiles, which would expose current_balance). Returns the
 * Hebrew names of the fields that failed so the UI can report a partial save.
 */
export async function saveChildDetails(vars: {
  childId: string;
  avatar: string;
  birthdate: string | null;
}): Promise<{ failed: string[]; attempted: number }> {
  const failed: string[] = [];
  try {
    unwrapJson(await supabase.rpc("set_child_avatar", { _child_id: vars.childId, _avatar: vars.avatar }));
  } catch {
    failed.push("הדמות");
  }
  if (vars.birthdate) {
    try {
      unwrapJson(
        await supabase.rpc("set_child_birthdate", { _child_id: vars.childId, _birthdate: vars.birthdate }),
      );
    } catch {
      failed.push("תאריך הלידה");
    }
  }
  return { failed, attempted: vars.birthdate ? 2 : 1 };
}

export function useSaveChildDetails(hh: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveChildDetails,
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }),
  });
}

/** Lazily creates the child's gift link token (or rotates it). Parent-only RPC. */
export async function fetchGiftToken(childId: string, rotate: boolean): Promise<string> {
  const p = unwrapJson<{ success: boolean; token: string }>(
    await supabase.rpc("child_gift_token", { _child_id: childId, _rotate: rotate }),
  );
  if (!p.token) throw new RpcError("No token");
  return p.token;
}

export function useGiftToken(hh: string, childId: string) {
  return useQuery({ queryKey: qk.giftToken(hh, childId), queryFn: () => fetchGiftToken(childId, false) });
}

export function useRotateGiftToken(hh: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchGiftToken(childId, true),
    onSuccess: (token) => qc.setQueryData(qk.giftToken(hh, childId), token),
  });
}

// ---- Create child (Supabase Edge Function `create-child`) ----

export interface CreateChildInput {
  email: string;
  password: string;
  displayName: string;
  birthdate: string;
  avatar?: string;
}

/**
 * The web runs this as a TanStack server function with the service-role key. Mobile
 * calls the `create-child` Edge Function instead (same validation and the same
 * admin.createUser + handle_new_user trigger path). The service-role key lives only in
 * the function's environment, never in the app.
 */
export async function createChild(input: CreateChildInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    "create-child",
    { body: input },
  );
  if (error) {
    // FunctionsHttpError carries the JSON body with our Hebrew-mappable error code.
    let reason = "unavailable";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body.error) reason = body.error;
      } catch {
        // non-JSON body (e.g. function not deployed)
      }
    }
    throw new RpcError(reason, (error as { name?: string }).name);
  }
  if (!data?.success) throw new RpcError(data?.error ?? "unknown");
}

export function createChildErrorMessage(reason: string): string {
  switch (reason) {
    case "email_taken":
      return "כתובת המייל כבר רשומה. בחרו כתובת אחרת לילד.";
    case "invalid_input":
      return "חלק מהפרטים לא תקינים. בדקו את השדות ונסו שוב.";
    case "not_parent":
      return "רק הורה יכול להוסיף ילד.";
    case "unavailable":
      return `יצירת ילד מהאפליקציה עדיין לא זמינה. אפשר להוסיף ילד באתר: ${env.webOrigin}`;
    default:
      return "שגיאה ביצירת הילד. נסו שוב.";
  }
}

export function useCreateChild(hh: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createChild,
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }),
  });
}
