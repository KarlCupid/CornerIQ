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

## Covered Flows

The first scenario covers:

- First launch in local E2E mode.
- Auth screen visible.
- Local E2E sign-in with non-secret fake credentials.
- Local demo onboarding visible.
- Today screen visible.
- Today first-action content visible.
- Quick logs visible.
- Mobile-size browser layout smoke.

## Severity Rules

- Blocker: The app cannot launch, the audit cannot reach Auth/Onboarding/Today, secrets appear, production data is touched, or unsafe boxing/weight-cut/contact behavior is exposed.
- High: A core first-run step is unusable, hidden, misleading, or contradicts safety rules.
- Medium: A core step works but is confusing, poorly labeled, or likely to create tester error.
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
- Use fake local credentials such as `agent-qa@example.test` only in local E2E mode.
- If a screenshot shows a token, email from a real account, terminal secret, or production URL with private data, discard it and rerun after removing the exposure.

## Human Review Still Required

Agent QA does not replace:

- Real Supabase auth and email-confirmation testing.
- Real beta account data checks.
- Physical iPhone/Android keyboard, safe-area, and touch testing.
- Human review of boxing safety, cycle privacy, and weight-class language.
- Release owner checks for EAS, TestFlight, stores, or external distribution.

## Handoff Checklist

Before handoff, run and document:

- `cmd /c npm run typecheck`
- `cmd /c npm test`
- `cmd /c npm run lint`
- `cmd /c npm run quality`
- `cmd /c npm run preflight:beta`
- `cmd /c npm run qa:agent:audit`

Commit only after verification passes or after exact blockers are documented.
