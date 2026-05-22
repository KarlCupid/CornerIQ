# CornerIQ Agent QA

CornerIQ agent QA lets Codex run repeatable browser audits without a human manually documenting every screen. The routine path is local-only, visibly marked as test mode, and does not require Supabase credentials.

## Commands

- `cmd /c npm run qa:web` starts Expo web in local E2E mode for manual inspection.
- `cmd /c npm run qa:agent:audit` runs the Playwright audit and writes screenshots plus a report under `qa-artifacts/`.
- `cmd /c npm run qa:agent:report` regenerates the latest markdown report from the last audit artifacts.
- `cmd /c npm run qa:web:update` is reserved for refreshing Playwright snapshots if visual snapshots are added later.

## Files

- Runbook: `docs/qa/AGENT_BROWSER_AUDIT_RUNBOOK.md`
- Finding template: `docs/qa/FINDINGS_TEMPLATE.md`
- E2E tests: `qa/e2e/`
- Playwright config: `playwright.config.ts`
- Generated reports: `qa-artifacts/reports/`
- Generated screenshots: `qa-artifacts/browser-audit/current/screenshots/`

## Safety Boundary

Agent QA uses `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`. That flag is disabled by default, never creates a Supabase client, and renders a banner that says the app is in local E2E mode. The QA scripts set `EXPO_NO_DOTENV=1` and blank Supabase-related env slots for the local process. Routine browser QA must not use service-role keys, production data, or copied secret values.
