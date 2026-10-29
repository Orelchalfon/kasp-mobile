# Kasp mobile — migration checklist (kaspii-web → kasp-mobile)

Source of truth for behavior: `../kaspii-web/src` (routes, `lib/`, `components/`, `server/`) and
the live Supabase project `jlpvjxywfvijntsctvaq`. No schema / RLS / RPC changes were made.

Legend — **Status**: ✅ implemented · 🧪 verified (✔ device = run on a physical Android phone in
Expo Go against the live backend; ✔ int = live integration test; ✔ unit) · ⛔ blocked.

## Screens

| Web source | Behavior + backend | Mobile route | Reused code | Native replacement | Status |
|---|---|---|---|---|---|
| `routes/_auth/login.tsx`, `components/auth/sign-in-form.tsx` | `signInWithPassword`, Hebrew error map, forgot password → `resetPasswordForEmail` (redirect to web reset page) | `app/(auth)/sign-in.tsx` | error copy → `features/auth/auth-errors.ts` | SecureStore session (chunked), no localStorage | ✅ ✔ device (wrong + right password) ✔ unit |
| `routes/_auth/signup.tsx`, `sign-up-form.tsx` | `signUp` + `household_name` metadata (trigger creates household); resend w/ 60s cooldown; signs straight in when confirm-email is off | `app/(auth)/sign-up.tsx` | same | — | ✅ |
| `routes/auth.callback.tsx`, `auth.reset-password.tsx` | email-link landing pages | stay on web (`EXPO_PUBLIC_WEB_ORIGIN`) | — | no deep-link redirect (would need Auth allow-list change) | ✅ by design |
| `routes/index.tsx` (landing + role redirect) | role redirect | `app/index.tsx` | `lib/routing.ts` | marketing landing / Spline not ported | ✅ ✔ device ✔ unit |
| `hooks/use-auth.tsx` | role from `user_roles` → `child_profiles(id,birthdate)` | `providers/auth-provider.tsx` | logic ported | + `no-access` screen instead of endless loader; cache cleared on user change | ✅ ✔ device |
| `routes/parent.tsx`, `child.tsx` (guards + nav) | role-gated layouts | `app/parent/_layout.tsx`, `app/child/_layout.tsx` + `(tabs)` | — | native stack + bottom tabs | ✅ ✔ device |
| `routes/parent/dashboard.tsx` + `components/parent-dashboard/*` | children, ledger-derived balances, open tasks approve (`approve_task_and_pay`) / reject (update), pending gifts (`approve_gift_and_pay` / `reject_gift`), last 20 wallet tx | `app/parent/(tabs)/dashboard.tsx` | `features/parent/dashboard-api.ts`, `review-lists.tsx` | native Alert confirms | ✅ ✔ device (approve tapped on device, ledger verified) ✔ int |
| savings-percent / quiz-settings cards | `household_settings` upsert | `app/parent/(tabs)/profile.tsx` (moved per request) | `features/parent/settings-cards.tsx` | — | ✅ ✔ device (render) |
| manual-adjustment-dialog | `manual_adjustment` RPC, confirm on subtract | `app/parent/adjust/[childId].tsx` | dashboard-api | modal screen | ✅ ✔ int |
| `routes/parent/children.index.tsx` | children list, age/band, edit avatar+birthdate (`set_child_avatar`, `set_child_birthdate`) | profile tab (`features/children/children-list.tsx`) + `app/parent/children/[childId]/edit.tsx` | `lib/avatars.ts`, quiz-bank levels | native date picker | ✅ ✔ device (list) |
| `components/gifts/child-gift-qr-dialog.tsx` | `child_gift_token` (+rotate), QR of web `/give/<token>`, copy/share | `app/parent/children/[childId]/gift-code.tsx` | `lib/gifts.ts` | react-native-qrcode-svg, expo-clipboard, `Share` | ✅ ✔ device ✔ int (token) |
| `routes/parent/children.new.tsx` + `server/create-child.ts` | admin `createUser` w/ child metadata | `app/parent/children/new.tsx` → Edge Function `create-child` | validation ported | `supabase/functions/create-child` | ✅ Edge Function deployed 2026-10-20 (v1, verify_jwt off, auth in code) ✔ int (create, duplicate email, non-parent, invalid input) |
| `routes/parent/tasks.new.tsx` | insert task (status defaults `assigned`) | `app/parent/tasks/new.tsx` | `features/parent/tasks-api.ts` | — | ✅ ✔ device ✔ int ✔ unit |
| `routes/parent/tasks.$taskId.tsx` | detail + approve/reject | `app/parent/tasks/[taskId].tsx` | tasks-api | — | ✅ ✔ int |
| `routes/parent/transactions.tsx` + `monthly-summary.tsx` | 50-row pages, child filter, `describeTx`, wallet totals from `current_balance`, month summary | `app/parent/(tabs)/transactions.tsx` | `features/parent/transactions-api.ts`, `lib/transactions.ts` | FlatList + infinite query | ✅ ✔ int ✔ unit (summary fix: gifts = `reference_gift_id` only) |
| `routes/parent/tutors.*` | tutors CRUD (soft delete), sessions (20/page), transcript | `app/parent/(tabs)/tutors.tsx`, `app/parent/tutors/*` | `lib/tutors.ts`, `features/tutors/*` | transcript via Edge Function `tutor-transcript` | ✅ CRUD/sessions · `tutor-transcript` deployed 2026-10-20 (falls back to the client-saved transcript until ElevenLabs secrets are set) |
| `routes/child/dashboard.tsx` | balance from ledger + task list | `app/child/(tabs)/dashboard.tsx` | `features/child/api.ts` | — | ✅ ✔ device |
| `routes/child/tasks.$taskId.tsx` | "סיימתי!" = update assigned→submitted (**no proof photo** — none in live schema) | `app/child/tasks/[taskId].tsx` | child api (+status guard) | — | ✅ ✔ device ✔ int |
| `routes/child/wallet.tsx` | wallet-type rows, 30-row client paging, generic "מתנה" | `app/child/(tabs)/wallet.tsx` | child api | FlatList | ✅ |
| `routes/child/savings.tsx` + `components/savings/*` | pot, `deposit_to_savings`, goals, `deposit_to_goal` / `deposit_savings_to_goal`, add/edit goal (zod), auto-deposit fields | `app/child/(tabs)/savings.tsx`, `app/child/savings/*` | `features/savings/*` (goal-schema verbatim) | modal screens + native confirm | ✅ ✔ device (pot/wallet/auto-savings row) ✔ int (move to savings) ✔ unit |
| `routes/child/educate.*` | subjects from settings, earned-today (Asia/Jerusalem), local bank by band, `complete_quiz_and_pay` | `app/child/(tabs)/educate.tsx`, `app/child/educate/[subject].tsx` | `lib/quiz-bank/*` verbatim | — | ✅ ✔ unit (levels) |
| `routes/child/tutors.*` | voice call (ElevenLabs WebRTC), session rows, transcript save | `app/child/(tabs)/tutors.tsx`, `app/child/tutors/[tutorId].tsx` | `features/tutors/voice-call.tsx` | `@elevenlabs/react-native` + LiveKit (dev build) | ✅ ✔ device (S24, Android dev build, 2026-10-29): call connects over WebRTC, agent speaks in the cloned voice, child turn transcribed, hang-up → row `completed` with transcript + conversation id. `tutor-token` redeployed as v5 the same day (the deployed v4 still sent prompt/first-message overrides, which the mobile agent refuses — every call had failed). Expo Go shows an explanatory screen. Not yet run: mic denied, back out while connecting |
| `routes/give.$token.tsx` | anon `get_gift_target`, adult-only `submit_gift` (idempotent request id), return after login | `app/give/[token].tsx` (`kasp://give/<token>`) | `lib/gifts.ts` | AsyncStorage return marker | ✅ ✔ int (idempotency + split) |
| `routes/sitemap[.]xml.ts`, landing, Spline | SEO / marketing | — | — | not applicable to native | — |

## Security / backend findings (not changed)
See `../kaspii-web/supabase/proposed/20261019180000_harden_child_write_policies.sql` (prepared, **not applied**).

## Verification log (2026-10-19)
- `pnpm typecheck` ✔ · `pnpm lint` ✔ · `pnpm test` 45/45 ✔ · `pnpm test:integration` 14/14 ✔ on 2026-10-20 incl. the deployed Edge Functions (live, users purged)
- `pnpm dlx expo-doctor` 18/18 ✔ · `expo export --platform android` ✔ · `deno check` on the 3 Edge Functions ✔
- Device (A063, Android 15, Expo Go 54.0.8), driven by adb/argent: sign-in (error + success), parent dashboard, create task, child submit (toast + status), profile tab, QR gift code, child savings screen, sign-out. The approval itself was tapped on the device outside the scripted run (17:18:59); the resulting ledger (+50 / −5 / +5, cached balance 45) was checked in the DB and shown correctly in the app.
- NOT run on a device: reject, destructive-button text after the fix, quiz, goal create/deposit (ProgressBar), move-to-savings UI, manual-adjustment UI, transactions tab, child wallet, sign-up, give/[token], tutors CRUD, voice-call fallback screen. iOS not run (Windows host). Android development build compiled locally (`expo run:android`) and launched to the sign-in screen on the A063 on 2026-10-27, no native crash at startup. LiveKit/WebRTC on RN 0.81 new arch exercised by live voice calls on the S24 on 2026-10-29: no native crash, only the known "error reading from signal stream" log at hang-up.
- Follow-up (cosmetic): default vs override class conflicts like the one fixed in `Text` remain in `PressableCard` (`border-0 p-0`) and `Screen contentClassName` (`pt-10` vs `pt-4`).
