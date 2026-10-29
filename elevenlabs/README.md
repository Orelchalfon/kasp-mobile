# ElevenLabs agent — Kaspii Tutor (Mobile)

The mobile app talks to its **own** ElevenLabs agent, separate from the web app's "Kaspii Tutor"
(`kaspii-web` still uses the old agent with per-session prompt overrides). The agent id lives in
the Supabase Edge Function secret `ELEVENLABS_AGENT_ID`.

Why a separate agent: the conversation is started by the client, so anything sent as an override
is client-controlled. With prompt overrides on, any signed-in user could replace the system prompt
(and its safety rules). This agent has the prompt + first-message overrides **off**; the prompt is
fixed in the dashboard and the tutor's details arrive only as dynamic variables, which can fill
their slots but can't remove the surrounding rules.

## Agent config (source of truth = this folder)

| Setting | Value |
|---|---|
| System prompt | [`tutor-agent-prompt.md`](./tutor-agent-prompt.md), verbatim |
| First message | `שלום! בואו נתחיל את השיחה שלנו. היום נדבר על {{topic}}.` |
| Dynamic variables | `tutor_name`, `subject`, `topic`, `personality`, `practice_language` — built and sanitized server-side by `buildTutorDynamicVariables` in `supabase/functions/_shared/tutors.ts` and passed to `startSession` by `features/tutors/voice-call.tsx`. **All are required**: a session without them is refused (`Missing required dynamic variables`) |
| Overrides allowed | `agent.language`, `tts.voice_id`, `conversation.text_only` only. Sending `agent.prompt` or `agent.first_message` makes the agent refuse the session |
| Authentication | on (conversation token / signed URL required) |
| Guardrails | prompt injection; content: sexual, violence, harassment, self-harm, profanity. Off on purpose: religion/politics (Torah tutors), medical/legal (finance/science tutors). A triggered guardrail ends the call |

The dashboard placeholders (`tutor_name=החונך`, `subject=לימודים`, …) are only for dashboard
previews/tests — they are **not** a runtime fallback.

## Known residual risk

There is no server-side way to bind dynamic variables for WebRTC sessions (the initiation webhook
is telephony/messaging only), so a modified client can put arbitrary text in a variable. Tested
2026-10-27: the safety rules stay in force and harmful instructions planted in `topic`
(profanity, violent story) were stopped by the prompt-injection guardrail 6/6; a harmless persona
change ("talk like a pirate") still gets through, partly because the first message reads `{{topic}}`
aloud verbatim (no LLM, so no guardrail on it). If that matters, make the first message static.
The prompt-injection guardrail did not react to variable content on its own — only once the
child's turn followed it.

## Deploying and voices

`tutor-token` bundles `supabase/functions/_shared/tutors.ts`, so redeploy it whenever that file
changes (`supabase functions deploy tutor-token --project-ref jlpvjxywfvijntsctvaq --no-verify-jwt`).
On 2026-10-29 the agent secret already pointed at this agent while the deployed function still sent
prompt/first-message overrides, and every call failed with "Override for field 'first_message' is
not allowed by config".

The agent's default voice is the household's cloned voice (אבי in `lib/tutors.ts`), but each tutor
row's `voice_id` is sent as a `tts.voiceId` override and wins. Changing a voice id in the catalog
does not update existing tutors; their rows must be updated as well.

Changing the prompt: edit `tutor-agent-prompt.md`, then apply it to the agent (dashboard, or
`PATCH /v1/convai/agents/{id}` with `conversation_config.agent.prompt.prompt`). A variable added to
the prompt must also be added to `buildTutorDynamicVariables` and to the placeholders.
