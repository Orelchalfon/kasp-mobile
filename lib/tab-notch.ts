/**
 * Geometry for the liquid tab bar: a flat bar whose top edge dips into a rounded
 * "cradle" under the active tab. While switching tabs the cradle spans two centers
 * (`a` → `b`) and contracts back to one, which reads as liquid stretching across.
 *
 * All x values are physical (SVG coordinates never flip in RTL). These run as
 * Reanimated worklets on the UI thread and as plain functions in unit tests.
 */
export type NotchGeometry = {
  /** Bar width. */
  width: number;
  /** y of the bar's flat top edge. */
  top: number;
  /** y of the bar's bottom (the SVG height). */
  height: number;
  /** Cradle end centers; equal at rest. Order doesn't matter. */
  a: number;
  b: number;
  /** Half-width of the cradle's rounded bottom. */
  radius: number;
  /** Horizontal run of the smooth shoulder between the top edge and the cradle. */
  shoulder: number;
  /** How far the cradle dips below `top`. */
  depth: number;
};

/** Keeps a cradle center far enough from the bar's ends that its bowl stays visible. */
export function clampNotchCenter(x: number, width: number, radius: number): number {
  "worklet";
  return Math.min(Math.max(x, radius), width - radius);
}

/** The top edge only (for the border stroke). */
export function buildNotchEdgePath(g: NotchGeometry): string {
  "worklet";
  const lo = clampNotchCenter(Math.min(g.a, g.b), g.width, g.radius);
  const hi = clampNotchCenter(Math.max(g.a, g.b), g.width, g.radius);
  const floor = g.top + g.depth;
  // Shoulders may run past the bar's ends next to the first/last tab; the SVG clips them.
  return (
    `M0 ${g.top} L${lo - g.radius - g.shoulder} ${g.top} ` +
    `C${lo - g.radius} ${g.top} ${lo - g.radius} ${floor} ${lo} ${floor} ` +
    `L${hi} ${floor} ` +
    `C${hi + g.radius} ${floor} ${hi + g.radius} ${g.top} ${hi + g.radius + g.shoulder} ${g.top} ` +
    `L${g.width} ${g.top}`
  );
}

/** The filled bar shape: the top edge closed down the sides and along the bottom. */
export function buildNotchBarPath(g: NotchGeometry): string {
  "worklet";
  return `${buildNotchEdgePath(g)} L${g.width} ${g.height} L0 ${g.height} Z`;
}
