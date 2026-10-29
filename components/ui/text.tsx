import { Text as RNText, type TextProps } from "react-native";

const variants = {
  display: { size: "text-4xl", weight: "font-sans-bold", color: "text-foreground" },
  title: { size: "text-2xl", weight: "font-sans-bold", color: "text-foreground" },
  heading: { size: "text-lg", weight: "font-sans-semibold", color: "text-foreground" },
  body: { size: "text-base", weight: "font-sans", color: "text-foreground" },
  label: { size: "text-sm", weight: "font-sans-medium", color: "text-foreground" },
  caption: { size: "text-sm", weight: "font-sans", color: "text-muted-foreground" },
  small: { size: "text-xs", weight: "font-sans", color: "text-muted-foreground" },
} as const;

export type TextVariant = keyof typeof variants;

const SIZE = /^text-(xs|sm|base|lg|[0-9]*xl)$/;
// Size / alignment utilities that also start with `text-` but aren't colors.
const NON_COLOR = /^text-(xs|sm|base|lg|[0-9]*xl|start|end|center|left|right|justify|\[)/;

function classes(className: string | undefined): string[] {
  return (className ?? "").split(/\s+/).filter(Boolean);
}

/** True when `className` sets its own text color (e.g. "text-destructive", "text-white/80"). */
export function hasTextColor(className: string | undefined): boolean {
  return classes(className).some((c) => c.startsWith("text-") && !NON_COLOR.test(c));
}

/**
 * App text. Weight comes from the variant's Rubik family (font-sans-*), never
 * fontWeight, so Android doesn't fall back to a system font. Alignment defaults to the
 * start edge, which is the right edge in RTL.
 *
 * A size, weight or color class in `className` replaces the variant's instead of competing:
 * with Tailwind/NativeWind the winner between two color utilities is decided by
 * stylesheet order, not class order, so both must never be applied together.
 */
export function Text({
  variant = "body",
  className,
  ...props
}: TextProps & { variant?: TextVariant; className?: string }) {
  const v = variants[variant];
  const own = classes(className);
  const size = own.some((c) => SIZE.test(c)) ? "" : v.size;
  const weight = own.some((c) => c.startsWith("font-sans")) ? "" : v.weight;
  const color = hasTextColor(className) ? "" : v.color;
  return <RNText className={`text-start ${size} ${weight} ${color} ${className ?? ""}`} {...props} />;
}

/**
 * Left-to-right island inside RTL copy: emails, tokens, signed numbers, URLs.
 * Without it "+50" renders as "50+" and "a@b.com" can reorder around punctuation.
 */
export function LtrText({
  style,
  children,
  ...props
}: TextProps & { variant?: TextVariant; className?: string }) {
  // `writingDirection` is iOS-only, so string content is also wrapped in Unicode
  // LEFT-TO-RIGHT ISOLATE ... POP DIRECTIONAL ISOLATE, which Android's bidi engine honors.
  const content =
    typeof children === "string" || typeof children === "number" ? `⁦${children}⁩` : children;
  return (
    <Text {...props} style={[{ writingDirection: "ltr" }, style]}>
      {content}
    </Text>
  );
}
