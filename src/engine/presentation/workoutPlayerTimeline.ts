import type { DetailedTrainingSession, ExercisePrescription } from "../core/types";
import { plainSectionIntent, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

export interface WorkoutPlayerTimelineStep {
  actionLabel: string;
  cue: string;
  dose: string;
  durationLabel: string;
  durationSeconds: number;
  exerciseId: string;
  exerciseIndex: number;
  id: string;
  instruction: string;
  rest: string;
  sectionDurationSeconds: number;
  sectionIndex: number;
  sectionIntent: string;
  sectionName: string;
  setIndex: number;
  timerLabel: string;
  title: string;
  totalExerciseSets: number;
}

export interface WorkoutPlayerTimeline {
  steps: readonly WorkoutPlayerTimelineStep[];
  totalSeconds: number;
}

const MIN_TIMED_STEP_SECONDS = 15;

interface StructuredTimerStep {
  cue: string;
  durationText?: string | undefined;
  instruction?: string | undefined;
  restText?: string | undefined;
  title: string;
}

interface StructuredTimerProfile {
  actionNoun: "round" | "segment";
  defaultStepCountWhenSingle?: number | undefined;
  steps: readonly StructuredTimerStep[];
}

const genericRoundSteps: readonly StructuredTimerStep[] = [
  {
    title: "Base shape",
    cue: "Start in stance, keep breath calm, and let the first actions be clean."
  },
  {
    title: "Primary action",
    cue: "Use the main skill only. Reset before adding speed or volume."
  },
  {
    title: "Exit and reset",
    cue: "Finish each action with feet under you and hands back home."
  },
  {
    title: "Quality round",
    cue: "Keep the cleanest version. Shorten the round if shape breaks twice."
  },
  {
    title: "Clean repeat",
    cue: "Repeat the best pattern without chasing fatigue."
  },
  {
    title: "Best-quality finish",
    cue: "End with the same stance, guard, and breathing you had at the start."
  }
];

const structuredTimerProfiles: Readonly<Record<string, StructuredTimerProfile>> = {
  stance_guard_reset: {
    actionNoun: "segment",
    defaultStepCountWhenSingle: 4,
    steps: [
      {
        title: "Stance base",
        durationText: "60 sec",
        instruction: "Find stance width, soft knees, chin tucked, and quiet shoulders.",
        cue: "Feet feel available before the hands do anything.",
        restText: "Shake out tension, then reset stance."
      },
      {
        title: "Guard home",
        durationText: "60 sec",
        instruction: "Bounce lightly and return both hands home after every small action.",
        cue: "Hands return before the next step or punch shape.",
        restText: "Relax jaw, neck, and shoulders."
      },
      {
        title: "Step and reset",
        durationText: "60 sec",
        instruction: "Step small, recover stance width, and bring guard back with the feet.",
        cue: "No crossing, reaching, or falling into the reset.",
        restText: "Breathe down before the next pattern."
      },
      {
        title: "Jab shape to guard",
        durationText: "60 sec",
        instruction: "Touch a light jab shape, return to guard, then reset stance.",
        cue: "The jab is finished only when stance and guard are back.",
        restText: "Move on only if balance stayed clean."
      }
    ]
  },
  guard_return_timer: {
    actionNoun: "segment",
    steps: [
      {
        title: "Single jab return",
        cue: "Count only jabs that finish with both hands home."
      },
      {
        title: "Double jab return",
        cue: "Second jab stays relaxed; rear hand stays available."
      },
      {
        title: "Jab-cross return",
        cue: "Combination ends when both hands are back, not when the punch lands."
      },
      {
        title: "Step-out guard return",
        cue: "Feet move after the hands return, then stance resets."
      },
      {
        title: "Feint to guard",
        cue: "Sell the feint without lifting the chin or losing the rear hand."
      },
      {
        title: "Honest quality count",
        cue: "Missed returns do not count. Keep the timer honest."
      }
    ]
  },
  shadowboxing_technical_rounds: {
    actionNoun: "round",
    steps: [
      {
        title: "Stance and jab line",
        cue: "Use the jab to check range, then reset stance before the next entry."
      },
      {
        title: "Guard return only",
        cue: "Every action finishes with hands home and shoulders loose."
      },
      {
        title: "Entry, exit, reset",
        cue: "Enter once, exit once, and recover stance before adding anything."
      },
      {
        title: "Defense after action",
        cue: "Add one small slip, roll, pivot, or step-out after the offense."
      },
      {
        title: "Rhythm change",
        cue: "Change speed once, then return to relaxed breathing and shape."
      },
      {
        title: "Best-quality round",
        cue: "Use only the cleanest patterns from the earlier rounds."
      }
    ]
  },
  defense_after_combo_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Jab-cross plus slip",
        cue: "Slip small after the combination and reset before punching again."
      },
      {
        title: "Double jab plus step-out",
        cue: "Exit before admiring the work; feet finish under you."
      },
      {
        title: "Combo plus roll",
        cue: "Roll from the legs and trunk, not from a loose neck."
      },
      {
        title: "Combo plus pivot",
        cue: "Pivot small, recover stance, and bring guard back together."
      },
      {
        title: "Quality cap",
        cue: "Choose the defense that stayed clean and remove anything sloppy."
      }
    ]
  },
  rhythm_change_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Feint, pause, jab",
        cue: "Break rhythm without rushing the punch."
      },
      {
        title: "Slow-fast entry",
        cue: "Change speed once, then return to stance."
      },
      {
        title: "Jab, pause, exit",
        cue: "The pause stays relaxed; the exit stays balanced."
      },
      {
        title: "Clean rhythm choice",
        cue: "Use the one rhythm change that stayed calm and repeatable."
      }
    ]
  },
  round_based_conditioning_support: {
    actionNoun: "round",
    steps: [
      {
        title: "Footwork rhythm",
        cue: "Move smoothly in stance with quiet feet and controlled breathing."
      },
      {
        title: "Shadow rhythm",
        cue: "Use light punch shapes only if guard return stays clean."
      },
      {
        title: "Low-impact movement",
        cue: "Keep effort repeatable and posture tall."
      },
      {
        title: "Quality cap",
        cue: "Stop adding pace if coordination or breathing changes."
      }
    ]
  },
  low_impact_round_circuit: {
    actionNoun: "round",
    steps: [
      {
        title: "Easy footwork",
        cue: "Stay light, small, and repeatable."
      },
      {
        title: "Trunk and mobility reset",
        cue: "Use the round to restore control, not to chase fatigue."
      },
      {
        title: "Breathing reset",
        cue: "Finish calmer than you started."
      }
    ]
  },
  bag_angle_reset_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Touch and step",
        cue: "Touch the bag, step to a small angle, then reset."
      },
      {
        title: "Jab to angle",
        cue: "The jab creates the angle; do not spin around the bag."
      },
      {
        title: "Combination to reset",
        cue: "Hands return before the feet leave."
      },
      {
        title: "Angle, exit, breathe",
        cue: "Exit with calm breathing and stance width intact."
      },
      {
        title: "Cleanest angle round",
        cue: "Repeat only the angle that stayed accurate."
      }
    ]
  },
  bag_rhythm_change_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Pause before touch",
        cue: "Change rhythm once, then touch cleanly."
      },
      {
        title: "Feint to entry",
        cue: "The feint stays relaxed and the rear hand stays home."
      },
      {
        title: "Slow-fast bag touch",
        cue: "Speed changes without losing accuracy."
      },
      {
        title: "Exit on calm breath",
        cue: "Leave the bag before tension rises."
      },
      {
        title: "Best rhythm round",
        cue: "Use the cleanest timing change only."
      }
    ]
  },
  bag_jab_control_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Jab-only accuracy",
        cue: "Touch the target cleanly and bring the hand home."
      },
      {
        title: "Jab-feint control",
        cue: "Feint without reaching, then jab from balance."
      },
      {
        title: "Jab exit reset",
        cue: "Exit after the jab and reset before the next entry."
      }
    ]
  },
  bag_combo_exit_round: {
    actionNoun: "round",
    steps: [
      {
        title: "Jab-cross exit",
        cue: "Combination ends with feet and guard, not more punches."
      },
      {
        title: "Body-head shape",
        cue: "Level change stays shallow and posture stays tall."
      },
      {
        title: "Clean exit round",
        cue: "Exit before chasing the bag."
      }
    ]
  },
  bag_defense_after_combo: {
    actionNoun: "round",
    steps: [
      {
        title: "Combo plus small slip",
        cue: "Defense is part of the sequence, not an extra afterthought."
      },
      {
        title: "Combo plus roll",
        cue: "Roll compactly and recover stance."
      },
      {
        title: "Combo plus step-out",
        cue: "Leave the line and bring guard with you."
      },
      {
        title: "Quality defense round",
        cue: "Keep the defense that stayed balanced."
      }
    ]
  }
};

function parseClockSeconds(value: string): number | null {
  const clock = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!clock?.[1] || !clock[2]) {
    return null;
  }
  return Number(clock[1]) * 60 + Number(clock[2]);
}

function unitSeconds(amount: number, unit: string): number {
  return Math.round(unit.startsWith("m") ? amount * 60 : amount);
}

export function parseWorkoutTimerSeconds(text: string | undefined): number | null {
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const repeated = normalized.match(/\b\d+(?:\s*-\s*\d+)?\s*x\s*(\d{1,2}:[0-5]\d|\d+(?:\.\d+)?)(?:\s*-\s*\d+(?:\.\d+)?)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)?\b/);
  if (repeated?.[1]) {
    const clockSeconds = parseClockSeconds(repeated[1]);
    if (clockSeconds !== null) {
      return clockSeconds;
    }
    if (repeated[2]) {
      const amount = Number(repeated[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return unitSeconds(amount, repeated[2]);
      }
    }
  }

  const clock = normalized.match(/\b(\d{1,2}:[0-5]\d)\b/);
  if (clock?.[1]) {
    return parseClockSeconds(clock[1]);
  }

  const range = normalized.match(/\b(\d+(?:\.\d+)?)\s*-\s*\d+(?:\.\d+)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\b/);
  const single = normalized.match(/\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\b/);
  const match = range ?? single;
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return unitSeconds(amount, match[2]);
}

function repeatCountFromText(text: string | undefined): number {
  const repeated = text?.toLowerCase().match(/\b(\d+)(?:\s*-\s*\d+)?\s*x\b/);
  if (!repeated?.[1]) {
    return 1;
  }
  const count = Number(repeated[1]);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

function structuredTimerProfile(exercise: ExercisePrescription): StructuredTimerProfile | undefined {
  return structuredTimerProfiles[exercise.exerciseId];
}

function timerSetCount(exercise: ExercisePrescription): number {
  const firstSet = exercise.sets[0];
  const profile = structuredTimerProfile(exercise);
  const repeatedCount = Math.max(
    repeatCountFromText(exercise.durationText),
    repeatCountFromText(exercise.repsText),
    repeatCountFromText(firstSet?.durationText),
    repeatCountFromText(firstSet?.repsText)
  );
  return Math.max(
    1,
    exercise.sets.length,
    repeatedCount,
    repeatedCount <= 1 ? (profile?.defaultStepCountWhenSingle ?? 1) : 1
  );
}

function fallbackSeedSeconds(exercise: ExercisePrescription): number {
  switch (exercise.category) {
    case "roadwork":
    case "conditioning":
      return 120;
    case "main_strength":
    case "secondary_strength":
      return 75;
    case "boxing_skill":
    case "technical":
    case "agility":
    case "power":
      return 45;
    case "warm_up":
    case "mobility":
    case "recovery":
    case "durability":
      return 60;
  }
}

function structuredStep(exercise: ExercisePrescription, setIndex: number, setCount: number): StructuredTimerStep | undefined {
  const profile = structuredTimerProfile(exercise);
  if (profile) {
    return profile.steps[setIndex] ?? genericRoundSteps[setIndex] ?? genericRoundSteps[genericRoundSteps.length - 1];
  }
  if (setCount > 1 && isBoxingRoundLike(exercise)) {
    return genericRoundSteps[setIndex] ?? genericRoundSteps[genericRoundSteps.length - 1];
  }
  return undefined;
}

function stepSeedSeconds(exercise: ExercisePrescription, setIndex: number, setCount: number): number {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  const structured = structuredStep(exercise, setIndex, setCount);
  return parseWorkoutTimerSeconds(structured?.durationText) ?? parseWorkoutTimerSeconds(set?.durationText) ?? parseWorkoutTimerSeconds(exercise.durationText) ?? fallbackSeedSeconds(exercise);
}

function allocateDurations(totalSeconds: number, seeds: readonly number[]): readonly number[] {
  if (seeds.length === 0) {
    return [];
  }
  const safeTotalSeconds = Math.max(1, Math.round(totalSeconds));
  const seedTotal = Math.max(1, seeds.reduce((sum, seed) => sum + Math.max(1, seed), 0));
  const canUseMinimum = safeTotalSeconds >= seeds.length * MIN_TIMED_STEP_SECONDS;
  const minimum = canUseMinimum ? MIN_TIMED_STEP_SECONDS : 1;
  const raw = seeds.map((seed) => (safeTotalSeconds * Math.max(1, seed)) / seedTotal);
  const durations = raw.map((value) => Math.max(minimum, Math.floor(value)));
  let remaining = safeTotalSeconds - durations.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder)
    .map((item) => item.index);

  while (remaining > 0) {
    for (const index of order) {
      if (remaining <= 0) {
        break;
      }
      durations[index] = (durations[index] ?? minimum) + 1;
      remaining -= 1;
    }
  }

  while (remaining < 0) {
    const index = [...order].reverse().find((candidate) => (durations[candidate] ?? 0) > minimum);
    if (index === undefined) {
      break;
    }
    durations[index] = (durations[index] ?? minimum) - 1;
    remaining += 1;
  }

  return durations;
}

function formatDurationLabel(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isBoxingRoundLike(exercise: ExercisePrescription): boolean {
  const searchable = `${exercise.name} ${exercise.category} ${exercise.durationText ?? ""} ${exercise.repsText ?? ""} ${exercise.boxingTransfer}`.toLowerCase();
  return (
    (exercise.category === "boxing_skill" || exercise.category === "technical" || exercise.category === "agility" || exercise.category === "conditioning") &&
    /\b(boxing|shadow|bag|jab|guard|stance|round|footwork|ringcraft|defense|counter|rhythm|pivot|slip|roll|exit)\b/.test(searchable)
  );
}

function actionNoun(exercise: ExercisePrescription, setCount: number): "round" | "segment" | "set" | "movement" {
  const profile = structuredTimerProfile(exercise);
  if (profile) {
    return profile.actionNoun;
  }
  if (setCount > 1 && isBoxingRoundLike(exercise)) {
    return "round";
  }
  return setCount > 1 ? "set" : "movement";
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function actionLabel(exercise: ExercisePrescription, setIndex: number, setCount: number): string {
  const noun = actionNoun(exercise, setCount);
  return noun === "movement" ? "movement" : `${noun} ${setIndex + 1}`;
}

function stepTitle(exercise: ExercisePrescription, setIndex: number, setCount: number): string {
  const structured = structuredStep(exercise, setIndex, setCount);
  if (structured) {
    return `${sentenceCase(actionLabel(exercise, setIndex, setCount))}: ${structured.title}`;
  }
  return plainWorkoutTitle(exercise.name);
}

function doseText(exercise: ExercisePrescription, setIndex: number, setCount: number, durationSeconds: number): string {
  const set = exercise.sets[setIndex] ?? exercise.sets[0];
  const structured = structuredStep(exercise, setIndex, setCount);
  const repeatedTopLevel = setCount > 1 && repeatCountFromText(exercise.durationText) > 1;
  const repeatedTopLevelReps = setCount > 1 && repeatCountFromText(exercise.repsText) > 1;
  const prescribed = [
    structured?.instruction ? undefined : set?.repsText ?? (repeatedTopLevelReps ? undefined : exercise.repsText),
    structured?.durationText ?? set?.durationText ?? (repeatedTopLevel ? undefined : exercise.durationText)
  ].filter((item): item is string => Boolean(item));
  const timerDose = `${formatDurationLabel(durationSeconds)} timer`;
  const currentActionLabel = sentenceCase(actionLabel(exercise, setIndex, setCount));
  const progressLabel = setCount > 1 ? `${currentActionLabel} of ${setCount}` : currentActionLabel;
  const parent = structured ? plainWorkoutTitle(exercise.name) : prescribed.join(" / ");
  return parent ? `${progressLabel}: ${parent} - ${timerDose}` : `${progressLabel}: ${timerDose}`;
}

export function buildWorkoutPlayerTimeline(session: DetailedTrainingSession): WorkoutPlayerTimeline {
  const fallbackSectionSeconds = Math.max(60, Math.round((session.durationMinutes * 60) / Math.max(1, session.sections.length)));
  const steps = session.sections.flatMap((section, sectionIndex) => {
    const sectionDurationSeconds = section.durationMinutes > 0 ? section.durationMinutes * 60 : fallbackSectionSeconds;
    const entries = section.exercises.flatMap((exercise, exerciseIndex) => {
      const totalExerciseSets = timerSetCount(exercise);
      return Array.from({ length: totalExerciseSets }).map((_, setIndex) => ({
        exercise,
        exerciseIndex,
        seedSeconds: stepSeedSeconds(exercise, setIndex, totalExerciseSets),
        setIndex,
        totalExerciseSets
      }));
    });
    const durations = allocateDurations(sectionDurationSeconds, entries.map((entry) => entry.seedSeconds));

    return entries.map((entry, entryIndex): WorkoutPlayerTimelineStep => {
      const durationSeconds = durations[entryIndex] ?? MIN_TIMED_STEP_SECONDS;
      const structured = structuredStep(entry.exercise, entry.setIndex, entry.totalExerciseSets);
      const set = entry.exercise.sets[entry.setIndex] ?? entry.exercise.sets[0];
      const primaryCue = structured?.cue ?? entry.exercise.coachingNotes[0] ?? entry.exercise.boxingTransfer;
      const sectionName = plainSectionName(section.name);
      const currentActionLabel = actionLabel(entry.exercise, entry.setIndex, entry.totalExerciseSets);
      return {
        actionLabel: currentActionLabel,
        cue: plainTrainingCopy(primaryCue),
        dose: doseText(entry.exercise, entry.setIndex, entry.totalExerciseSets, durationSeconds),
        durationLabel: formatDurationLabel(durationSeconds),
        durationSeconds,
        exerciseId: entry.exercise.exerciseId,
        exerciseIndex: entry.exerciseIndex,
        id: `timeline:${sectionIndex}:${entry.exercise.exerciseId}:${entry.setIndex}`,
        instruction: plainTrainingCopy(structured?.instruction ?? set?.loadGuidance ?? entry.exercise.loadGuidance),
        rest: plainTrainingCopy(structured?.restText ?? set?.restText ?? entry.exercise.restText),
        sectionDurationSeconds,
        sectionIndex,
        sectionIntent: plainSectionIntent(section.intent),
        sectionName,
        setIndex: entry.setIndex,
        timerLabel: `${sentenceCase(currentActionLabel)} timer`,
        title: plainWorkoutTitle(stepTitle(entry.exercise, entry.setIndex, entry.totalExerciseSets)),
        totalExerciseSets: entry.totalExerciseSets
      };
    });
  });

  return {
    steps,
    totalSeconds: steps.reduce((sum, step) => sum + step.durationSeconds, 0)
  };
}
