import { fetchAllRows, fetchByIds, IN_CHUNK, ROW_PAGE, uniqueById } from "@/lib/paging";

type Row = { id: string; amount: number };

const rowsOf = (n: number, prefix = "r"): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, amount: 1 }));

/** A fake PostgREST endpoint over `table()` that honours range() and max_rows. */
function fakeEndpoint(table: () => Row[], maxRows = ROW_PAGE) {
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    const all = table();
    return { data: all.slice(from, Math.min(to + 1, from + maxRows)), error: null, count: all.length };
  };
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("reads past the 1000-row cap", async () => {
    const all = rowsOf(2500);
    const { page, calls } = fakeEndpoint(() => all);
    const out = await fetchAllRows(page);
    expect(out).toHaveLength(2500);
    expect(out.reduce((s, r) => s + r.amount, 0)).toBe(2500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("makes a single request when everything fits", async () => {
    const { page, calls } = fakeEndpoint(() => rowsOf(3));
    expect(await fetchAllRows(page)).toHaveLength(3);
    expect(calls).toHaveLength(1);
  });

  it("handles an empty table", async () => {
    const { page } = fakeEndpoint(() => []);
    expect(await fetchAllRows(page)).toEqual([]);
  });

  it("neither duplicates nor drops rows when a row is inserted between pages (newest first)", async () => {
    let table = rowsOf(1500, "old");
    const { page } = fakeEndpoint(() => table);
    const out = await fetchAllRows(async (from, to) => {
      const res = await page(from, to);
      if (from === 0) table = [{ id: "new", amount: 1 }, ...table]; // lands on top after page 1
      return res;
    });
    const ids = new Set(out.map((r) => r.id));
    expect(ids.size).toBe(out.length);
    for (const r of rowsOf(1500, "old")) expect(ids.has(r.id)).toBe(true);
  });

  it("surfaces a PostgREST error", async () => {
    await expect(
      fetchAllRows<Row>(async () => ({ data: null, error: { message: "boom", code: "500" } as never, count: null })),
    ).rejects.toMatchObject({ reason: "boom" });
  });

  it("refuses a query built without count", async () => {
    await expect(fetchAllRows<Row>(async () => ({ data: [], error: null }))).rejects.toThrow(/count/);
  });
});

describe("fetchByIds", () => {
  it("splits ids into chunks and concatenates results", async () => {
    const ids = Array.from({ length: IN_CHUNK * 2 + 5 }, (_, i) => `id${i}`);
    const sizes: number[] = [];
    const out = await fetchByIds(ids, async (chunk) => {
      sizes.push(chunk.length);
      return chunk.map((id) => ({ id }));
    });
    expect(sizes).toEqual([IN_CHUNK, IN_CHUNK, 5]);
    expect(out.map((r) => r.id)).toEqual(ids);
  });

  it("makes no request for no ids", async () => {
    const fetch = jest.fn();
    expect(await fetchByIds([], fetch)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("uniqueById", () => {
  it("keeps the first copy of each id in order", () => {
    expect(uniqueById([{ id: "a" }, { id: "b" }, { id: "a" }, { id: "c" }]).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
