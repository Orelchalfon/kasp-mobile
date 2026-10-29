// Session config for the mobile ElevenLabs agent ("Kaspii Tutor (Mobile)", see ../../../elevenlabs/).
// Intentionally diverges from kaspii-web/src/lib/tutors.ts: the web agent takes the whole system
// prompt as a client-sent override, which lets any signed-in client replace it. The mobile agent's
// prompt (with the safety rules) is fixed in the dashboard and refuses prompt/first-message
// overrides; the tutor's details arrive as dynamic variables. Those are still relayed by the
// client, so they're data slots, not a trust boundary — safety lives in the dashboard prompt and
// the agent's guardrails.

export type TutorPersonality = "friendly" | "playful" | "calm" | "strict";
export type TutorLanguage = "he" | "en" | "ar" | "ru" | "fr";

const PERSONALITY_LABELS_HE: Record<TutorPersonality, string> = {
  friendly: "ידידותי",
  playful: "משעשע",
  calm: "רגוע",
  strict: "רציני",
};

const LANGUAGE_LABELS_HE: Record<TutorLanguage, string> = {
  he: "עברית",
  en: "אנגלית",
  ar: "ערבית",
  ru: "רוסית",
  fr: "צרפתית",
};

export interface TutorConfig {
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
  language: TutorLanguage;
}

// Must match the {{variables}} in elevenlabs/tutor-agent-prompt.md and the agent's first message;
// the agent refuses a conversation that is missing any of them.
export interface TutorDynamicVariables {
  tutor_name: string;
  subject: string;
  topic: string;
  personality: string;
  practice_language: string;
}

// Only the overrides the mobile agent allows. Sending prompt/firstMessage makes it refuse the call.
export interface TutorAgentOverrides {
  agent: { language: TutorLanguage };
  tts?: { voiceId: string };
}

/**
 * Parent-entered text lands inside the agent's prompt, so flatten it to a single plain label:
 * no line breaks or control characters (which could fake a new prompt section), no template
 * braces, no quote/angle/backtick delimiters, collapsed whitespace, capped at the DB limit.
 */
export function sanitizeTutorLabel(value: string, maxLength: number): string {
  return value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/[{}<>"`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

export function buildTutorDynamicVariables(tutor: TutorConfig): TutorDynamicVariables {
  return {
    tutor_name: sanitizeTutorLabel(tutor.name, 60) || "החונך",
    subject: sanitizeTutorLabel(tutor.subject, 60) || "לימודים",
    topic: sanitizeTutorLabel(tutor.topic, 200) || "נושא שהילד/ה יבחר/תבחר",
    personality: PERSONALITY_LABELS_HE[tutor.personality] ?? PERSONALITY_LABELS_HE.friendly,
    practice_language: LANGUAGE_LABELS_HE[tutor.language] ?? LANGUAGE_LABELS_HE.he,
  };
}

export function buildTutorOverrides(tutor: TutorConfig): TutorAgentOverrides {
  return {
    agent: { language: tutor.language in LANGUAGE_LABELS_HE ? tutor.language : "he" },
    // A placeholder voice_id must not be sent — omitting it falls back to the agent's default voice.
    ...(tutor.voice_id.startsWith("REPLACE_WITH") ? {} : { tts: { voiceId: tutor.voice_id } }),
  };
}
