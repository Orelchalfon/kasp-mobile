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
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` + EAS env vars | public, ships in the bundle |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env` + EAS env vars (sensitive) | anon/publishable key, public |
| `EXPO_PUBLIC_WEB_ORIGIN` | `.env` + EAS env vars | web app origin for gift QR links + auth emails (default `https://kasp-web.kasp.workers.dev`) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `.env.test` (or `../kaspii-web/.env`) | **integration tests only**, never `EXPO_PUBLIC_*` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | Supabase Edge Function secrets | never in the app |

EAS builds don't see `.env` (gitignored). The three `EXPO_PUBLIC_*` values are EAS environment
variables on `@orelchalfon/kasp-mobile` in `development`, `preview` and `production`
(`eas env:list <environment>`); the build profile picks the environment automatically.

Supabase is a cloud URL, so a physical phone reaches it directly (no `localhost`).

## Run

There are two ways to run the app. Use **Expo Go** for everyday UI work. Use a **development
build** (dev client) when you need the AI-tutor voice call.

### Expo Go (`pnpm start`)

```bash
pnpm start                  # expo start --go: Metro + QR code; scan it with the Expo Go app
pnpm android                # same, and opens Expo Go on a connected Android device / emulator
pnpm ios                    # same, for the iOS simulator (macOS only)
pnpm web                    # browser preview
```

Nothing to compile: install Expo Go from the store, keep the phone and PC on the same network,
and scan the QR. Every screen works here **except the voice call**. Expo Go doesn't include the
LiveKit/WebRTC native modules it needs (`@elevenlabs/react-native`, `@livekit/react-native`,
`@livekit/react-native-webrtc`), so the tutor screen shows a message saying to open the development build instead.
Because `expo-dev-client` is installed, a bare `expo start` would open in dev-client mode. That's
why the scripts pass `--go`.

### Development build / dev client (`pnpm start:dev`)

```bash
pnpm build:android:dev      # expo run:android: compiles the native app, installs it on the device, starts Metro
pnpm start:dev              # expo start --dev-client: Metro only, for a dev build that's already installed
```

A development build is our own app compiled with all native modules plus the `expo-dev-client`
launcher. Think of it as a custom Expo Go that also has WebRTC. Use it to test voice calls.

- **First time, or after native changes:** run `pnpm build:android:dev`. It needs the Android
  SDK, JDK 17 and a phone connected over USB (USB debugging on) or a running emulator. Rebuild
  after adding or upgrading a package with native code, or after changing `app.json` plugins or
  permissions.
- **Every other day:** run `pnpm start:dev`, then open the **Kasp** app on the phone (not Expo
  Go). It finds the dev server on the same network, or you can scan the QR. JS changes
  hot-reload as usual.
- **Without a local Android toolchain:** build it with EAS (the `eas.json` `development`
  profile), install the APK it produces, then use `pnpm start:dev`:

  ```bash
  pnpm dlx eas-cli build --profile development --platform android   # add --local to build on this PC
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
itself (`auth.getUser`, 401 otherwise). Redeploy after editing `_shared/` too, from this folder:
`supabase functions deploy <name> --project-ref jlpvjxywfvijntsctvaq --no-verify-jwt` (without
`--no-verify-jwt` the CLI turns JWT verification back on and every call fails).
