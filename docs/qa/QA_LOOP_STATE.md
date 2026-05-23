# QA Loop State

This file is the persistent QA memory for CornerIQ beta readiness. Update it after every audit, AI review, fix pass, and verification pass.

## Summary

| Field | Value |
| --- | --- |
| Current QA phase | needs_ai_review |
| Last commit tested | 25540a6 plus working tree changes from this pass |
| Last QA run result | automated_status pass; 9/9 Playwright scenarios passed; deterministic safety and secret scans passed |
| Last QA bundle path | qa-artifacts/corneriq-agent-qa-bundle.zip |
| Last AI review brief path | qa-artifacts/reports/agent-ai-review-brief.md |
| Current open blocker count | 0 |
| Current open high count | 0 |
| Current required-medium count | 0 automatable; analysis still records 3 human/AI review limitations |
| Next recommended action | Send the bundle for AI qualitative review, then schedule physical iPhone and live Supabase/release-owner checks |
| Beta readiness decision | needs_human_review |

Allowed readiness decisions: `not_ready`, `blocked`, `needs_fix`, `needs_human_review`, `controlled_beta_ready`, `distributed_beta_ready`.

Allowed surface statuses: `not_started`, `automated_pass`, `needs_ai_review`, `needs_fix`, `fixed_needs_verification`, `verified`, `human_review_required`, `blocked`, `deferred`, `accepted_beta_limitation`.

## Surface Status

### A. Code and build health

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| npm install | automated_pass | Required before handoff. |
| typecheck | automated_pass | Required before handoff. |
| tests | automated_pass | Required before handoff. |
| lint | automated_pass | Required before handoff. |
| quality | automated_pass | Required before handoff. |
| beta preflight | automated_pass | Required before handoff. |
| GitHub Actions quality | human_review_required | Remote workflow status cannot be completed by local E2E alone. |
| Expo web startup | automated_pass | Covered by `qa:agent:ci`. |
| agent QA CI | automated_pass | Covered by `qa:agent:ci`. |

### B. Auth and account

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| sign-in copy | automated_pass | Local E2E auth screenshot and page text. |
| sign-up copy | automated_pass | Local E2E auth copy; live account behavior is separate. |
| email confirmation limitation | human_review_required | Requires live Supabase/email review. |
| session persistence | human_review_required | Requires live Supabase/browser session review. |
| sign-out | automated_pass | Profile Settings local sign-out smoke required. |
| signed-out recovery | automated_pass | Auth and error/recovery docs/tests required. |
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
| no user guessing about internal engine terms | needs_ai_review | Local text checks help; human/AI comprehension review still needed. |

### D. Today

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| first action obvious within 5 seconds | needs_ai_review | Automation checks Start here; qualitative review still needed. |
| primary action clarity | needs_ai_review | Automation checks visible primary action. |
| why disclosure | automated_pass | Browser audit requires Today evidence. |
| quick logs visible | automated_pass | Browser audit requires Today evidence. |
| quick logs use 1-5 explanations where relevant | needs_ai_review | Text evidence required; nuance review pending. |
| save success/feedback | automated_pass | Quick-log feedback smoke required. |
| missing data unknown/not safe | automated_pass | Deterministic scan required. |
| not too dense for first-run user | needs_ai_review | Requires qualitative review. |
| mobile viewport readability | human_review_required | Mobile viewport is automated; physical phone remains required. |

### E. Fuel

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| command visible | automated_pass | Fuel audit. |
| first safe action clear | needs_ai_review | Automation checks text; qualitative review pending. |
| no unsafe weight-cut copy | automated_pass | Deterministic scan plus Fuel audit. |
| no pressure to make weight | needs_ai_review | Requires AI/human safety copy review. |
| manual food logging visible | automated_pass | Fuel audit. |
| hydration copy safe | automated_pass | Fuel audit and scan. |
| missing food logs unknown/lower confidence | automated_pass | Fuel audit. |
| nutrition review/hard-stop/self-clear copy safe | automated_pass | Fuel audit. |
| body mass copy safe | automated_pass | Fuel audit. |
| no barcode/meal-planning expectation | accepted_beta_limitation | Barcode and meal planning are deferred. |

### F. Train

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Today/Workout screen visible | automated_pass | New Train audit. |
| generated workout feels boxing-supportive, not generic | needs_ai_review | Engine report and screenshots need qualitative review. |
| no generated sparring/contact/fight simulation | automated_pass | Train audit plus deterministic scan. |
| no unsafe intensity escalation | needs_ai_review | Engine report and beta persona review. |
| fast workout completion path | automated_pass | New Train audit. |
| session RPE flow | automated_pass | New Train audit. |
| one exercise row completion | automated_pass | New Train audit checks row inputs. |
| Exercise History visible | automated_pass | New Train audit. |
| progression copy not overconfident | needs_ai_review | Automation checks no exact load inference; nuance pending. |
| no fake numeric load inference | automated_pass | Train progression audit. |

### G. Plan

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Week visible | automated_pass | New Plan audit. |
| Next Week visible | automated_pass | New Plan audit. |
| Block History visible | automated_pass | New Plan audit. |
| Adjustments visible | automated_pass | New Plan audit. |
| Protect this day understandable | needs_ai_review | Automation checks request framing; nuance pending. |
| Mark unavailable understandable | needs_ai_review | Automation checks request framing; nuance pending. |
| Request deload understandable | needs_ai_review | Automation checks request framing; nuance pending. |
| Restore engine plan understandable | needs_ai_review | Automation checks request framing; nuance pending. |
| no coach-only controls exposed | automated_pass | Plan audit and scan. |
| no drag/drop expectation | accepted_beta_limitation | Drag/drop calendar is deferred. |
| adjustment result/rejection copy understandable | needs_ai_review | Plan audit opens controls; rejected/applied nuance pending. |
| roll-forward/next-week materialization explanation | needs_ai_review | Next Week audit plus AI review. |

### H. Profile

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| athlete section | automated_pass | Profile tab audit required. |
| settings section | automated_pass | Profile tab/sign-out audit required. |
| data section | automated_pass | New data controls audit. |
| audit section | automated_pass | Profile Audit audit. |
| sign out | automated_pass | Profile Settings smoke required. |
| beta tester notice | automated_pass | Profile Audit audit. |
| beta health preflight | automated_pass | Profile Audit audit. |
| feedback panel | automated_pass | Profile Audit audit. |
| feedback history | automated_pass | Profile Audit audit refresh control. |
| data export preview | automated_pass | New data controls audit. |
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
| no emergency/medical/coaching support framing | automated_pass | Text and source scans. |

### J. Engine output quality

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| Today view model output quality | needs_ai_review | Engine-output report required. |
| Fuel command output quality | needs_ai_review | Engine-output report required. |
| Train workout output quality | needs_ai_review | Engine-output report required. |
| Plan recommendation output quality | needs_ai_review | Engine-output report required. |
| beta persona coverage | automated_pass | Engine-output report required. |
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
| no secrets in feedback | automated_pass | Profile Audit audit. |
| no emergency details requested | automated_pass | Profile Audit audit. |
| cycle privacy respected | needs_ai_review | Automation checks copy; human trust review pending. |
| wearable optional | automated_pass | Onboarding/Profile checks. |
| feedback user-owned | human_review_required | Live data ownership requires Supabase/RLS check. |

### L. Supabase/live data

| Gate | Status | Evidence / notes |
| --- | --- | --- |
| migrations aligned | human_review_required | Release-owner check, opt-in only. |
| dry run up to date | human_review_required | Release-owner check, opt-in only. |
| live smoke passes | human_review_required | Explicit live smoke only. |
| feedback submit persists and cleans up | human_review_required | Live data check only. |
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
| EAS project initialized | blocked | Known gap: no configured EAS project/build artifact. |
| preview build artifact exists | blocked | Known gap blocks distributed beta. |
| tester list controlled | human_review_required | Managed outside git. |
| app icon/splash/store metadata accepted or fixed | human_review_required | Release owner required. |
| private distribution channel confirmed | human_review_required | Release owner required. |
| no secrets in build config | automated_pass | Static/preflight checks required. |
| release docs updated | automated_pass | Docs updated in this pass. |
| release decision updated | automated_pass | This file and checklist updated in this pass. |
