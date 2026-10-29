// AI voice tutors — ported from kaspii-web/src/routes/{parent,child}/tutors.*.tsx.
// tutors / tutor_sessions are plain tables (RLS: household read, parent write; session
// rows by the owning child or a household parent). Token minting and transcript upgrade
// need the ElevenLabs key, so they go through the tutor-token / tutor-transcript Edge
// Functions — the key never reaches the app.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hhKey, qk } from "@/lib/query-keys";
import { mustList, RpcError } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { cleanTutorText } from "@/lib/tutor-text";
import type { TutorAgentOverrides, TutorDynamicVariables, TutorLanguage, TutorPersonality } from "@/lib/tutors";

export interface TutorRow {
  id: string;
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
  language: TutorLanguage;
  active: boolean;
}

export type TutorInput = Omit<TutorRow, "id" | "active">;

export function useTutors(hh: string, activeOnly: boolean) {
  return useQuery({
    queryKey: qk.tutors(hh, !activeOnly),
    queryFn: async (): Promise<TutorRow[]> => {
      let q = supabase
        .from("tutors")
        .select("id, name, subject, topic, personality, voice_id, language, active")
        .eq("household_id", hh)
        .order("created_at", { ascending: false });
      if (activeOnly) q = q.eq("active", true);
      return mustList(await q) as TutorRow[];
    },
  });
}

export function useTutor(hh: string, tutorId: string) {
  return useQuery({
    queryKey: qk.tutor(hh, tutorId),
    queryFn: async (): Promise<TutorRow | null> => {
      const { data, error } = await supabase
        .from("tutors")
        .select("id, name, subject, topic, personality, voice_id, language, active")
        .eq("id", tutorId)
        .maybeSingle();
      if (error) {
        if (error.code === "22P02") return null;
        throw error;
      }
      return data as TutorRow | null;
    },
  });
}

/** Mirrors the DB CHECKs (name/subject 1..60, topic 1..200). */
export function validateTutor(input: TutorInput): Partial<Record<"name" | "subject" | "topic", string>> {
  const errors: Partial<Record<"name" | "subject" | "topic", string>> = {};
  if (!input.name.trim() || input.name.trim().length > 60) errors.name = "שם באורך 1-60 תווים";
  if (!input.subject.trim() || input.subject.trim().length > 60) errors.subject = "מקצוע באורך 1-60 תווים";
  if (!input.topic.trim() || input.topic.trim().length > 200) errors.topic = "נושא באורך 1-200 תווים";
  return errors;
}

function useHH<TVars, TRes>(hh: string, fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }) });
}

export function useCreateTutor(hh: string, userId: string) {
  return useHH(hh, async (input: TutorInput) => {
    const { error } = await supabase.from("tutors").insert({
      household_id: hh,
      created_by: userId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      topic: input.topic.trim(),
      personality: input.personality,
      voice_id: input.voice_id,
      language: input.language,
    });
    if (error) throw error;
  });
}

export function useUpdateTutor(hh: string, tutorId: string) {
  return useHH(hh, async (input: Partial<TutorInput> & { active?: boolean }) => {
    const { error } = await supabase.from("tutors").update(input).eq("id", tutorId);
    if (error) throw error;
  });
}

export interface SessionRow {
  id: string;
  child_id: string;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "failed";
}

const SESSIONS_PAGE = 20;

export function useTutorSessions(hh: string, tutorId: string) {
  return useInfiniteQuery({
    queryKey: qk.tutorSessions(hh, tutorId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const rows = mustList(
        await supabase
          .from("tutor_sessions")
          .select("id, child_id, started_at, ended_at, status")
          .eq("tutor_id", tutorId)
          .order("started_at", { ascending: false })
          .order("id", { ascending: false })
          .range(pageParam, pageParam + SESSIONS_PAGE),
      ) as SessionRow[];
      const page = rows.slice(0, SESSIONS_PAGE);
      const childIds = [...new Set(page.map((r) => r.child_id))];
      const names: Record<string, string> = {};
      if (childIds.length) {
        for (const c of mustList(await supabase.from("child_profiles").select("id, display_name").in("id", childIds))) {
          names[c.id] = c.display_name;
        }
      }
      return { rows: page, hasMore: rows.length > SESSIONS_PAGE, names };
    },
    getNextPageParam: (last, all) => (last.hasMore ? all.length * SESSIONS_PAGE : undefined),
  });
}

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
  if (error) {
    let reason = "unavailable";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = (await ctx.json()) as { error?: string };
        if (parsed.error) reason = parsed.error;
      } catch {
        // not deployed / non-JSON
      }
    }
    throw new RpcError(reason);
  }
  if (!data) throw new RpcError("empty");
  return data;
}

export function useSessionTranscript(hh: string, sessionId: string) {
  return useQuery({
    queryKey: qk.tutorSession(hh, sessionId),
    queryFn: async () => {
      const meta = await supabase
        .from("tutor_sessions")
        .select("child_id, tutor_id, started_at, ended_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (meta.error) throw meta.error;
      if (!meta.data) return null;
      const [tutor, child, transcript] = await Promise.all([
        supabase.from("tutors").select("name").eq("id", meta.data.tutor_id).maybeSingle(),
        supabase.from("child_profiles").select("display_name").eq("id", meta.data.child_id).maybeSingle(),
        invokeFunction<{ transcript: TranscriptMessage[] }>("tutor-transcript", { sessionId }),
      ]);
      return {
        ...meta.data,
        tutorName: tutor.data?.name ?? "",
        childName: child.data?.display_name ?? "",
        transcript: transcript.transcript.map((m) => ({ ...m, content: cleanTutorText(m.content) })),
      };
    },
  });
}

export async function mintTutorToken(tutorId: string) {
  return invokeFunction<{
    conversationToken: string;
    overrides: TutorAgentOverrides;
    dynamicVariables: TutorDynamicVariables;
    childId: string;
    tutorId: string;
  }>("tutor-token", { tutorId });
}

export function tutorErrorMessage(reason: string): string {
  switch (reason) {
    case "tutor_inactive":
    case "tutor_not_found":
      return "החונך לא זמין כרגע.";
    case "not_configured":
    case "unavailable":
      return "שיחות קוליות עדיין לא זמינות באפליקציה. אפשר לשוחח עם החונך באתר.";
    default:
      return "לא הצלחנו להתחיל את השיחה. נסו שוב.";
  }
}
