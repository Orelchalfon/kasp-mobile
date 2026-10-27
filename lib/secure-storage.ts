// Supabase session storage backed by the OS keychain/keystore (expo-secure-store).
// SecureStore values are limited to ~2048 bytes and a Supabase session (access +
// refresh token + user JSON) is larger, so values are split into chunks:
//   <key>          -> number of chunks
//   <key>.<i>      -> chunk i
// SecureStore keys may only contain [A-Za-z0-9._-], so keys are sanitized first.
import * as SecureStore from "expo-secure-store";

export const CHUNK_SIZE = 1800;

export interface KeyValueBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function splitIntoChunks(value: string, size: number = CHUNK_SIZE): string[] {
  if (value.length === 0) return [""];
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
  return chunks;
}

export function createChunkedStorage(backend: KeyValueBackend) {
  async function removeChunks(base: string) {
    const countRaw = await backend.getItemAsync(base);
    const count = countRaw ? Number.parseInt(countRaw, 10) : 0;
    for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) {
      await backend.deleteItemAsync(`${base}.${i}`);
    }
    await backend.deleteItemAsync(base);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const base = sanitizeKey(key);
      const countRaw = await backend.getItemAsync(base);
      if (countRaw === null) return null;
      const count = Number.parseInt(countRaw, 10);
      if (!Number.isFinite(count) || count < 1) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await backend.getItemAsync(`${base}.${i}`);
        // A missing chunk means a torn write — treat the whole value as absent.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    },
    async setItem(key: string, value: string): Promise<void> {
      const base = sanitizeKey(key);
      await removeChunks(base);
      const chunks = splitIntoChunks(value);
      for (let i = 0; i < chunks.length; i++) {
        await backend.setItemAsync(`${base}.${i}`, chunks[i]);
      }
      // Count is written last so a partially written value is never read back.
      await backend.setItemAsync(base, String(chunks.length));
    },
    async removeItem(key: string): Promise<void> {
      await removeChunks(sanitizeKey(key));
    },
  };
}

export const secureSessionStorage = createChunkedStorage(SecureStore);
