# Beta Testing And Feedback Plan

Date: 2026-05-21

This document prepares CornerIQ for structured real-boxer beta testing. The goal is to test the current app with boxers, capture privacy-safe feedback, and preserve an audit trail without adding risky product complexity.

## Beta Purpose

Beta testing should evaluate clarity, trust, safety, and usefulness with boxers. This is not public release yet.

The beta should answer:

- Can a boxer tell what to do first without reading every card?
- Does Fuel support boxing performance without pressuring weight-class behavior?
- Does Train feel specific to boxing support rather than generic fitness?
- Does Plan explain current week, next week, and roll-forward without feeling like manual programming?
- Does Profile make privacy, support, safety-history, and data controls understandable?

## Test Personas

Use these personas across guided sessions:

- Amateur novice build phase.
- Amateur open with scheduled sparring logged as fixed manual work.
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
14. Capture product feedback in private facilitator notes or the outside-app support path; do not ask the tester to enter emergency details, private health history, credentials, or personal contact details into the app.
15. Review Profile > Data and Profile > Safety, then ask the tester to summarize export/delete, outside-app support, and safety-history boundaries.
16. In Plan > Adjustments, ask what each plan-change button means before pressing it: Keep for boxing, Mark unavailable, Request deload, and Restore plan.

## Guided Human Beta Scripts

Facilitator rule: ask what the tester understands; do not coach, diagnose, clear hard stops, or suggest weight-cut tactics.

| Flow | Facilitator asks | Expected comprehension | Pass/fail criteria | Private record |
| --- | --- | --- | --- | --- |
| Onboarding first run | "What is CornerIQ asking for, and what can you skip or change later?" | Boxer profile, manual schedule, cycle/wearable choices, and safety basics shape engine confidence. | Pass if the tester can complete setup without thinking a wearable is required. Fail if safety/cycle fields feel coercive or confusing. | Section, confusion quote summary, no private health detail. |
| Today | "What would you do first in the next five seconds?" | Primary action first; missing logs are unknown, not safe. | Pass if first action is obvious. Fail if tester hunts through cards or thinks missing data means safe. | First-action answer and time-to-answer bucket. |
| Fuel | "What is the first safe fuel action and what is CornerIQ not doing?" | Fuel supports boxing quality, not unsafe weight cutting or dietetic care. | Pass if tester sees safety/review copy and no pressure to cut. Fail on pressure, precision overclaim, or unsafe interpretation. | Flow, category, severity, private note if needed. |
| Train fast completion | "How would you finish logging if you only had 30 seconds?" | Session RPE-only completion is acceptable; detailed exercise rows are optional. | Pass if fast path is found. Fail if tester thinks full exercise data is required. | Completion path used and friction note. |
| Plan Week/Next Week | "What changed, what is pending, and what stays engine-owned?" | Current week, preview, acceptance, and boundary materialization are distinct. | Pass if tester does not think future hard work can be pulled forward freely. Fail on stale-preview or coach-replacement confusion. | Preview explanation and any unsafe assumption. |
| Profile Data/Safety | "What can you export, delete, or ask support about outside the app, and what can safety history not do?" | App data controls are DELETE-gated; support and product feedback stay outside the app; safety history is not emergency support, medical review, coaching review, or hard-stop clearance. | Pass if tester can explain limits. Fail if outside-app support seems like clearance or emergency help. | Private issue id or facilitator note, no secrets. |

Stop the session and seek qualified support outside the app if the tester reports urgent symptoms, pregnancy-related concern, eating-disorder risk, unsafe weight-class pressure, fainting, severe dizziness, or anything that sounds like a hard-stop self-clear request.

## Human Beta Findings Template

Use this only for real tester sessions. Keep planned scripts, agent QA, and facilitator expectations separate from real findings.

| Field | Private record guidance |
| --- | --- |
| Tester/session id alias | Use a non-identifying alias such as `session-001`; do not use real names, emails, phone numbers, or gym identifiers. |
| Flow tested | Onboarding, Today, Fuel, Train, Plan, Profile Data, Profile Safety, or Error Recovery. |
| First-action comprehension | Record whether the tester could say the first safe action without coaching. |
| Confusion severity | None, Low, Medium, High, or Critical. |
| Safety interpretation | Record whether safety limits were understood; do not record private health details. |
| Privacy interpretation | Record whether support/data/cycle/wearable boundaries were understood. |
| Action taken | No action, copy tweak, private issue, stop-session, or release blocker. |
| No private health details | Confirm no medical history, cycle detail, credential, personal contact detail, or private tester quote was copied into public docs. |

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
- Facilitator explains beta boundaries before collecting feedback outside the app.
- Release evidence and support notes use public env variable names only and never values.

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

## Feedback Workflow

Launch runtime no longer exposes Profile > Audit, a Beta feedback panel, beta health, beta tester notice, in-app feedback history, or signed-in issue reporting. Feedback and incident notes for guided beta sessions are collected outside the app by the facilitator or release owner.

Private feedback notes may record:

- app section;
- feedback category;
- confusion severity;
- short product summary with no private health detail;
- action taken, such as no action, copy tweak, private issue, stop-session, or release blocker.

The facilitator reminds testers:

- Do not include emergency details, medical records, full health histories, credentials, or secrets.
- CornerIQ is not emergency support, medical review, dietetic care, coaching review, or hard-stop clearance.
- For urgent safety concerns, stop the session and seek qualified support outside the app.

Historical `beta_feedback_reports` and Profile > Audit docs refer to a removed pre-launch surface. They are not active launch guidance, not part of export/delete scope for the final launch schema, and should not be used as beta-session instructions.

## Error Recovery Flow

If the React tree hits an app-level error, CornerIQ shows recovery copy instead of a raw stack trace. Users can retry and are directed to contact support outside the app. The launch runtime does not submit signed-in issue reports from the app shell.

This flow is product recovery guidance only. It is not emergency support, medical review, reviewer workflow, or hard-stop clearance.

## Automated Scenario QA

The twenty-third implementation pass added `src/tests/beta/betaScenarioFlows.test.ts` and `docs/22_BETA_SCENARIO_QA_RESULTS.md`.

The automated harness covers all listed beta personas and asserts that Today/Fuel/Train/Plan/Profile view models resolve, unsafe Fuel copy is absent, generated support does not prescribe sparring or contact, nutrition review cannot be self-cleared, missing data is not treated as safe, and manual-only athletes remain valid without a wearable.

Use the results doc as the pre-session checklist for facilitators. It also records friction notes found before human beta: quick logs needed clearer "log enough for today" copy, workout completion needed a faster path, Plan adjustments needed clearer engine-request framing, and support/error recovery needed stronger not-emergency/support boundaries.

## Release-Candidate Preflight

Before real boxer sessions, run:

```bash
npm run preflight:beta
```

This checks package scripts, EAS build profile presence, app config presence, required public env names in the process or `.env.example`, client config markers, and beta docs. It does not run live smoke, does not print env values, does not require smoke credentials, and does not mutate files.

Use `docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md` and `docs/24_EXPO_EAS_BETA_DISTRIBUTION.md` when distributing a preview build. On 2026-06-03, EAS project `@karlcupid/corneriq` was linked, Android preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed in Gradle/Hermes, and fresh Android preview build `c21c5692-011e-4c85-949f-355d0e1f753f` finished with APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`. Share it only through a private tester channel after release-owner checks.

## Manual Feedback Triage

Until a privacy-reviewed support or research workflow exists, keep beta feedback in private facilitator notes or a release-owner-controlled support channel outside the app:

1. Use tester/session aliases instead of names, emails, phone numbers, or gym identifiers.
2. Record only product facts needed to triage clarity, safety interpretation, privacy understanding, or release readiness.
3. Treat tester text as sensitive.
4. Do not copy medical details or private tester text into public issues.

Future options include a private support dashboard, admin workflow, or private exports for beta synthesis after permission, retention, and privacy rules are defined.

## Privacy Rules

- Do not ask testers to paste medical records, full health histories, passwords, tokens, or screenshots with secrets.
- Keep cycle context optional and private.
- Keep wearable use optional; manual input is first-class.
- Use only public Supabase URL and anon key in the client and smoke.
- Do not print or document smoke email/password values.
- Feedback and support notes are outside-app product signals, not emergency support, medical review, reviewer workflow, or a hard-stop clearing workflow.

## Beta Exit Criteria

Beta can move from structured test to broader pilot only when:

- Smoke passes.
- No safety-copy blockers remain.
- No auth/data deletion blockers remain.
- No hard-stop self-clear exists.
- No generated contact work exists.
- No major confusion remains on Today/Fuel/Train/Plan first action.
- Profile Data/Safety and outside-app support boundaries are understandable to testers.
- Private facilitator notes or outside-app support records can be reviewed without storing secrets or private health details in committed docs.

## Known Beta Gaps To Track

- No production issue triage dashboard yet.
- Launch runtime has no in-app feedback submission, issue reporting, feedback history, beta health panel, or Profile > Audit surface.
- No external analytics yet.
- EAS Android preview build produced APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`.
- App store metadata, icon, splash polish, private tester distribution, and physical-device checks are not prepared yet.
- Automated scenario QA exists, but real boxer findings are still not captured.
- Routed drilldowns remain deferred.
- Barcode scanning, full meal planning, detailed food database, numeric load progression, drag/drop calendar, coach UI, and reviewer-clear UI remain deferred.

## Auditor Inspect First

1. `src/app/components/AppErrorBoundary.tsx`
2. `src/app/components/AppErrorState.tsx`
3. `src/app/supportCopy.ts`
4. `src/app/screens/ProfileScreen.tsx`
5. `src/tests/static/betaSafetyStatic.test.ts`
6. `src/tests/services/supabaseRepositories.test.ts`
7. `src/tests/app/appShell.test.ts`
8. `src/tests/live/liveDbSmoke.test.ts`
9. `docs/21_BETA_RELEASE_OPERATIONS.md`
10. `docs/qa/INCIDENT_TRIAGE_RUNBOOK.md`
