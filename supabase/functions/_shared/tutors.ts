// Tutor prompt/override builders — copied from kaspii-web/src/lib/tutors.ts (keep in sync).
// The prompt is built server-side so a client can't swap in its own system prompt.

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

function languageInstructionLine(language: TutorLanguage): string {
  if (language === "he") return "- דברו רק בעברית.";
  const label = LANGUAGE_LABELS_HE[language];
  return `- נהלו את השיעור ותרגלו עם הילד/ה ב${label} - זו שפת התרגול של החונך הזה. אפשר להסביר מונחים בעברית במידת הצורך כדי לוודא הבנה, אך רוב השיחה צריכה להתנהל ב${label}.`;
}

function buildSafetyFloorHe(language: TutorLanguage): string {
  return `
כללי בטיחות (חובה תמיד):
${languageInstructionLine(language)}
- ההתאמה היא לילדים - השתמשו בשפה פשוטה ומתאימה לגיל.
- אין לבקש פרטים אישיים (כתובת, טלפון, סיסמאות, מיקום).
- אם הילד/ה משתפים מצוקה, פחד או בקשת עזרה - הפנו אותם בעדינות בעברית לפנות להורה או למבוגר אחראי, גם אם שאר השיחה מתנהלת בשפה אחרת.
- אין להזכיר תוכן אלים, מיני או לא הולם.
`.trim();
}

export function buildTutorSystemPrompt(tutor: TutorConfig): string {
  const personalityHe = PERSONALITY_LABELS_HE[tutor.personality];
  return `
אתם ${tutor.name}, חונך/ת פרטי/ת שמנהל/ת שיחת קול בזמן אמת עם ילד/ה.

הנחיות הוראה:
- התמקדו בנושא "${tutor.topic}" במקצוע "${tutor.subject}" ולמדו אותו את/ה ילד/ה.
- שמרו על שיחה זורמת אך מובילה - את/ה מוביל/ה את קצב השיחה.
- מדי פעם ודאו שהילד/ה עוקב/ת אחריכם ומבין/ה.
- פרקו את הנושא לחלקים קטנים ולמדו חלק אחד בכל פעם.
- סגנון הדיבור שלכם: ${personalityHe}.
- שמרו על תשובות קצרות, כמו בשיחת קול אמיתית.
- אל תשתמשו בתווים מיוחדים בתשובות - זו שיחה קולית.

${buildSafetyFloorHe(tutor.language)}
`.trim();
}

export function buildTutorFirstMessage(tutor: TutorConfig): string {
  return `שלום! בואו נתחיל את השיחה שלנו. היום נדבר על ${tutor.topic}.`;
}

export function buildTutorOverrides(tutor: TutorConfig) {
  return {
    agent: {
      prompt: { prompt: buildTutorSystemPrompt(tutor) },
      firstMessage: buildTutorFirstMessage(tutor),
      language: tutor.language,
    },
    ...(tutor.voice_id.startsWith("REPLACE_WITH") ? {} : { tts: { voiceId: tutor.voice_id } }),
  };
}
