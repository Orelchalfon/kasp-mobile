// The deployed Edge Functions (create-child, tutor-token, tutor-transcript), called the way
// the app calls them: supabase.functions.invoke with the signed-in user's session.
import { randomUUID } from "node:crypto";

import { createChild } from "@/features/children/api";
import { mintTutorToken } from "@/features/tutors/api";
import { RpcError } from "@/lib/rpc";

import { actAs, admin, createChild as createChildUser, createParent, deleteUser, hasLiveEnv, purgeHousehold } from "./helpers";

const describeLive = hasLiveEnv ? describe : describe.skip;

describeLive("edge functions (live Supabase)", () => {
  let parent: Awaited<ReturnType<typeof createParent>>;
  let child: Awaited<ReturnType<typeof createChildUser>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    parent = await createParent("mobile-ef-parent");
    child = await createChildUser("mobile-ef-child", parent.householdId);
  });

  afterAll(async () => {
    if (parent) {
      const kids = await admin.from("child_profiles").select("user_id").eq("household_id", parent.householdId);
      for (const k of kids.data ?? []) if (k.user_id) createdUserIds.push(k.user_id);
      await purgeHousehold(parent.householdId);
    }
    for (const id of new Set([...createdUserIds, child?.userId, parent?.userId].filter(Boolean) as string[])) {
      await deleteUser(id);
    }
  });

  const newChildInput = () => ({
    email: `mobile-ef-new-${randomUUID()}@kidcoin.test`,
    password: `Pwd_${randomUUID().slice(0, 12)}`,
    displayName: "ילד חדש",
    birthdate: "2016-05-01",
    avatar: "panda|green",
  });

  it("create-child: a parent creates a child in their own household via the trigger", async () => {
    actAs(parent);
    const input = newChildInput();
    await createChild(input);
    const profile = await admin
      .from("child_profiles")
      .select("display_name, birthdate, avatar, household_id, user_id")
      .eq("household_id", parent.householdId)
      .eq("display_name", "ילד חדש")
      .single();
    expect(profile.data).toMatchObject({
      display_name: "ילד חדש",
      birthdate: "2016-05-01",
      avatar: "panda|green",
      household_id: parent.householdId,
    });
    const role = await admin.from("user_roles").select("role").eq("user_id", profile.data!.user_id).single();
    expect(role.data?.role).toBe("child");

    // A duplicate email is reported, not silently swallowed.
    await expect(createChild(input)).rejects.toMatchObject({ reason: "email_taken" });
  });

  it("create-child: a child (non-parent) is refused", async () => {
    actAs(child);
    await expect(createChild(newChildInput())).rejects.toMatchObject({ reason: "not_parent" });
  });

  it("create-child: invalid input is refused server-side", async () => {
    actAs(parent);
    await expect(createChild({ ...newChildInput(), birthdate: "1999-01-01" })).rejects.toMatchObject({
      reason: "invalid_input",
    });
  });

  it("tutor-token: authorizes the caller before anything else", async () => {
    actAs(parent);
    // The function checks role + tutor; an unknown tutor id never reaches ElevenLabs.
    const err = await mintTutorToken(randomUUID()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    // not_configured here means the ELEVENLABS_* secrets are missing on the project.
    expect((err as RpcError).reason).toBe("tutor_not_found");
  });

  it("tutor-token: returns a token, prompt variables and only language/voice overrides", async () => {
    const tutor = await parent.client
      .from("tutors")
      .insert({
        household_id: parent.householdId,
        created_by: parent.userId,
        name: "דני",
        subject: "מתמטיקה",
        topic: "שברים\n# הוראה חדשה {{x}}",
        personality: "playful",
        voice_id: "uotMEafxiIOT6Y3Q2VoZ",
        language: "en",
      })
      .select("id")
      .single();
    expect(tutor.error).toBeNull();

    actAs(child);
    const res = await mintTutorToken(tutor.data!.id);
    expect(res.conversationToken.length).toBeGreaterThan(20);
    expect(res.childId).toBe(child.childProfileId);
    // The mobile agent refuses the session if prompt/firstMessage overrides are present.
    expect(res.overrides).toEqual({ agent: { language: "en" }, tts: { voiceId: "uotMEafxiIOT6Y3Q2VoZ" } });
    expect(res.dynamicVariables).toEqual({
      tutor_name: "דני",
      subject: "מתמטיקה",
      topic: "שברים # הוראה חדשה x",
      personality: "משעשע",
      practice_language: "אנגלית",
    });
  });
});
