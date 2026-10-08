# CornerIQ Restart Review

Follow-up: the authorized maintenance pass is recorded in [Restart Maintenance](RESTART_MAINTENANCE_2026-10-08.md). The observations below preserve the pre-fix baseline.

CornerIQ should restart with a bounded maintenance milestone, followed by a focused improvement to the daily training experience. Version 0.1.1 is already public. The immediate work is to restore a usable development backend, repair the failing dependency gate, and reconcile the release records before adding functionality.

- Audit date: 2026-10-08 America/Vancouver
- Commit tested: `5dbe9fd732ff3be3734de83c7152085d7d0f6f25` (`5dbe9fd`)
- Branch: `codex/development`
- Agent: Codex
- Scenario: observational restart review of repository history, GitHub checks, prior chats, public release status, backend metadata, and local QA
- Browser/viewports: Chromium through the repository Playwright audit; desktop 1280x900 and mobile 390x844
- Report path: `docs/qa/RESTART_REVIEW_2026-10-08.md`
- Screenshot artifact paths: `qa-artifacts/browser-audit/current/screenshots/`; matching text under `qa-artifacts/browser-audit/current/page-text/`

## Summary

- Pass/fail: typecheck, 925 tests, lint, and normal preflight pass; full local QA fails at an obsolete Profile selector; GitHub dependency gate fails; development backend is inactive.
- Highest severity: High for dependency remediation; Blocker for live development testing while its backend is inactive.
- Next recommended fix area: development backend, dependency gate, browser harness, and release traceability.
- Scope: observational. Product code, dependencies, databases, builds, and distribution were not changed. Local documentation and ignored QA artifacts are the outputs.

## Release And Repository State

Apple's [Canadian listing](https://apps.apple.com/ca/app/corneriq/id6786384726) and public lookup report version 0.1.1 released August 11, 2026. The previous “Mock up consistent app aesthetic” chat records submission of build 15 on August 10, with automatic release enabled. That chat links [the EAS candidate](https://expo.dev/accounts/karlcupid/projects/corneriq/builds/41ef1bae-caff-4eec-b2ff-3de0d001c411) and identifies `5dbe9fd` as its source. The public listing confirms the version and release date; exact build-to-source provenance still needs release-owner reconciliation.

The checkout is at the [August 10 workout concurrency fix](https://github.com/KarlCupid/CornerIQ/commit/5dbe9fd732ff3be3734de83c7152085d7d0f6f25) and matches the remote development branch after fetching. `main` remains at `2fe8c3a`. Development has 34 unique commits, and `main` has one unique commit. GitHub returned no pull requests and no issues. Reconcile the branch histories deliberately before the next release.

Supabase metadata reports **CornerIQ Development: INACTIVE** and **CornerIQ: ACTIVE_HEALTHY**. A read-only production migration listing contains all 28 local migration versions, including `20260723233725`, `20260724203621`, and `20260725005909`. This establishes version-history alignment only; it does not verify migration file contents, current auth, persistence, RLS behavior, or purchases.

## Previous Product Direction

The relevant prior chats were “Set up development branch,” “Plan CornerIQ Phase 1 updates,” “Mock up consistent app aesthetic,” “Plan next update improvements,” and “Audit pillar features,” plus the historical Apple rejection work.

Phase 1 implemented grouped onboarding, clearer existing-training ownership, recurring and one-off schedule editing, Build/Fight Camp with Single Fight/Tournament branches, period-support wording, consistent visual styling, and four daily tabs. Later work addressed plan scheduling, regeneration history, duplicate keys, and concurrent generated-workout saves.

“Plan next update improvements” proposed a daily training loop: understand today, adapt, execute, complete, and learn. It also recorded the owner's interest in a hybrid boxing engine. That direction remains useful, but the earlier feature list was a proposal rather than a completed or newly approved scope.

The current engine already has canonical workouts, compiler V2, templates, boxing curriculum, readiness overlays, completion evidence, and progression modules. A hybrid expansion should build on these contracts with boxer-authored solo drills and cues, deterministic scheduling/dose/safety, and structured feedback. Future AI explanation or variation remains optional and must use approved components.

## Findings

### Finding 1 Dependency Checks Block Remote Quality

- Severity: High
- Screen/flow: development and release verification
- What the user sees: new pushes fail Quality before fixture smoke, tests, coverage, or migration dry-run execute.
- Steps to reproduce: run `npm audit --audit-level=high --omit=dev` against the current lockfile, or inspect [Quality run 31422337072](https://github.com/KarlCupid/CornerIQ/actions/runs/31422337072).
- Expected behavior: the dependency policy passes, with any accepted exceptions narrowly justified.
- Actual behavior: the August 10 job failed at Dependency audit. Today's install reports 51 findings across all dependencies: 1 low, 15 moderate, 32 high, and 3 critical. Today's production-tree audit reports 47: 13 moderate, 31 high, and 3 critical. Counts include transitive package propagation and do not establish exploitability in the installed iPhone app.
- Evidence: GitHub job `93565832272`; local install and production-tree audit; `qa-artifacts/reports/restart-dependency-audit.json`.
- Suspected owner/file: `package.json`, `package-lock.json`, Expo/React Native tooling, `.github/workflows/quality.yml`.
- Fix pass required: yes. Assess reachable advisories and compatible fixes first; scope a coordinated framework upgrade separately if necessary. Preserve the gate while resolving the findings.

### Finding 2 Development Backend Is Inactive

- Severity: Blocker for live development testing
- Screen/flow: development sign-in and persistence
- What the user sees: the configured development backend cannot be relied on for connected app testing until restored and verified.
- Steps to reproduce: inspect CornerIQ Development project metadata in Supabase.
- Expected behavior: the isolated development project is active and usable before connected development smoke tests.
- Actual behavior: both project listing and project-detail read return `INACTIVE`; production returns `ACTIVE_HEALTHY`.
- Evidence: read-only Supabase metadata on October 8; historical branch/environment setup in “Set up development branch.”
- Suspected owner/file: CornerIQ Development project lifecycle and development environment configuration.
- Fix pass required: yes. Restore development in a separate scoped action, then verify auth, schema, persistence, and cleanup using dedicated test data. Local E2E remains usable without this backend.

### Finding 3 Project Status And Release History Need Reconciliation

- Severity: Medium
- Screen/flow: restart planning and next release
- What the user sees: the old QA summary recommends applying a migration already recorded in production and creating a candidate after a public release has occurred.
- Steps to reproduce: compare the previous QA summary and May handoff with the August release, branch histories, production migration listing, and latest GitHub run.
- Expected behavior: current evidence guides the next action; historical records remain clearly dated.
- Actual behavior: the prior summary tests `89d3eca` from July 23, while the checkout is `5dbe9fd` from August 10. `main` and development differ, and the newest development Quality run fails.
- Evidence: git branch comparison; public Apple listing; production migration metadata; `docs/CODEX_LAST_HANDOFF.md`; `docs/qa/QA_LOOP_STATE.md`.
- Suspected owner/file: release documentation, QA state, and source/build traceability.
- Fix pass required: yes. This review updates the QA summary and preserves older surface records as historical evidence. A future release still needs one explicit candidate SHA and matching checks/build evidence.

### Finding 4 Browser Harness Uses The Previous Profile Section

- Severity: Medium, required for complete automated evidence
- Screen/flow: Profile History & Support audit
- What the user sees: the audit stops after two passing journeys; eight later journeys are skipped.
- Steps to reproduce: run `cmd /c npm run qa:agent:ci` on the tested commit.
- Expected behavior: the audit opens the current History & Support section and checks the existing safety-history content.
- Actual behavior: `auditProfileSafety` calls `openSection(page, "Safety")`, then times out waiting for `Fuel safety history`. The screenshot and page-text snapshot show `Show History & Support` still collapsed. The content remains in `ProfileScreen.tsx`.
- Evidence: `qa/e2e/agent-browser-audit.spec.ts:721`; `src/app/screens/ProfileScreen.tsx:661`; `qa-artifacts/playwright/results.json`; `qa-artifacts/playwright/test-results/agent-browser-audit-Profil-7219e-tory-after-local-onboarding/error-context.md`; `qa-artifacts/browser-audit/current/screenshots/13a-profile-setup-details.png` and matching `page-text/13a-profile-setup-details.txt`.
- Suspected owner/file: `qa/e2e/agent-browser-audit.spec.ts` and dependent evidence expectations.
- Fix pass required: yes, a separate scoped harness repair. Keep assertions aligned with the implemented UI without removing safety/privacy checks. Later journeys remain untested until the complete audit passes.

## Verification

| Check | October 8 result |
| --- | --- |
| npm install | Passed; lockfile unchanged; 51 audit findings across all dependencies. |
| Typecheck | Passed in local QA CI. |
| Unit and integration tests | 925 passed, 2 opt-in live tests skipped, across 88 passing files. |
| Lint | Passed in local QA CI. |
| Normal production preflight | Passed; local paid-build configuration warnings are not evidence that the public build lacks configuration. |
| Full local QA CI | Failed: Profile browser assertion, followed by incomplete evidence analysis. |
| Browser journeys | 2 passed, 1 failed, 8 skipped. |
| Evidence bundle | Generated at `qa-artifacts/corneriq-agent-qa-bundle.zip`; incomplete browser coverage is explicit. |
| npm run quality | Passed after documentation edits: typecheck plus 925 tests, 2 live tests skipped. |
| npm run preflight:beta | Passed after documentation edits, with the same local paid-build warnings. |

The deterministic analysis reports 67 blockers and 2 high findings largely from missing artifacts after the serial audit stopped. Treat these as incomplete-coverage findings, not 67 independently demonstrated product defects. Static scans of captured evidence passed safety, secrets, and object-serialization checks. Live database and concurrency smoke tests remain disabled.

## Recommended Restart Milestones

1. **Restore the development baseline.** Restore the development project, resolve the dependency gate, repair the browser harness, reconcile release/source records, run local QA, and explicitly scope a separate development smoke. Finish with a usable development environment and green checks for one candidate.
2. **Improve workout execution and completion.** Validate the installed app on an iPhone, then scope the smallest useful player pass: reliable interruption/resume, clear controls, and quick completion. The player currently decrements a timer in `setInterval` and persists remaining seconds; code inspection found no player-specific foreground reconciliation or keep-awake integration. Physical-device behavior must be tested before treating this as a reproduced defect. Audio, substitutions, and device-local resume already exist and should be refined where evidence shows friction.
3. **Expand the hybrid boxing engine.** Work together on a small vetted solo-boxing content set and progression rules, using actual completion and comprehension feedback. Keep business decisions in deterministic engine modules and preserve all existing safety boundaries.

For the first owner session, use the installed 0.1.1 app for 20–30 minutes: reopen an existing account after the long gap, compare today's date/workout across Today/Train/Plan, check in, run part of a workout, lock/background the phone, resume, complete it, and reopen to inspect saved history. Record observed confusion and failures without private health details. Obtain a few real boxer sessions before approving the larger daily-loop scope.

## Human Review Still Needed

- Real Supabase auth/account state: development is inactive; fresh email confirmation, session, persistence, and cross-user RLS checks remain `human_review_required` until separately evidenced.
- Physical mobile device behavior: interruptions, timer behavior, touch, keyboard, safe areas, and workout completion remain `human_review_required`.
- Boxing-domain safety copy: real boxer comprehension and pressure interpretation remain `human_review_required`.
- Privacy/secret exposure: routine QA uses local fixtures and disabled backend credentials; real user exports/deletion require a separate test.
- Release/launch readiness: 0.1.1 is public, but future candidates require fresh dependency, build, purchase/restore, and owner acceptance evidence. App Store/RevenueCat usage and retention metrics were not available in this review.
