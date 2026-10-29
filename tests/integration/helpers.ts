// Live-project helpers, adapted from kaspii-web/tests/helpers/supabase.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import type { Database } from "@/lib/database.types";
import { computeWalletBalance } from "@/lib/transactions";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasLiveEnv = Boolean(SUPABASE_URL && SERVICE_ROLE && ANON);

export const admin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL || "https://missing.supabase.co",
  SERVICE_ROLE || "missing",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  client: SupabaseClient<Database>;
}

async function signedInClient(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  return client;
}

/** A confirmed user; the signup trigger makes them the parent of a fresh household. */
export async function createParent(prefix: string): Promise<TestUser & { householdId: string }> {
  const email = `${prefix}-${randomUUID()}@kidcoin.test`;
  const password = `Pwd_${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const role = await admin.from("user_roles").select("household_id").eq("user_id", data.user.id).single();
  if (role.error || !role.data) throw new Error(`no household for ${email}`);
  return {
    userId: data.user.id,
    email,
    password,
    householdId: role.data.household_id,
    client: await signedInClient(email, password),
  };
}

/** A child created exactly like createChild / the create-child Edge Function does. */
export async function createChild(prefix: string, householdId: string): Promise<TestUser & { childProfileId: string }> {
  const email = `${prefix}-${randomUUID()}@kidcoin.test`;
  const password = `Pwd_${randomUUID().slice(0, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "child", household_id: householdId, full_name: `child-${prefix}`, birthdate: "2015-03-10" },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const profile = await admin.from("child_profiles").select("id").eq("user_id", data.user.id).single();
  if (profile.error || !profile.data) throw new Error("child profile missing");
  return {
    userId: data.user.id,
    email,
    password,
    childProfileId: profile.data.id,
    client: await signedInClient(email, password),
  };
}

/** Run the app's data layer as this user (swaps the mocked singleton client). */
export function actAs(user: { client: SupabaseClient<Database> }) {
  (jest.requireMock("@/lib/supabase") as { __setClient: (c: unknown) => void }).__setClient(user.client);
}

export async function purgeHousehold(householdId: string): Promise<void> {
  await admin.from("transactions").delete().eq("household_id", householdId);
  await admin.from("gifts").delete().eq("household_id", householdId);
  await admin.from("child_gift_links").delete().eq("household_id", householdId);
  await admin.from("quiz_attempts").delete().eq("household_id", householdId);
  await admin.from("tutor_sessions").delete().eq("household_id", householdId);
  await admin.from("tutors").delete().eq("household_id", householdId);
  await admin.from("goals").delete().eq("household_id", householdId);
  await admin.from("tasks").delete().eq("household_id", householdId);
  await admin.from("household_settings").delete().eq("household_id", householdId);
  await admin.from("child_profiles").delete().eq("household_id", householdId);
  await admin.from("user_roles").delete().eq("household_id", householdId);
  await admin.from("households").delete().eq("id", householdId);
}

export async function deleteUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

/** child_profiles.current_balance must always equal the wallet derived from the ledger. */
export async function assertWalletInvariant(childId: string): Promise<void> {
  const txs = await admin.from("transactions").select("amount, type").eq("child_id", childId);
  const profile = await admin.from("child_profiles").select("current_balance").eq("id", childId).single();
  expect(Number(profile.data?.current_balance)).toBe(computeWalletBalance(txs.data ?? []));
}
