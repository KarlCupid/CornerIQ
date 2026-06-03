# CornerIQ

CornerIQ is a boxing-only performance operating system for athletes planning training support, fuel, readiness, body mass, weight-class decisions, cycle-aware context, fight camp, fight week, weigh-ins, tournaments, and recovery.

Internal engine name: Corner Engine.

## Architecture

CornerIQ is engine-first. Core decisions live in deterministic TypeScript engine modules under `src/engine`, while services and repositories validate/map external data before it reaches the engine. Screens should read presentation view models; they should not own business logic.

## Current Status

Implemented so far:

- Expo + React Native + strict TypeScript app shell.
- Engine product/spec docs in `docs/`.
- Domain-split engine type exports with compatibility barrel at `src/engine/core/types.ts`.
- First deterministic performance kernel vertical slice.
- Body-mass trend, cycle context, readiness, wearable confidence, safety flags, weigh-in eligibility, tournament strategy, nutrition targets, structured rehydration, training support generation, and presentation view models.
- Supabase migration files through `010_generated_sessions_training_block_scope.sql`; remote migration status is tracked in `docs/11_SUPABASE_REMOTE_STATUS.md`.
- Engine fixtures and tests for safety, cycle, wearable/manual, nutrition, training, body mass, validation, and persistence schema checks.
- Engine evidence registry in `docs/25_ENGINE_EVIDENCE_REGISTRY.md` and `src/engine/evidence/evidenceRegistry.ts`.

## Install

```sh
npm install
```

## Run

```sh
npm start
```

Useful variants:

```sh
npm run ios
npm run android
npm run web
```

## Tests

```sh
npm test
```

Watch mode:

```sh
npm run test:watch
```

## Typecheck

```sh
npm run typecheck
```

## Lint

```sh
npm run lint
```

## Quality

```sh
npm run quality
```

`quality` runs strict TypeScript typecheck and the engine test suite.

Additional release gates include:

```sh
npm run lint
npm run preflight:beta
npm run smoke:fixtures
npm run test:coverage
```

GitHub Actions also run the Quality workflow plus JavaScript/TypeScript CodeQL analysis on push and pull request. Live Supabase smoke remains opt-in and outside CI by default.

## Live DB Smoke

The live Supabase smoke test is skipped by default. To run it, use a dedicated smoke user and set:

```sh
CORNERIQ_LIVE_DB_SMOKE=1
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
CORNERIQ_SMOKE_EMAIL=
CORNERIQ_SMOKE_PASSWORD=
npm run smoke:live-db
```

The smoke test uses the anon key only, signs in as the smoke user, writes scoped manual logs, resolves engine projections, and cleans up rows it can identify from the run.

## Environment

Create a local `.env` with:

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit Supabase passwords, service tokens, or personal access tokens. The repository only includes `.env.example` with blank values.

## Expo SDK

This pass targets Expo SDK 54 with React 19.1 and React Native 0.81.5, matching `package.json`. If Expo install tooling cannot fully reconcile local native package versions in a future environment, keep the app runnable and document the blocker here before changing SDK families.

## Current Non-Goals

- No UI polish or onboarding screens yet.
- No generic fitness workouts.
- No MMA or broad combat-sports language.
- No generated sparring, contact drills, or replacement boxing coaching.
- No unsafe weight-cut instructions.
- No wearable requirement.
- No UI-owned business logic.

## Safety

CornerIQ is educational planning support for boxing performance. It is not medical care, dietetic care, or boxing coaching. Hard-stop symptoms and unsafe weight-class scenarios block automatic recommendations and point the athlete toward qualified support.
