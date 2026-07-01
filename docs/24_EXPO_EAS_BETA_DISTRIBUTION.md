# Expo EAS Beta Distribution

Date: 2026-05-21

This runbook describes how to prepare and distribute a CornerIQ Expo/EAS beta build. It keeps live smoke, secrets, and outside-app product feedback triage separate from app distribution.

## Required Tools

- Node.
- npm.
- Expo CLI through `npm start`, `npm run android`, `npm run ios`, `npm run web`, or `npx expo`.
- EAS CLI through `npx eas-cli` or an installed `eas` command when the release owner is ready to build.
- Access to the Expo/EAS project owner account.
- Access to the linked Supabase project for manual smoke when explicitly opted in.

## Required Public Env Names

The Expo client uses only these public runtime variable names:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Runtime UI and preflight checks may show missing variable names. They must never show values.

Paid App Store builds also declare these public runtime variable names:

- `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL`
- `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED`
- `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_CORNERIQ_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_CORNERIQ_REVENUECAT_ENTITLEMENT_ID`
- `EXPO_PUBLIC_CORNERIQ_MONTHLY_PRODUCT_ID`
- `EXPO_PUBLIC_CORNERIQ_ANNUAL_PRODUCT_ID`

## Secret Values Never Committed

Keep these out of git, docs, source, tests, issue trackers, screenshots, and build config:

- Supabase access token.
- Supabase DB password.
- Smoke email/password.
- Service role key.
- Any tester password.

Use ignored local `.env` files or EAS secret storage when appropriate. Do not commit `.env`; do not commit .env in any release branch.

## Local Run

Recommended local gate sequence:

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run quality
npm run preflight:beta
npm start
```

Platform launch scripts are available:

```bash
npm run android
npm run ios
npm run web
```

PowerShell on this Windows host may block `npm.ps1`; `cmd /c npm run <script>` is the equivalent local workaround.

## Preview Build

`eas.json` now defines:

- `development`: internal distribution, Android APK, iOS simulator.
- `preview`: internal distribution, Android APK.
- `production`: store-oriented profile with EAS remote app versions, auto-incremented build numbers, and a pinned Xcode 26 iOS image.

Preview build command:

```bash
eas build --profile preview
npx eas-cli build --profile preview --platform android --non-interactive
```

If EAS is not configured for the project owner yet:

1. Sign in with the release owner account.
2. Run `npx eas-cli project:init` or `eas init` to link or create the EAS project.
3. Confirm the existing app name, slug, version, bundle identifiers, and Android package in `app.json`.
4. Do not add secret values to `app.json` or `eas.json`.
5. Re-run `npm run preflight:beta`.
6. Run `npx eas-cli build --profile preview --platform android --non-interactive`.

Current app config:

- App name: `CornerIQ`.
- Owner: `karlcupid`.
- EAS project ID: `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`.
- Slug: `corneriq`.
- Version: `0.1.0`.
- Orientation: portrait.
- User interface style: dark.
- iOS bundle identifier: `com.corneriq.app`.
- iOS build number seed: `1`; production EAS builds auto-increment from remote version state.
- iOS export compliance: `usesNonExemptEncryption` is set to `false`.
- Android package: `com.corneriq.app`.
- Icon and splash assets are not production-polished yet; accept this as a beta limitation or add assets before broader distribution.

## Current EAS Build Status

2026-05-21 verification:

- EAS CLI was available through `npx eas-cli`.
- EAS CLI version: `eas-cli/19.0.5`.
- EAS auth was available for the release owner account.
- Android preview build was attempted with `npx eas-cli build --profile preview --platform android --non-interactive`.
- First attempt failed with `Invalid UUID appId` because `app.json` had a pre-existing dirty invalid `extra.eas.projectId`.
- The invalid project id was removed, and beta preflight now validates any future EAS project id as a UUID.
- Retry failed with `EAS project not configured`; non-interactive build requires `eas init`.
- EAS result: failed.
- Build URL/artifact: none produced.
- Previous status: release-candidate prepared, build pending.

2026-06-03 verification:

- EAS CLI version check: `eas-cli/19.0.5`.
- EAS auth check: release owner account verified privately; no personal email recorded.
- `npx eas-cli project:info --non-interactive` initially failed with `EAS project not configured`.
- `npx eas-cli init --non-interactive` found existing project `@karlcupid/corneriq` and required `--force`.
- `npx eas-cli init --non-interactive --force` linked project ID `906eba92-1dee-41d8-b27f-0c04f4fc6f1a` and modified `app.json`.
- `npx eas-cli project:info --non-interactive` then verified `@karlcupid/corneriq`.
- Android preview build submitted with `npx eas-cli build --profile preview --platform android --non-interactive`.
- Build ID: `d550e9bb-b705-41a3-bae7-76c2b6d38453`.
- Build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/d550e9bb-b705-41a3-bae7-76c2b6d38453
- Final EAS status from `build:view`: `ERRORED`.
- Failure code: `EAS_BUILD_UNKNOWN_GRADLE_ERROR`.
- Failure phase: Gradle `:app:createBundleReleaseJsAndAssets`, where Hermes rejected a dynamic `import(/* webpackIgnore: true */ ...)` expression in the generated Android bundle.
- Root cause found locally: the floating `@supabase/supabase-js` range had resolved to `2.106.0`, whose CommonJS bundle includes OpenTelemetry tracing dynamic import code that Hermes could parse as invalid syntax.
- Remediation: `@supabase/supabase-js` is now pinned exactly to `2.50.0`, which brings `@supabase/auth-js@2.70.0`, avoids the vulnerable `2.41.1 - 2.49.10` Supabase audit range, and has no matching `otelModulePromise` / `webpackIgnore` dynamic import text in the installed Supabase bundle. Expo dependency drift was also corrected with `expo@~54.0.35`, `expo-font@~14.0.12`, and an explicit Expo default `metro.config.js`.
- Local verification after remediation: `npm install`, `npm run typecheck`, `npm run lint`, `npm run preflight:beta`, approved `npx expo-doctor` (`18/18`), approved `npm test` (`489` passed, `1` skipped), approved `npm run quality`, approved `npm run smoke:fixtures` (`20` passed), approved `npm run test:coverage` (`489` passed, `1` skipped; all-files statements about `88.73%`), `npm audit --audit-level=high --omit=dev` passed with only moderate Expo-chain advisories remaining.
- Fresh Android preview build submitted with `npx eas-cli build --profile preview --platform android --non-interactive --clear-cache`.
- Fresh build ID: `c21c5692-011e-4c85-949f-355d0e1f753f`.
- Fresh build URL: https://expo.dev/accounts/karlcupid/projects/corneriq/builds/c21c5692-011e-4c85-949f-355d0e1f753f
- Final EAS status from `build:view`: `FINISHED`.
- Build artifact: https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk
- Completed at: `2026-06-03T20:29:29.176Z`.
- Current status: EAS project linked, prior Hermes/Supabase failure remediated locally, fresh preview build finished, APK artifact produced. Share only through a private tester channel after the release owner confirms tester list, app icon/splash/store metadata acceptance, and physical-device checks.

Manual release-owner tasks:

- Record build `c21c5692-011e-4c85-949f-355d0e1f753f` and artifact URL in release handoff.
- Distribute only through a private tester channel.
- Confirm build credentials.
- Decide whether current icon/splash/store metadata gaps are acceptable for the private beta or add assets first.
- Share any produced build link only through a private tester channel.

## Tester Distribution

- Use internal testers only for this beta release candidate.
- Share the preview build link through a private channel.
- Share tester onboarding notes, not secrets.
- Do not share `.env`, Supabase tokens, DB passwords, service role keys, smoke credentials, or tester passwords.
- Tell testers this is a beta, not medical advice, not a replacement for qualified human judgment, and not emergency support.
- Tell testers that manual logs are enough and wearables are optional.
- Collect product feedback through private facilitator notes or outside-app support, not Profile > Audit. Ask testers to avoid secrets, emergency details, medical records, full health histories, credentials, and personal contact details.

## Smoke

Live smoke remains separate and manual.

Required variable names:

- `CORNERIQ_LIVE_DB_SMOKE`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `CORNERIQ_SMOKE_EMAIL`
- `CORNERIQ_SMOKE_PASSWORD`

Safe command pattern:

```bash
CORNERIQ_LIVE_DB_SMOKE=1 npm run smoke:live-db
```

Do not run live smoke in CI by default. Do not print or document smoke credential values.

## Troubleshooting

Missing env:

- Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present in the local process or build environment.
- Run `npm run preflight:beta`.
- The app may show missing variable names, never values.

Auth email confirmation:

- If sign-up succeeds but the confirmation email opens a dead browser page, confirm Supabase Auth URL Configuration is not relying on localhost or an expired preview Site URL.
- Add the app callback to Supabase Auth Redirect URLs: `corneriq://auth/confirm` for production-tight config, or `corneriq://**` while testing all CornerIQ auth callbacks.
- Keep the app sign-up redirect aligned with `ACCOUNT_CONFIRMATION_REDIRECT_URL` in `src/hooks/useSupabaseSession.ts`; the callback handler accepts `code`, session credentials, and `token_hash` confirmation links.
- Use a test account that has completed confirmation for live smoke.

Supabase project link:

- Run `npm exec supabase -- migration list`.
- Run `npm exec supabase -- db push --dry-run`.
- If linked-project access fails, verify local Supabase CLI auth and project ownership outside git.

App starts but no profile:

- Complete onboarding, or use the demo profile path for a non-production local check.
- Missing profile is an onboarding/runtime warning and should not be treated as safe data.

Feedback/support path:

- Launch runtime has no Profile > Audit feedback form, beta health panel, beta tester notice, feedback history, or signed-in issue-reporting path.
- Use private facilitator notes or outside-app support records for product feedback.
- Do not inspect `beta_feedback_reports` as an active launch table; the pre-launch feedback table was removed from the final launch schema.
- Do not use an admin dashboard in the app; manual triage remains private and outside the client.

## What Not To Do

- Do not use service role in app code.
- Do not run live smoke in CI.
- Do not commit `.env`.
- Do not hardcode Supabase credentials.
- Do not add barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, reviewer-clear UI, external analytics, or admin triage during release-candidate verification.
- Do not tell testers to use the app for urgent symptoms or emergency support.

## Auditor Inspect First

1. `app.json`
2. `eas.json`
3. `package.json`
4. `scripts/beta-preflight.mjs`
5. `src/app/components/AppErrorBoundary.tsx`
6. `src/app/components/AppErrorState.tsx`
7. `src/app/supportCopy.ts`
8. `src/tests/static/betaReleaseConfigStatic.test.ts`
9. `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
10. `docs/qa/INCIDENT_TRIAGE_RUNBOOK.md`
