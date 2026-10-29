// Canonical config for AI voice tutors: personality/language/voice catalogs and the types of the
// ElevenLabs session config returned by the tutor-token Edge Function.
// Catalogs ported from kaspii-web/src/lib/tutors.ts — keep them in sync. The prompt does not
// follow the web: mobile uses its own agent with a fixed dashboard prompt (see elevenlabs/README.md).

export const TUTOR_PERSONALITIES = ["friendly", "playful", "calm", "strict"] as const;
export type TutorPersonality = (typeof TUTOR_PERSONALITIES)[number];

export const PERSONALITY_LABELS_HE: Record<TutorPersonality, string> = {
  friendly: "ידידותי",
  playful: "משעשע",
  calm: "רגוע",
  strict: "רציני",
};

export const TUTOR_LANGUAGES = ["he", "en", "ar", "ru", "fr"] as const;
export type TutorLanguage = (typeof TUTOR_LANGUAGES)[number];

export const LANGUAGE_LABELS_HE: Record<TutorLanguage, string> = {
  he: "עברית",
  en: "אנגלית",
  ar: "ערבית",
  ru: "רוסית",
  fr: "צרפתית",
};

export const DEFAULT_LANGUAGE: TutorLanguage = "he";

export interface TutorVoiceOption {
  id: string;
  label: string;
  gender: "male" | "female";
}

// Placeholder ids — replace with real Hebrew-capable ElevenLabs voice ids
// from the user's voice library before this feature goes live. These
// deliberately do not look like real ElevenLabs ids so they can't be
// mistaken for working ones.
export const TUTOR_VOICES: readonly TutorVoiceOption[] = [
  { id: "uotMEafxiIOT6Y3Q2VoZ", label: "אבי", gender: "male" },
  { id: "Lzv0WyyKupOrbKO120f8", label: "נועה", gender: "female" },
];

export const DEFAULT_VOICE_ID = TUTOR_VOICES[0].id;

export interface TutorConfig {
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
  language: TutorLanguage;
}

// The prompt itself lives in the mobile ElevenLabs agent (elevenlabs/tutor-agent-prompt.md); the
// tutor-token Edge Function builds these per session (supabase/functions/_shared/tutors.ts).
export interface TutorDynamicVariables {
  tutor_name: string;
  subject: string;
  topic: string;
  personality: string;
  practice_language: string;
}

// Only language + voice: the mobile agent refuses prompt/first-message overrides.
export interface TutorAgentOverrides {
  agent: { language: TutorLanguage };
  tts?: { voiceId: string };
}
