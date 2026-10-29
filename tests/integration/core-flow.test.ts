// End-to-end core flow through the MOBILE data layer against the live Supabase project:
// parent creates a task -> child submits -> parent approves -> wallet + savings split +
// ledger, plus authorization (child can't self-approve or adjust, other households are
// isolated) and the gift flow's idempotency. Ad-hoc users/households are purged in afterAll.
import { fetchDashboard, approveTask, rejectTask, manualAdjustment, approveGift } from "@/features/parent/dashboard-api";
import { createTask, fetchParentTask } from "@/features/parent/tasks-api";
import { fetchTxPage } from "@/features/parent/transactions-api";
import { submitTask } from "@/features/child/api";
import { moveToSavings } from "@/features/savings/api";
import { fetchGiftToken } from "@/features/children/api";
import { newGiftRequestId } from "@/lib/gifts";
import { RpcError, unwrapJson } from "@/lib/rpc";
import { computeSavingsBalance, computeWalletBalance } from "@/lib/transactions";

import {
  actAs,
  admin,
  assertWalletInvariant,
  createChild,
  createParent,
  deleteUser,
  hasLiveEnv,
  purgeHousehold,
} from "./helpers";

const describeLive = hasLiveEnv ? describe : describe.skip;

describeLive("mobile core flow (live Supabase)", () => {
  let parent: Awaited<ReturnType<typeof createParent>>;
  let child: Awaited<ReturnType<typeof createChild>>;
  let outsider: Awaited<ReturnType<typeof createParent>>;
  let taskId: string;

  beforeAll(async () => {
    parent = await createParent("mobile-parent");
    child = await createChild("mobile-child", parent.householdId);
    outsider = await createParent("mobile-outsider");
    // 10% auto-savings, as a parent sets it on the dashboard.
    await parent.client
      .from("household_settings")
      .upsert({ household_id: parent.householdId, savings_percentage: 10 }, { onConflict: "household_id" });
  });

  afterAll(async () => {
    for (const hh of [parent?.householdId, outsider?.householdId]) if (hh) await purgeHousehold(hh);
    for (const u of [child, parent, outsider]) if (u) await deleteUser(u.userId);
  });

  it("parent creates a task for the child", async () => {
    actAs(parent);
    await createTask({
      householdId: parent.householdId,
      parentUserId: parent.userId,
      childId: child.childProfileId,
      title: "לסדר את החדר",
      description: "",
      reward: 50,
    });
    const dash = await fetchDashboard(parent.householdId);
    const task = dash.tasks.find((t) => t.title === "לסדר את החדר");
    expect(task).toMatchObject({ status: "assigned", reward_amount: 50, child_id: child.childProfileId });
    taskId = task!.id;
  });

  it("child submits once; a second submit is rejected by the status guard", async () => {
    actAs(child);
    await submitTask(taskId);
    await expect(submitTask(taskId)).rejects.toBeInstanceOf(RpcError);
    const row = await admin.from("tasks").select("status, submitted_at").eq("id", taskId).single();
    expect(row.data?.status).toBe("submitted");
    expect(row.data?.submitted_at).toBeTruthy();
  });

  it("the child cannot approve (pay) their own task", async () => {
    actAs(child);
    await expect(approveTask(taskId)).rejects.toMatchObject({ code: "42501" });
    const txs = await admin.from("transactions").select("id").eq("reference_task_id", taskId);
    expect(txs.data).toHaveLength(0);
  });

  it("another household's parent can't see, approve or reject the task", async () => {
    actAs(outsider);
    expect(await fetchParentTask(taskId)).toBeNull();
    await expect(approveTask(taskId)).rejects.toBeInstanceOf(RpcError);
    await expect(rejectTask(taskId)).rejects.toBeInstanceOf(RpcError); // 0 rows visible -> guard
    await expect(manualAdjustment(child.childProfileId, 100)).rejects.toBeInstanceOf(RpcError);
  });

  it("parent approves: 45 to the wallet, 5 to savings, ledger + cache consistent", async () => {
    actAs(parent);
    await approveTask(taskId);
    const dash = await fetchDashboard(parent.householdId);
    const ledger = dash.ledger.filter((t) => t.child_id === child.childProfileId);
    expect(computeWalletBalance(ledger)).toBe(45);
    expect(computeSavingsBalance(ledger)).toBe(5);
    expect(ledger.map((t) => t.type).sort()).toEqual(["savings_credit", "task_reward", "wallet_debit"]);
    expect(dash.tasks.find((t) => t.id === taskId)).toBeUndefined(); // no longer open
    await assertWalletInvariant(child.childProfileId);
  });

  it("re-approving never pays twice", async () => {
    actAs(parent);
    await expect(approveTask(taskId)).rejects.toBeInstanceOf(RpcError);
    const txs = await admin.from("transactions").select("id").eq("reference_task_id", taskId);
    expect(txs.data).toHaveLength(3);
  });

  it("household ledger page labels the rows and shows them to the parent", async () => {
    actAs(parent);
    const page = await fetchTxPage(parent.householdId, child.childProfileId, 0);
    expect(page.rows).toHaveLength(3);
    expect(page.taskTitles[taskId]).toBe("לסדר את החדר");
    expect(page.hasMore).toBe(false);
  });

  it("child moves wallet coins to savings; overdraw is refused", async () => {
    actAs(child);
    await moveToSavings(10);
    await expect(moveToSavings(1000)).rejects.toBeInstanceOf(RpcError);
    const txs = await admin.from("transactions").select("amount, type").eq("child_id", child.childProfileId);
    expect(computeWalletBalance(txs.data ?? [])).toBe(35);
    expect(computeSavingsBalance(txs.data ?? [])).toBe(15);
    await assertWalletInvariant(child.childProfileId);
  });

  it("only the parent can adjust the wallet, and never below zero", async () => {
    actAs(child);
    await expect(manualAdjustment(child.childProfileId, 100)).rejects.toBeInstanceOf(RpcError);
    actAs(parent);
    await expect(manualAdjustment(child.childProfileId, -1000)).rejects.toBeInstanceOf(RpcError);
    await manualAdjustment(child.childProfileId, 5);
    await assertWalletInvariant(child.childProfileId);
  });

  it("gift: one pending gift per request id, approved with the savings split", async () => {
    actAs(parent);
    const token = await fetchGiftToken(child.childProfileId, false);
    actAs(outsider); // any signed-in adult with a confirmed email
    const requestId = newGiftRequestId();
    const send = async () =>
      unwrapJson(
        await outsider.client.rpc("submit_gift", {
          _token: token,
          _amount: 50,
          _reason: "birthday",
          _sender_name: "דוד",
          _request_id: requestId,
        }),
      );
    await send();
    await send(); // retry of the same gift is deduplicated
    const gifts = await admin.from("gifts").select("id, status").eq("child_id", child.childProfileId);
    expect(gifts.data).toHaveLength(1);

    actAs(parent);
    await approveGift(gifts.data![0].id);
    const giftTx = await admin
      .from("transactions")
      .select("amount, type")
      .eq("reference_gift_id", gifts.data![0].id);
    expect(giftTx.data?.map((t) => `${t.type}:${t.amount}`).sort()).toEqual(
      ["manual_adjustment:50", "savings_credit:5", "wallet_debit:-5"].sort(),
    );
    await assertWalletInvariant(child.childProfileId);
  });
});
