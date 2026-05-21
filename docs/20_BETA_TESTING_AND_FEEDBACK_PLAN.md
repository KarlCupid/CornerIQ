# Beta Testing And Feedback Plan

Date: 2026-05-20

This document prepares CornerIQ for structured real-boxer beta testing. The goal is to test the current app with boxers, capture privacy-safe feedback, and preserve an audit trail without adding risky product complexity.

## Beta Purpose

Beta testing should evaluate clarity, trust, safety, and usefulness with boxers. This is not public release yet.

The beta should answer:

- Can a boxer tell what to do first without reading every card?
- Does Fuel support boxing performance without pressuring weight-class behavior?
- Does Train feel specific to boxing support rather than generic fitness?
- Does Plan explain current week, next week, and roll-forward without feeling like manual programming?
- Does Profile make privacy, feedback, and data controls understandable?

## Test Personas

Use these personas across guided sessions:

- Amateur novice build phase.
- Amateur open with sparring anchors logged as protected coach-led work.
- Amateur tournament daily weigh-ins.
- Pro camp day-before weigh-in.
- Same-day weigh-in amateur.
- Cycle-enabled athlete with high symptoms.
- manual-only no wearable athlete.
- Under-fueling risk case.
- Red readiness case.
- No-equipment boxer.

## Test Scripts

Run each script as observation, not coaching advice. Ask the tester to narrate what they think CornerIQ is asking them to do.

1. Complete onboarding with boxer-specific profile details.
2. Read Today primary action and explain what you would do first.
3. Log body mass manually.
4. Log readiness manually.
5. Log food and water manually.
6. Use Fuel Command and describe the first safe action.
7. Request or acknowledge nutrition safety review when the UI exposes it.
8. Complete a generated workout using only session RPE when time is tight, then repeat with one exercise row if the tester has energy.
9. Inspect Exercise History after completion.
10. Inspect Plan Week and Next Week.
11. Accept a next-week preview when available.
12. Check the auto-roll-forward explanation after a week boundary scenario.
13. Preview export and review DELETE-gated data deletion copy without deleting unless this is a dedicated test account.
14. Submit beta feedback from Profile > Audit.
15. Reopen Profile > Audit and confirm the recent feedback list shows the submitted report as received.
16. Review the Beta health preflight and explain any warning in the tester's own words.
17. In Plan > Adjustments, ask what each engine-request button means before pressing it: Protect this day, Mark unavailable, Request deload, and Restore engine plan.

## Safety Checks

Before and during each beta session, confirm:

- no unsafe weight-cut instructions.
- No generated sparring/contact.
- No self-clear review path.
- No coach controls.
- No service role in client code.
- missing data = unknown.
- Manual input works without a wearable.
- Safety beats performance and weight-class pressure.
- Cycle support stays optional, private, and symptom-aware.

## Feedback Prompts

Ask these after each flow:

- What was confusing?
- What felt trustworthy?
- What felt too dense?
- Could you tell what to do first?
- Did any weight-class copy feel pressuring?
- Did workout completion feel too heavy?
- Did cycle support feel respectful?
- Did Fuel feel useful without barcode scanning?

## In-App Feedback Workflow

Feedback is available in Profile > Audit through the Beta feedback panel.

The panel collects:

- App section.
- Feedback category.
- Severity.
- Short message.
- Sanitized app context such as section, engine version, and safe status labels.

The panel reminds testers:

- Do not include emergency details or secrets.
- This is not emergency support and is not medical or coaching review.
- For urgent safety concerns, stop and seek qualified support.

Feedback is saved to `beta_feedback_reports` as user-owned data under RLS. Feedback reports are included in app data export/delete scope. There is no admin triage dashboard in the app yet, and reports are not sent to third-party analytics.

Recent reports are visible to the signed-in user in Profile > Audit. Status chips are read-only in the client: received, reviewed, resolved, or dismissed. The client cannot mark a report reviewed, resolved, or dismissed.

## Error Report Flow

If the React tree hits an app-level error, CornerIQ shows recovery copy instead of a raw stack trace. Signed-in users can choose Report this issue, which submits sanitized bug feedback through the same beta feedback service. Signed-out users can retry, but no issue report is submitted.

This flow is product issue reporting only. It is not emergency support, medical review, coach review, or hard-stop clearance.

## Automated Scenario QA

The twenty-third implementation pass added `src/tests/beta/betaScenarioFlows.test.ts` and `docs/22_BETA_SCENARIO_QA_RESULTS.md`.

The automated harness covers all listed beta personas and asserts that Today/Fuel/Train/Plan/Profile/Beta Health view models resolve, unsafe Fuel copy is absent, generated support does not prescribe sparring or contact, nutrition review cannot be self-cleared, missing data is not treated as safe, and manual-only athletes remain valid without a wearable.

Use the results doc as the pre-session checklist for facilitators. It also records friction notes found before human beta: quick logs needed clearer "log enough for today" copy, workout completion needed a faster path, Plan adjustments needed clearer engine-request framing, and feedback/error reporting needed stronger not-emergency/support boundaries.

## Manual Feedback Triage

Until a private admin triage dashboard exists, inspect feedback manually in the Supabase dashboard:

1. Open `beta_feedback_reports`.
2. Filter by `user_id`, `created_at`, `screen`, `category`, `severity`, or `status`.
3. Treat message text as sensitive.
4. Do not copy medical details or private tester text into public issues.

Future options include an admin Edge Function, a private dashboard, or private exports for beta synthesis.

## Privacy Rules

- Do not ask testers to paste medical records, full health histories, passwords, tokens, or screenshots with secrets.
- Keep cycle context optional and private.
- Keep wearable use optional; manual input is first-class.
- Use only public Supabase URL and anon key in the client and smoke.
- Do not print or document smoke email/password values.
- Feedback is product feedback, not emergency support, medical review, coach review, or a hard-stop clearing workflow.

## Beta Exit Criteria

Beta can move from structured test to broader pilot only when:

- Smoke passes.
- No safety-copy blockers remain.
- No auth/data deletion blockers remain.
- No hard-stop self-clear exists.
- No generated contact work exists.
- No major confusion remains on Today/Fuel/Train/Plan first action.
- Profile feedback and data-control copy are understandable to testers.
- Feedback reports can be submitted, verified, and cleaned up in smoke.

## Known Beta Gaps To Track

- No production issue triage dashboard yet.
- Feedback reports are user-owned and not admin-reviewed in app.
- No external analytics yet.
- No beta health drilldown beyond Profile > Audit preflight yet.
- Automated scenario QA exists, but real boxer findings are still not captured.
- Routed drilldowns remain deferred.
- Barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and reviewer-clear UI remain deferred.

## Auditor Inspect First

1. `supabase/migrations/009_beta_feedback_reports.sql`
2. `src/services/supabase/betaFeedbackRepository.ts`
3. `src/services/feedback/submitBetaFeedback.ts`
4. `src/hooks/useBetaFeedback.ts`
5. `src/app/components/BetaFeedbackPanel.tsx`
6. `src/app/components/AppErrorBoundary.tsx`
7. `src/app/components/BetaHealthPanel.tsx`
8. `src/engine/presentation/betaHealthViewModel.ts`
9. `src/app/screens/ProfileScreen.tsx`
10. `src/tests/services/betaFeedbackService.test.ts`
11. `src/tests/services/supabaseRepositories.test.ts`
12. `src/tests/app/appShell.test.ts`
13. `src/tests/engine/betaHealthViewModel.test.ts`
14. `src/tests/live/liveDbSmoke.test.ts`
15. `docs/21_BETA_RELEASE_OPERATIONS.md`
