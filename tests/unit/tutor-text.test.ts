import { cleanTutorText } from "@/lib/tutor-text";

describe("cleanTutorText", () => {
  it("strips multi-voice tags and keeps the text inside", () => {
    expect(cleanTutorText("<Kaspii female voice 1>יופי! בואו נתחיל.</Kaspii female voice 1>")).toBe(
      "יופי! בואו נתחיל.",
    );
  });

  it("strips an unclosed voice tag", () => {
    expect(cleanTutorText("<Kaspii female voice 1>היי! אני נועה.")).toBe("היי! אני נועה.");
  });

  it("keeps square brackets (they can be content)", () => {
    expect(cleanTutorText('איך אומרים "שלום" באנגלית [hello]?')).toBe('איך אומרים "שלום" באנגלית [hello]?');
  });

  it("leaves plain text and line breaks untouched", () => {
    expect(cleanTutorText("Hello, can you hear me?\nכן!")).toBe("Hello, can you hear me?\nכן!");
  });
});
