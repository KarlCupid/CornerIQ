# Private Incident Triage Runbook

This runbook is for release-owner or private reviewer use during structured CornerIQ launch validation. It is not an in-app admin workflow and must not be exposed as athlete self-clearance.

## Severity Definitions

- Critical: urgent health concern, possible unsafe weight-class pressure, exposed secret, data deletion failure, hard-stop bypass, generated contact-work language, or any report that could harm a user if ignored.
- High: launch flow blocks safe use, removed in-app reporting reappears, privacy copy is misleading, or a safety warning is unclear.
- Medium: confusing flow, dense copy, missing context, or local QA mismatch that does not create immediate safety risk.
- Low: polish, wording, ordering, or non-blocking comprehension notes.

## Safety-Concern Handling

1. Stop the validation session if a user reports urgent symptoms, unsafe weight pressure, self-harm language, pregnancy-related concern, eating-disorder risk, fainting, chest pain, severe dizziness, or medical uncertainty.
2. Say plainly that CornerIQ is not emergency support, medical care, dietetic care, or boxing coaching replacement.
3. Redirect the user to qualified support outside the app. Do not attempt diagnosis, clearance, weight-cut advice, or coaching.
4. Record only the minimum private operational facts needed to triage the product issue. Do not copy full medical histories into public issues.

## Critical And High Owner Actions

The release owner must take these actions before continuing the affected beta surface:

| Trigger | Owner action | Release status |
| --- | --- | --- |
| Generated unsafe copy or contact-work language | Stop the affected flow, preserve a private screenshot/text snapshot if it contains no secrets, open a private issue, remove the unsafe output path, and rerun static plus scenario QA. | Blocked until fixed and verified. |
| Hard-stop bypass or self-clear interpretation | Stop the session, record the route privately, verify no client reviewer-clear or self-clear path exists, and add or update a regression test. | Blocked until fixed and verified. |
| Exposed secret or credential-like value | Stop sharing the artifact, rotate the exposed value outside git, redact the artifact/report, and run the committed secret/static scans. | Blocked until rotated, redacted, and verified. |
| Data deletion/export failure | Stop destructive testing for that account, preserve non-secret row counts privately, verify export/delete scope and cleanup order, and rerun service tests. | Blocked until user-owned data behavior is proven. |
| Migration mismatch | Stop release handoff, record migration list/dry-run status without values, reconcile local/remote schema, and rerun persistence tests. | Release-blocking until remote evidence is exact-SHA recorded. |
| Urgent health concern | Stop the validation session, redirect to qualified support outside the app, avoid diagnosis or coaching, and record only product-safety metadata. | Session blocked; product issue severity is Critical if app copy contributed. |

High reports that do not create immediate harm still require a private issue, assigned owner, target fix/review date, and explicit decision before the next validation cohort.

## Privacy Handling

- Treat user text as sensitive by default.
- Never paste secrets, screenshots with private content, medical records, full health histories, or exact credentials into public docs or issues.
- If a report contains a token, credential, or personal contact detail, redact it before any private issue is created.
- Keep cycle context private and do not describe cycle support as fertility tracking.
- Retain user text only as long as needed for the launch triage decision, then remove unnecessary prose from private notes.
- Public docs may record flow, severity, action taken, and blocker status, but not private health details or personal contact details.

## Private Issue Criteria

Create a private issue when:

- The report is Critical or High.
- A local QA gate failed in a way that changes safety, privacy, persistence, or release evidence.
- A user could not understand the first safe action in Today, Fuel, Train, Plan, Profile Data, or Profile Safety.
- A report suggests support, export/delete, or incident data was not sanitized.

Do not create a public issue containing user prose unless the user has explicitly approved the exact text and all private details are removed.

## Stop-Launch Criteria

Pause the affected launch validation session or external rollout when:

- Any hard-stop self-clear path is found.
- Generated support includes contact drills, generated sparring, or fight simulation.
- Unsafe weight-cut instructions appear.
- Service-role or smoke credential values appear in app, docs, reports, screenshots, or terminal output.
- Migration/schema mismatch affects user-owned data, support data, generated sessions, or export/delete scope.

## Status Changes

Normal users cannot mark reports reviewed, resolved, dismissed, or cleared. Any future reviewer workflow requires server-side identity, permission, and audit logs before it can change safety or incident state.
