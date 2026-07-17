# Apple Review Handoff

Date: 2026-07-06

Status: SUBMISSION_DOCKET_READY_FOR_BUILD_7. App Review submission is authorized once build `0.1.0` / iOS build `7` is uploaded to App Store Connect, processed by Apple, selectable for the app version, and no App Store Connect blocker requires release-owner judgment.

## Final Submission Docket - Build 7

- App: `CornerIQ`.
- Version: `0.1.0`.
- iOS build number: `7`.
- EAS build ID: `34ea1526-fe17-4ab2-aa52-e0176bee8ddc`.
- EAS submission ID: `ddf280ef-4201-4096-88bf-255277d71bd7`.
- Commit: `fb2663e`.
- ASC App ID: `6786384726`.
- Submission authorization: release owner approved proceeding to App Review on 2026-07-06 once Apple processes build 7.
- Guardrail: do not start another `eas submit` for build 7. If Apple requires a fresh 2FA/security confirmation, a missing agreement, a pricing/tax decision, or a metadata choice not covered here, stop and ask the release owner.
- Screenshots: fresh 6.9-inch iPhone portrait PNGs are staged in `qa-artifacts/app-store-screenshots/build-7-1290x2796/`.
- Screenshot manifest: `qa-artifacts/app-store-screenshots/build-7-1290x2796/manifest.json`.
- Screenshot source caveat: these are current-code local promo-capture screenshots at an App Store accepted iPhone size; use physical TestFlight captures instead if App Store Connect rejects them or if the release owner wants native-player artwork.

## Required Before Submission

- Privacy Policy URL: published at `https://sites.google.com/view/corneriq/privacy-policy` and configured as the app default release link. `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL` can override it if the release owner moves the policy.
- Account deletion Edge Function: completed on 2026-06-18. `supabase/functions/delete-account` is deployed to the production Supabase project as ACTIVE v2, and Profile > Data > Delete account passed live smoke with a real signed-in account.
- App icon and splash: local assets are wired in `app.json`; APPLE_SUBMISSION_BLOCKED until the release owner accepts them as final App Store assets or replaces them.
- Screenshots: build 7 submission screenshots are staged in `qa-artifacts/app-store-screenshots/build-7-1290x2796/`.
- Support URL: published at `https://sites.google.com/view/corneriq/support` and configured as the app default release link. `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL` can override it if the release owner moves support.
- Terms of Use: the app defaults to Apple's standard EULA at `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`. `EXPO_PUBLIC_CORNERIQ_TERMS_OF_USE_URL` can override it if the release owner publishes custom terms.
- Reviewer credentials: review account is prepared and entitled for review access. Provide credentials only in App Store Connect Review Notes. Do not commit credentials.
- Subscriptions: product features are gated by RevenueCat entitlement `corneriq_pro` after onboarding. App Store subscription products are `com.corneriq.pro.monthly` and `com.corneriq.pro.annual`. The reviewer account is entitled through RevenueCat for review access.

## Reviewer Access

1. Review account auth was completed before setup; onboarding was completed through the normal signed-in app flow on 2026-06-19.
2. Provide the review account email and password only in App Store Connect Review Notes.
3. Do not commit credentials, personal emails, or screenshots containing credentials.

Preloaded reviewer profile:

- Adult amateur open boxer; age 25; male; orthodox; 3-5 years training age.
- Body context: 175 cm, 67.5 kg current body weight, 69 kg typical walk-around weight.
- Manual-first setup: wearable preference is manual only; no wearable is required.
- Cycle support is left as decide later.
- Equipment/access: jump rope, gloves/wraps, dumbbells, pull-up bar, heavy bag.
- Availability: Monday, Tuesday, Wednesday, Thursday, Saturday.
- Fixed boxing sessions: Wednesday technical session, 45 min, RPE 6; Saturday pads/mitts, 75 min, RPE 7.
- Safety profile has no medical restriction flags, no eating/weight-cut risk flags, and no prior adverse cut notes.
- Fight camp context: confirmed amateur bout on 2026-08-15, 68 kg, day-before weigh-in. Exact weigh-in datetime was saved through Plan > Change goal or schedule as `2026-08-15T01:00:00.000Z`, with standard support dose and existing fixed schedule kept.
- Manual readiness was logged for the review account: 7.5h sleep, energy 4/5, soreness 2/5, sleep quality 4/5, stress 2/5, mood 4/5.

Expected reviewer behavior:

- Today may still show conservative review/cut-paused language when fuel, hydration, or safety context is incomplete. This is intentional: missing data stays unknown, not safe.
- The reviewer can use Today > Check in and Quick Logs to see manual-first readiness, weight, water, and food logging.
- Plan shows a fight-camp week built around the fixed boxing sessions.
- Fuel shows weight/fuel safety framing and should not present unsafe weight-cut pressure.
- Profile > Data includes export preview, portable JSON export, delete app data, and delete account.

Suggested Review Notes:

```text
CornerIQ is account-gated. A review account has been created, confirmed, onboarded, and granted active CornerIQ Pro access through RevenueCat.
Username: [provide only in App Store Connect]
Password: [provide only in App Store Connect]

The account demonstrates:
- Manual-first onboarding; no wearable is required
- Adult boxing profile
- Fixed weekly boxing sessions
- Boxing support training around coach/team work
- Manual readiness, hydration, food, and body-weight logging
- Conservative fuel and safety guidance when context is incomplete

Profile > Data includes:
- Export preview
- Portable JSON export
- Delete app data
- Delete account, confirmed with DELETE ACCOUNT, which signs the user out after server-side account deletion

The app is manual-first and does not require a wearable.

CornerIQ uses auto-renewable in-app purchase subscriptions after onboarding.
- Monthly: CA$15/month
- Annual: CA$100/year
- No free trial

Users can create/sign in to an account and complete onboarding without purchase. After onboarding, product features require subscription. Restore purchase, Privacy Policy, Terms of Use, Support, sign out, export, and delete account remain available from the paywall without purchase.

For review access, the provided account has active CornerIQ Pro entitlement through RevenueCat. The reviewer account may skip the paywall because it is already entitled for review.
```

## Subscription Notes

- Product features are subscription-gated after onboarding.
- Account, privacy, terms, support, export, restore purchase, sign-out, and delete-account controls remain available without purchase.
- Pricing decision: `CA$15/month` or `CA$100/year`, no free trial.
- Planned product IDs: `com.corneriq.pro.monthly` and `com.corneriq.pro.annual`.
- Planned RevenueCat entitlement: `corneriq_pro`.
- RevenueCat identity uses the signed-in Supabase `session.user.id`; the app must not use email addresses or shared IDs as RevenueCat App User IDs.
- Mocked automated coverage verifies RevenueCat identity lifecycle, strict platform keys, entitlement-vs-offerings handling, purchase/restore entitlement checks, listener updates, foreground refresh, stale-result guards, disabled-paywall bypass, and cancellation messaging. This is not live App Store purchase evidence.
- Setup checklist: `docs/release/APPLE_SUBSCRIPTION_SETUP.md`.
- `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` blocks until `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED=1` and `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY` are set for the Apple submission path.

## Account Deletion Notes

- In-app path: Profile > Data > Danger Zone > Delete account.
- Confirmation phrase: `DELETE ACCOUNT`.
- Client-side code calls `supabase.functions.invoke("delete-account")` with the signed-in user's JWT.
- The Edge Function verifies the JWT, derives the caller user id from Supabase Auth, deletes user-owned app rows, deletes only that caller's Supabase Auth identity, and returns typed JSON.
- No trusted key is exposed in Expo/client code.
- On success, the app signs the user out.
- Production status on 2026-06-18: `delete-account` listed ACTIVE v2, updated `2026-06-18 22:30:16 UTC`, and live smoke verified sign-in, delete confirmation, sign-out, and rejected re-login for the deleted credentials.

Deployment command, needed only if the function changes again:

```powershell
cmd /c npm exec supabase -- functions deploy delete-account
```

Required function environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not print or commit secret values.

## Privacy Policy

- In-app path: Profile > Data > Privacy Policy.
- Public URL: `https://sites.google.com/view/corneriq/privacy-policy`.
- Public support URL: `https://sites.google.com/view/corneriq/support`.
- Public terms URL: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`.
- Central config: `src/services/config/runtimeConfig.ts`.
- Public env name: `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL`.
- Public support env name: `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL`.
- Public terms env name: `EXPO_PUBLIC_CORNERIQ_TERMS_OF_USE_URL`.
- Template: `docs/legal/PRIVACY_POLICY_TEMPLATE.md`.
- The Google Site is public and the app defaults point to the published URLs.

The policy must cover account/auth data, email/auth identifier, athlete profile, body mass, height, age, sex at birth, pregnancy context, readiness and safety flags, nutrition/water/electrolyte logs, cycle data and symptoms, training plans, workout history, exercise results, wearable/manual preference, exports/deletions, retention/deletion, Supabase as a processor, and analytics status.

## Age Rating And Minor Policy

- MVP is 18+.
- Under-18 users cannot complete onboarding.
- Do not market CornerIQ to children or youth athletes.
- Do not select the Kids category.
- Youth/minor support remains deferred until guardian consent, privacy handling, and policy review are ready.

## App Store Metadata Draft

Use this copy for the build 7 App Store submission.

- App name: `CornerIQ`.
- Subtitle: `Boxing Training Support`.
- Primary category: `Health & Fitness`.
- Age rating notes: adult-only MVP; sensitive health/body/cycle/nutrition context; no Kids category.
- Privacy Policy URL: `https://sites.google.com/view/corneriq/privacy-policy`.
- Support URL: `https://sites.google.com/view/corneriq/support`.
- Terms of Use URL: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`.
- Copyright: `2026 CornerIQ`.
- Keywords: `boxing,training,readiness,fuel,hydration,workouts,planner,fitness,bodyweight`.
- Promotional text: `Built for boxing: plan support work, log readiness, and keep fuel and hydration context conservative without needing a wearable.`
- Release notes: `Initial App Store release of CornerIQ for boxing readiness, support training, fuel, hydration, planning, and privacy-aware account controls.`
- Release option: automatic release after approval unless App Store Connect blocks that choice.
- Account deletion instructions: Profile > Data > Delete account > type `DELETE ACCOUNT`; successful deletion signs the user out.
- Demo account/review notes: provide only in App Store Connect Review Notes.

Description:

```text
CornerIQ is made for boxers, by a boxer.

The goal is simple: help close the gap between athletes who already have access to coaches, strength and conditioning support, nutrition guidance, and structured planning, and the boxers who are still building that team around them.

CornerIQ does not replace a boxing coach, S&C coach, nutritionist, doctor, or qualified professional. It is here to support the athletes who do not have all of that around them yet, so training can be more organized, more conservative, and safer while they keep building.

Built for boxing, not generic fitness:
- Set up your boxing profile and fixed weekly boxing sessions
- Check today’s readiness from manual logs like sleep, energy, soreness, stress, mood, hydration, food, and body weight
- Review support training around coach or team boxing work
- See fuel and hydration prompts that stay conservative when context is incomplete
- Track plan adjustments, unavailable days, deload requests, and next-week training context
- Export or delete app data from Profile

Manual input is first-class. CornerIQ does not require a wearable. Wearable signals, when available, are treated as extra context rather than the source of truth.

Safety boundaries are part of the product. CornerIQ does not provide medical diagnosis, emergency support, fertility prediction, generated sparring, contact drills, fight simulation, or unsafe weight-cut instructions. Missing data remains unknown, not safe, so the app may show conservative guidance when fuel, hydration, weight, or safety context is incomplete.

CornerIQ requires an account. Sign-in and onboarding are available before purchase. Product features are available with CornerIQ Pro after onboarding, and restore purchase, privacy, support, export, sign out, and delete-account controls remain available without purchase.
```

In-app purchase copy:

- `CornerIQ Pro Monthly`: `Monthly access to CornerIQ Pro for boxing training support, readiness, fuel, plan, and data controls after onboarding.`
- `CornerIQ Pro Annual`: `Annual access to CornerIQ Pro for boxing training support, readiness, fuel, plan, and data controls after onboarding.`

Do not claim:

- Medical diagnosis, treatment, emergency support, or fertility prediction.
- A diet plan, barcode scanner, meal planner, or food database.
- Coach/team UI or reviewer-clear workflows.
- Generated sparring, contact drills, or fight simulation.
- Wearable requirement.
- Persisted in-progress workout state across app reloads.
- iPad support for MVP; `ios.supportsTablet` is false until validated.

## Assets And Config

- Current `app.json` has name, slug, scheme, version, portrait orientation, bundle id, iOS build-number seed, Android package, EAS project id, `ios.supportsTablet: false`, and iOS export-compliance config.
- Current `eas.json` uses EAS remote app versions, pins the production iOS build image to Xcode 26 for Expo SDK 54, and sets `production.autoIncrement: true` so App Store uploads get a fresh build number.
- App Store submission can stay interactive until the App Store Connect app id/API-key path is chosen. If the release owner needs non-interactive submit, add only non-secret submit metadata to `eas.json` and keep `.p8`, Apple ID, team, and password values out of git.
- App icon and splash files are wired in `app.json`; production preflight verifies file presence only.
- Final icon/splash visual acceptance remains a release-owner App Store task.
- `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` must fail until the paid subscription build blockers and any remaining automated release blockers are ready. It does not prove final App Store artwork acceptance.
- The same Apple-submission preflight must fail until the subscription gate is explicitly enabled and the public RevenueCat iOS SDK key is configured.

## Production E2E/Demo Mode Guard

- Local QA mode uses `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`.
- Production runtime disables local E2E mode when `NODE_ENV=production` or `EXPO_PUBLIC_CORNERIQ_PRODUCTION=1`.
- Do not expose local E2E/demo shortcuts to public users.

## Final Owner Checklist

- [x] Publish Privacy Policy.
- [x] Configure in-app Privacy Policy URL.
- [x] Publish public Support page.
- [x] Configure in-app Support URL.
- [x] Configure in-app Terms of Use URL.
- [x] Deploy `delete-account` Edge Function.
- [x] Smoke-test Profile > Data > Delete account in production.
- [ ] Accept the wired icon/splash as final App Store assets or replace them.
- [x] Create and confirm review account.
- [x] Preload a safe adult boxer profile or verify onboarding from empty profile.
- [x] Capture screenshots.
- [ ] Fill App Store Connect Support URL with `https://sites.google.com/view/corneriq/support`.
- [ ] Enroll in the Apple Developer Program.
- [ ] Accept the Paid Apps Agreement and complete tax/banking in App Store Connect.
- [ ] Create App Store Connect subscriptions for `com.corneriq.pro.monthly` and `com.corneriq.pro.annual`.
- [ ] Configure RevenueCat entitlement `corneriq_pro`, products, offering, and public iOS SDK key.
- [ ] Verify purchase and restore in a development/TestFlight build.
- [ ] Put credentials only in App Store Connect Review Notes.
- [ ] Run `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` and resolve blockers.
