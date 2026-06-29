# Apple Public MVP Submission Checklist

Date: 2026-06-29

Status: not ready to submit. Use this as the release-owner checklist for moving CornerIQ from local/beta readiness toward TestFlight, then App Store review for the public MVP.

Do not use this checklist to add product scope. During this pass, avoid new Fuel, Train, Plan, coach, reviewer-clear, EAS distribution, feedback, or generated sparring/contact features unless a release blocker cannot be solved any other way.

## Release Decision

- [ ] Public MVP release owner named.
- [ ] Candidate branch and exact candidate SHA selected.
- [ ] Release target chosen: TestFlight internal, TestFlight external, App Store review, or phased public release.
- [ ] Known public MVP limitations accepted in `docs/KNOWN_GAPS.md`.
- [ ] `docs/qa/QA_LOOP_STATE.md` says `launch_code_ready` or explicitly lists remaining human-review blockers accepted by the release owner.
- [ ] No generated QA artifacts, credentials, screenshots with secrets, `.env`, or `.env.*` files are staged.

## Current Blocking Items

- [ ] Apple Developer Program enrollment is complete for the intended seller account.
- [ ] Paid Apps Agreement, tax, and banking are complete in App Store Connect.
- [ ] App Store Connect app record exists for bundle id `com.corneriq.app`.
- [ ] App icon and splash are accepted as final public App Store assets or replaced.
- [ ] App Store screenshots are captured from a production-like iPhone build.
- [ ] App Store support URL is set to `https://sites.google.com/view/corneriq/support`.
- [ ] App Store privacy policy URL is set to `https://sites.google.com/view/corneriq/privacy-policy`.
- [ ] Reviewer credentials are valid, confirmed, and provided only in App Store Connect Review Notes.
- [ ] Subscription products are created in App Store Connect:
  - [ ] `com.corneriq.pro.monthly`, monthly, `CA$15/month`.
  - [ ] `com.corneriq.pro.annual`, annual, `CA$100/year`.
- [ ] RevenueCat is configured with entitlement `corneriq_pro`, both products, a default offering, and the production iOS public SDK key.
- [ ] TestFlight purchase, restore, cancellation/error handling, and paywall bypass controls are verified.
- [ ] Live Supabase smoke passes with a confirmed smoke account, or the exact blocker is documented.
- [ ] Remote migration list and dry-run evidence are fresh for the exact candidate SHA.
- [ ] Physical iPhone behavior is reviewed for auth, onboarding, Today, Fuel, Train, Plan, Profile, paywall, keyboard, scroll, safe area, and delete/export controls.
- [ ] Human boxer comprehension review is complete or consciously accepted as a public MVP risk.

## Local Code Gates

Run from the repository root:

```powershell
cmd /c npm install
cmd /c npm run typecheck
cmd /c npm test
cmd /c npm run lint
cmd /c npm run quality
cmd /c npm run preflight:beta
```

- [ ] `cmd /c npm install` passes.
- [ ] `cmd /c npm run typecheck` passes.
- [ ] `cmd /c npm test` passes.
- [ ] `cmd /c npm run lint` passes.
- [ ] `cmd /c npm run quality` passes.
- [ ] `cmd /c npm run preflight:beta` passes.
- [ ] `cmd /c npm run test:coverage` passes if this candidate changes engine, safety, persistence, auth, subscription, or release-gate behavior.
- [ ] Any failed command is recorded with exact command, failure summary, and fix or accepted blocker.

## Apple Submission Preflight

Run the Apple-specific preflight only when the release owner has configured the paid public build environment:

```powershell
CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production
```

- [ ] `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED=1` is set for the App Store build.
- [ ] `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY` is set to the RevenueCat public iOS SDK key.
- [ ] `EXPO_PUBLIC_CORNERIQ_REVENUECAT_ENTITLEMENT_ID=corneriq_pro` is set or defaulted intentionally.
- [ ] `EXPO_PUBLIC_CORNERIQ_MONTHLY_PRODUCT_ID=com.corneriq.pro.monthly` is set or defaulted intentionally.
- [ ] `EXPO_PUBLIC_CORNERIQ_ANNUAL_PRODUCT_ID=com.corneriq.pro.annual` is set or defaulted intentionally.
- [ ] `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL` points to the public privacy policy if overriding the default.
- [ ] `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL` points to the public support page if overriding the default.
- [ ] Apple submission preflight passes with no `APPLE_SUBMISSION_BLOCKED` entries.

## Browser QA And Release Evidence

Run the local-only agent QA loop before creating the Apple build:

```powershell
cmd /c npm run qa:agent:ci
cmd /c npm run release:evidence
cmd /c npm run release:quality
```

- [ ] `cmd /c npm run qa:agent:ci` passes.
- [ ] `qa-artifacts/corneriq-agent-qa-bundle.zip` is generated and kept out of git.
- [ ] `qa-artifacts/reports/agent-ai-review-brief.md` is generated and reviewed.
- [ ] `cmd /c npm run release:evidence` generates exact-SHA evidence.
- [ ] `cmd /c npm run release:quality` passes, or fails only for clearly documented external blockers that the release owner accepts before TestFlight.
- [ ] `docs/qa/QA_LOOP_STATE.md` is updated after audit, review, fix, and verification passes.

## Supabase And Account Controls

- [ ] No Supabase service-role key exists in app code, tests, docs, browser QA, screenshots, or generated reports.
- [ ] Remote migration list is fresh for the exact candidate SHA.
- [ ] Remote `db push --dry-run` reports the remote database is up to date.
- [ ] Linked or staging schema lint passes.
- [ ] Generated TypeScript database types are fresh or verified unchanged against the release schema.
- [ ] Live Supabase smoke passes with public URL, anon key, and confirmed smoke credentials only.
- [ ] Account deletion still works in production through Profile > Data > Delete account > `DELETE ACCOUNT`.
- [ ] Export preview and portable JSON export work for the review account.
- [ ] Sign-up, email confirmation, sign-in, sign-out, session recovery, and password reset behavior are tested against the real production Supabase project.

## Apple Developer And EAS Setup

- [ ] EAS project ownership is confirmed for `@karlcupid/corneriq`.
- [ ] `eas.json` production profile is intentionally configured for the public build.
- [ ] Apple distribution credentials are configured through EAS credentials.
- [ ] App Store Connect app record uses bundle id `com.corneriq.app`.
- [ ] App Store Connect API key or Apple ID submission path is chosen and kept out of git.
- [ ] Build number strategy is set. If using current `eas.json` with `appVersionSource: "local"` and `production.autoIncrement: false`, manually increment iOS build numbers for every upload.
- [ ] Export compliance is answered in App Store Connect. If appropriate, add `ios.config.usesNonExemptEncryption` to `app.json` before submission.

## TestFlight

Build and submit to TestFlight before App Store review:

```powershell
npx eas-cli@latest build -p ios --profile production --submit
```

Alternative after a build exists:

```powershell
npx eas-cli@latest submit -p ios --latest
```

- [ ] Internal TestFlight build installs on a physical iPhone.
- [ ] App launches from cold start.
- [ ] Production E2E/local test mode is absent.
- [ ] Review account can sign in.
- [ ] New public user can create an account and complete onboarding.
- [ ] Paywall appears only after onboarding and does not block privacy, support, restore purchase, sign-out, export, or delete-account controls.
- [ ] Purchase flow works in sandbox/TestFlight.
- [ ] Restore purchase works in sandbox/TestFlight.
- [ ] Subscription cancellation/error paths keep the app safe and understandable.
- [ ] Today, Fuel, Train, Plan, Profile, Data, and Safety screens are checked on device.
- [ ] External TestFlight group is used before public App Store release unless the release owner explicitly accepts the risk.
- [ ] TestFlight feedback and crash reports are reviewed before App Store submission.

## App Store Metadata

- [ ] App name: `CornerIQ`.
- [ ] Subtitle is final and no more than 30 characters.
- [ ] Primary category is `Health & Fitness` unless release owner changes it intentionally.
- [ ] Age rating is answered honestly for an adult-only MVP; do not choose Kids.
- [ ] Description does not claim medical diagnosis, treatment, emergency support, fertility prediction, meal planning, barcode scanning, coach workflow, reviewer-clear workflow, wearable requirement, generated sparring, contact drills, or fight simulation.
- [ ] Keywords are final and no more than 100 characters.
- [ ] Promotional text is final if used.
- [ ] Release notes are final.
- [ ] Privacy Policy URL is public.
- [ ] Support URL is public.
- [ ] Copyright and seller details are correct.
- [ ] Pricing and availability are correct.
- [ ] App privacy questionnaire matches the actual data collected and processed.
- [ ] In-app purchases are attached to the app version for review.

## Screenshots And Assets

- [ ] Final app icon passes Apple asset review and matches `assets/app-icon.png` or the replacement wired in `app.json`.
- [ ] Final splash screen is accepted and matches `assets/splash-screen.png` or the replacement wired in `app.json`.
- [ ] Required iPhone screenshots are captured from a production-like build.
- [ ] Screenshots show real app value without exposing credentials, private health details, secrets, production user data, or test-only banners.
- [ ] Screenshot sequence covers onboarding/manual-first setup, Today, Fuel, Train, Plan, and Profile/Data controls.
- [ ] Screenshots do not imply unsafe weight cutting, medical care, coach approval, or wearable requirement.

## Review Notes

- [ ] Reviewer account username and password are pasted only into App Store Connect.
- [ ] Review notes say CornerIQ is account-gated and manual-first.
- [ ] Review notes state no wearable is required.
- [ ] Review notes explain subscription timing and restore purchase.
- [ ] Review notes explain account deletion path.
- [ ] Review notes mention that incomplete safety/fuel/context data may produce conservative guidance by design.
- [ ] Review notes do not include secrets, personal emails outside the reviewer credential fields, or service-role/admin details.

Suggested review-note source: `docs/release/APPLE_REVIEW_HANDOFF.md`.

## Public MVP Safety Boundaries

- [ ] No generated sparring, contact drills, or unsupervised fight simulation appears in generated support.
- [ ] Missing data is unknown, not safe.
- [ ] Manual input is fully usable without a wearable.
- [ ] Wearables only increase confidence when fresh and consistent.
- [ ] Cycle support remains optional, private, and symptom-aware.
- [ ] Safety beats performance and weight-class pressure.
- [ ] No athlete self-clear path exists for hard stops.
- [ ] No coach UI or reviewer-clear UI is exposed.
- [ ] App copy avoids emergency, medical-review, dietetic-care, fertility, or treatment claims.
- [ ] MVP remains 18+; under-18 users cannot complete onboarding.

## Submit For Review

- [ ] Final TestFlight build selected in App Store Connect.
- [ ] App privacy, age rating, pricing, availability, screenshots, metadata, review notes, and subscriptions are complete.
- [ ] Final exact-SHA release evidence is generated.
- [ ] Final physical iPhone checks are complete.
- [ ] Final live Supabase/account-control checks are complete.
- [ ] Final `CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production` passes.
- [ ] Submit for App Review.
- [ ] Release option chosen: manual release, automatic release, scheduled release, or phased release.
- [ ] Monitor App Store Connect review messages, TestFlight/App Store crash reports, support inbox, and RevenueCat purchase events.

## Cross-References

- Apple review handoff: `docs/release/APPLE_REVIEW_HANDOFF.md`
- Subscription setup: `docs/release/APPLE_SUBSCRIPTION_SETUP.md`
- Beta release candidate checklist: `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md`
- EAS beta distribution: `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md`
- Release evidence ledger: `docs/27_RELEASE_EVIDENCE_LEDGER.md`
- QA loop: `docs/qa/QA_LOOP.md`
- QA loop state: `docs/qa/QA_LOOP_STATE.md`
- Launch blocker register: `docs/qa/LAUNCH_BLOCKER_REGISTER.md`
- Known gaps: `docs/KNOWN_GAPS.md`
