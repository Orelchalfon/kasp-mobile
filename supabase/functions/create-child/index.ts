// Port of kaspii-web/src/server/create-child.ts for the mobile app.
// Same validation, same parent check, same admin.createUser call: the DB trigger
// `on_auth_user_created -> handle_new_user` reads role / household_id / full_name /
// birthdate / avatar from user_metadata and creates user_roles + child_profiles
// atomically. No rows are inserted here directly.
//
// Error codes returned as `{ error }` (mapped to Hebrew in the app):
//   unauthorized | invalid_input | not_parent | email_taken | create_failed
import { z } from "npm:zod@3.25.76";

import { adminClient, authenticate, CORS, json } from "../_shared/http.ts";

const InputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(100),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() && s >= "2000-01-01";
    }),
  avatar: z.string().max(40).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await authenticate(req);
  if (!caller) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const data = parsed.data;

  // RLS-scoped: the caller can only read their own user_roles row.
  const { data: roleRow, error: roleError } = await caller.supabase
    .from("user_roles")
    .select("role, household_id")
    .eq("user_id", caller.userId)
    .maybeSingle();
  if (roleError || !roleRow || roleRow.role !== "parent") {
    return json({ error: "not_parent" }, 403);
  }

  const { data: created, error: createErr } = await adminClient().auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      role: "child",
      household_id: roleRow.household_id,
      full_name: data.displayName,
      birthdate: data.birthdate,
      avatar: data.avatar ?? "",
    },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return json({ error: "email_taken" }, 409);
    }
    console.error("[create-child] createUser failed", createErr?.message);
    return json({ error: "create_failed" }, 500);
  }

  return json({ success: true, childUserId: created.user.id });
});
