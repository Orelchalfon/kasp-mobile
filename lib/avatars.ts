// Ported from kaspii-web/src/lib/avatars.ts — keep the catalog keys in sync.
// Stored on `child_profiles.avatar` as "<iconKey>|<colorKey>". Tailwind class strings
// are replaced by hex values (Tailwind v3/v4 100/400 swatches) for React Native.

export interface AvatarIcon {
  key: string;
  emoji: string;
  labelHe: string;
}

export interface AvatarColor {
  key: string;
  labelHe: string;
  /** Soft tint behind the emoji. */
  bg: string;
  /** Solid swatch / selection ring. */
  solid: string;
}

export const AVATAR_ICONS: readonly AvatarIcon[] = [
  { key: "fox", emoji: "🦊", labelHe: "שועל" },
  { key: "cat", emoji: "🐱", labelHe: "חתול" },
  { key: "unicorn", emoji: "🦄", labelHe: "חד-קרן" },
  { key: "dog", emoji: "🐶", labelHe: "כלב" },
  { key: "panda", emoji: "🐼", labelHe: "פנדה" },
  { key: "lion", emoji: "🦁", labelHe: "אריה" },
  { key: "frog", emoji: "🐸", labelHe: "צפרדע" },
  { key: "penguin", emoji: "🐧", labelHe: "פינגווין" },
  { key: "rabbit", emoji: "🐰", labelHe: "ארנב" },
  { key: "turtle", emoji: "🐢", labelHe: "צב" },
] as const;

export const AVATAR_COLORS: readonly AvatarColor[] = [
  { key: "purple", labelHe: "סגול", bg: "#f3e8ff", solid: "#c084fc" },
  { key: "blue", labelHe: "כחול", bg: "#dbeafe", solid: "#60a5fa" },
  { key: "green", labelHe: "ירוק", bg: "#dcfce7", solid: "#4ade80" },
  { key: "orange", labelHe: "כתום", bg: "#ffedd5", solid: "#fb923c" },
  { key: "pink", labelHe: "ורוד", bg: "#fce7f3", solid: "#f472b6" },
  { key: "yellow", labelHe: "צהוב", bg: "#fef9c3", solid: "#facc15" },
] as const;

export const DEFAULT_ICON_KEY = AVATAR_ICONS[0].key;
export const DEFAULT_COLOR_KEY = AVATAR_COLORS[0].key;

export interface ResolvedAvatar {
  icon: AvatarIcon;
  color: AvatarColor;
}

export function serializeAvatar(iconKey: string, colorKey: string): string {
  return `${iconKey}|${colorKey}`;
}

// Tiny deterministic string hash (djb2). Stable across reloads for a given seed.
function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Resolves a stored `avatar` value into its icon + color catalog entries.
 * Falls back to a deterministic pick from `seed` (the child id) when the value
 * is null or doesn't match the current catalog.
 */
export function parseAvatar(value: string | null | undefined, seed: string): ResolvedAvatar {
  const [iconKey, colorKey] = (value ?? "").split("|");
  const icon = AVATAR_ICONS.find((i) => i.key === iconKey);
  const color = AVATAR_COLORS.find((c) => c.key === colorKey);
  if (icon && color) return { icon, color };

  const h = hash(seed || "");
  return {
    icon: icon ?? AVATAR_ICONS[h % AVATAR_ICONS.length],
    color: color ?? AVATAR_COLORS[(h >>> 8) % AVATAR_COLORS.length],
  };
}
