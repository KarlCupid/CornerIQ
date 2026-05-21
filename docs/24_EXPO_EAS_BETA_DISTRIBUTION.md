# Expo EAS Beta Distribution

Date: 2026-05-21

This runbook describes how to prepare and distribute a CornerIQ Expo/EAS beta build. It keeps live smoke, secrets, and product feedback triage separate from app distribution.

## Required Tools

- Node.
- npm.
- Expo CLI through `npm start`, `npm run android`, `npm run ios`, `npm run web`, or `npx expo`.
- EAS CLI through `npx eas-cli` or an installed `eas` command when the release owner is ready to build.
- Access to the Expo/EAS project owner account.
- Access to the linked Supabase project for manual smoke and feedback triage.

## Required Public Env Names

The Expo client uses only these public runtime variable names:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Runtime UI and preflight checks may show missing variable names. They must never show values.

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
- `production`: store-oriented profile with local app version source.

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
- Slug: `corneriq`.
- Version: `0.1.0`.
- Orientation: portrait.
- User interface style: dark.
- iOS bundle identifier: `com.corneriq.app`.
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
- Current status: release-candidate prepared, build pending. Do not call the app distributed until EAS project setup is complete and a preview build succeeds.

Manual release-owner tasks:

- Run `npx eas-cli project:init` or `eas init`.
- Rerun Android preview build.
- Confirm build credentials.
- Decide whether current icon/splash/store metadata gaps are acceptable for the private beta or add assets first.
- Share any produced build link only through a private tester channel.

## Tester Distribution

- Use internal testers only for this beta release candidate.
- Share the preview build link through a private channel.
- Share tester onboarding notes, not secrets.
- Do not share `.env`, Supabase tokens, DB passwords, service role keys, smoke credentials, or tester passwords.
- Tell testers this is a beta, not medical advice, not a coach replacement, and not emergency support.
- Tell testers that manual logs are enough and wearables are optional.
- Ask testers to use Profile > Audit for product feedback and avoid secrets or emergency details.

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

- If sign-up succeeds but sign-in does not, check whether Supabase email confirmation is enabled.
- Use a test account that has completed confirmation for live smoke.

Supabase project link:

- Run `npm exec supabase -- migration list`.
- Run `npm exec supabase -- db push --dry-run`.
- If linked-project access fails, verify local Supabase CLI auth and project ownership outside git.

App starts but no profile:

- Complete onboarding, or use the demo profile path for a non-production local check.
- Missing profile is a warning in beta health and should not be treated as safe data.

Feedback submit fails:

- Confirm the user is signed in.
- Confirm migration `009` is applied remotely.
- Inspect `beta_feedback_reports` in the Supabase dashboard for user-owned rows.
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
5. `src/services/config/betaRuntimeConfig.ts`
6. `src/app/components/BetaTesterNoticePanel.tsx`
7. `src/tests/static/betaReleaseConfigStatic.test.ts`
8. `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
