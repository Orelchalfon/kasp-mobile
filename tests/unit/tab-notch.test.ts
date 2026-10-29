import { buildNotchBarPath, buildNotchEdgePath, clampNotchCenter, type NotchGeometry } from "@/lib/tab-notch";

const base: NotchGeometry = { width: 390, top: 30, height: 128, a: 195, b: 195, radius: 30, shoulder: 18, depth: 32 };

/** All [x, y] pairs in a path string, in order. */
function points(d: string): [number, number][] {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

describe("liquid tab bar notch geometry", () => {
  it("at rest, dips into a symmetric cradle centered on the tab", () => {
    expect(buildNotchEdgePath(base)).toBe(
      "M0 30 L147 30 C165 30 165 62 195 62 L195 62 C225 62 225 30 243 30 L390 30",
    );
  });

  it("while stretching, spans both centers with a flat floor, in either order", () => {
    const forward = buildNotchEdgePath({ ...base, a: 100, b: 250 });
    expect(forward).toContain("100 62 L250 62");
    expect(buildNotchEdgePath({ ...base, a: 250, b: 100 })).toBe(forward);
  });

  it("closes the bar shape down the sides and along the bottom", () => {
    const bar = buildNotchBarPath(base);
    expect(bar.startsWith(buildNotchEdgePath(base))).toBe(true);
    expect(bar.endsWith("L390 128 L0 128 Z")).toBe(true);
  });

  it("keeps the cradle bowl inside the bar next to the first and last tabs", () => {
    expect(clampNotchCenter(10, 390, 30)).toBe(30);
    expect(clampNotchCenter(385, 390, 30)).toBe(360);
    expect(clampNotchCenter(39, 390, 30)).toBe(39);

    const edge = points(buildNotchEdgePath({ ...base, a: 5, b: 5 }));
    const floor = edge.filter(([, y]) => y === base.top + base.depth).map(([x]) => x);
    expect(floor).toContain(30);
    expect(floor.every((x) => x >= 0 && x <= base.width)).toBe(true);
  });
});
