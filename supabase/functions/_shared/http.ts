// Shared helpers for the Kasp Edge Functions called by the mobile app.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/**
 * Reads a key from the new JSON key maps (`SUPABASE_PUBLISHABLE_KEYS` /
 * `SUPABASE_SECRET_KEYS`, entry "default"), falling back to the legacy JWT keys, which
 * Supabase keeps working until the end of 2026.
 */
function projectKey(newVar: string, legacyVar: string): string {
  const raw = Deno.env.get(newVar);
  if (raw) {
    try {
      const key = (JSON.parse(raw) as Record<string, string>)["default"];
      if (key) return key;
    } catch {
      // fall through to the legacy key
    }
  }
  return Deno.env.get(legacyVar) ?? "";
}

/**
 * The caller's RLS-scoped client + user id, from the `Authorization: Bearer` header
 * (the equivalent of kaspii-web's requireSupabaseAuth middleware). Returns null when the
 * token is missing or invalid. The functions are deployed with verify_jwt = false (the
 * platform check doesn't support the new API keys), so this is the authentication.
 */
export async function authenticate(
  req: Request,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    projectKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await supabase.auth.getUser(auth.slice("Bearer ".length));
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

/** Service-role client. Only ever constructed inside a function — never shipped to clients. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    projectKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
