# Private Incident Triage Runbook

This runbook is for release-owner or private reviewer use during structured CornerIQ beta testing. It is not an in-app admin workflow and must not be exposed as athlete self-clearance.

## Severity Definitions

- Critical: urgent health concern, possible unsafe weight-class pressure, exposed secret, data deletion failure, hard-stop bypass, generated contact-work language, or any report that could harm a tester if ignored.
- High: beta flow blocks safe use, feedback reports fail for signed-in users, privacy copy is misleading, or a safety warning is unclear.
- Medium: confusing flow, dense copy, missing context, or local QA mismatch that does not create immediate safety risk.
- Low: polish, wording, ordering, or non-blocking comprehension notes.

## Safety-Concern Handling

1. Stop the beta session if a tester reports urgent symptoms, unsafe weight pressure, self-harm language, pregnancy-related concern, eating-disorder risk, fainting, chest pain, severe dizziness, or medical uncertainty.
2. Say plainly that CornerIQ is not emergency support, medical care, dietetic care, or boxing coaching replacement.
3. Redirect the tester to qualified support outside the app. Do not attempt diagnosis, clearance, weight-cut advice, or coaching.
4. Record only the minimum private operational facts needed to triage the product issue. Do not copy full medical histories into public issues.

## Privacy Handling

- Treat tester text as sensitive by default.
- Never paste secrets, screenshots with private content, medical records, full health histories, or exact credentials into public docs or issues.
- If a report contains a token, credential, or personal contact detail, redact it before any private issue is created.
- Keep cycle context private and do not describe cycle support as fertility tracking.

## Private Issue Criteria

Create a private issue when:

- The report is Critical or High.
- A local QA gate failed in a way that changes safety, privacy, persistence, or release evidence.
- A tester could not understand the first safe action in Today, Fuel, Train, Plan, Profile Data, or Profile Audit.
- A report suggests feedback, export/delete, or incident data was not sanitized.

Do not create a public issue containing tester prose unless the tester has explicitly approved the exact text and all private details are removed.

## Stop-Beta Criteria

Pause the affected beta session or cohort when:

- Any hard-stop self-clear path is found.
- Generated support includes contact drills, generated sparring, or fight simulation.
- Unsafe weight-cut instructions appear.
- Service-role or smoke credential values appear in app, docs, reports, screenshots, or terminal output.
- Migration/schema mismatch affects user-owned data, feedback reports, generated sessions, or export/delete scope.

## Status Changes

Normal users cannot mark reports reviewed, resolved, dismissed, or cleared. Any future reviewer workflow requires server-side identity, permission, and audit logs before it can change safety or incident state.
