// Unit tests never touch the network: public config gets placeholder values and native
// storage modules are replaced by in-memory mocks.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";
process.env.EXPO_PUBLIC_WEB_ORIGIN ??= "https://kasp-web.kasp.workers.dev";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// jest-expo auto-mocks native modules (randomUUID would return undefined); use Node's CSPRNG.
jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));
