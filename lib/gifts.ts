// Ported from kaspii-web/src/lib/gifts.ts — keep in sync. Server rules live in
// submit_gift / approve_gift_and_pay (kaspii-web/supabase/migrations/20261019120000_qr_gifts.sql).
// Native changes: request ids come from expo-crypto, the gift URL uses the configured
// web origin (QR codes must open in any phone's browser), and the post-login return
// marker lives in AsyncStorage instead of localStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { env } from "@/lib/env";

export const GIFT_REASONS = ["haircut", "birthday", "holiday", "help", "school", "gift"] as const;
export type GiftReason = (typeof GIFT_REASONS)[number];

export const GIFT_REASON_LABELS: Record<GiftReason, string> = {
  haircut: "תספורת",
  birthday: "יום הולדת",
  holiday: "חג",
  help: "עזרה",
  school: "הצלחה בלימודים",
  gift: "סתם מתנה",
};

export function giftReasonLabel(reason: string): string {
  return (GIFT_REASON_LABELS as Record<string, string>)[reason] ?? "מתנה";
}

/** Per-gift ceiling, mirrors the gifts.amount CHECK and submit_gift. */
export const GIFT_MAX = 500;
export const GIFT_QUICK_AMOUNTS = [10, 20, 50, 100] as const;
export const SENDER_NAME_MAX = 40;

/** Tokens are gen_random_uuid() without dashes. */
export function isGiftToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

/** Formats 16 random bytes as an RFC 4122 v4 UUID (sets the version + variant bits). */
export function uuidV4FromBytes(bytes: Uint8Array): string {
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Idempotency key for submit_gift (`_request_id uuid`). */
export function newGiftRequestId(): string {
  return Crypto.randomUUID();
}

/** Public web link encoded in the QR — opens in any adult's browser, app or not. */
export function giftUrl(token: string): string {
  return `${env.webOrigin}/give/${token}`;
}

/** Extracts a gift token from a scanned/pasted gift URL or a bare token. */
export function giftTokenFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (isGiftToken(trimmed)) return trimmed;
  const m = /\/give\/([0-9a-f]{32})(?:[/?#]|$)/.exec(trimmed);
  return m ? m[1] : null;
}

/** Hebrew copy for submit_gift / approve_gift_and_pay / reject_gift `{ error }` values. */
export function giftErrorMessage(error: string): string {
  switch (error) {
    case "Email not confirmed":
      return "צריך לאמת את כתובת המייל לפני ששולחים מתנה. בדקו את תיבת הדואר.";
    case "Children cannot send gifts":
      return "רק מבוגרים יכולים לשלוח מתנות.";
    case "Gift link not found":
      return "הקוד הזה כבר לא פעיל. בקשו מההורים קוד חדש.";
    case "Too many pending gifts":
      return "יש לכם כבר 3 מתנות שממתינות לאישור ההורים. נסו שוב אחרי שיאשרו אותן.";
    case "Invalid amount":
      return `הסכום חייב להיות מספר שלם בין 1 ל-${GIFT_MAX}.`;
    case "Invalid sender name":
      return "הזינו שם שיוצג להורים.";
    case "Gift is not pending":
      return "המתנה כבר טופלה.";
    default:
      return "משהו השתבש. נסו שוב.";
  }
}

// Remembers which gift link a signed-out visitor came from, so sign-in sends them back
// to it. Expires after an hour so a later, unrelated login isn't hijacked.
const RETURN_KEY = "kasp:give-return";
const RETURN_TTL_MS = 60 * 60 * 1000;

export async function rememberGiveReturn(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(RETURN_KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // Storage unavailable: the sender just reopens the link after login.
  }
}

/** Returns (and clears) a still-fresh remembered gift token, if any. */
export async function takeGiveReturn(now: number = Date.now()): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(RETURN_KEY);
    return parseGiveReturn(raw, now);
  } catch {
    return null;
  }
}

export function parseGiveReturn(raw: string, now: number): string | null {
  try {
    const parsed = JSON.parse(raw) as { token?: unknown; at?: unknown };
    if (typeof parsed.token !== "string" || !isGiftToken(parsed.token)) return null;
    if (typeof parsed.at !== "number" || now - parsed.at > RETURN_TTL_MS) return null;
    return parsed.token;
  } catch {
    return null;
  }
}
