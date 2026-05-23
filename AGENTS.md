# CornerIQ Agent Rules

- Engine first: business logic belongs in deterministic engine modules, not screens.
- Boxing only: no generic fitness, MMA, or broad combat-sports defaults.
- No generated sparring, contact drills, or unsupervised fight simulation.
- No UI-owned business logic; screens read engine view models.
- Manual input is first-class; never require a wearable.
- Wearables increase confidence only when fresh and consistent.
- Cycle support is first-class, optional, private, and symptom-aware.
- Missing data is unknown, not safe.
- Safety beats performance and weight-class pressure.
- Add or update tests before relying on engine behavior from UI.
- Run `npm run typecheck`, `npm test`, and `npm run quality` before handoff.

## Normal Quality Gates

Run these from the repository root before handing off code changes:

- `cmd /c npm install`
- `cmd /c npm run typecheck`
- `cmd /c npm test`
- `cmd /c npm run lint`
- `cmd /c npm run quality`
- `cmd /c npm run preflight:beta`

If a command fails because of the Windows sandbox or package download restrictions, rerun it with the required approval path and document both the failed attempt and the approved rerun.

## Browser QA

Agent browser QA is Playwright-based and local-only by default:

- Start the local QA web app: `cmd /c npm run qa:web`
- Run the structured audit: `cmd /c npm run qa:agent:audit`
- Regenerate the latest markdown report from existing artifacts: `cmd /c npm run qa:agent:report`
- Run the full beta-readiness evidence loop: `cmd /c npm run qa:agent:ci`
- Print persistent loop state and exit criteria: `cmd /c npm run qa:loop:state`
- Refresh Playwright snapshots if future visual snapshots are added: `cmd /c npm run qa:web:update`

The agent audit uses `EXPO_PUBLIC_CORNERIQ_E2E_LOCAL=1`, which renders a visibly local/test-only path through auth, onboarding, and Today without Supabase credentials. The mode must stay disabled by default and must never use service-role keys or production data.

## QA Reports And Artifacts

- Write committed QA process docs under `docs/qa/`.
- Write generated reports, screenshots, traces, and Playwright HTML output under `qa-artifacts/`.
- The full loop bundle is `qa-artifacts/corneriq-agent-qa-bundle.zip`.
- The AI review brief is `qa-artifacts/reports/agent-ai-review-brief.md`.
- The deterministic analysis is `qa-artifacts/reports/agent-qa-analysis.md`.
- Do not commit `qa-artifacts/`, Playwright output, `.env`, `.env.*`, screenshots that reveal secrets, or secret values copied from terminal output.
- When documenting screenshots, reference artifact paths such as `qa-artifacts/browser-audit/current/screenshots/03-today-screen.png`.
- Every major screenshot should have a matching page-text snapshot under `qa-artifacts/browser-audit/current/page-text/`.

## Audit Passes Vs Fix Passes

Keep audit passes observational. During an audit pass, add findings to a report using `docs/qa/FINDINGS_TEMPLATE.md`; do not fix product UX unless the harness itself cannot run. Start a separate fix pass only after findings are reviewed and scoped.

During release or beta QA, do not add Fuel/Train/Plan product features, coach UI, reviewer-clear UI, EAS/iPhone distribution work, generated sparring/contact drills, unsafe weight-cut copy, or anything that treats missing data as safe.

Use the persistent beta-readiness loop in `docs/qa/QA_LOOP.md` and update `docs/qa/QA_LOOP_STATE.md` after audit, review, fix, and verification passes. Local E2E automation can pass a surface, but real Supabase/email confirmation, physical iPhone behavior, distribution readiness, and human boxer comprehension must remain `human_review_required` until real evidence exists.

## Secrets And Supabase

- Never commit `.env` or secret values.
- Never use Supabase service-role keys in the app, tests, browser QA, docs, or generated reports.
- Routine agent QA must not require real Supabase credentials.
- Live Supabase smoke testing must remain explicit, opt-in, and separate from agent browser QA.

## Commit Discipline

All changes must be committed only after verification passes or after failures are clearly documented with the exact blocker. Do not commit generated QA artifacts unless a human explicitly asks for a specific artifact to be versioned.
