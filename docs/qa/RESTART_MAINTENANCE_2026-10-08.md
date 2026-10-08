# CornerIQ Restart Maintenance

- Date: 2026-10-08 America/Vancouver
- Agent: Codex
- Scope: compatible dependency remediation, development backend recovery, browser harness repair, verification, and release-record reconciliation.
- Baseline: `d34c64a45132115f94e062fcef3b99ad934c2f9a` plus the maintenance working-tree changes. Local reports identify this pre-commit HEAD; they do not certify a later commit by SHA alone.
- Review branch: `codex/restart-maintenance`, targeting `codex/development`.
- Browser/viewports: local Chromium, desktop 1280x900 and mobile 390x844.
- Evidence: ignored `qa-artifacts/reports/`, `qa-artifacts/browser-audit/current/`, and `qa-artifacts/corneriq-agent-qa-bundle.zip`.

## Result

The local development baseline is usable again. All eight local QA gates pass, with 925 unit tests passing and two credential-dependent live tests skipped. All 11 browser scenarios pass, and all 44 screenshots have matching page-text evidence. The deterministic analysis reports zero blockers and zero highs in its evidence/safety scans, with three review areas remaining.

The dependency audit remains a separate blocker for GitHub Quality and a future release: 22 high and 12 moderate propagated package findings remain. There are zero critical findings in either the complete or production-tree audit. These counts are package findings, not 34 distinct vulnerabilities, and the passing local QA loop does not clear the dependency gate.

## Changes

- Updated Expo within SDK 54 to `~54.0.37`. React Native remains `0.81.5`; the pinned Supabase client remains `2.50.0`.
- Updated existing overrides to PostCSS `8.5.29`, shell-quote `1.12.0`, and Undici `6.29.0`; refreshed compatible transitive dependencies.
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

The Development Auth settings endpoint responds successfully. Email confirmation is enabled, and no dedicated smoke-account credentials are available locally. No account was created, email sent, or live CRUD/concurrency smoke claimed. Those two opt-in tests remain skipped until a dedicated Development account is available.

Production was not modified. No service-role key was used in the app, tests, browser QA, or reports.

## Verification

| Check | Result |
| --- | --- |
| `cmd /c npm install` | Pass; compatible audit fix and test-runner installation completed afterward. |
| `cmd /c npm run typecheck` | Pass in local QA and `quality`. |
| `cmd /c npm test` | 925 pass, 2 opt-in live tests skipped; 88 files pass, 2 skipped. |
| `cmd /c npm run lint` | Pass, including the final Metro configuration. |
| `cmd /c npm run quality` | Pass. |
| `cmd /c npm run preflight:beta` | Pass for the normal gate. Local paid-build environment warnings do not establish a defect in the released build. |
| `cmd /c npm run qa:agent:ci` and targeted repair verification | All eight gate records pass after browser, engine-evidence, and bundle reruns. |
| Browser audit | 11/11 pass; 44 screenshot/text pairs; runtime guards pass. |
| Coverage | Pass: statements 85.39%, branches 77.09%, functions 89.99%, lines 84.97%. |
| `npx expo install --check` | Pass: dependencies are up to date for the selected Expo SDK. |
| Local iOS export | Pass: Hermes JavaScript bundle and assets exported with local E2E disabled and no backend credentials. This is not a signed native build or an iPhone runtime test. |
| Development migration dry run | Pass after applying the three existing pending migrations. |
| `git diff --check` | Pass. |
| Dependency audit | **Fail at high threshold**; zero critical, 22 high, 12 moderate findings remain. |

The initial browser run exposed obsolete Profile copy and selectors. A later run was interrupted by Metro watching replaced coverage directories. The corrected rerun passed all scenarios; incomplete intermediate analysis counts were missing-evidence cascades, not demonstrated product defects. Two initial test-runner attempts were interrupted during diagnosis; the final complete unit, quality, and coverage runs passed.

## Remaining Findings

### D1 — Dependency gate still fails

- Severity: High
- Flow: installation, CI, build tooling, and future release verification.
- Actual behavior: `npm audit --audit-level=high --omit=dev` still exits nonzero.
- Expected behavior: the release candidate meets the dependency gate without suppressing unresolved alerts.
- Evidence: `qa-artifacts/reports/maintenance-dependency-audit.json` and `maintenance-all-dependency-audit.json`.
- Owners: Expo/Metro/Jest tooling dependencies and `package-lock.json`.
- Fix pass required: yes; scope a controlled Expo/React Native tooling upgrade or an explicitly reviewed upstream mitigation. No audit bypass was added.

The unresolved roots are:

| Package | Dependency path / constraint | Remaining advisory |
| --- | --- | --- |
| braces 3.0.3 | micromatch through Metro and Jest tooling; upstream lists no patched version | [Stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| node-forge 1.4.0 | Expo CLI and code-signing tooling; upstream lists no patched version | [Signature-verification advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| image-size 1.2.1 | Both Metro packages require `^1.0.2`; patched 2.x crosses the supported dependency range | [JXL/HEIF parser advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [ICNS parser advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) |
| sprintf-js | argparse through Istanbul tooling; no compatible automatic fix | [Precision-specifier advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |
| uuid 7.x | xcode through Expo configuration tooling; patched range is 11.1.1+ | [Buffer-boundary advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

These toolchain paths are not proof that the installed iPhone app exposes the vulnerable operations. They still need a deliberate mitigation; forcing npm's suggested Expo downgrade or React Native replacement would not be a validated fix.

### R1 — Live account and phone evidence is incomplete

- Severity: Medium / required external review
- Flows: fresh signup/email confirmation, authenticated persistence and RLS, purchases/restore, native workout audio/timers/backgrounding, real boxer comprehension.
- Evidence: local live-test skips and `qa-artifacts/reports/agent-qa-analysis.md`.
- Fix pass required: separate Development smoke with a dedicated account, followed by owner iPhone review. Automation cannot substitute for the missing evidence.

The agent inspected the current mobile Today, Train, Fuel, Plan, and workout-player screenshots. They show readable primary controls, unknown fuel framing, a non-contact session, and the player timer. This limited visual review is not independent qualitative review or evidence from a physical phone. The local E2E fixtures include an extra Profile tab and fixed May dates; they must not be mistaken for the current production navigation or live calendar state.

## Release Context And Next Work

Version 0.1.1 is public, released August 11. The prior chat associates build 15 with source `5dbe9fd732ff3be3734de83c7152085d7d0f6f25` and the [August 10 EAS build](https://expo.dev/accounts/karlcupid/projects/corneriq/builds/41ef1bae-caff-4eec-b2ff-3de0d001c411). The public listing confirms version/date; build-to-source mapping remains a recorded chat claim until EAS/App Store Connect metadata is checked.

At the restart baseline, `main` was at `2fe8c3a`, with one unique documentation/promo-assets commit, while Development had 34 unique commits. The main-only commit modifies the Apple handoff and adds two Instagram images. This maintenance branch targets Development; it does not merge the older release branch, create a build, or submit a new release.

The next technical milestone is to close D1 with a controlled tooling upgrade and obtain dedicated Development smoke credentials. Then review one real iPhone journey: open Today, adjust around existing boxing, start and pause a workout, background/reopen it, complete it, and confirm history after a fresh sign-in. Use that evidence to scope the daily-training usability milestone already discussed in “Plan next update improvements.” The hybrid boxing engine remains a later separately scoped milestone.
