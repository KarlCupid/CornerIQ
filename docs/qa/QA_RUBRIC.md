# QA Rubric

Use this rubric for agent findings, AI review notes, and human beta session notes. Severity is based on beta-blocking risk, not how hard the fix looks.

## Blocker

A Blocker stops controlled beta until fixed or until a release owner explicitly accepts a non-user-facing limitation.

- App cannot launch.
- Auth prevents all testing.
- Safety-copy blocker.
- Unsafe weight-cut instruction.
- Generated sparring, contact drill, or fight simulation.
- Hard-stop self-clear.
- Secret exposure.
- Service-role exposure.
- Migration or live-smoke blocker.
- Data deletion unsafe.
- Distributed beta claimed without a build artifact.

## High

High findings usually block beta because a core user path is likely to fail or mislead a boxer.

- Core flow unusable.
- User cannot tell what to do first on Today, Fuel, Train, or Plan.
- Onboarding field causes likely wrong engine input.
- Fuel copy feels weight-pressuring.
- Workout completion cannot be completed.
- Profile feedback unavailable.
- Data export/delete unclear.
- Engine output materially unsafe or misleading.

## Medium

Medium findings are confusing but usable. Mark `must fix before beta` when they affect safety, first action clarity, or input quality.

- Confusing but usable.
- Too dense.
- Unclear copy.
- Mobile layout awkward.
- Report needs human interpretation.

## Low

Low findings do not block a controlled beta by themselves.

- Polish.
- Spacing.
- Minor copy.
- Evidence quality issue with no product risk.

## Accept Or Defer

These are accepted limitations unless a release owner changes scope:

- Barcode scanning.
- Full meal planning.
- Coach UI.
- Reviewer-clear UI.
- Detailed food database.
- Numeric load progression.
- Drag/drop calendar.
- External analytics.
- Admin dashboard.
- Routed drilldowns.

Deferred features must not be backfilled during a QA pass unless the user explicitly scopes that work.

## Automation Limits

Automation can pass a surface and still leave it `human_review_required`. Human boxer comprehension cannot be fully automated. Physical device checks cannot be fully automated. Local E2E can prove rendered text and interaction smoke paths, but it cannot prove trust, usefulness, physical phone ergonomics, live auth/email behavior, or distribution readiness.

