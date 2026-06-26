import type { CompileTrainingWeekInput, CompiledTrainingSession, DailyReadinessOverlay, TrainingSessionBlock } from "./types";

type ReadinessInput = NonNullable<CompileTrainingWeekInput["readiness"]>;

function blockTotal(blocks: readonly TrainingSessionBlock[]): number {
  return Math.round(blocks.reduce((sum, block) => sum + block.durationMinutes, 0));
}

function trimBlock(block: TrainingSessionBlock, color: ReadinessInput["color"]): TrainingSessionBlock {
  const trimRatio = color === "amber" ? 0.9 : 0.72;
  if (block.conditioning) {
    const repetitions = Math.max(1, Math.floor(block.conditioning.repetitions * trimRatio));
    const mainSeconds = repetitions * block.conditioning.workSeconds + Math.max(0, repetitions - 1) * block.conditioning.restSeconds;
    return {
      ...block,
      durationMinutes: Math.round(mainSeconds / 60),
      conditioning: {
        ...block.conditioning,
        repetitions,
        rpe: Math.min(block.conditioning.rpe, color === "amber" ? 7 : 5)
      },
      coachingNotes: [...block.coachingNotes, color === "amber" ? "Readiness trims optional volume while preserving the conditioning purpose." : "Red readiness downshifts output and complexity for today only."]
    };
  }
  if (block.boxingRounds) {
    const keepRounds = Math.max(2, Math.floor(block.boxingRounds.rounds.length * trimRatio));
    const rounds = block.boxingRounds.rounds.slice(0, keepRounds);
    const mainSeconds = rounds.reduce((sum, round, index) => sum + round.durationSeconds + (index === rounds.length - 1 ? 0 : round.restSeconds), 0);
    return {
      ...block,
      durationMinutes: Math.round(mainSeconds / 60),
      boxingRounds: {
        ...block.boxingRounds,
        rounds,
        rpe: Math.min(block.boxingRounds.rpe, color === "amber" ? 6 : 4)
      },
      coachingNotes: [...block.coachingNotes, "Readiness trims rounds without changing the technical theme."]
    };
  }
  if (block.exercises.length > 0) {
    return {
      ...block,
      durationMinutes: Math.max(8, Math.round(block.durationMinutes * trimRatio)),
      exercises: block.exercises.map((exercise, index) =>
        index === block.exercises.length - 1 || color === "red"
          ? {
              ...exercise,
              sets: typeof exercise.sets === "number" ? Math.max(1, exercise.sets - 1) : exercise.sets,
              rpe: typeof exercise.rpe === "number" ? Math.min(exercise.rpe, color === "amber" ? 6 : 5) : exercise.rpe,
              stopConditions: [...exercise.stopConditions, "Today-only readiness downshift: stop before technical quality changes."]
            }
          : exercise
      ),
      coachingNotes: [...block.coachingNotes, color === "amber" ? "Drop the final optional set if warm-up checks are not clean." : "Keep only clean, low-cost work today."]
    };
  }
  return {
    ...block,
    durationMinutes: Math.max(4, Math.round(block.durationMinutes * trimRatio))
  };
}

function recoveryOnlySession(session: CompiledTrainingSession, readiness: ReadinessInput): CompiledTrainingSession {
  const overlay: DailyReadinessOverlay = {
    readinessDate: readiness.date,
    color: readiness.color,
    applied: true,
    status: "recovery_only",
    affectedSessionIds: [session.id],
    rationale: ["Same-day red readiness with hard-stop symptoms replaced training with recovery-only work."]
  };
  return {
    ...session,
    role: "mobility_recovery",
    primaryAdaptation: "recovery",
    title: "Readiness recovery-only prescription",
    structuredDurationMinutes: 20,
    displayedDurationMinutes: 20,
    hardness: "recovery",
    readinessOverlay: overlay,
    blocks: [
      {
        id: `${session.id}:readiness-recovery`,
        role: "mobility",
        title: "Recovery-only readiness bridge",
        adaptation: "recovery",
        durationMinutes: 20,
        exercises: [],
        coachingNotes: ["Use this only for same-day symptom management; it does not rewrite future sessions."]
      }
    ],
    rationale: [...session.rationale, ...overlay.rationale]
  };
}

function overlayFor(session: CompiledTrainingSession, readiness: ReadinessInput, status: DailyReadinessOverlay["status"], rationale: readonly string[]): DailyReadinessOverlay {
  return {
    readinessDate: readiness.date,
    color: readiness.color,
    applied: status !== "execute_as_prescribed",
    status,
    affectedSessionIds: status === "execute_as_prescribed" ? [] : [session.id],
    rationale
  };
}

export function applyDailyReadinessOverlay(input: {
  sessions: readonly CompiledTrainingSession[];
  readiness?: ReadinessInput | undefined;
}): readonly CompiledTrainingSession[] {
  if (!input.readiness) {
    return input.sessions;
  }
  return input.sessions.map((session) => {
    if (session.date !== input.readiness!.date) {
      return session;
    }
    if (input.readiness!.color === "green") {
      const overlay = overlayFor(session, input.readiness!, "execute_as_prescribed", ["Same-day readiness is green, so the compiled session is unchanged."]);
      return {
        ...session,
        readinessOverlay: overlay
      };
    }
    if (input.readiness!.color === "red" && input.readiness!.hardStop) {
      return recoveryOnlySession(session, input.readiness!);
    }
    const blocks = session.blocks.map((block) => trimBlock(block, input.readiness!.color));
    const status = input.readiness!.color === "amber" ? "trimmed" : "downshifted";
    const overlay = overlayFor(
      session,
      input.readiness!,
      status,
      input.readiness!.color === "amber"
        ? ["Same-day amber readiness trims optional volume while preserving the session purpose."]
        : ["Same-day red readiness without hard-stop symptoms reduces intensity and complexity for today only."]
    );
    const duration = blockTotal(blocks);
    return {
      ...session,
      blocks,
      structuredDurationMinutes: duration,
      displayedDurationMinutes: duration,
      hardness: input.readiness!.color === "amber" ? session.hardness : "easy",
      readinessOverlay: overlay,
      rationale: [...session.rationale, ...overlay.rationale]
    };
  });
}
