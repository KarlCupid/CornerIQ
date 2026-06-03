# Release Evidence Ledger

Date: 2026-06-03

Purpose: exact-SHA release evidence for CornerIQ. This file is the release-owner checklist that `npm run release:quality` inspects alongside `docs/26_PRODUCTION_QUALITY_AUDIT.md`. Record non-secret evidence only. Do not paste credentials, personal emails, smoke passwords, service-role values, tokens, or screenshots with private data.

Candidate SHA for this ledger: `7ff2d7f524c0c50075a429163e62dd8ce4b99419` (short `7ff2d7f`).

## Evidence Table

| Field | Record |
| --- | --- |
| Candidate SHA | `7ff2d7f524c0c50075a429163e62dd8ce4b99419` (short `7ff2d7f`). |
| Quality run | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; run ID `26909536964`; URL https://github.com/KarlCupid/CornerIQ/actions/runs/26909536964; event `push`; status completed; conclusion success; created `2026-06-03T19:58:54Z`; updated `2026-06-03T20:00:06Z`. |
| CodeQL run | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; run ID `26909536499`; URL https://github.com/KarlCupid/CornerIQ/actions/runs/26909536499; event `push`; status completed; conclusion success; created `2026-06-03T19:58:54Z`; updated `2026-06-03T20:00:46Z`. |
| Release Quality run | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; local `cmd /c npm run release:quality` failed as designed because Supabase migration `010` remote evidence and live smoke evidence are not recorded and release-owner env acknowledgements are absent. |
| Local command results | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; local worktree verification passed: `cmd /c npm install`, `cmd /c npm run typecheck`, `cmd /c npm test`, `cmd /c npm run lint`, `cmd /c npm run quality`, `cmd /c npm run preflight:beta`, `cmd /c npm run smoke:fixtures`, `cmd /c npm run test:coverage`, `cmd /c npm audit --audit-level=high --omit=dev`, and `cmd /c npm run qa:agent:ci`. Vitest-based commands, `npm audit`, and Supabase/GitHub network checks required approved reruns after sandbox access-denied or network failures. |
| Coverage result | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; `cmd /c npm run test:coverage` passed with statements 88.81, functions 87.77, lines 88.81, branches 87.05 against floors statements 75, functions 75, lines 75, branches 65. |
| Supabase migration list/dry-run | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; Supabase CLI `2.100.1`; approved `cmd /c npm exec supabase -- migration list` connected and showed local `010` with blank remote; approved `cmd /c npm exec supabase -- db push --dry-run` reported it would push `010_generated_sessions_training_block_scope.sql`. Migration `010` is therefore not remotely verified/applied and remains release-blocking. |
| Live smoke | Candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; not run for this SHA; blocked because remote migration `010` is pending and current-app smoke would not prove production readiness against a stale remote schema. Run only after remote migration evidence is resolved, using ignored local credentials and non-secret rows-created/rows-cleaned evidence. |
| EAS/mobile artifact status | Separate mobile lane, explicitly excluded from this in-scope release-quality proof. Android preview build `c21c5692-011e-4c85-949f-355d0e1f753f` produced APK artifact `https://expo.dev/artifacts/eas/pYeMLGCyyhfB72dRYhG93K.apk`; TestFlight, Play Console, app icon, splash, store metadata, private tester distribution, and physical-device distribution remain external blockers for distributed beta. |
| Human beta findings | No real boxer findings are recorded for candidate `7ff2d7f524c0c50075a429163e62dd8ce4b99419`; current UX evidence is scripted beta readiness only and production UX validation remains human_review_required. |
| Known blockers | Supabase remote migration `010`, live smoke, Release Quality pass evidence, private mobile distribution, physical-device checks, and real boxer comprehension findings remain unresolved. |

## Required Release-Owner Evidence Fields

Use this exact field set for each candidate:

- Candidate SHA: full and short SHA.
- Quality run: run ID or URL, status, conclusion, and SHA.
- CodeQL run: run ID or URL, status, conclusion, and SHA.
- Release Quality run: command or workflow URL, status, conclusion, and SHA.
- Local command results: command, pass/fail, and non-secret summary.
- Coverage result: statements, functions, lines, branches, and command.
- Supabase migration list/dry-run: CLI version, command, migration `010` status, dry-run result, and SHA.
- Live smoke: date/time, command, env names present yes/no, pass/fail, rows created/cleaned summary, and SHA.
- EAS/mobile artifact status: separate lane status and artifact URL only if private sharing rules allow recording it.
- Human beta findings: private alias, flow, comprehension, safety/privacy interpretation, action taken, and no private health detail.
- Known blockers: unresolved external or human-review blockers.

## Release-Blocking Rules

- Do not mark release-ready if this ledger lacks the current candidate SHA.
- Do not mark CodeQL passed from "latest run" language; record a run ID or URL tied to the exact SHA.
- Do not mark Supabase migration `010` remotely verified unless migration list and dry-run evidence are recorded for the exact SHA.
- Do not mark live smoke passed unless the command result and rows-created/rows-cleaned summary are recorded without secret values.
- Do not count EAS/mobile deliverability inside local production-readiness scores.
- Do not convert scripted beta QA into real boxer findings.
