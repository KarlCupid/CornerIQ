# CornerIQ Beta QA Loop

CornerIQ beta readiness is a loop, not a screenshot bundle. The goal is to keep collecting evidence, reviewing it, fixing scoped blockers, verifying fixes, and updating durable state until every beta-blocking area is either covered or explicitly marked human-only.

## Loop Shape

1. Retrieve: read `docs/qa/QA_LOOP_STATE.md`, the latest audit report, latest analysis, known gaps, beta checklist, and current git state.
2. Audit/Evidence: run local-only automated checks, capture screenshots, page text, Playwright output, engine-output reports, and deterministic scans.
3. AI Review: package the evidence for a separate qualitative reviewer. Automation can flag missing coverage, but it cannot fully judge boxer comprehension, trust, or nuanced safety language.
4. Fix: make targeted fixes only for reviewed beta blockers or harness blockers. Do not add broad product features during a QA pass.
5. Verify: rerun the same failing check plus the normal gates listed in `AGENTS.md`.
6. Distill: update `QA_LOOP_STATE.md`, docs, known gaps, and the next recommended action.
7. Repeat: start the next iteration only if a blocker, high, or required medium remains.

## Agent Usage

Agents should start each pass by running:

```powershell
cmd /c npm run qa:loop:state
```

Then run the requested loop depth. The normal local loop is:

```powershell
cmd /c npm run qa:agent:ci
```

That command runs the browser audit, report generation, deterministic analysis, contact sheet generation, engine-output review, and evidence bundle creation. It must stay local E2E only and must not require real Supabase credentials.

## Max Iterations

Use at most two fix iterations per Codex pass unless the user explicitly asks for more:

- Iteration 1: repair harness failures or obvious beta blockers found by automation.
- Iteration 2: verify the fix and address one additional tightly scoped blocker if it is clearly related.

After two iterations, distill the remaining findings into `QA_LOOP_STATE.md` and stop with a clear next action. This avoids infinite loops and keeps beta release decisions reviewable.

## Avoiding Infinite Loops

- Keep audit passes observational unless the harness itself cannot run.
- Do not expand scope into Fuel, Train, Plan, coach, reviewer, EAS, or iPhone product work unless the finding is already accepted for the current fix pass.
- Treat repeated qualitative uncertainty as `needs_ai_review` or `human_review_required`, not as a reason to keep editing copy forever.
- If local automation passes but human-only evidence is missing, stop at `needs_human_review`.
- If a live or device requirement is missing, do not substitute local Playwright evidence.

## Beta-Ready Meaning

`controlled_beta_ready` means:

- All automatable beta-readiness gates pass.
- No Blocker findings remain.
- No High findings remain.
- No Medium finding marked `must fix before beta` remains.
- Human-only gates are explicitly listed as `human_review_required`, `accepted_beta_limitation`, or complete with real evidence.
- Safety rules still hold: missing data is unknown, no unsafe weight-cut copy, no generated sparring/contact, no hard-stop self-clear, no coach UI, no reviewer-clear UI, no secret values displayed, and no service-role key in Expo/client code.

`distributed_beta_ready` additionally requires release-owner evidence for the distribution path, preview build artifact, app metadata, tester list control, and build-config secret safety.

## What Cannot Be Automated

Local E2E automation cannot certify:

- Real Supabase auth, session persistence, email confirmation, or RLS behavior.
- Live data smoke behavior against a real project.
- Physical iPhone touch, keyboard, scrolling, safe-area, notification, and Expo/EAS behavior.
- Human boxer comprehension, trust, perceived pressure, or usefulness under real training-day context.
- Release-owner distribution readiness.

These areas must remain `human_review_required` until real evidence is attached.

## Human Review Fit

Human review is a first-class output of the loop. When automation reaches its boundary, the next action should name the exact human session needed, such as `physical iPhone review`, `live Supabase/release-owner check`, `AI qualitative review`, or `human beta session`.

