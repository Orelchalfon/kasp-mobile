# Kasp mobile

Hebrew-first (RTL) Expo app for Kasp — the native counterpart of `../kaspii-web`, on the same
Supabase backend (`jlpvjxywfvijntsctvaq`). Expo SDK 54 · Expo Router · NativeWind 5 RC ·
TanStack Query · pnpm. Feature map and verification status: [`migration-progress.md`](./migration-progress.md).

## Setup

```bash
pnpm install
cp .env.example .env        # fill in the public Supabase URL + publishable key
```

| Variable | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | public, ships in the bundle |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env` | anon/publishable key, public |
| `EXPO_PUBLIC_WEB_ORIGIN` | `.env` | web app origin for gift QR links + auth emails (default `https://kasp-web.kasp.workers.dev`) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `.env.test` (or `../kaspii-web/.env`) | **integration tests only**, never `EXPO_PUBLIC_*` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | Supabase Edge Function secrets | never in the app |

Supabase is a cloud URL, so a physical phone reaches it directly (no `localhost`).

## Run

```bash
pnpm start                  # Expo Go (--go): scan the QR (phone and PC on the same network)
pnpm android                # Expo Go on a connected Android device / emulator
pnpm start:dev              # serve a development build instead (--dev-client)
```

Everything runs in **Expo Go** except the AI-tutor **voice call**, which needs LiveKit/WebRTC
native modules (`@elevenlabs/react-native`, `@livekit/react-native`, `@livekit/react-native-webrtc`).
Because `expo-dev-client` is installed, plain `expo start` defaults to development-build mode —
the scripts pass `--go` explicitly. For the voice call, use a development build (not yet compiled
or tested — `@livekit/react-native-webrtc` 144.x on RN 0.81 / new architecture is unverified):

```bash
pnpm build:android:dev      # = expo run:android: local dev build (Android SDK + JDK 17), installs on the device
# or in the cloud / locally with EAS (eas.json "development" profile):
pnpm dlx eas-cli build --profile development --platform android [--local]
```

## RTL

The app is Hebrew-only and always right-to-left:
- builds: `expo-localization` plugin with `supportsRTL` + `forcesRTL` (changing it needs a rebuild);
- Expo Go: `extra.supportsRTL/forcesRTL` in `app.json`, plus `I18nManager.forceRTL` at startup.

Use logical classes (`ps-/pe-/ms-/me-/start-/end-`, `text-start`) — never left/right. LTR
fragments (emails, links, signed amounts) go through `LtrText`, which wraps strings in Unicode
LRI/PDI because Android ignores `writingDirection`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test                   # unit, no network
pnpm test:integration       # LIVE Supabase: creates ad-hoc users and purges them
pnpm dlx expo-doctor
```

## Backend contract

Supabase only; no schema / RLS / RPC changes from this app. Money moves go exclusively through
the existing SECURITY DEFINER RPCs; mutations never auto-retry or queue offline
(`lib/query-client.ts`). Wallet = `task_reward + manual_adjustment + wallet_debit + quiz_reward`
(`lib/transactions.ts`). Server-only features use Supabase Edge Functions in
`supabase/functions` (`create-child`, `tutor-token`, `tutor-transcript`, Deno; excluded from
`tsc`/ESLint here, check with `deno check`), deployed to
`jlpvjxywfvijntsctvaq` with `verify_jwt` off: the project uses the new publishable/secret API
keys, which the platform JWT check does not support, so each function authenticates the caller
itself (`auth.getUser`, 401 otherwise). Redeploy after editing `_shared/` too.
