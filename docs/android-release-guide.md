# Android development and Google Play release guide

This runbook covers the current `kasp-mobile` setup: Expo SDK 54, Android package
`com.kasp.mobile`, and the existing `development` and `production` profiles in `eas.json`.

## Choose the right workflow

| Workflow | Output | Use |
|---|---|---|
| `pnpm start` | Expo Go | UI/TypeScript work; voice tutor is unavailable |
| Development client | APK | Daily development with native LiveKit/WebRTC modules |
| Production build | Signed AAB | Google Play testing and releases |
| EAS Update | JS/assets | Optional hotfixes after explicit setup |

## 1. One-time EAS setup

From `kasp-mobile`:

```bash
pnpm install
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest whoami
pnpm dlx eas-cli@latest init
```

Run `eas init` only if the project is not linked to the correct Expo account. It adds the EAS
project ID and owner to `app.json`; review and commit that change. Keep the existing `eas.json`.

In the EAS dashboard, add these variables to both `development` and `production` under
**Project settings → Environment variables**:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_WEB_ORIGIN`

The build profiles automatically select their matching EAS environments. For local Metro, keep
the same development values in the ignored `.env`, or pull them:

```bash
pnpm dlx eas-cli@latest env:pull --environment development
```

`EXPO_PUBLIC_*` values ship in the app and are not secrets. Never place the Supabase service-role
key, ElevenLabs key, Play service-account JSON, or Android keystore in the app config or Git.

## 2. Build and use the development client

The voice tutor requires a development client because it uses native WebRTC modules.

```bash
# Cloud APK build
pnpm dlx eas-cli@latest build --platform android --profile development

# Install the latest build on a running emulator
pnpm dlx eas-cli@latest build:run --platform android --latest

# Start Metro after installing the client
pnpm start:dev
```

Install a cloud build on a physical device from its build URL/QR code. The computer and device
should normally share a network. If LAN discovery is blocked:

```bash
pnpm exec expo start --dev-client --tunnel
```

For a local build, install Android Studio, Android SDK, JDK 17, and run:

```bash
pnpm exec expo run:android --device
```

Rebuild after changing native dependencies, config plugins, permissions, icon/splash config, or
the Expo SDK. TypeScript, styling, and ordinary assets only need Metro reloads.

## 3. Create a production build

Run the release checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm dlx expo-doctor
pnpm dlx eas-cli@latest env:list --environment production
```

Update `expo.version` in `app.json` when the user-visible version changes. The current EAS
configuration uses remote versioning with `autoIncrement: true`, so EAS increments Android's
`versionCode`.

```bash
pnpm dlx eas-cli@latest build --platform android --profile production
```

On the first build, let EAS create/manage the signing keystore unless this app already has an
established signing key. The output is an AAB for Play; it cannot be installed directly like an
APK.

## 4. Push to Google Play

1. Create/select the Play Console app with package name `com.kasp.mobile`. This cannot be changed
   after the first upload.
2. Complete the store listing and **App content**. For Kasp, verify the privacy policy (also
   available in-app), Data safety, target audience/children, content rating, account deletion,
   microphone declaration, ads declaration, and reviewer login instructions.
3. Start on **Internal testing**. Upload the production AAB manually or configure EAS Submit.
4. Test login, parent/child flows, money operations, deep links, RTL, and voice on a physical
   device installed through Play.
5. Promote to closed testing and then production after policy and setup checks pass.

To use EAS Submit, create a Google service account with Play Console access, download its JSON key
temporarily, and upload it to EAS:

```bash
pnpm dlx eas-cli@latest credentials --platform android
```

Choose `production`, then **Google Service Account → Manage key for Play Store submissions**.
After EAS stores it, remove the downloaded local key safely. Submit the latest build:

```bash
pnpm dlx eas-cli@latest submit --platform android --profile production --latest
```

Submission uploads the release; Play Console still controls review and rollout. Once this path is
proven, build and submit together:

```bash
pnpm dlx eas-cli@latest build --platform android --profile production --auto-submit
```

New personal Play developer accounts created after 13 November 2023 currently need at least 12
continuously opted-in closed-test users for 14 days before applying for production access.

## 5. EAS Update is optional

This repository currently has no `expo-updates` dependency, update URL, runtime version, or EAS
channels. A new build is therefore the current deployment path. If the team intentionally adopts
over-the-air updates, make it a separately reviewed change:

```bash
pnpm exec expo install expo-updates
pnpm dlx eas-cli@latest update:configure
```

Add separate development/production channels and make a fresh native build before publishing an
update. Native-module, permission, plugin, or native-config changes always require a new store
build.

## Release checklist

- [ ] Typecheck, lint, unit tests, and Expo Doctor pass
- [ ] Production EAS environment variables are correct
- [ ] `expo.version` is updated when appropriate
- [ ] AAB is built from the intended commit with the production profile
- [ ] Critical flows pass from a Play testing-track install
- [ ] Listing, Data safety, privacy, app access, and audience declarations remain accurate
- [ ] Release notes and staged rollout are configured and monitored

Official references: [development builds](https://docs.expo.dev/develop/development-builds/introduction/),
[EAS environments](https://docs.expo.dev/eas/environment-variables/usage/),
[production builds](https://docs.expo.dev/tutorial/eas/android-production-build/),
[EAS Submit](https://docs.expo.dev/submit/android/), and
[Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
