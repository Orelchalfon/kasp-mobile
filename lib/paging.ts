import type { PostgrestError } from "@supabase/supabase-js";

import { mustList, RpcError } from "@/lib/rpc";

/**
 * PostgREST caps every response at the project's max_rows (1000 by default), so a plain
 * select silently drops rows past it. Ledger reads that feed balances must see every row.
 */
export const ROW_PAGE = 1000;

/** Ids per `.in("id", …)` request: keeps the URL short and each response under max_rows. */
export const IN_CHUNK = 200;

type ListResult<T> = { data: T[] | null; error: PostgrestError | null; count?: number | null };

/**
 * Reads every row of a query, ROW_PAGE at a time. `page(from, to)` must build the query
 * with `{ count: "exact" }`, apply `.range(from, to)` and order by a unique key (e.g.
 * created_at then id). Rows are deduplicated by id: in a newest-first order a row inserted
 * between pages pushes the previous page's last row onto the next one, and inserts never
 * make the read skip a row (ledger rows are never deleted).
 */
export async function fetchAllRows<T extends { id: string }>(
  page: (from: number, to: number) => PromiseLike<ListResult<T>>,
): Promise<T[]> {
  const byId = new Map<string, T>();
  let total: number | null = null;
  for (let from = 0; ; from += ROW_PAGE) {
    const result = await page(from, from + ROW_PAGE - 1);
    const rows = mustList(result);
    if (total === null) {
      if (typeof result.count !== "number") throw new RpcError("fetchAllRows needs { count: 'exact' }");
      total = result.count;
    }
    for (const r of rows) if (!byId.has(r.id)) byId.set(r.id, r);
    if (rows.length === 0 || byId.size >= total) return [...byId.values()];
  }
}

/** Runs `fetch` over `ids` in chunks of IN_CHUNK and concatenates the results. */
export async function fetchByIds<T>(ids: string[], fetch: (chunk: string[]) => PromiseLike<T[]>): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK));
  return (await Promise.all(chunks.map(fetch))).flat();
}

/** Flattens infinite-query pages, keeping the first copy of each id (offset pages can overlap). */
export function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
