// Integration tests run against the REAL Supabase project (like kaspii-web's e2e suite):
// they create ad-hoc auth users with the service-role key and purge them in afterAll.
//
// Secrets are read from kasp-mobile/.env.test (gitignored) or, as a fallback, from
// ../kaspii-web/.env — never from EXPO_PUBLIC_* variables, which ship in the app bundle.
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test"), quiet: true });
config({ path: path.resolve(__dirname, "../../kaspii-web/.env"), quiet: true });

// The app modules read the public config at import time.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= process.env.SUPABASE_PUBLISHABLE_KEY;
process.env.EXPO_PUBLIC_WEB_ORIGIN ??= "https://kasp-web.kasp.workers.dev";

jest.setTimeout(60_000);

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The app's data layer imports a singleton `supabase` client. Tests swap which signed-in
// user it represents, so every mobile query/mutation runs under that user's RLS.
jest.mock("@/lib/supabase", () => {
  const holder: { client: unknown } = { client: null };
  return {
    get supabase() {
      if (!holder.client) throw new Error("call actAs() before using the app data layer");
      return holder.client;
    },
    __setClient(client: unknown) {
      holder.client = client;
    },
  };
});

// jest-expo auto-mocks native modules (randomUUID would return undefined); use Node's CSPRNG.
jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));
