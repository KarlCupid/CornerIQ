# QA Loop State

This file is the persistent QA memory for CornerIQ launch readiness. Update it after every audit, AI review, fix pass, and verification pass.

## Summary

| Field | Value |
| --- | --- |
| Current QA phase | needs_human_review |
| Last commit tested | 2026-06-26 local automated hardening pass based on HEAD `703916c6d514aed251e3750d57163b4e39d48214` (`703916c`). The QA scripts report the HEAD SHA; code, test, browser-audit, and doc changes in this worktree were verified before commit. |
| Last QA run result | 2026-06-26 local / 2026-06-27 UTC automated hardening verification: WorkoutPlayer resume now preserves a persisted mid-step timer instead of resetting to the full step duration; revision-isolated active plan lifecycle coverage now rejects duplicate active plan intents/blocks and prevents new revisions from reusing superseded generated state; cleanup derived-state guardrail tests cover dry-run-first behavior and preservation of completed sessions/exercise results. `cmd /c npm install`, `cmd /c npm run typecheck`, `cmd /c npm test`, `cmd /c npm run lint`, `cmd /c npm run quality`, `cmd /c npm run preflight:production`, `cmd /c npm run preflight:beta`, and `cmd /c npm run qa:agent:ci` passed. Routine agent QA remained local-only. |
| Last QA bundle path | qa-artifacts/corneriq-agent-qa-bundle.zip |
| Last generated release evidence path | qa-artifacts/release-evidence/current-release-evidence.md (generated artifact; not stored in this committed state file) |
| Last AI review brief path | qa-artifacts/reports/agent-ai-review-brief.md |
| Current open blocker count | 0 |
| Current open high count | 0 |
| Current required-medium count | 3 AI/human review limitations remain explicitly tracked |
| Next recommended action | Send `qa-artifacts/corneriq-agent-qa-bundle.zip` for AI qualitative review, then schedule physical iPhone, live Supabase, and release-owner checks. Apple paid-build warnings for paywall/RevenueCat iOS env remain intentionally uncleared in this automated pass. |
| Launch readiness decision | needs_human_review |

Allowed readiness decisions: `not_ready`, `blocked`, `needs_fix`, `needs_human_review`, `launch_code_ready`, `external_launch_ready`.

Allowed surface statuses: `not_started`, `automated_pass`, `needs_ai_review`, `needs_fix`, `fixed_needs_verification`, `verified`, `human_review_required`, `blocked`, `deferred`, `accepted_launch_limitation`.

## Surface Status

### A. Code and build health

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| npm install | automated_pass | `cmd /c npm install` passed on 2026-06-26; npm reported dependencies up to date and 18 existing audit advisories (1 low, 17 moderate). |
| typecheck | automated_pass | `cmd /c npm run typecheck` passed on 2026-06-26 directly, inside `quality`, and inside `qa:agent:ci`. |
| tests | automated_pass | `cmd /c npm test` passed on 2026-06-26 after focused regression runs; 773 tests passed and 1 skipped. Coverage added for WorkoutPlayer resume timer, revision-isolated active lifecycle duplicates, new-revision stale state isolation, and cleanup/preflight guardrails. |
| lint | automated_pass | `cmd /c npm run lint` passed on 2026-06-26 directly and inside `qa:agent:ci`. |
| quality | automated_pass | `cmd /c npm run quality` passed on 2026-06-26; embedded typecheck and tests passed with 773 tests passed and 1 skipped. |
| coverage | automated_pass | `cmd /c npm run test:coverage` passed on 2026-06-19; statements 90.22, functions 90.51, lines 90.22, branches 85.38. |
| production preflight | automated_pass | `cmd /c npm run preflight:production` and `cmd /c npm run preflight:beta` passed on 2026-06-26; revision-isolated lifecycle schema fragments are checked, and Apple paid-build warnings remain for paywall and RevenueCat iOS env values. |
| GitHub Actions quality | human_review_required | Exact Quality run evidence is required for the pushed commit. |
| Expo web startup | automated_pass | Covered by `qa:agent:ci`. |
| agent QA CI | automated_pass | `cmd /c npm run qa:agent:ci` passed on 2026-06-26: static checks (46 tests), typecheck, full unit suite (773 passed, 1 skipped), lint, production preflight, 10 Playwright browser tests, engine-output review, deterministic analysis, contact sheet, AI brief, and bundle generation all passed. |

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
| real Supabase auth human/live check | verified | Explicit opt-in production sign-in plus full account-deletion smoke passed on 2026-06-18. Fresh sign-up/email confirmation and creation of a new review account remain human_review_required. |

### C. Onboarding

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| boxer level definitions | automated_pass | Playwright first-time onboarding. |
| body mass/height units | automated_pass | Playwright first-time onboarding. |
| equipment access | automated_pass | Playwright first-time onboarding. |
| day-of-week availability | automated_pass | Playwright first-time onboarding. |
| fixed boxing sessions with RPE | automated_pass | Playwright first-time onboarding. |
| cycle optional/private copy | automated_pass | Playwright first-time onboarding. |
| wearable optional/manual-first copy | automated_pass | Playwright first-time onboarding. |
| safety restrictions | automated_pass | Playwright first-time onboarding. |
| no medication collection | automated_pass | Playwright first-time onboarding. |
| goal phase clarity | automated_pass | Playwright first-time onboarding. |
| finish setup | automated_pass | Playwright first-time onboarding. |
| onboarding draft persistence | automated_pass | Native draft storage now resolves through AsyncStorage and is cleared after successful completion; memory fallback is limited to test, web, and local E2E paths. |
| no user guessing about internal engine terms | human_review_required | Local text checks pass; real boxer comprehension remains human-only. |

### D. Today

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| first action obvious within 5 seconds | human_review_required | Automation checks the redesigned Today dashboard: readiness, weekly load, fuel status, training decision, manual inputs, and quick actions (`Quick check-in`, `Log food`, `Open workout`). The 2026-06-09 fix makes the primary action a wide cyan button and keeps secondary actions quieter; real boxer comprehension remains human-only. |
| primary action clarity | human_review_required | Automation checks Today dashboard actions and plan rationale without restoring the old mission/detail surfaces; real boxer comprehension remains human-only. |
| primary action routing | automated_pass | Today receives an explicit `ctaAction` enum from the presentation view model; visible labels no longer drive routing behavior. |
| why disclosure | automated_pass | Browser audit requires Today evidence. |
| quick logs visible | automated_pass | Browser audit requires the first Today surface to stay at three quick actions, then opens `Quick check-in` to verify readiness, body weight, hydration, and manual form paths. The 2026-06-08 UI polish constrains the compact quick-check surface as a bottom sheet so old detail UI no longer stacks over the new dashboard. |
| quick logs use 1-5 explanations where relevant | human_review_required | Text evidence is present; real boxer interpretation remains human-only. |
| save success/feedback | automated_pass | Quick-log feedback smoke requires confidence/context messages for body mass, readiness, hydration, food, and training paths, including update states. |
| missing data unknown/not safe | automated_pass | Deterministic scan required. |
| not too dense for first-run user | human_review_required | Today now uses compact dashboard cards, title-case card headers, quieter metric tiles, and a top stat rail instead of nested status tiles. The first mobile viewport still needs human boxer/phone review before clearing this gate. |
| mobile viewport readability | human_review_required | Mobile viewport is automated and the 2026-06-10 screenshots show the bottom nav using below-icon labels, a tighter bar, a smaller active marker, restored tab-specific accents, and calmer inactive tab colour; the local-only E2E banner and dev overlay reduce available space in artifacts. Physical phone review remains required. |

### E. Fuel

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| command visible | automated_pass | Fuel audit. |
| daily macro targets visible | automated_pass | Fuel audit checks the redesigned Fuel dashboard, macro summary, hydration/sodium, meal distribution, body-mass trend, recovery support, and manual `Log meal`/`Add water` paths. The 2026-06-10 rollout applies the Today-style compact card density, title-case headers, and primary-led top action row to Fuel. |
| first safe action clear | automated_pass | Fuel food logging now says "Add meal/snack" and explains one meal/snack or day total entries add up today; real boxer comprehension remains human_review_required. |
| no unsafe weight-cut copy | automated_pass | Deterministic scan plus Fuel audit. |
| no pressure to make weight | human_review_required | Deterministic unsafe-copy scan passes; real boxer safety interpretation remains human-only. |
| manual food logging visible | automated_pass | Fuel audit checks meal/snack/day-total add-up copy. |
| hydration copy safe | automated_pass | Fuel and Today audit check `Add water`/hydration copy after opening the manual log path, without pretending to set a daily total. |
| logger focus reset | automated_pass | Today-to-Fuel `Log food` and `Add water` intents open the logger, and the logger has a visible return-to-overview action so Fuel does not stay stuck in logging mode. |
| missing food logs unknown/lower confidence | automated_pass | Missing-food copy is shortened to "No food log today. Training still stays planned. Log food only if you want more personalized fueling feedback." Missing food affects execution guidance and confidence, not baseline training generation. |
| nutrition review/hard-stop/self-clear copy safe | automated_pass | Safety review copy says users cannot self-clear hard stops; athlete UI is read-only for reviewer decisions, and reviewer clear requires trusted server-side identity and audit. Agent audit passed. |
| body mass copy safe | automated_pass | Fuel audit. |
| no barcode/meal-planning expectation | accepted_launch_limitation | Barcode and meal planning are deferred. |

### F. Train

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Today/Workout screen visible | automated_pass | Train audit checks the new Training Overview dashboard, preview-only future generated workouts, manual boxing log completion, next-7-days context, and completion affordances when the generated workout is available today. The 2026-06-10 rollout applies the Today-style top action row, compact dashboard card defaults, title-case headers, and a quiet fuel/hydration rail instead of nested helper cards. |
| generated workout feels boxing-supportive, not generic | human_review_required | Engine report and screenshots pass deterministic scans, cards show concrete prescription lines, and robotic engine copy is collapsed; real boxer usefulness remains human-only. |
| no generated sparring/contact/fight simulation | automated_pass | Train audit plus deterministic scan. |
| no unsafe intensity escalation | automated_pass | Added safety tests for stale persisted hard sessions, red tournament readiness, under-fueling, and protected hard anchors. |
| fast workout completion path | automated_pass | Train audit checks "Open workout" and "Log result" before optional exercise details. |
| workout-player controls and resume expectation | automated_pass | The full-screen player no longer exposes a dead options button, and Train/player copy states that active follow-along resume is app-session scoped while discard/reload can lose progress. The 2026-06-26 automated hardening pass fixed and regression-tested mid-step resume so persisted `activeStepIndex`, `stepRemainingSeconds`, elapsed time, maps, RPE, notes, and status are restored without resetting the timer to full duration. |
| session RPE flow | automated_pass | Train audit checks protected logging RPE mapping plus generated workout completion RPE 1-10. |
| one exercise row completion | automated_pass | Train audit checks optional row inputs stay behind the secondary exercise-details disclosure. |
| Progress visible | automated_pass | Train audit checks the default Progress section is compact with latest workout/key change only, and dense rows stay behind "Show details". |
| progression copy not overconfident | human_review_required | Automation checks no exact load inference; real boxer interpretation remains human-only. |
| no fake numeric load inference | automated_pass | Train progression audit. |

### G. Plan

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Week visible | automated_pass | Plan audit checks the new Plan dashboard: weekly structure, load balance, energy systems, anchored sessions, block overview, and Plan actions. The 2026-06-10 rollout applies the shared compact dashboard card defaults and title-case quiet headers across the remaining Plan surfaces. |
| Next Week visible | automated_pass | Plan audit checks a concise top card with goal, planned support count, fixed boxing context, and status; dense detail is collapsed. |
| Block History visible | automated_pass | Plan audit and static checks cover Block History while avoiding duplicate-prone user-facing string keys. |
| Adjustments visible | automated_pass | New Plan audit. |
| Fixed boxing schedule understandable | human_review_required | Automation checks fixed boxing schedule labels and visible scheduled sparring example; real boxer interpretation remains human-only. |
| Mark unavailable understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| Request deload understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| Restore plan understandable | human_review_required | Automation checks request framing; real boxer interpretation remains human-only. |
| no coach-only controls exposed | automated_pass | Plan audit and scan. |
| no drag/drop expectation | accepted_launch_limitation | Drag/drop calendar is deferred. |
| adjustment result/rejection copy understandable | human_review_required | Plan audit exercises controls; real boxer interpretation remains human-only. |
| roll-forward/next-week materialization explanation | human_review_required | Next Week audit exercises controls where available; review-required copy avoids hard-stop labeling unless safety is actually blocking. |
| Plan Details density | automated_pass | Plan Details now leads with athlete-facing rationale, then collapses This Week, Plan Changes, and Technical Details; hashes, saved-session diagnostics, repair actions, deltas, and generation diagnostics are hidden behind the technical disclosure. |

### H. Profile

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| athlete section | automated_pass | Profile tab audit checks `profile-top-action-card` plus athlete/privacy context. The 2026-06-10 rollout keeps the top action in the Today-style rhythm and uses a quiet compact status strip for wearable, cycle, and units context. |
| settings section | automated_pass | Profile tab/sign-out audit required. The 2026-06-10 rollout moved Profile settings groups onto the shared compact `DashboardCard` primitive for consistent card density and title treatment. |
| data section | automated_pass | New data controls audit. |
| safety section | automated_pass | Profile Safety audit. |
| outside-app support path | automated_pass | Profile Data/Safety now direct account, export/delete, app access, and app-state issues to the private-release support path outside the app without collecting free-form health details. |
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
| app-level support path | automated_pass | App error states now include the outside-app support path and conservative urgent-symptom guidance without requesting emergency medical information in-app. |
| passive persistence warnings | automated_pass | `usePerformanceState` no longer promotes background engine projection persistence warnings into global App Notes; focused hook regression passed on 2026-06-08. Explicit save/log/action failures still surface through their existing error paths. |
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
| migrations aligned | human_review_required | Remote Supabase alignment was not run in the 2026-06-26 automated hardening pass and must be verified before release. Local tests now cover revision-isolated active lifecycle behavior around duplicate active plan intents, duplicate active blocks for a user/plan revision, date lookup ambiguity, and avoiding superseded generated state when a new revision has no active block. |
| dry run up to date | human_review_required | Rerun remote `db push --dry-run` after applying/confirming the current migration set, including `20260625080657_generated_session_active_slot_reconciliation.sql`, `20260626062900_revision_isolated_plan_lifecycle.sql`, and `20260626120000_outside_engine_workout_support.sql`. |
| local clean migration apply | human_review_required | Not rerun in the 2026-06-26 local automated hardening pass; current migration set still needs clean local/remote migration evidence before release. |
| local schema lint | automated_pass | `cmd /c npm exec supabase -- db lint --local --level error --fail-on error` passed on 2026-06-19 after local database startup. |
| generated database types | automated_pass | `cmd /c npm exec supabase -- gen types typescript --local` passed on 2026-06-19 and generated types matched `src/services/supabase/database.types.ts`. |
| live smoke passes | blocked | `cmd /c npm run smoke:live-db` ran with live env names present after remote migration alignment, but Supabase sign-in failed with `invalid_credentials`; the configured smoke email/password pair must sign in before this gate can pass. |
| support intake removed from live app | automated_pass | In-app feedback persistence was removed from launch runtime; migration `012` is now applied in production. |
| data export/delete scope works | human_review_required | Full account deletion live smoke passed on 2026-06-18; portable export and app-data-only deletion still need final live data check if the release owner wants those separately evidenced. |
| RLS/user-owned behavior remains safe | human_review_required | `cmd /c npm exec supabase -- db lint --linked --level error --fail-on error` passed after remote migration alignment, but cross-user RLS smoke still requires a valid live account path. |
| real auth/email confirmation reviewed | human_review_required | Live auth check only. |

### M. Physical mobile / iPhone

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| physical iPhone not covered by local E2E | human_review_required | Must remain human-only until device checked. |
| touch behavior | human_review_required | Physical device required. |
| keyboard behavior | human_review_required | Physical device required. |
| scrolling | human_review_required | Physical device required. |
| safe area | human_review_required | Physical device required, especially for final bottom-navigation inset and thumb-reach confirmation. |
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
