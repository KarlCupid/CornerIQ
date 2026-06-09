import { exerciseCatalog, type CatalogExercise } from "./exerciseCatalog";
import { guidedProfileForSource } from "./guidedExerciseCatalog";
import type { GuidedWorkoutStep } from "./types";

export interface ExerciseCatalogValidationResult {
  valid: boolean;
  errors: readonly string[];
}

const prohibitedTerms = ["sparring", "contact", "neck bridge", "sweat suit", "sweatsuit", "sauna", "weight cut", "cut weight"];
const vagueTitlePatterns = [
  /\bbase shape\b/i,
  /\bprimary action\b/i,
  /\bquality round\b/i,
  /\bclean repeat\b/i,
  /\bguard return rounds\b/i,
  /\bshadowboxing rounds\b/i,
  /\bdefense round\b/i,
  /\brhythm round\b/i,
  /\btechnical round\b/i,
  /\bexecute cleanly\b/i,
  /\bfocus on quality\b/i,
  /\breset shape\b/i
];
const setupOptionalCategories = new Set<CatalogExercise["category"]>(["mobility", "recovery", "warm_up"]);

function exerciseText(exercise: CatalogExercise): string {
  const profile = guidedProfileForSource(exercise);
  return [
    exercise.exerciseId,
    exercise.name,
    exercise.loadGuidance,
    exercise.boxingTransfer,
    ...exercise.coachingNotes,
    ...exercise.safetyNotes,
    ...exercise.stopConditions,
    ...exercise.substitutions.flatMap((substitution) => [
      substitution.exerciseId,
      substitution.name,
      substitution.reason,
      substitution.loadGuidance,
      ...substitution.coachingNotes
    ]),
    profile.beginnerName,
    profile.oneLineGoal,
    ...profile.commonMistakes,
    ...profile.safetyStops,
    ...profile.setup.flatMap(guidedStepTextParts),
    ...profile.work.flatMap(guidedStepTextParts),
    ...(profile.cooldown ?? []).flatMap(guidedStepTextParts)
  ]
    .join(" ")
    .toLowerCase();
}

function guidedStepTextParts(step: GuidedWorkoutStep): readonly string[] {
  return [
    step.id,
    step.kind,
    step.title,
    step.beginnerInstruction,
    step.intent,
    step.cue,
    ...(step.microCues ?? []),
    step.repsText ?? "",
    step.loadGuidance ?? "",
    step.commonMistake ?? "",
    step.successCheck ?? "",
    step.safetyStop ?? "",
    step.regression ?? "",
    step.progression ?? ""
  ];
}

function validateGuidedStep(input: { exerciseId: string; step: GuidedWorkoutStep; errors: string[] }): void {
  const { exerciseId, step, errors } = input;
  if (!step.title.trim() || !step.beginnerInstruction.trim() || !step.intent.trim() || !step.cue.trim()) {
    errors.push(`${exerciseId} has incomplete guided ${step.kind} step copy.`);
  }
  if (step.kind === "work" && !step.durationSeconds && !step.repsText) {
    errors.push(`${exerciseId} guided work step ${step.id} is missing duration or reps.`);
  }
  if (step.kind === "work" && !step.safetyStop?.trim()) {
    errors.push(`${exerciseId} guided work step ${step.id} is missing a safety stop.`);
  }
  if (step.kind === "work" && !step.commonMistake?.trim()) {
    errors.push(`${exerciseId} guided work step ${step.id} is missing a common mistake.`);
  }
  if (step.kind === "work" && !step.successCheck?.trim()) {
    errors.push(`${exerciseId} guided work step ${step.id} is missing a success check.`);
  }
  for (const pattern of vagueTitlePatterns) {
    if (pattern.test(step.title)) {
      errors.push(`${exerciseId} guided step has vague title: ${step.title}`);
    }
  }
}

function validateGuidedProfile(exercise: CatalogExercise, errors: string[]): void {
  const profile = guidedProfileForSource(exercise);
  if (!profile.beginnerName.trim() || !profile.oneLineGoal.trim()) {
    errors.push(`${exercise.exerciseId} guided profile is missing beginner name or goal.`);
  }
  if (exercise.noviceEligible && !profile.beginnerEligible) {
    errors.push(`${exercise.exerciseId} is novice eligible but guided profile is not beginner eligible.`);
  }
  if ((!setupOptionalCategories.has(exercise.category) && profile.setup.length === 0) || profile.work.length === 0) {
    errors.push(`${exercise.exerciseId} guided profile must include setup and work steps.`);
  }
  if (profile.commonMistakes.length === 0 || profile.commonMistakes.some((mistake) => !mistake.trim())) {
    errors.push(`${exercise.exerciseId} guided profile is missing common mistakes.`);
  }
  if (profile.safetyStops.length === 0 || profile.safetyStops.some((stop) => !stop.trim())) {
    errors.push(`${exercise.exerciseId} guided profile is missing safety stops.`);
  }
  [...profile.setup, ...profile.work, ...(profile.cooldown ?? [])].forEach((step) => validateGuidedStep({ exerciseId: exercise.exerciseId, step, errors }));
}

export function validateExerciseCatalog(catalog: readonly CatalogExercise[] = exerciseCatalog): ExerciseCatalogValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const exercise of catalog) {
    if (seen.has(exercise.exerciseId)) {
      errors.push(`Duplicate exerciseId: ${exercise.exerciseId}`);
    }
    seen.add(exercise.exerciseId);
    if (!exercise.boxingTransfer.trim()) {
      errors.push(`${exercise.exerciseId} is missing boxingTransfer.`);
    }
    if (exercise.stopConditions.length === 0 || exercise.stopConditions.some((condition) => !condition.trim())) {
      errors.push(`${exercise.exerciseId} is missing stopConditions.`);
    }
    if (exercise.safetyNotes.length === 0 || exercise.safetyNotes.some((note) => !note.trim())) {
      errors.push(`${exercise.exerciseId} is missing safetyNotes.`);
    }
    if (exercise.requiredEquipment.length > 0 && !exercise.substitutions.some((substitution) => substitution.equipmentNeeded.length === 0)) {
      errors.push(`${exercise.exerciseId} is loaded but has no no-equipment substitution.`);
    }
    if (exercise.category === "power" && !exercise.stopConditions.join(" ").toLowerCase().match(/speed|quality|coordination|timing/)) {
      errors.push(`${exercise.exerciseId} is power work without a speed or quality stop.`);
    }
    if (exercise.coachingNotes.length === 0 || exercise.coachingNotes.some((note) => !note.trim())) {
      errors.push(`${exercise.exerciseId} has empty coaching notes.`);
    }
    validateGuidedProfile(exercise, errors);
    const text = exerciseText(exercise);
    for (const term of prohibitedTerms) {
      if (text.includes(term)) {
        errors.push(`${exercise.exerciseId} contains prohibited term: ${term}`);
      }
    }
    if (exercise.noviceEligible && /\b(olympic|snatch|jerk)\b/i.test(`${exercise.name} ${exercise.substitutions.map((substitution) => substitution.name).join(" ")}`)) {
      errors.push(`${exercise.exerciseId} exposes novice Olympic derivatives.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
