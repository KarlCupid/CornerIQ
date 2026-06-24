# Apple Review Handoff

Date: 2026-06-19

Status: APPLE_SUBMISSION_BLOCKED until the release owner completes the blockers marked below. This file is a handoff checklist, not final App Store metadata.

## Required Before Submission

- Privacy Policy URL: published at `https://sites.google.com/view/corneriq/privacy-policy` and configured as the app default release link. `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL` can override it if the release owner moves the policy.
- Account deletion Edge Function: completed on 2026-06-18. `supabase/functions/delete-account` is deployed to the production Supabase project as ACTIVE v2, and Profile > Data > Delete account passed live smoke with a real signed-in account.
- App icon and splash: APPLE_SUBMISSION_BLOCKED until final icon/splash assets are added and wired in `app.json`, or the release owner documents accepted final assets.
- Screenshots: APPLE_SUBMISSION_BLOCKED until App Store screenshots are captured from a production-like build with real public privacy and support metadata.
- Support URL: published at `https://sites.google.com/view/corneriq/support` and configured as the app default release link. `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL` can override it if the release owner moves support.
- Reviewer credentials: review account prepared on 2026-06-19. Provide credentials only in App Store Connect Review Notes. Do not commit credentials.
- Subscriptions: APPLE_SUBMISSION_BLOCKED until Apple Developer Program enrollment, Paid Apps Agreement, tax/banking, App Store Connect subscription products, RevenueCat project/products/entitlement/offering, and a TestFlight purchase/restore smoke are complete. App code expects `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED=1`, platform-specific RevenueCat public SDK keys, entitlement `corneriq_pro`, monthly product `com.corneriq.pro.monthly`, and annual product `com.corneriq.pro.annual`. Mocked automated coverage is in place, but no live purchase or restore has passed yet.

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
CornerIQ is account-gated. A review account has been created, confirmed, and preloaded through onboarding.
Username: [provide only in App Store Connect]
Password: [provide only in App Store Connect]

The account demonstrates:
- Manual-first onboarding; no wearable is required
- Adult amateur boxing profile
- Fixed weekly boxing sessions
- Fight-camp planning context
- Manual readiness and body-weight logging
- Safety-first fuel/weight guidance when context is incomplete

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
Users can create/sign in to an account and complete onboarding without purchase. After onboarding, app product features require subscription. Restore purchase, Privacy Policy, Support, sign out, export, and delete account remain available from the paywall without purchase.
```

## Subscription Notes

- Product features are subscription-gated after onboarding.
- Account, privacy, support, export, restore purchase, sign-out, and delete-account controls remain available without purchase.
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
- Central config: `src/services/config/runtimeConfig.ts`.
- Public env name: `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL`.
- Public support env name: `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL`.
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

- App name: CornerIQ.
- Subtitle suggestion: Boxing training and fuel planner.
- Category suggestion: Health & Fitness.
- Age rating notes: 18+ MVP; sensitive health/body/cycle/nutrition context; no Kids category.
- Privacy Policy URL: `https://sites.google.com/view/corneriq/privacy-policy`.
- Support URL: `https://sites.google.com/view/corneriq/support`.
- Account deletion instructions: Profile > Data > Danger Zone > Delete account > type `DELETE ACCOUNT`; successful deletion signs the user out.
- Demo account/review notes: create and provide only in App Store Connect Review Notes.

Do not claim:

- Medical diagnosis, treatment, emergency support, or fertility prediction.
- A diet plan, barcode scanner, meal planner, or food database.
- Coach/team UI or reviewer-clear workflows.
- Generated sparring, contact drills, or fight simulation.
- Wearable requirement.
- Persisted in-progress workout state across app reloads.
- iPad support for MVP; `ios.supportsTablet` is false until validated.

## Assets And Config

- Current `app.json` has name, slug, scheme, version, portrait orientation, bundle id, Android package, EAS project id, and `ios.supportsTablet: false`.
- Final app icon is not wired.
- Final splash image is not wired.
- `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` must fail until final icon/splash and any remaining release-owner blockers are ready.
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
- [x] Deploy `delete-account` Edge Function.
- [x] Smoke-test Profile > Data > Delete account in production.
- [ ] Add final icon and splash assets to `app.json`.
- [x] Create and confirm review account.
- [x] Preload a safe adult boxer profile or verify onboarding from empty profile.
- [ ] Capture screenshots.
- [ ] Fill App Store Connect Support URL with `https://sites.google.com/view/corneriq/support`.
- [ ] Enroll in the Apple Developer Program.
- [ ] Accept the Paid Apps Agreement and complete tax/banking in App Store Connect.
- [ ] Create App Store Connect subscriptions for `com.corneriq.pro.monthly` and `com.corneriq.pro.annual`.
- [ ] Configure RevenueCat entitlement `corneriq_pro`, products, offering, and public iOS SDK key.
- [ ] Verify purchase and restore in a development/TestFlight build.
- [ ] Put credentials only in App Store Connect Review Notes.
- [ ] Run `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` and resolve blockers.
