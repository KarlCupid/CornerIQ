# QA Loop State

This file is the persistent QA memory for CornerIQ launch readiness. Update it after every audit, AI review, fix pass, and verification pass.

## Summary

| Field | Value |
| --- | --- |
| Current QA phase | needs_human_review |
| Last commit tested | Historical only. Exact current-candidate proof is generated under `qa-artifacts/release-evidence/current-release-evidence.md` and is not stored in this committed state file. |
| Last QA run result | 2026-06-07 fatigue-first launch UX verification pass: `cmd /c npm run qa:agent:ci` passed with 9 browser scenarios, regenerated the QA bundle, and reported 0 blockers, 0 high, and 3 medium human/AI review items. Direct install, typecheck, unit, lint, quality, fixture smoke, coverage, beta/production preflight, and high-severity production audit gates also passed. Live Supabase, physical-device checks, private distribution, and real boxer findings remain unresolved until explicit human or live evidence exists. |
| Last QA bundle path | qa-artifacts/corneriq-agent-qa-bundle.zip |
| Last AI review brief path | qa-artifacts/reports/agent-ai-review-brief.md |
| Current open blocker count | 0 |
| Current open high count | 0 |
| Current required-medium count | 3 human/AI review limitations remain explicitly tracked |
| Next recommended action | Send `qa-artifacts/corneriq-agent-qa-bundle.zip` and `qa-artifacts/reports/agent-ai-review-brief.md` for AI qualitative review, then schedule physical iPhone checks and live Supabase/release-owner verification, including remote migrations `010` through `012`, before declaring external launch readiness. |
| Launch readiness decision | needs_human_review |

Allowed readiness decisions: `not_ready`, `blocked`, `needs_fix`, `needs_human_review`, `launch_code_ready`, `external_launch_ready`.

Allowed surface statuses: `not_started`, `automated_pass`, `needs_ai_review`, `needs_fix`, `fixed_needs_verification`, `verified`, `human_review_required`, `blocked`, `deferred`, `accepted_launch_limitation`.

## Surface Status

### A. Code and build health

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| npm install | automated_pass | `cmd /c npm install` passed; package tree was up to date. |
| typecheck | automated_pass | `cmd /c npm run typecheck` passed directly and again inside `qa:agent:ci` and `quality`. |
| tests | automated_pass | `cmd /c npm test` passed directly and again inside `qa:agent:ci`/`quality`; 511 tests passed and 1 live-smoke test skipped. |
| lint | automated_pass | `cmd /c npm run lint` passed directly and again inside `qa:agent:ci`. |
| quality | automated_pass | `cmd /c npm run quality` passed after the fatigue-first UX edits; 511 tests passed and 1 live-smoke test skipped. |
| production preflight | automated_pass | `cmd /c npm run preflight:production` passed directly and again inside `qa:agent:ci`. |
| GitHub Actions quality | human_review_required | Remote workflow status cannot be completed by local E2E alone. |
| Expo web startup | automated_pass | Covered by `qa:agent:ci`. |
| agent QA CI | automated_pass | `cmd /c npm run qa:agent:ci` passed on 2026-06-07; 9 browser tests passed and the bundle was regenerated under `qa-artifacts/`. |

### B. Auth and account

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| sign-in copy | automated_pass | Local E2E auth screenshot and page text. |
| sign-up copy | automated_pass | Local E2E auth copy; live account behavior is separate. |
| email confirmation limitation | human_review_required | Requires live Supabase/email review. |
| session persistence | human_review_required | Requires live Supabase/browser session review. |
| sign-out | automated_pass | Profile Settings local sign-out smoke required. |
| signed-out recovery | automated_pass | Auth tests cover signed-out password reset request, success/failure messaging, signed-in state, and missing Supabase config copy. |
| error behavior | automated_pass | Error boundary static coverage required. |
| real Supabase auth human/live check | human_review_required | Explicit opt-in only. |

### C. Onboarding

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| boxer level definitions | automated_pass | Playwright first-time onboarding. |
| body mass/height units | automated_pass | Playwright first-time onboarding. |
| equipment access | automated_pass | Playwright first-time onboarding. |
| day-of-week availability | automated_pass | Playwright first-time onboarding. |
| protected anchors with RPE | automated_pass | Playwright first-time onboarding. |
| cycle optional/private copy | automated_pass | Playwright first-time onboarding. |
| wearable optional/manual-first copy | automated_pass | Playwright first-time onboarding. |
| safety restrictions | automated_pass | Playwright first-time onboarding. |
| no medication collection | automated_pass | Playwright first-time onboarding. |
| goal phase clarity | automated_pass | Playwright first-time onboarding. |
| finish setup | automated_pass | Playwright first-time onboarding. |
| no user guessing about internal engine terms | human_review_required | Local text checks pass; real boxer comprehension remains human-only. |

### D. Today

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| first action obvious within 5 seconds | human_review_required | Automation checks the fatigue-first Today surface: mission, "Do this now", compact readiness/body-mass/water actions, 60-second check-in, and workout routing before optional detail. Real boxer comprehension remains human-only. |
| primary action clarity | human_review_required | Automation checks Today daily log actions and training call are visible before optional/history detail; real boxer comprehension remains human-only. |
| why disclosure | automated_pass | Browser audit requires Today evidence. |
| quick logs visible | automated_pass | Browser audit requires readiness, body mass, and water quick actions on the first Today surface, then opens the 60-second check-in to verify the manual form path. |
| quick logs use 1-5 explanations where relevant | human_review_required | Text evidence is present; real boxer interpretation remains human-only. |
| save success/feedback | automated_pass | Quick-log feedback smoke requires confidence/context messages for body mass, readiness, hydration, food, and training paths, including update states. |
| missing data unknown/not safe | automated_pass | Deterministic scan required. |
| not too dense for first-run user | human_review_required | Today now collapses logged readiness/body-mass inputs by default and keeps optional engine detail collapsed, but real boxer/phone review is still required. |
| mobile viewport readability | human_review_required | Mobile viewport is automated; physical phone remains required. |

### E. Fuel

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| command visible | automated_pass | Fuel audit. |
| daily macro targets visible | automated_pass | Fuel audit checks the first-view target summary, then opens "Show Targets" to verify calories, protein, carbs, fat, demand tier, target status, and missing/weak input copy where available. |
| first safe action clear | automated_pass | Fuel food logging now says "Add meal/snack" and explains one meal/snack or day total entries add up in today's context; real boxer comprehension remains human_review_required. |
| no unsafe weight-cut copy | automated_pass | Deterministic scan plus Fuel audit. |
| no pressure to make weight | human_review_required | Deterministic unsafe-copy scan passes; real boxer safety interpretation remains human-only. |
| manual food logging visible | automated_pass | Fuel audit checks meal/snack/day-total add-up copy. |
| hydration copy safe | automated_pass | Fuel and Today audit check the Water quick action plus add-hydration/add-to-today copy after opening the manual log path, without pretending to set a daily total. |
| missing food logs unknown/lower confidence | automated_pass | Missing-food copy is shortened to "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback." Missing food affects execution guidance and confidence, not baseline training generation. |
| nutrition review/hard-stop/self-clear copy safe | automated_pass | Safety review copy says users cannot self-clear hard stops; athlete UI is read-only for reviewer decisions, and reviewer clear requires trusted server-side identity and audit. Agent audit passed. |
| body mass copy safe | automated_pass | Fuel audit. |
| no barcode/meal-planning expectation | accepted_launch_limitation | Barcode and meal planning are deferred. |

### F. Train

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Today/Workout screen visible | automated_pass | Train audit checks one main workout command card, practical Workout detail, completion affordances, and collapsed secondary manual logging/detail. |
| generated workout feels boxing-supportive, not generic | human_review_required | Engine report and screenshots pass deterministic scans, cards show concrete prescription lines, and robotic engine copy is collapsed; real boxer usefulness remains human-only. |
| no generated sparring/contact/fight simulation | automated_pass | Train audit plus deterministic scan. |
| no unsafe intensity escalation | automated_pass | Added safety tests for stale persisted hard sessions, red tournament readiness, under-fueling, and protected hard anchors. |
| fast workout completion path | automated_pass | Train audit checks "Open workout" and "Log result" before optional exercise details. |
| session RPE flow | automated_pass | Train audit checks protected logging RPE mapping plus generated workout completion RPE 1-10. |
| one exercise row completion | automated_pass | Train audit checks optional row inputs stay behind the secondary exercise-details disclosure. |
| Exercise History visible | automated_pass | Train audit checks the default is compact with latest workout/key change only, and dense rows stay behind "Show details". |
| progression copy not overconfident | human_review_required | Automation checks no exact load inference; real boxer interpretation remains human-only. |
| no fake numeric load inference | automated_pass | Train progression audit. |

### G. Plan

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Week visible | automated_pass | Plan audit checks the Week top card plus protected boxing work, generated support, and rest/recovery separated clearly. |
| Next Week visible | automated_pass | Plan audit checks a concise top card with goal, planned support count, protected anchors considered, and status; dense detail is collapsed. |
| Block History visible | automated_pass | Plan audit and static checks cover Block History while avoiding duplicate-prone user-facing string keys. |
| Adjustments visible | automated_pass | New Plan audit. |
| Protect this day understandable | human_review_required | Automation checks protected work labels and visible preset sparring anchor; real boxer interpretation remains human-only. |
| Mark unavailable understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| Request deload understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| Restore engine plan understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| no coach-only controls exposed | automated_pass | Plan audit and scan. |
| no drag/drop expectation | accepted_launch_limitation | Drag/drop calendar is deferred. |
| adjustment result/rejection copy understandable | human_review_required | Plan audit exercises controls; real boxer interpretation remains human-only. |
| roll-forward/next-week materialization explanation | human_review_required | Next Week audit exercises controls where available; review-required copy avoids hard-stop labeling unless safety is actually blocking. |

### H. Profile

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| athlete section | automated_pass | Profile tab audit checks `profile-top-action-card` plus athlete/privacy context. |
| settings section | automated_pass | Profile tab/sign-out audit required. |
| data section | automated_pass | New data controls audit. |
| safety section | automated_pass | Profile Safety audit. |
| sign out | automated_pass | Profile Settings smoke required. |
| launch notice removed | automated_pass | Profile Safety audit verifies removed runtime notice/panel text does not appear. |
| runtime-readiness panel removed | automated_pass | Profile Safety audit verifies removed runtime-readiness panel text does not appear. |
| in-app feedback removed | automated_pass | Profile Safety audit verifies in-app feedback/reporting surfaces do not appear. |
| feedback history removed | automated_pass | Profile Safety audit verifies in-app feedback history does not appear. |
| data export preview | automated_pass | Data controls audit covers export preview and generated portable JSON export affordance; portable bundle generation is service-tested. |
| DELETE-gated deletion copy | automated_pass | New data controls audit. |
| no accidental destructive action | automated_pass | Delete button disabled until preview plus DELETE. |
| no secret values | automated_pass | Deterministic scan. |

### I. Error and recovery

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| app error boundary | automated_pass | Static docs/tests and source inspection. |
| signed-in sanitized issue report | automated_pass | Static docs/tests and source inspection. |
| signed-out retry only | automated_pass | Static docs/tests and source inspection. |
| no raw stack traces to user | automated_pass | Static docs/tests and source inspection. |
| no emergency/medical review framing | automated_pass | Text and source scans. |

### J. Engine output quality

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Today view model output quality | human_review_required | Engine-output report generated and deterministic scans pass; real boxer interpretation remains human-only. |
| Fuel command output quality | human_review_required | Engine-output report generated and deterministic scans pass; real boxer interpretation remains human-only. |
| Train workout output quality | human_review_required | Engine-output report generated and deterministic scans pass; real boxer usefulness remains human-only. |
| Plan recommendation output quality | human_review_required | Engine-output report generated and deterministic scans pass; real boxer interpretation remains human-only. |
| local launch persona coverage | automated_pass | Engine-output report required; object serialization leaks fail deterministic analysis. |
| under-fueling risk case | automated_pass | Engine-output report required. |
| red readiness case | automated_pass | Engine-output report required. |
| same-day weigh-in case | automated_pass | Engine-output report required. |
| tournament daily weigh-in case | automated_pass | Engine-output report required. |
| pro day-before weigh-in case | automated_pass | Engine-output report required. |
| cycle high symptoms case | automated_pass | Engine-output report required. |
| manual-only no wearable case | automated_pass | Engine-output report required. |
| no-equipment boxer case | automated_pass | Engine-output report required. |
| amateur open with protected sparring case | automated_pass | Engine-output report required. |
| no unsafe generated support | automated_pass | Engine-output report scan. |
| no missing data treated as safe | automated_pass | Engine-output report scan. |
| no hard-stop self-clear | automated_pass | Engine-output report scan. |

### K. Privacy and safety

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| no service role in client | automated_pass | Static tests and scans. |
| no env values displayed | automated_pass | Static tests and page text scans. |
| no tokens in screenshots/reports/page text | automated_pass | Deterministic scan. |
| no medical history request beyond engine-relevant restrictions | automated_pass | Onboarding audit. |
| no in-app free-form support intake | automated_pass | Profile Safety audit verifies removed support/feedback fields do not appear. |
| no emergency details requested | automated_pass | Profile Safety audit. |
| cycle privacy respected | human_review_required | Automation checks copy and engine consent boundary; real user trust review remains human-only. |
| wearable optional | automated_pass | Onboarding/Profile checks. |
| support data ownership | deferred | In-app support intake is removed from launch runtime; any future support workflow needs Supabase/RLS review. |

### L. Supabase/live data

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| migrations aligned | human_review_required | Local migration `012_remove_beta_feedback_launch.sql` was added; remote migrations `010` through `012` still require release-owner/live Supabase verification. |
| dry run up to date | human_review_required | Release-owner check, opt-in only. |
| live smoke passes | human_review_required | Explicit live smoke only. |
| support intake removed from live app | automated_pass | In-app feedback persistence was removed from launch runtime; live data check should verify the old table is absent after migration `012`. |
| data export/delete scope works | human_review_required | Live data check only. |
| RLS/user-owned behavior remains safe | human_review_required | Live data check only. |
| real auth/email confirmation reviewed | human_review_required | Live auth check only. |

### M. Physical mobile / iPhone

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| physical iPhone not covered by local E2E | human_review_required | Must remain human-only until device checked. |
| touch behavior | human_review_required | Physical device required. |
| keyboard behavior | human_review_required | Physical device required. |
| scrolling | human_review_required | Physical device required. |
| safe area | human_review_required | Physical device required. |
| layout density | human_review_required | Physical device and human review required. |
| Expo Go/EAS limitation documented | human_review_required | Release-owner confirmation required. |
| human_review_required until physically checked | human_review_required | Do not mark complete from Playwright. |

### N. Distribution/release

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| EAS project initialized | automated_pass | `app.json` links EAS project `906eba92-1dee-41d8-b27f-0c04f4fc6f1a`; `npx eas-cli project:info --non-interactive` verified `@karlcupid/corneriq` on 2026-06-03. |
| preview build artifact exists | automated_pass | Android preview build `d550e9bb-b705-41a3-bae7-76c2b6d38453` failed in Gradle/Hermes from a floating Supabase dynamic import. The dependency/config fix is applied locally and fresh build `c21c5692-011e-4c85-949f-355d0e1f753f` finished on 2026-06-03 with APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`. |
| private distribution list controlled | human_review_required | Managed outside git. |
| app icon/splash/store metadata accepted or fixed | human_review_required | Release owner required. |
| private distribution channel confirmed | human_review_required | Release owner required. |
| no secrets in build config | automated_pass | Static/preflight checks required. |
| release docs updated | automated_pass | Docs updated in this pass. |
| release decision updated | automated_pass | This file and checklist updated in this pass. |
