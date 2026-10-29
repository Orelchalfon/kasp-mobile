// Port of kaspii-web/src/server/tutor-transcript.ts (getTutorSessionTranscript) for mobile.
// RLS on tutor_sessions already limits reads/updates to the owning child or a household
// parent. Upgrades a client-saved transcript to ElevenLabs' record on first view.
// Secret: ELEVENLABS_API_KEY.
import { z } from "npm:zod@3.25.76";

import { authenticate, CORS, json } from "../_shared/http.ts";

const InputSchema = z.object({ sessionId: z.string().uuid() });

type ElevenLabsStatus = "initiated" | "in-progress" | "processing" | "done" | "failed";

interface ElevenLabsTranscriptTurn {
  role: "user" | "agent";
  message?: string | null;
}

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

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
  const { supabase } = caller;

  const { data: session, error } = await supabase
    .from("tutor_sessions")
    .select("id, elevenlabs_conversation_id, transcript, transcript_source")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (error || !session) return json({ error: "session_not_found" }, 404);

  const saved = (session.transcript as TranscriptMessage[] | null) ?? [];
  if (session.transcript_source === "elevenlabs_api" || !session.elevenlabs_conversation_id) {
    return json({ transcript: saved });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return json({ transcript: saved });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(session.elevenlabs_conversation_id)}`,
    { headers: { "xi-api-key": apiKey } },
  );
  if (!res.ok) return json({ transcript: saved });

  const el = (await res.json()) as { status?: ElevenLabsStatus; transcript?: ElevenLabsTranscriptTurn[] };
  const transcript: TranscriptMessage[] = (el.transcript ?? [])
    .filter((t): t is ElevenLabsTranscriptTurn & { message: string } => !!t.message)
    .map((t) => ({ role: t.role === "agent" ? "assistant" : "user", content: t.message }));

  // Only a finished ("done") record is final. While the call is live or ElevenLabs is still
  // processing it, its transcript can be partial or empty; saving it would mark the row
  // elevenlabs_api and permanently replace the client's full save. Serve the client save.
  if (el.status !== "done" || transcript.length === 0) return json({ transcript: saved });

  await supabase
    .from("tutor_sessions")
    .update({ transcript, transcript_source: "elevenlabs_api" })
    .eq("id", parsed.data.sessionId);

  return json({ transcript });
});
