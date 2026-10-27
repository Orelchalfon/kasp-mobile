// Hebrew copy for Supabase auth errors — same mapping as kaspii-web's
// sign-in-form.tsx / sign-up-form.tsx / auth.reset-password.tsx.

export interface AuthErrorLike {
  message?: string;
  status?: number;
}

export function signInErrorMessage(error: AuthErrorLike): string {
  const msg = error.message?.toLowerCase() ?? "";
  if (msg.includes("not confirmed")) {
    return "המייל עוד לא אומת. בדקו את תיבת הדואר ולחצו על הקישור.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "אימייל או סיסמה שגויים";
  }
  if (msg.includes("too many requests") || error.status === 429) {
    return "יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.";
  }
  return "שגיאה בהתחברות. נסו שוב.";
}

export function signUpErrorMessage(error: AuthErrorLike): string {
  const msg = error.message?.toLowerCase() ?? "";
  if (msg.includes("password") && msg.includes("pwned")) {
    return "הסיסמה הזו נמצאת ברשימת סיסמאות שדלפו. בחרו סיסמה אחרת.";
  }
  if (msg.includes("already")) return "כתובת המייל כבר רשומה. נסו להתחבר.";
  if (msg.includes("password") && (msg.includes("6") || msg.includes("short"))) {
    return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  }
  return "שגיאה בהרשמה. נסו שוב.";
}

export const PASSWORD_MIN_LENGTH = 6;

export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
