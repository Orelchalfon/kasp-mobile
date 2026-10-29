// Port of kaspii-web/src/server/tutor-session.ts (mintTutorConversationToken) for mobile.
// RLS-scoped authorization, then a privileged ElevenLabs call with a server-only key.
// Secrets: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID (set with `supabase secrets set`).
import { z } from "npm:zod@3.25.76";

import { authenticate, CORS, json } from "../_shared/http.ts";
import { buildTutorDynamicVariables, buildTutorOverrides, type TutorConfig } from "../_shared/tutors.ts";

const InputSchema = z.object({
  tutorId: z.string().uuid(),
  childId: z.string().uuid().optional(),
});

const CONVERSATION_TOKEN_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await authenticate(req);
  if (!caller) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
  if (!apiKey || !agentId) return json({ error: "not_configured" }, 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const data = parsed.data;
  const { supabase, userId } = caller;

  const tokenPromise = fetch(`${CONVERSATION_TOKEN_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": apiKey },
  });
  tokenPromise.catch(() => {});

  // A child is always resolved from their own auth user (never a client-sent id);
  // a parent names the child and RLS scopes it to their household.
  const [roleResult, tutorResult, ownProfileResult, namedChildResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabase
      .from("tutors")
      .select("id, name, subject, topic, personality, voice_id, language, active")
      .eq("id", data.tutorId)
      .maybeSingle(),
    supabase.from("child_profiles").select("id").eq("user_id", userId).maybeSingle(),
    data.childId
      ? supabase.from("child_profiles").select("id").eq("id", data.childId).maybeSingle()
      : Promise.resolve(null),
  ]);

  if (roleResult.error || !roleResult.data) return json({ error: "forbidden" }, 403);
  const tutor = tutorResult.data;
  if (tutorResult.error || !tutor) return json({ error: "tutor_not_found" }, 404);
  if (!tutor.active) return json({ error: "tutor_inactive" }, 409);

  let childId: string;
  if (roleResult.data.role === "child") {
    if (ownProfileResult.error || !ownProfileResult.data) return json({ error: "child_not_found" }, 404);
    childId = ownProfileResult.data.id;
  } else if (roleResult.data.role === "parent") {
    if (!namedChildResult || namedChildResult.error || !namedChildResult.data) {
      return json({ error: "child_required" }, 400);
    }
    childId = namedChildResult.data.id;
  } else {
    return json({ error: "forbidden" }, 403);
  }

  const overrides = buildTutorOverrides(tutor as TutorConfig);
  const dynamicVariables = buildTutorDynamicVariables(tutor as TutorConfig);
  const res = await tokenPromise;
  if (!res.ok) {
    console.error("[tutor-token] ElevenLabs token failed", res.status);
    return json({ error: "token_failed" }, 502);
  }
  const tokenBody = (await res.json()) as { token: string };
  return json({ conversationToken: tokenBody.token, overrides, dynamicVariables, childId, tutorId: tutor.id });
});
