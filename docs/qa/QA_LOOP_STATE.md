# QA Loop State

This file is the persistent QA memory for CornerIQ launch readiness only. Update it after every launch QA audit, AI review, fix pass, and verification pass.

The full-codebase technical and scientific audit is tracked separately through `docs/qa/FULL_CODEBASE_AUDIT_LOOP.md`, `docs/qa/FULL_CODEBASE_AUDIT_FINDINGS_TEMPLATE.md`, and generated packets under `qa-artifacts/audit-loop/`. Launch readiness decisions in this file do not close full-codebase audit findings; the full audit requires no unresolved `P0-P4` findings.

## Summary

| Field | Value |
| --- | --- |
| Current QA phase | needs_fix |
| Last commit tested | The final follow-up QA reports record pre-commit HEAD `dde48e6517bf136a9e137f5353c60da4dbd40feb`; the tested working tree adds the adapter/UUID override/tooling tests/SQL smoke described in Restart Maintenance. This is bounded working-tree evidence, not exact-SHA release certification of a later commit. The first maintenance code commit `8665dd9` also passed a clean post-commit loop. Review branch: `codex/restart-maintenance`, targeting `codex/development`, in draft PR #1. |
| Last QA run result | All eight local gates pass in the final adapter run. 930 tests pass, 2 opt-in live app tests remain skipped; 11/11 browser scenarios pass with 44 paired screenshot/text artifacts. Quality, lint, beta preflight, clean iOS Hermes export, Expo dependency compatibility, 18/18 Doctor checks, and npm 10 clean installation pass. Separate Development policy smoke passes 78 assertions with cleanup verified. Coverage passed in the first maintenance pass; engine/service source is unchanged. Dependency audit still fails. |
| Last QA bundle path | qa-artifacts/corneriq-agent-qa-bundle.zip |
| Last generated release evidence path | qa-artifacts/release-evidence/current-release-evidence.md (generated artifact; not stored in this committed state file) |
| Last AI review brief path | qa-artifacts/reports/agent-ai-review-brief.md |
| Current open blocker count | 0 local browser/development-availability blockers. Development is ACTIVE_HEALTHY with all 28 migrations present, and its final migration dry run is clean. This does not clear future release gates. |
| Current open high count | 1 dependency remediation area remains: 21 high and 5 moderate propagated package findings, zero critical, in both full and production-tree audits. The three unpatched roots are braces, node-forge, and sprintf-js. Image-size and UUID findings are resolved; the audit threshold was not weakened. |
| Current required-medium count | 3 review areas: independent qualitative review, physical iPhone/boxer comprehension, and live account/purchase/release-owner evidence. Dedicated Development smoke credentials are absent; email confirmation is enabled. |
| Next recommended action | Adopt maintained fixes for the three remaining advisory roots or a fully reviewed mitigation. Complete the pending Supabase sign-in handoff for a dedicated Development smoke account, and review one complete workout journey on a real iPhone. Then scope the daily-training usability milestone from the prior product-direction chat. |
| Launch readiness decision | needs_fix |

Allowed readiness decisions: `not_ready`, `blocked`, `needs_fix`, `needs_human_review`, `launch_code_ready`, `external_launch_ready`.

Allowed surface statuses: `not_started`, `automated_pass`, `needs_ai_review`, `needs_fix`, `fixed_needs_verification`, `verified`, `human_review_required`, `blocked`, `deferred`, `accepted_launch_limitation`.

## October 8 Restart Evidence

The observational review is recorded in `docs/qa/RESTART_REVIEW_2026-10-08.md`. Version 0.1.1 is public, released August 11 according to the Canadian App Store listing. The prior chat records build 15 submission on August 10. Production project metadata reports `ACTIVE_HEALTHY`; Development reports `INACTIVE`. A read-only production migration listing includes all 28 local versions, including the previously pending preview-strategy migration and the July regeneration hotfixes. Version-history alignment does not prove current auth, persistence, RLS, migration-content equality, or purchase behavior.

After fetching, development matches `5dbe9fd`, with 34 commits unique to development and one unique to `main` (`2fe8c3a`). Release/source history needs deliberate reconciliation. The public release does not certify a future candidate.

The surface rows below preserve the older July evidence unless explicitly updated. Their historical pass labels are not fresh October verification. Current local evidence is in the summary and `qa-artifacts/reports/agent-gate-results.md`; physical iPhone behavior, fresh live account flows, purchases, and real boxer comprehension remain `human_review_required` until current evidence exists. No production or development mutation, build, submission, or product code change occurred during this restart audit.

## October 8 Maintenance Follow-up

The fix and verification pass is recorded in `docs/qa/RESTART_MAINTENANCE_2026-10-08.md`. Development was restored, the CLI link was corrected from production to Development, and three existing pending migrations were applied to Development only. Current development history aligns with all 28 local versions. Production was not modified. A rolled-back SQL-role smoke passed 74 authenticated checks and four anonymous denial checks across profiles, cycle logs, symptom logs, and water logs. Cross-user reads/writes and ownership transfers were rejected, and a separate cleanup query found zero fixtures. GoTrue signup/email confirmation, Data API behavior, other tables, and full app persistence/concurrency remain unverified in this follow-up.

Compatible dependency fixes removed every critical finding. Expo remains on SDK 54 and the Supabase client remains pinned. Image-size parsing now uses official `2.0.4` behind a narrow filename adapter, and Xcode uses UUID `11.1.1`. A global Metro `0.83.8` attempt broke Expo's watcher and was reverted; the final adapter passes both browser and native export. The Profile harness covers current disclosure sections, exact deletion confirmations, and sign-out. Metro excludes generated coverage and QA folders from its watcher. All 11 browser scenarios pass; deterministic analysis reports zero blockers/highs and three review areas. Forty-four screenshots have paired text snapshots. The agent inspected Today, Train, Fuel, Plan, and player mobile screenshots; this is limited local evidence, not independent review or a physical-device test.

The older surface rows below retain their bounded historical evidence unless explicitly updated. Fresh summary results do not clear email confirmation, native phone behavior, purchases, or real boxer comprehension.

The verified changes are proposed in [draft PR #1](https://github.com/KarlCupid/CornerIQ/pull/1). The remaining dependency blocker is tracked in [issue #2](https://github.com/KarlCupid/CornerIQ/issues/2). Final local reports identify the pre-commit follow-up baseline `dde48e6` plus its working tree; they must not be relabeled as exact-SHA release evidence. Read-only EAS metadata independently verifies version `0.1.1`, build `15`, iOS production/STORE, source `5dbe9fd`, FINISHED on August 10. App Store Connect live-build mapping is still outside this evidence.

## Surface Status

### A. Code and build health

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| npm install | automated_pass | Passed on 2026-10-08; final adapter also passes clean npm 10 installation from the lockfile. Remaining audit findings are tracked separately. |
| typecheck | automated_pass | Passed in QA CI and final `quality` on 2026-10-08. |
| tests | automated_pass | 930 tests passed and 2 opt-in live app tests skipped on 2026-10-08; five tooling integration tests are included. Separate SQL policy smoke passes 78 assertions. |
| lint | automated_pass | Passed on 2026-10-08, including the final Metro configuration. |
| quality | automated_pass | Passed on 2026-10-08. |
| coverage | automated_pass | Passed on 2026-10-08: statements 85.39, functions 89.99, lines 84.97, branches 77.09. Vitest 4 uses different coverage remapping, so historical percentages are not directly comparable. |
| production preflight | automated_pass | Normal and beta preflight pass. Apple paid-build/RevenueCat checks are outside this owner-approved candidate scope and remain deferred rather than represented as completed. |
| GitHub Actions quality | needs_fix | First maintenance code commit `8665dd9` fails Quality at the dependency audit (run `37822606495`); CodeQL passes (run `37822606325`). Final follow-up workflow results require their own SHA-specific evidence. |
| Expo web startup | automated_pass | Covered by `qa:agent:ci`. |
| agent QA CI | automated_pass | Final 2026-10-08 run passes all eight gates: 64 static checks, typecheck, 930 tests (two live app tests skipped), lint, preflight, 11 Playwright journeys, engine-output review/analysis, and bundle generation. Evidence identifies the pre-commit working tree. |
| Expo Doctor | automated_pass | 18/18 checks pass on 2026-10-08 with the final dependency adapter and overrides. |
| dependency audit | needs_fix | Full and production-tree audits fail: zero critical, 21 high, 5 moderate propagated findings from unpatched braces/node-forge/sprintf-js. Image-size and Xcode UUID findings are resolved. No audit bypass was added. |

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
| migrations aligned | fixed_needs_verification | Production is aligned through `20260718092403`; local migration `20260723233725_align_next_week_volume_strategy.sql` is intentionally pending explicit approval. |
| dry run up to date | fixed_needs_verification | `supabase db push --linked --dry-run` reports that only `20260723233725_align_next_week_volume_strategy.sql` would be applied. No production migration was applied. |
| local clean migration apply | human_review_required | Not rerun in the 2026-06-26 local automated hardening pass; current migration set still needs clean local/remote migration evidence before release. |
| local schema lint | automated_pass | `cmd /c npm exec supabase -- db lint --local --level error --fail-on error` passed on 2026-06-19 after local database startup. |
| generated database types | automated_pass | `cmd /c npm exec supabase -- gen types typescript --local` passed on 2026-06-19 and generated types matched `src/services/supabase/database.types.ts`. |
| live smoke passes | fixed_needs_verification | Dedicated-account production authentication succeeded. The smoke then exposed timestamp normalization and preview-constraint compatibility failures. Local fixes and focused tests pass; the production migration and a complete rerun remain required. Guarded cleanup ran. |
| support intake removed from live app | automated_pass | In-app feedback persistence was removed from launch runtime; migration `012` is now applied in production. |
| data export/delete scope works | human_review_required | Full account deletion live smoke passed on 2026-06-18; portable export and app-data-only deletion still need final live data check if the release owner wants those separately evidenced. |
| RLS/user-owned behavior remains safe | human_review_required | October 8 Development SQL-role smoke passes 78 assertions across profiles, cycle logs, symptoms, and water logs, with cross-user operations rejected and rollback cleanup verified. This does not verify GoTrue/Data API behavior or other tables. Current metadata reports all 40 public tables have RLS enabled. Full authenticated app smoke still needs a dedicated account. |
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
| preview build artifact exists | human_review_required | Existing CornerIQ TestFlight builds 2 through 9 show Complete processing and are attached to the internal `Team (Expo)` group. No exact-candidate build has been created for the current fixes. The production EAS profile is the correct TestFlight path; the release owner will handle physical-device acceptance. |
| paid Apple build configuration | deferred | Explicitly excluded from this pass by the release owner; no RevenueCat/App Store Connect purchase configuration was touched. |
| live purchase and restore | deferred | Explicitly excluded from this pass by the release owner because it is attached to live builds. |
| private distribution list controlled | human_review_required | Managed outside git. |
| app icon/splash/store metadata accepted or fixed | human_review_required | Release owner required. |
| private distribution channel confirmed | human_review_required | Release owner required. |
| no secrets in build config | automated_pass | Static/preflight checks required. |
| release docs updated | automated_pass | Docs updated in this pass. |
| release decision updated | automated_pass | This file and checklist updated in this pass. |
