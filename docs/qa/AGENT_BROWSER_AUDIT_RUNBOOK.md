# Agent Browser Audit Runbook

## Purpose

Use this runbook when a Codex agent needs to audit CornerIQ web UX and produce documentation without a human manually recording every screen. This is an audit harness, not a product-fix pass.

## Local Web Testing

1. From the repository root, run `cmd /c npm install`.
2. Run `cmd /c npm run qa:web` to start Expo web in local E2E mode.
3. Open the served localhost URL if manual inspection is needed.
4. Stop the server with `Ctrl+C` after inspection.

The QA web script sets `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`, sets `EXPO_NO_DOTENV=1`, and blanks Supabase-related env slots for the local process. Normal app startup does not use this mode.

## Automated Agent Audit

Run:

```powershell
cmd /c npm run qa:agent:audit
```

The script starts Expo web through Playwright, runs the audit in `qa/e2e/`, captures screenshots, writes `qa-artifacts/browser-audit/current/summary.json`, and writes a markdown report under `qa-artifacts/reports/`.

To regenerate the markdown report from the last audit:

```powershell
cmd /c npm run qa:agent:report
```

For the full launch-readiness evidence bundle, run:

```powershell
cmd /c npm run qa:agent:ci
```

That command also writes page-text snapshots, a screenshot manifest, deterministic analysis, an AI review brief, a contact sheet, an engine-output review, and `qa-artifacts/corneriq-agent-qa-bundle.zip`.

## Covered Flows

The full onboarding audit covers the real first-time path before any shortcut:

- Auth screen visible in local E2E mode.
- Local E2E sign-in with non-secret fake credentials.
- Boxer basics with boxing status, visible level definitions, training age, and stance.
- Body mass with kg/cm labels, examples, and missing-data safety copy.
- Training access with Monday-Sunday availability chips plus optional equipment and availability notes.
- Protected weekly anchors for recurring Tuesday pads and Thursday protected sparring using RPE selection.
- Cycle support disabled while confirming optional/private/non-fertility copy.
- Manual-only wearable preference.
- Safety screening with male sex-at-birth selection hiding pregnancy-specific choices, no medication collection, and constrained engine-relevant safety restrictions.
- Build phase goal selection with plain-English explanations.
- Finish setup reaches Today.
- Mobile-width Today after the real onboarding path.

The smoke audit covers the shortcut path:

- First launch in local E2E mode.
- Auth screen visible.
- Local E2E sign-in with non-secret fake credentials.
- Local demo onboarding visible.
- `Create safe demo boxer` shortcut.
- Today screen visible.
- Today first-action content visible.
- Quick logs visible.
- Mobile-size browser layout smoke.

The Fuel audit covers the local E2E path after onboarding:

- Fuel tab visible from the local tab shell.
- Fuel start-here card is visible first with First action copy, "Fuel the boxing work first", and missing-logs-lower-confidence/unknown framing.
- Default Fuel view is focused on the start-here card, today's fuel priority, manual food logging, and hydration.
- Details / why, History, Safety review, and Body Mass sections remain available behind collapsed controls.
- Missing food logs are framed as unknown/lower-confidence context, not safe.
- Safety review section shows nutrition review history, "You cannot self-clear nutrition hard stops", hard-stops-cannot-clear-in-app copy, and urgent-support copy.
- Body Mass section keeps unknown context visible.
- Visible Fuel text is scanned for unsafe weight-cut instruction phrases such as dehydration, diuretics, laxatives, sauna, starvation, sweat-suit, or water-loading instructions.

The Profile Safety audit covers the local E2E path after onboarding:

- Profile tab visible from the local tab shell.
- Safety section visible.
- Training history and Fuel safety history are visible.
- Saved history detail opens without exposing private server controls.
- In-app feedback, issue reporting, launch notice, and runtime-readiness panel text do not appear.
- Visible Profile Safety text is scanned for secret-value patterns, Supabase service-role assignments, JWTs, bearer tokens, database URLs, and concrete Supabase project URLs.

The Train audit covers the local E2E path after onboarding:

- Train tab visible from the local tab shell.
- Today and Workout sections visible.
- Today's generated training visible and scanned so generated training does not include sparring, contact, partner drills, or fight simulation.
- Workout detail opens.
- Protected workout logging uses Session RPE 1-10 and maps internally to existing intensity buckets.
- Fast completion path, session RPE, and one exercise row are visible.
- Local E2E workout completion path returns local-only feedback.
- Exercise History is visible.
- Progression copy says free-text load is not used for numeric progression.

The Plan audit covers the local E2E path after onboarding:

- Plan tab visible from the local tab shell.
- Week, Next Week, Block History, and Adjustments sections visible.
- Next Week explains preview/materialization as engine-owned and safety-bound.
- Adjustments expose Keep for boxing, Mark unavailable, Request deload, and Restore plan as requests to update the plan.
- No coach-only controls or drag/drop expectation is exposed.

The Profile Data audit covers:

- Data controls visible.
- Export preview explains user-owned app data scope.
- Local E2E preview rows appear without Supabase calls.
- Delete remains disabled until preview plus exact `DELETE` confirmation.
- Account deletion limitation is visible.

The Error and Recovery audit is static-only by design:

- App error boundary source exists.
- Error recovery gives retry plus support-outside-app guidance.
- Users cannot submit issue reports from the app shell.
- Raw stack traces are not rendered to users.

Use the full onboarding audit when checking whether first-run labels, helper text, and field affordances still work. Current onboarding checks include boxer level definitions, day-of-week availability, protected-anchor RPE, and the simplified safety screen. Use the Fuel and Profile Safety scenarios as focused launch-safety guards after onboarding. Use the smoke shortcut audit as a fast guard that local auth, the demo shortcut, Today, quick logs, and mobile rendering still boot.

The full onboarding audit writes these screenshots under `qa-artifacts/browser-audit/current/screenshots/`:

- `01-auth-screen.png`
- `02-onboarding-boxing-basics.png`
- `03-onboarding-body-mass.png`
- `04-onboarding-training-access.png`
- `05-onboarding-fixed-boxing-schedule.png`
- `06-onboarding-cycle.png`
- `07-onboarding-wearable.png`
- `08-onboarding-safety.png`
- `09-onboarding-goal.png`
- `10-today-after-real-onboarding.png`
- `11-mobile-today-after-real-onboarding.png`
- `12-fuel-screen.png`
- `12-fuel-food-quick-log-submit.png`
- `13-profile-safety-screen.png`
- `14-profile-safety-history-detail.png`
- `16-train-screen.png`
- `18-train-manual-log-completion.png`
- `19-train-week-context.png`
- `20-plan-screen.png`
- `21-plan-details-screen.png`
- `24-profile-data-controls.png`
- `24-profile-data-delete-submit.png`
- `25-profile-settings-signout.png`
- `smoke-01-auth-screen.png`
- `smoke-02-onboarding-shortcut-screen.png`
- `smoke-03-today-screen.png`
- `smoke-04-mobile-today-screen.png`
- `smoke-05-today-quick-log-saves.png`

The generated markdown report groups screenshots by scenario so Fuel and Profile Safety results are separated from onboarding and smoke coverage.

Each screenshot has a matching visible page-text snapshot under `qa-artifacts/browser-audit/current/page-text/`, plus an entry in `qa-artifacts/browser-audit/current/screenshot-manifest.json`. Use those text files for AI review and deterministic scans.

## Severity Rules

- Blocker: The app cannot launch, the audit cannot reach Auth/Onboarding/Today, secrets appear, production data is touched, or unsafe boxing/weight-cut/contact behavior is exposed.
- High: A core first-run step is unusable, hidden, misleading, or contradicts safety rules.
- Medium: A core step works but is confusing, poorly labeled, or likely to create user error.
- Low: Cosmetic, copy, spacing, or evidence-quality issue that does not block the flow.

## Documenting Findings

Use `docs/qa/FINDINGS_TEMPLATE.md` for human-readable findings. Keep audit passes observational. Do not fix product UX during the same pass unless the QA harness cannot run.

Every finding should include:

- Severity.
- Screen/flow.
- Reproduction steps.
- Expected and actual behavior.
- Screenshot or trace path.
- Whether a separate fix pass is required.

## Screenshots And Artifacts

Generated screenshots belong under `qa-artifacts/browser-audit/current/screenshots/`. Playwright traces, videos, JSON, and HTML reports belong under `qa-artifacts/playwright/`.

`qa-artifacts/` is ignored by git. Do not commit generated screenshots unless a human explicitly asks for a specific artifact.

## Secrets

- Never copy `.env` values into reports.
- Never use Supabase service-role keys.
- Routine agent QA must not require `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Use fake local credentials such as `user@example.com` only in local E2E mode.
- If a screenshot shows a token, email from a real account, terminal secret, or production URL with private data, discard it and rerun after removing the exposure.

## Human Review Still Required

Agent QA does not replace:

- Real Supabase auth and email-confirmation testing.
- Real account data checks.
- Physical iPhone/Android keyboard, safe-area, and touch testing.
- Human review of boxing safety, cycle privacy, and weight-class language.
- Release owner checks for EAS, TestFlight, stores, or external distribution.

## Handoff Checklist

Before handoff, run and document:

- `cmd /c npm run typecheck`
- `cmd /c npm test`
- `cmd /c npm run lint`
- `cmd /c npm run quality`
- `cmd /c npm run preflight:production`
- `cmd /c npm run qa:agent:ci`

Commit only after verification passes or after exact blockers are documented.
