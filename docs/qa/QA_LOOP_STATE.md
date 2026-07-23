# QA Loop State

This file is the persistent QA memory for CornerIQ launch readiness only. Update it after every launch QA audit, AI review, fix pass, and verification pass.

The full-codebase technical and scientific audit is tracked separately through `docs/qa/FULL_CODEBASE_AUDIT_LOOP.md`, `docs/qa/FULL_CODEBASE_AUDIT_FINDINGS_TEMPLATE.md`, and generated packets under `qa-artifacts/audit-loop/`. Launch readiness decisions in this file do not close full-codebase audit findings; the full audit requires no unresolved `P0-P4` findings.

## Summary

| Field | Value |
| --- | --- |
| Current QA phase | needs_human_review |
| Last commit tested | 2026-07-23 release candidate `94b8682f55c0491997aef52321047631a05071fa` (`94b8682`) on `codex/development`. |
| Last QA run result | Exact-SHA local evidence passes typecheck, lint, quality, beta preflight, Expo Doctor, 915 tests with one opt-in live DB test skipped, coverage, and the complete 11-journey agent QA bundle. Exact-SHA GitHub Quality and CodeQL both pass. Plan/Profile fixes are verified. EAS iOS internal distribution is blocked before upload by missing suitable ad-hoc credentials and an expired Apple session; physical-device acceptance and credentialed live Supabase auth/persistence remain open. |
| Last QA bundle path | qa-artifacts/corneriq-agent-qa-bundle.zip |
| Last generated release evidence path | qa-artifacts/release-evidence/current-release-evidence.md (generated artifact; not stored in this committed state file) |
| Last AI review brief path | qa-artifacts/reports/agent-ai-review-brief.md |
| Current open blocker count | 2 external: Apple/EAS signing credentials for an installable iOS preview, and a populated dedicated Supabase smoke account. RevenueCat/App Store purchase configuration is explicitly deferred by the release owner. |
| Current open high count | 2 external-evidence items: live auth/persistence smoke needs a populated dedicated Supabase smoke account, and physical-iPhone acceptance requires a real device. |
| Current required-medium count | 0. Exact-candidate GitHub Actions passes; remaining moderate Expo build-tool notices are accepted for a controlled framework upgrade. |
| Next recommended action | Release owner will handle Apple/EAS signing, device registration, the iOS candidate, and physical-iPhone acceptance manually. Populate a dedicated Supabase smoke account to complete live auth/persistence/runtime-RLS checks. |
| Launch readiness decision | needs_human_review |

Allowed readiness decisions: `not_ready`, `blocked`, `needs_fix`, `needs_human_review`, `launch_code_ready`, `external_launch_ready`.

Allowed surface statuses: `not_started`, `automated_pass`, `needs_ai_review`, `needs_fix`, `fixed_needs_verification`, `verified`, `human_review_required`, `blocked`, `deferred`, `accepted_launch_limitation`.

## Surface Status

### A. Code and build health

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| npm install | automated_pass | `cmd /c npm install` passed on 2026-07-23; npm reported 1 low development notice and 10 moderate production-tree notices. |
| typecheck | automated_pass | Passed directly, inside `quality`, and inside `qa:agent:ci` on 2026-07-23. |
| tests | automated_pass | 915 tests passed and one opt-in live DB smoke test was skipped on 2026-07-23. |
| lint | automated_pass | Passed inside `qa:agent:ci` on 2026-07-23. |
| quality | automated_pass | Passed on 2026-07-23. |
| coverage | automated_pass | Passed on 2026-07-23: statements 87.79, functions 89.70, lines 87.79, branches 83.49. |
| production preflight | automated_pass | Normal and beta preflight pass. Apple paid-build/RevenueCat checks are outside this owner-approved candidate scope and remain deferred rather than represented as completed. |
| GitHub Actions quality | verified | Exact candidate `94b8682f55c0491997aef52321047631a05071fa` passed push-triggered Quality run `30052197047` and CodeQL run `30052197035` on 2026-07-23. |
| Expo web startup | automated_pass | Covered by `qa:agent:ci`. |
| agent QA CI | verified | The final corrected bundle passes static checks, typecheck, 915 tests (1 opt-in live smoke skipped), lint, production preflight, 11 Playwright journeys, engine-output review, deterministic analysis, and bundle generation. The browser audit covers eight mobile Plan-wizard states. |
| Expo Doctor | verified | 18/18 checks pass after declaring `expo-asset` directly and adding its Expo config plugin. |
| dependency audit | accepted_launch_limitation | The high PostCSS advisory is fixed by resolving `postcss@8.5.12`; `npm audit --audit-level=high --omit=dev` exits 0. Ten moderate notices remain in Expo's build-time `xcode@3.0.1 -> uuid@7.0.3` chain; forcing npm's suggested breaking Expo change is deferred to a controlled SDK upgrade. |

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
| no user guessing about internal engine terms | human_review_required | 2026-06-30 fix pass changed onboarding/Plan/Today/Train presentation copy from generic scheduled/protected sparring labels to coach/team sparring already set outside CornerIQ, while preserving deterministic engine constraints. Automation passes; real boxer comprehension remains human-only. |

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
| mobile viewport readability | human_review_required | Mobile viewport is automated and the 2026-06-10 screenshots show the bottom nav using below-icon labels, a tighter bar, a smaller active marker, restored tab-specific accents, and calmer inactive tab colour; the local-only E2E banner and dev overlay reduce available space in artifacts. The 2026-06-30 fix pass sanitizes private-use icon glyphs from page-text snapshots and hides key decorative icons from accessibility; physical phone and native assistive-technology review remain required. |

### E. Fuel

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| command visible | automated_pass | Fuel audit. |
| daily macro targets visible | automated_pass | Fuel audit checks the redesigned Fuel dashboard, macro summary, hydration/sodium, meal distribution, body-mass trend, recovery support, and manual `Log meal`/`Add water` paths. The 2026-06-10 rollout applies the Today-style compact card density, title-case headers, and primary-led top action row to Fuel. |
| first safe action clear | automated_pass | Fuel food logging now says "Add meal/snack" and explains one meal/snack or day total entries add up today; real boxer comprehension remains human_review_required. |
| no unsafe weight-cut copy | automated_pass | Deterministic scan plus Fuel audit. |
| no pressure to make weight | human_review_required | Deterministic unsafe-copy scan passes; 2026-06-30 fix pass changed Fuel `Do not miss` to `Training fuel priorities` with context copy so exact fuel amounts read as guidance when food/hydration context is known. Real boxer safety interpretation remains human-only. |
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
| Today/Workout screen visible | automated_pass | Train audit checks the new Training Overview dashboard, preview-only future generated workouts, manual boxing log completion, next-7-days context, and completion affordances when the generated workout is available today. The 2026-06-30 fix pass renamed overdue work to `Past workout to resolve`, added explicit planned-day/move-today/unknown copy, and changed future previews to `Future preview` with planned-date guidance. |
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
| workout-player native status bar | fixed_needs_verification | `AppTabs` now switches the Expo status bar to light icons while the full-screen player is visible, with a component regression test. Physical iPhone verification remains required. |

### G. Plan

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Week visible | automated_pass | Plan audit checks the new Plan dashboard: weekly structure, load balance, energy systems, anchored sessions, block overview, and Plan actions. The 2026-06-10 rollout applies the shared compact dashboard card defaults and title-case quiet headers across the remaining Plan surfaces. |
| Next Week visible | automated_pass | Plan audit checks a concise top card with goal, planned support count, fixed boxing context, and status; dense detail is collapsed. |
| Block History visible | automated_pass | Plan audit and static checks cover Block History while avoiding duplicate-prone user-facing string keys. |
| Adjustments visible | automated_pass | New Plan audit. |
| generation wizard branch coverage | automated_pass | 2026-07-23 Playwright audit covers confirmation, goal, schedule, Build details/review, Fight Camp type, single-fight details, and tournament details at `390x844`. |
| generation wizard confirmation isolation | verified | The modal, scroll container, and confirmation canvas now use opaque surfaces; focused Playwright CSS assertions and the mobile screenshot show no underlying Plan content bleeding through. |
| balanced build review semantics | verified | Balanced no longer renders `Specific target` and no longer persists the hidden `subFocus`; component and Playwright regressions cover both behaviors. |
| Fixed boxing schedule understandable | human_review_required | Automation checks fixed boxing schedule labels and visible coach/team sparring example. The 2026-06-30 fix pass changed scheduled/generic sparring labels to coach/team sparring already set outside CornerIQ and clarified that CornerIQ only places non-contact support around fixed outside-app boxing. Real boxer interpretation remains human-only. |
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
| equipment label formatting | verified | Legacy camel-case and comma-packed values normalize through the engine boundary; Profile now renders `Jump Rope, Bands`. Engine tests and focused page-text QA pass. |

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
| Fuel command output quality | human_review_required | Engine-output report generated and deterministic scans pass. The 2026-06-30 fix pass softened visible Fuel priority copy and formatted confidence evidence as reviewer-readable prose instead of raw JSON or bare labels; real boxer interpretation remains human-only. |
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
| amateur open with coach/team sparring case | automated_pass | Engine-output report required. |
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
| migrations aligned | verified | `supabase migration list --linked` shows local and remote aligned through `20260718092403`. No migrations were applied during this verification pass. |
| dry run up to date | verified | `supabase db push --linked --dry-run` reports `Remote database is up to date` when the stale local DB-password override is omitted in favor of the authenticated CLI link. |
| local clean migration apply | human_review_required | Not rerun in the 2026-06-26 local automated hardening pass; current migration set still needs clean local/remote migration evidence before release. |
| local schema lint | automated_pass | `cmd /c npm exec supabase -- db lint --local --level error --fail-on error` passed on 2026-06-19 after local database startup. |
| generated database types | automated_pass | `cmd /c npm exec supabase -- gen types typescript --local` passed on 2026-06-19 and generated types matched `src/services/supabase/database.types.ts`. |
| live smoke passes | blocked | The opt-in live test was invoked, but stopped before auth or any write because `CORNERIQ_SMOKE_EMAIL` is blank/missing. A dedicated valid smoke account is required; no credentials were invented and no live rows were changed. |
| support intake removed from live app | automated_pass | In-app feedback persistence was removed from launch runtime; migration `012` is now applied in production. |
| data export/delete scope works | human_review_required | Full account deletion live smoke passed on 2026-06-18; portable export and app-data-only deletion still need final live data check if the release owner wants those separately evidenced. |
| RLS/user-owned behavior remains safe | fixed_needs_verification | Linked schema lint passes. Read-only metadata checks find no public tables with RLS disabled, no exposed RLS tables without policies, no public `SECURITY DEFINER` functions, and no user-owned policies lacking `auth.uid()`. Runtime cross-user RLS still needs the dedicated smoke account. |
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
| preview build artifact exists | human_review_required | Exact candidate `94b8682` reached the EAS preview credential check, but no artifact was uploaded because no suitable internal-distribution credentials or registered iPhone exist. The saved Apple session is expired; the run was stopped without collecting or exposing credentials. The release owner will handle the iOS candidate and device pass manually. |
| paid Apple build configuration | deferred | Explicitly excluded from this pass by the release owner; no RevenueCat/App Store Connect purchase configuration was touched. |
| live purchase and restore | deferred | Explicitly excluded from this pass by the release owner because it is attached to live builds. |
| private distribution list controlled | human_review_required | Managed outside git. |
| app icon/splash/store metadata accepted or fixed | human_review_required | Release owner required. |
| private distribution channel confirmed | human_review_required | Release owner required. |
| no secrets in build config | automated_pass | Static/preflight checks required. |
| release docs updated | automated_pass | Docs updated in this pass. |
| release decision updated | automated_pass | This file and checklist updated in this pass. |
