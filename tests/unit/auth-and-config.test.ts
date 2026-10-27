import { isEmailLike, signInErrorMessage, signUpErrorMessage } from "@/features/auth/auth-errors";
import { createQueryClient, MUTATION_DEFAULTS } from "@/lib/query-client";
import { routeForAuth } from "@/lib/routing";
import { createChunkedStorage, sanitizeKey, splitIntoChunks, type KeyValueBackend } from "@/lib/secure-storage";

function memoryBackend(): KeyValueBackend & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`invalid SecureStore key ${k}`);
      if (v.length > 2048) throw new Error("value too large for SecureStore");
      store.set(k, v);
    },
    deleteItemAsync: async (k) => {
      store.delete(k);
    },
  };
}

describe("chunked secure session storage", () => {
  it("round-trips a session larger than SecureStore's 2KB limit", async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    const session = JSON.stringify({ access_token: "a".repeat(3000), refresh_token: "r".repeat(900), user: { id: "u" } });
    await storage.setItem("sb-jlpvjxywfvijntsctvaq-auth-token", session);
    expect(await storage.getItem("sb-jlpvjxywfvijntsctvaq-auth-token")).toBe(session);
    expect([...backend.store.keys()].every((k) => /^[A-Za-z0-9._-]+$/.test(k))).toBe(true);
  });

  it("shrinking a value removes stale chunks; removeItem clears everything", async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem("k", "x".repeat(5000));
    await storage.setItem("k", "small");
    expect(await storage.getItem("k")).toBe("small");
    expect(backend.store.size).toBe(2);
    await storage.removeItem("k");
    expect(backend.store.size).toBe(0);
    expect(await storage.getItem("k")).toBeNull();
  });

  it("treats a torn write (missing chunk) as no session", async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem("k", "y".repeat(4000));
    backend.store.delete("k.1");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("splits and sanitizes deterministically", () => {
    expect(splitIntoChunks("abcdef", 4)).toEqual(["abcd", "ef"]);
    expect(sanitizeKey("sb:auth token")).toBe("sb_auth_token");
  });
});

describe("money mutations never retry or queue offline", () => {
  it("defaults to one attempt that fails fast when offline", () => {
    expect(MUTATION_DEFAULTS).toEqual({ retry: 0, networkMode: "always" });
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations).toMatchObject({ retry: 0, networkMode: "always" });
  });
});

describe("entry routing", () => {
  const base = { isLoading: false, isAuthenticated: true, role: null, roleStatus: "ready" as const };
  it("waits while the session/role are resolving", () => {
    expect(routeForAuth({ ...base, isLoading: true })).toBeNull();
  });
  it("routes by role", () => {
    expect(routeForAuth({ ...base, isAuthenticated: false })).toBe("/(auth)/sign-in");
    expect(routeForAuth({ ...base, role: "parent" })).toBe("/parent/dashboard");
    expect(routeForAuth({ ...base, role: "child" })).toBe("/child/dashboard");
  });
  it("sends role-less / admin accounts to no-access instead of loading forever", () => {
    expect(routeForAuth({ ...base, roleStatus: "missing" })).toBe("/no-access");
    expect(routeForAuth({ ...base, roleStatus: "error" })).toBe("/no-access");
  });
});

describe("auth error copy", () => {
  it("maps Supabase errors to Hebrew", () => {
    expect(signInErrorMessage({ message: "Invalid login credentials" })).toBe("אימייל או סיסמה שגויים");
    expect(signInErrorMessage({ message: "Email not confirmed" })).toContain("המייל עוד לא אומת");
    expect(signInErrorMessage({ message: "x", status: 429 })).toContain("יותר מדי");
    expect(signUpErrorMessage({ message: "User already registered" })).toBe("כתובת המייל כבר רשומה. נסו להתחבר.");
  });
  it("validates email shape", () => {
    expect(isEmailLike(" parent@example.com ")).toBe(true);
    expect(isEmailLike("parent@example")).toBe(false);
  });
});
