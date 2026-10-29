// Money and date formatting. 1 coin = ₪1, whole numbers only (no exchange rates).
// Mirrors the web's CoinAmount (`+n` when signed and positive) and he-IL dates.

const HAS_HE_INTL = (() => {
  try {
    return new Intl.NumberFormat("he-IL").format(1000) === "1,000";
  } catch {
    return false;
  }
})();

function groupThousands(n: number): string {
  return String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "1,250" — grouped integer, no sign handling beyond a leading minus. */
export function formatNumber(n: number): string {
  if (HAS_HE_INTL) return Math.trunc(n).toLocaleString("he-IL");
  return `${n < 0 ? "-" : ""}${groupThousands(n)}`;
}

/** Amount as shown next to the coin icon: "+50" when signed and positive, "-20", "0". */
export function formatCoins(n: number, opts: { signed?: boolean } = {}): string {
  const body = formatNumber(Math.abs(n));
  if (n < 0) return `-${body}`;
  if (opts.signed && n > 0) return `+${body}`;
  return body;
}

/** "₪50" — used where the web shows shekels explicitly (gifts, confirmations). */
export function formatShekels(n: number): string {
  return `₪${formatNumber(n)}`;
}

/** Accessible label for an amount: "50 מטבעות". */
export function coinsLabel(n: number): string {
  return `${formatNumber(n)} מטבעות`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "19.10.2026" (he-IL short date). */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  if (HAS_HE_INTL) return d.toLocaleDateString("he-IL");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

/** "19.10" — day and month only. */
export function formatDayMonth(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/** "אוקטובר 2026" */
export function formatMonthYear(year: number, monthIndex: number): string {
  return `${HE_MONTHS[monthIndex]} ${year}`;
}

/** "YYYY-MM-DD" in Asia/Jerusalem — the day boundary the quiz payout RPC uses. */
export function jerusalemDateKey(at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    // Hermes without tz data: approximate with UTC+3/+2 is risky; fall back to local date.
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  }
}

/** Local "YYYY-MM-DD" (for date inputs; never via toISOString, which shifts to UTC). */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
