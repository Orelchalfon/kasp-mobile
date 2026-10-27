import { parseIntInRange } from "@/features/parent/settings-cards";
import { validateNewTask } from "@/features/parent/tasks-api";
import { goalEditSchema, goalSchema, zodIssuesToErrors } from "@/features/savings/goal-schema";
import { validateTutor } from "@/features/tutors/api";
import { parseAvatar, serializeAvatar } from "@/lib/avatars";
import {
  GIFT_MAX,
  giftErrorMessage,
  giftTokenFromUrl,
  giftUrl,
  isGiftToken,
  newGiftRequestId,
  parseGiveReturn,
  uuidV4FromBytes,
} from "@/lib/gifts";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = "0123456789abcdef0123456789abcdef";

describe("task creation rules (same as the web)", () => {
  it("requires a child, a title and a positive whole reward", () => {
    expect(validateNewTask({ childId: null, title: " ", rewardInput: "0" }).errors).toEqual({
      child: "בחרו ילד",
      title: "כתבו כותרת למשימה",
      reward: "התגמול חייב להיות מספר שלם גדול מ-0",
    });
    expect(validateNewTask({ childId: "c", title: "x", rewardInput: "2.5" }).reward).toBeNull();
    expect(validateNewTask({ childId: "c", title: "x", rewardInput: "-3" }).reward).toBeNull();
    expect(validateNewTask({ childId: "c", title: "x", rewardInput: " 15 " })).toEqual({ errors: {}, reward: 15 });
  });
});

describe("settings inputs", () => {
  it("accepts whole numbers in range only", () => {
    expect(parseIntInRange("10", 0, 100)).toBe(10);
    expect(parseIntInRange("101", 0, 100)).toBeNull();
    expect(parseIntInRange("1e2", 0, 1000)).toBeNull();
    expect(parseIntInRange("", 0, 100)).toBeNull();
  });
});

describe("goal schema (mirrors the goals CHECKs)", () => {
  const ok = { title: "אופניים", target_amount: "300", cycle_amount: "20", cycle_period: "week", auto_deposit: false, auto_source: "wallet" };
  it("parses valid input and coerces numbers", () => {
    const r = goalSchema.safeParse(ok);
    expect(r.success && r.data.target_amount).toBe(300);
  });
  it("rejects a cycle above the target and targets over 100,000", () => {
    const r = goalSchema.safeParse({ ...ok, cycle_amount: "400" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodIssuesToErrors(r.error.issues).cycle_amount).toBe("סכום מחזורי לא יכול להיות גדול מהיעד");
    expect(goalSchema.safeParse({ ...ok, target_amount: "100001" }).success).toBe(false);
  });
  it("editing can't drop the target below what's deposited", () => {
    expect(goalEditSchema(250).safeParse({ ...ok, target_amount: "200", cycle_amount: "10" }).success).toBe(false);
    expect(goalEditSchema(250).safeParse({ ...ok, target_amount: "250", cycle_amount: "10" }).success).toBe(true);
  });
});

describe("tutor limits (DB CHECKs)", () => {
  it("enforces 1..60 / 1..60 / 1..200", () => {
    const base = { name: "נועה", subject: "אנגלית", topic: "שיחון", personality: "friendly" as const, voice_id: "v", language: "he" as const };
    expect(validateTutor(base)).toEqual({});
    expect(Object.keys(validateTutor({ ...base, name: "x".repeat(61), topic: "" }))).toEqual(["name", "topic"]);
  });
});

describe("avatars", () => {
  it("round-trips the stored 'icon|color' format and falls back deterministically", () => {
    const parsed = parseAvatar(serializeAvatar("panda", "green"), "id");
    expect([parsed.icon.key, parsed.color.key]).toEqual(["panda", "green"]);
    expect(parseAvatar(null, "child-1")).toEqual(parseAvatar("bogus", "child-1"));
  });
});

describe("gifts", () => {
  it("request ids are v4 UUIDs (submit_gift idempotency key)", () => {
    expect(newGiftRequestId()).toMatch(UUID_V4);
    expect(uuidV4FromBytes(new Uint8Array(16))).toMatch(UUID_V4);
    expect(uuidV4FromBytes(new Uint8Array(16).fill(0xff))).toMatch(UUID_V4);
  });
  it("recognizes tokens in links and rejects anything else", () => {
    expect(isGiftToken(TOKEN)).toBe(true);
    expect(isGiftToken(TOKEN.toUpperCase())).toBe(false);
    expect(giftTokenFromUrl(giftUrl(TOKEN))).toBe(TOKEN);
    expect(giftTokenFromUrl(`kasp://give/${TOKEN}?x=1`)).toBe(TOKEN);
    expect(giftTokenFromUrl("https://evil.example/give/123")).toBeNull();
    expect(giftUrl(TOKEN)).toBe(`https://kasp-web.kasp.workers.dev/give/${TOKEN}`);
  });
  it("the post-login return marker expires after an hour", () => {
    const now = 1_000_000_000;
    expect(parseGiveReturn(JSON.stringify({ token: TOKEN, at: now - 59 * 60_000 }), now)).toBe(TOKEN);
    expect(parseGiveReturn(JSON.stringify({ token: TOKEN, at: now - 61 * 60_000 }), now)).toBeNull();
    expect(parseGiveReturn(JSON.stringify({ token: "nope", at: now }), now)).toBeNull();
  });
  it("maps RPC errors to Hebrew", () => {
    expect(giftErrorMessage("Invalid amount")).toBe(`הסכום חייב להיות מספר שלם בין 1 ל-${GIFT_MAX}.`);
    expect(giftErrorMessage("whatever")).toBe("משהו השתבש. נסו שוב.");
  });
});
