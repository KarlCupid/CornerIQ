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
- Supabase schema migration draft at `supabase/migrations/001_core_schema.sql`.
- Engine fixtures and tests for safety, cycle, wearable/manual, nutrition, training, body mass, validation, and persistence schema checks.

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

## Environment

Create a local `.env` with:

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit Supabase passwords, service tokens, or personal access tokens. The repository only includes `.env.example` with blank values.

## Expo SDK

This pass targets stable Expo SDK 55 with React 19.2 and React Native 0.83. If Expo install tooling cannot fully reconcile local native package versions in a future environment, keep the app runnable and document the blocker here before changing SDK families.

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
