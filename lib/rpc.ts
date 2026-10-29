import type { PostgrestError } from "@supabase/supabase-js";

/** An RPC that returned `{ error: "..." }` in its jsonb payload, or a Postgres error. */
export class RpcError extends Error {
  /** The payload's `error` string or the Postgres message — map it to Hebrew in the UI. */
  readonly reason: string;
  /** SQLSTATE when the call raised (e.g. 42501 not authorized). */
  readonly code?: string;

  constructor(reason: string, code?: string) {
    super(reason);
    this.name = "RpcError";
    this.reason = reason;
    this.code = code;
  }
}

/**
 * Unwraps a jsonb RPC result. The Kasp RPCs report business failures as
 * `{ error: "..." }` (not exceptions), so both shapes are turned into an RpcError.
 */
export function unwrapJson<T extends object>(
  result: { data: unknown; error: PostgrestError | null },
): T {
  if (result.error) throw new RpcError(result.error.message, result.error.code);
  const payload = result.data as (T & { error?: unknown }) | null;
  if (!payload || typeof payload !== "object") throw new RpcError("Empty response");
  if (typeof payload.error === "string" && payload.error) throw new RpcError(payload.error);
  return payload;
}

/** Throws on a PostgREST error, returns data otherwise. */
export function must<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw new RpcError(result.error.message, result.error.code);
  return result.data;
}

/** Like `must` for list queries: a null list (no rows) becomes []. */
export function mustList<T>(result: { data: T[] | null; error: PostgrestError | null }): T[] {
  if (result.error) throw new RpcError(result.error.message, result.error.code);
  return result.data ?? [];
}
