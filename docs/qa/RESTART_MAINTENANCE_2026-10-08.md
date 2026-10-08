# CornerIQ Restart Maintenance

- Date: 2026-10-08 America/Vancouver
- Agent: Codex
- Scope: compatible dependency remediation, development backend recovery, browser harness repair, verification, and release-record reconciliation.
- Baseline: `d34c64a45132115f94e062fcef3b99ad934c2f9a` plus the maintenance working-tree changes. Local reports identify this pre-commit HEAD; they do not certify a later commit by SHA alone.
- Verification identity: the first maintenance code commit `8665dd9d01b0ca1dda0cd0d0a21cef927e231539` passed a clean post-commit QA loop. The follow-up verifies `dde48e6` plus the image-parser adapter, scoped UUID override, dependency compatibility tests, and opt-in SQL smoke described below. Follow-up reports record the pre-commit HEAD; this document identifies its tested working-tree changes. Those reports are not exact-SHA release certification for a later commit.
- Review branch: `codex/restart-maintenance`, targeting `codex/development`.
- Browser/viewports: local Chromium, desktop 1280x900 and mobile 390x844.
- Evidence: ignored `qa-artifacts/reports/`, `qa-artifacts/browser-audit/current/`, and `qa-artifacts/corneriq-agent-qa-bundle.zip`.

## Result

The local development baseline is usable again. The final follow-up clears all eight local QA gates, with 930 unit tests passing and two credential-dependent live application tests skipped. All 11 browser scenarios pass, with 44 screenshot/text pairs, zero deterministic safety/secret/serialization blockers, and three required review areas. Five of the unit tests exercise the patched build dependencies. A separate Development database-policy smoke passes all 78 assertions and verifies cleanup.

The dependency audit remains a separate blocker for GitHub Quality and a future release: 21 high and 5 moderate propagated package findings remain. There are zero critical findings in either the complete or production-tree audit. These 26 findings come from three root advisories, and the passing local QA loop does not clear the dependency gate.

## Changes

- Updated Expo within SDK 54 to `~54.0.37`. React Native remains `0.81.5`; the pinned Supabase client remains `2.50.0`.
- Updated existing overrides to PostCSS `8.5.29`, shell-quote `1.12.0`, and Undici `6.29.0`; refreshed compatible transitive dependencies.
- Replaced Metro's vulnerable image-size dependency with a [private filename adapter](../../tools/image-size-compat/README.md) that delegates all parsing to official `image-size@2.0.4`. It supports the synchronous Buffer/filename API used by this toolchain. The parser is pinned under the npm alias `image-size-patched`; no old parser code is copied into the adapter.
- Added the scoped xcode UUID `11.1.1` override. CommonJS `v4()` remains supported. Five tooling tests check both Metro consumers' buffer and file-path asset integrations and Xcode project identifiers.
- Updated Vitest and V8 coverage together to `4.1.11`, using isolated thread workers. The existing engine and app tests and coverage thresholds pass.
- Updated Profile browser coverage for History & Support, nested Delete controls, current export copy, and the account-exit shortcut. The audit rejects incorrect deletion phrases, checks both exact confirmation phrases, and confirms local deletion never contacts Supabase.
- Updated the scenario catalog and static QA contract for the renamed data-controls scenario.
- Excluded generated coverage and QA-artifact directories from Metro's watcher while preserving its default exclusions. A concurrent coverage replacement had caused a Windows `ENOENT` watcher crash; the repaired browser run passes.

Product business logic and engine safety behavior were not changed in this milestone.

## Development Backend

CornerIQ Development (`llsmdsraunsweqmvefhj`) was restored from INACTIVE to ACTIVE_HEALTHY. The local app configuration already targeted Development, but the CLI was still linked to production. The CLI is now linked to Development, and a target guard was checked before the database push.

The Development dry run identified three missing existing migrations:

- `20260723233725_align_next_week_volume_strategy.sql`
- `20260724203621_archive_superseded_generated_session_keys.sql`
- `20260725005909_repair_stranded_superseded_generated_session_keys.sql`

These migrations were applied to Development only. The subsequent dry run reports the remote database is up to date, and its migration history now contains all 28 local versions. A metadata check found RLS enabled on all 40 public tables. Anonymous profile access was denied with HTTP 401 / permission denied. That bounded check does not prove authenticated cross-user isolation.

The Development Auth settings endpoint responds successfully. Email confirmation is enabled, and no dedicated smoke-account credentials are available locally. The browser is signed out; a sign-in handoff is pending. No persistent account was created, email sent, or live application CRUD/concurrency smoke claimed. Those two opt-in tests remain skipped until a dedicated Development account is available.

An explicit, database-only smoke ran against Development using [the transactional SQL fixture](../../qa/sql/development-owner-isolation-smoke.sql), following Supabase's [database testing guidance](https://supabase.com/docs/guides/local-development/testing/overview). It passed 74 authenticated assertions and four anonymous denial checks across `athlete_profiles`, `cycle_logs`, `cycle_symptom_logs`, and `water_logs`. Two synthetic identities could read, create, update, and delete their own fixtures; cross-user reads/writes, ownership transfers, and anonymous access were rejected. The entire transaction rolled back. A separate query confirmed zero synthetic users and zero rows in all four tested tables afterward.

This bounded SQL-role check does not verify GoTrue signup, email confirmation, user JWT issuance, the Data API, other tables, or the two opt-in application smoke tests. Its sanitized evidence is `qa-artifacts/reports/development-owner-isolation-smoke.json`.

Production was not modified. No service-role key was used in the app, tests, browser QA, or reports.

## Verification

| Check | Result |
| --- | --- |
| `cmd /c npm install` | Pass. Additional clean `npm@10 ci` passes with the final local adapter and lockfile. |
| `cmd /c npm run typecheck` | Pass in local QA and `quality`. |
| `cmd /c npm test` | 930 pass, 2 opt-in live tests skipped; 89 files pass, 2 skipped. |
| `cmd /c npm run lint` | Pass, including the final Metro configuration. |
| `cmd /c npm run quality` | Pass. |
| `cmd /c npm run preflight:beta` | Pass for the normal gate. Local paid-build environment warnings do not establish a defect in the released build. |
| `cmd /c npm run qa:agent:ci` | All eight gates pass with the final adapter; the reports record pre-commit HEAD `dde48e6` plus the tested working tree. |
| Browser audit | 11/11 pass; 44 screenshot/text pairs; runtime guards pass. |
| Coverage | First maintenance pass: statements 85.39%, branches 77.09%, functions 89.99%, lines 84.97%. Engine/service source is unchanged in this follow-up; coverage was not rerun. |
| `npx expo install --check` | Pass: dependencies are up to date for the selected Expo SDK. |
| `npx expo-doctor` | 18/18 checks pass with the final dependencies. |
| Local iOS export | Pass with the final adapter and `--clear`: 6.43 MB Hermes bundle plus assets in `qa-artifacts/native-export-followup/`. Local E2E and dotenv/backend credentials disabled. This is not a signed native build or an iPhone runtime test. |
| Tooling integration tests | 5/5 pass: root/Expo Metro buffer dimensions and file-path metadata, plus Xcode UUID generation. |
| Development database-policy smoke | 78/78 assertions pass; separate cleanup query confirms no synthetic fixtures remain. |
| Development migration dry run | Pass after applying the three existing pending migrations. |
| `git diff --check` | Pass. |
| Dependency audit | **Fail at high threshold**; zero critical, 21 high, 5 moderate propagated findings from three root advisories. |

The changes are proposed in [draft PR #1](https://github.com/KarlCupid/CornerIQ/pull/1), targeting Development. On the first maintenance code commit `8665dd9`, GitHub's [Quality run](https://github.com/KarlCupid/CornerIQ/actions/runs/37822606495) passes installation, typecheck, lint, and preflight before failing at the documented dependency audit; [CodeQL](https://github.com/KarlCupid/CornerIQ/actions/runs/37822606325) passes. Those historical runs do not certify the follow-up SHA. The remaining dependency work is tracked in [issue #2](https://github.com/KarlCupid/CornerIQ/issues/2).

The initial browser run exposed obsolete Profile copy and selectors. A later run was interrupted by Metro watching replaced coverage directories. The corrected rerun passed all scenarios; incomplete intermediate analysis counts were missing-evidence cascades, not demonstrated product defects. Two initial test-runner attempts were interrupted during diagnosis; the final complete unit, quality, and coverage runs passed.

The follow-up initially tried a direct image-size `2.0.4` override. Buffer tests passed, but native export exposed Metro's separate filename call, which image-size 2.x no longer supports. A global [Metro 0.83.8 patch](https://github.com/react/metro/releases/tag/v0.83.8) then exported successfully but broke Expo SDK 54's watcher: Metro changed `eventsQueue` to a different event shape. That global override was reverted. The final adapter keeps Expo's pinned Metro `0.83.3` consumer while using the patched image parser; the React Native root Metro remains independently resolved within its existing `0.83.x` range. Full buffer and filename tests cover both consumers. This adapter should be removed once Expo's supported Metro line includes its own fixed parser. Failed attempts remain documented rather than being counted as successful checks.

## Remaining Findings

### D1 — Dependency gate still fails

- Severity: High
- Flow: installation, CI, build tooling, and future release verification.
- Actual behavior: `npm audit --audit-level=high --omit=dev` still exits nonzero.
- Expected behavior: the release candidate meets the dependency gate without suppressing unresolved alerts.
- Evidence: `qa-artifacts/reports/followup-dependency-audit.json`, `followup-all-dependency-audit.json`, and `followup-upstream-dependency-review.json`.
- Owners: Expo/Metro/Jest tooling dependencies and `package-lock.json`.
- Fix pass required: yes; adopt maintained upstream fixes when available, or a separately reviewed and tested source mitigation. No audit bypass or security-code backport was added.

The unresolved roots are:

| Package | Dependency path / constraint | Remaining advisory |
| --- | --- | --- |
| braces 3.0.3 | micromatch through Metro and Jest tooling; upstream lists no patched version | [Stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| node-forge 1.4.0 | Expo CLI and code-signing tooling; upstream lists no patched version | [Signature-verification advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| sprintf-js | argparse through Istanbul tooling; no compatible automatic fix | [Precision-specifier advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |

These toolchain paths are not proof that the installed iPhone app exposes the vulnerable operations. They still need a deliberate mitigation; forcing npm's suggested Expo downgrade or React Native replacement would not be a validated fix.

As checked October 8, the latest published roots are braces `3.0.3`, node-forge `1.4.0`, and sprintf-js `1.1.3`, all affected. The [braces source proposal](https://github.com/micromatch/braces/pull/72) is closed and unmerged; the [forge proposal](https://github.com/digitalbazaar/forge/pull/1157) remains open and unmerged. They were inspected, not installed or executed. Registry metadata also shows Expo `57.0.27` using CLI `57.0.28`, whose forge dependency is still `^1.3.3`; an SDK jump by itself would not resolve that root.

### R1 — Live account and phone evidence is incomplete

- Severity: Medium / required external review
- Flows: fresh signup/email confirmation, authenticated persistence and RLS, purchases/restore, native workout audio/timers/backgrounding, real boxer comprehension.
- Evidence: local live-test skips and `qa-artifacts/reports/agent-qa-analysis.md`.
- Fix pass required: separate Development smoke with a dedicated account, followed by owner iPhone review. Automation cannot substitute for the missing evidence.

The agent inspected the current mobile Today, Train, Fuel, Plan, and workout-player screenshots. They show readable primary controls, unknown fuel framing, a non-contact session, and the player timer. This limited visual review is not independent qualitative review or evidence from a physical phone. The local E2E fixtures include an extra Profile tab and fixed May dates; they must not be mistaken for the current production navigation or live calendar state.

## Release Context And Next Work

Version 0.1.1 is public, released August 11. Read-only `eas build:view` now directly verifies the [August 10 EAS build](https://expo.dev/accounts/karlcupid/projects/corneriq/builds/41ef1bae-caff-4eec-b2ff-3de0d001c411): FINISHED, iOS, version `0.1.1`, build `15`, `production` profile, STORE distribution, source `5dbe9fd732ff3be3734de83c7152085d7d0f6f25`, completed at `2026-08-10T19:14:17.745Z`. This verifies EAS build-to-source mapping independently of the chat claim. The public App Store listing does not expose the internal build number; App Store Connect submission-to-live-binary mapping was not independently checked.

At the restart baseline, `main` was at `2fe8c3a`, with one unique documentation/promo-assets commit, while Development had 34 unique commits. The main-only commit modifies the Apple handoff and adds two Instagram images. This maintenance branch targets Development; it does not merge the older release branch, create a build, or submit a new release.

The next technical milestone is to close D1 with maintained upstream fixes or a reviewed mitigation and obtain dedicated Development smoke credentials through the pending sign-in handoff. The best owner restart task is one real iPhone journey: open Today, adjust around existing boxing, start and pause a workout, background/reopen it, complete it, and confirm history after a fresh sign-in. Use that evidence to scope the daily-training usability milestone already discussed in “Plan next update improvements.” The hybrid boxing engine remains a later separately scoped milestone.
