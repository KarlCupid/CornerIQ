import type {
  AthleteProfile,
  CycleState,
  DetailedTrainingSession,
  ExercisePrescription,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  WorkoutSection
} from "../core/types";
import { prescribeExercise } from "./substitutionEngine";
import { findWorkoutTemplateByTitle, sectionDurationPlan, selectWorkoutTemplate, type WorkoutTemplate, type WorkoutTemplateSection } from "./workoutTemplateCatalog";
import { plainGeneratedSessionFamilyWhy, plainSectionIntent, plainSectionName, plainWorkoutTitle } from "../presentation/trainingCopy";

export interface BuildDetailedTrainingSessionInput {
  generatedSession: GeneratedTrainingSession;
  athlete: AthleteProfile;
  readiness: ReadinessState;
  cycle: CycleState;
  phase?: PhaseState | undefined;
  protectedWorkouts: readonly ProtectedWorkout[];
  equipmentAccess: readonly string[];
  painNotes?: readonly string[] | undefined;
}

const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);

function isNovice(athlete: AthleteProfile): boolean {
  return NOVICE_LEVELS.has(athlete.boxingLevel);
}

function hasHardBoxingAnchor(anchors: readonly ProtectedWorkout[], date: string): boolean {
  return anchors.some((anchor) => anchor.date === date && (anchor.type === "sparring" || anchor.type === "competition"));
}

function isHighIntensityFamily(family: GeneratedSessionFamily): boolean {
  return [
    "power_lower",
    "power_rotational",
    "power_upper",
    "alactic_sprints",
    "roadwork_intervals",
    "roadwork_tempo",
    "round_based_conditioning",
    "boxing_bag_skill",
    "boxing_round_skill_circuit",
    "agility_reactive_footwork",
    "strength_lower",
    "strength_upper",
    "strength_full_body"
  ].includes(family);
}

function prescription(input: BuildDetailedTrainingSessionInput, exerciseId: string): ExercisePrescription {
  return prescribeExercise({
    exerciseId,
    equipmentAccess: input.equipmentAccess,
    novice: isNovice(input.athlete)
  });
}

function trimExercise(exercise: ExercisePrescription, reason: string): ExercisePrescription {
  const firstSet = exercise.sets[0];
  return {
    ...exercise,
    sets: firstSet ? [{ ...firstSet, setLabel: `trimmed ${firstSet.setLabel}` }] : exercise.sets,
    coachingNotes: [...exercise.coachingNotes, reason],
    safetyNotes: [...exercise.safetyNotes, "Optional volume trimmed today."]
  };
}

function section(name: string, intent: string, durationMinutes: number, exercises: readonly ExercisePrescription[]): WorkoutSection {
  return { name, intent, durationMinutes, exercises };
}

function familyOverride(input: BuildDetailedTrainingSessionInput): GeneratedSessionFamily {
  if (input.generatedSession.executionReadinessStatus === "red_hard_stop" || (input.readiness.color === "red" && input.readiness.hardStops.length > 0)) {
    return "recovery_reset";
  }
  if (hasHardBoxingAnchor(input.protectedWorkouts, input.generatedSession.date) && input.generatedSession.family !== "recovery_reset") {
    return "shoulder_scap_durability";
  }
  if (input.phase?.phase === "tournament" && isHighIntensityFamily(input.generatedSession.family)) {
    return "hip_ankle_mobility";
  }
  if (input.phase?.phase === "fight_week" && isHighIntensityFamily(input.generatedSession.family)) {
    return "taper_maintenance";
  }
  return input.generatedSession.family;
}

function templateForDetail(input: BuildDetailedTrainingSessionInput, family: GeneratedSessionFamily, hardAnchor: boolean): WorkoutTemplate {
  const byTitle = family === input.generatedSession.family ? findWorkoutTemplateByTitle(family, input.generatedSession.title) : null;
  if (byTitle) {
    return byTitle;
  }
  return selectWorkoutTemplate({
    family,
    equipmentAccess: input.equipmentAccess,
    novice: isNovice(input.athlete),
    readinessColor: input.readiness.color,
    highCycleSymptoms: input.cycle.symptomBurden === "high",
    protectedHard: hardAnchor,
    conservativeFueling: input.generatedSession.fuelDemand === "low",
    volumeStrategy: input.phase?.phase === "fight_week" ? "taper" : input.phase?.phase === "tournament" ? "tournament_conserve" : undefined
  });
}

function exerciseForSection(input: BuildDetailedTrainingSessionInput, templateSection: WorkoutTemplateSection, exerciseId: string): ExercisePrescription {
  const base = prescription(input, exerciseId);
  if (input.phase?.phase === "fight_week" && templateSection.sectionType !== "warmup" && templateSection.sectionType !== "cooldown" && templateSection.sectionType !== "reset") {
    return trimExercise(base, "Fight week: volume is intentionally dropped.");
  }
  if (input.cycle.symptomBurden === "high" && templateSection.sectionType !== "warmup" && templateSection.sectionType !== "cooldown" && templateSection.sectionType !== "reset") {
    return trimExercise(base, "High symptoms: keep this as a small optional dose.");
  }
  return base;
}

function sectionsFromTemplate(input: BuildDetailedTrainingSessionInput, templateItem: WorkoutTemplate, targetDurationMinutes: number): readonly WorkoutSection[] {
  const durations = sectionDurationPlan(templateItem, targetDurationMinutes);
  return templateItem.sections.map((templateSection, index) =>
    section(
      plainSectionName(templateSection.name),
      plainSectionIntent(templateSection.intent),
      durations[index] ?? 0,
      templateSection.exerciseIds.map((exerciseId) => exerciseForSection(input, templateSection, exerciseId))
    )
  );
}

function whyForFamily(family: GeneratedSessionFamily): string {
  return plainGeneratedSessionFamilyWhy(family);
}

function athleteQualityCuesForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_") || family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return [`Main focus: ${theme ?? "stance, guard return, balance, and reset"}.`, "Last round should still look clean.", "Simplify if the cue breaks twice."];
  }
  return ["Keep speed, posture, timing, and breathing clean."];
}

function sessionQualityCheckpointsForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_")) {
    return [theme ? `${theme} stays clear.` : "The main boxing skill stays clear.", "Guard returns first.", "Feet reset before speed rises."];
  }
  if (family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return ["Brake quietly.", "Return to stance.", "Stop before coordination fades."];
  }
  if (family.startsWith("strength_")) {
    return ["No grinding reps.", "Trunk and shoulders stay clean.", "Cooldown restores boxing positions."];
  }
  if (family.startsWith("roadwork") || family === "round_based_conditioning" || family === "alactic_sprints") {
    return ["Breathing stays controlled.", "Gait and posture stay clean.", "Stop before chasing fatigue."];
  }
  return ["Move easier after.", "No symptom increase.", "Protect tomorrow's boxing."];
}

function selfCheckCuesForFamily(family: GeneratedSessionFamily): readonly string[] {
  if (family.startsWith("boxing_")) {
    return ["What stayed clean?", "What broke first?", "What should stay simple next time?"];
  }
  if (family.startsWith("strength_") || family.startsWith("power_")) {
    return ["Did every rep stay fast or clean?", "Did posture change under fatigue?", "Did the reset restore boxing positions?"];
  }
  return ["Did this leave you better for the next boxing session?", "Did symptoms change?", "What should you keep next time?"];
}

function filmCueForFamily(family: GeneratedSessionFamily, roundStructure?: string | undefined): string {
  if (family.startsWith("boxing_")) {
    return `Optional: film one round${roundStructure ? ` from ${roundStructure}` : ""}. Check guard, stance, breathing, and reset.`;
  }
  if (family === "agility_reactive_footwork") {
    return "Optional: film one short set and check quiet braking.";
  }
  return "Use one self-review note only if it helps the next boxing session.";
}

export function buildDetailedTrainingSession(input: BuildDetailedTrainingSessionInput): DetailedTrainingSession {
  const family = familyOverride(input);
  const hardAnchor = hasHardBoxingAnchor(input.protectedWorkouts, input.generatedSession.date);
  const templateItem = templateForDetail(input, family, hardAnchor);
  const durationMinutes =
    family === "recovery_reset"
      ? Math.min(input.generatedSession.durationMinutes, 20)
      : hardAnchor
        ? Math.min(input.generatedSession.durationMinutes, 35)
        : input.phase?.phase === "fight_week"
          ? Math.min(input.generatedSession.durationMinutes, 30)
          : input.phase?.phase === "tournament"
            ? Math.min(input.generatedSession.durationMinutes, 25)
            : input.cycle.symptomBurden === "high"
              ? Math.min(input.generatedSession.durationMinutes, 35)
              : input.generatedSession.durationMinutes;
  const sections = sectionsFromTemplate(input, templateItem, durationMinutes);
  const readinessModifications = [
    ...input.generatedSession.modifications,
    ...(input.generatedSession.executionReadinessStatus === "red_hard_stop" ? ["Safety symptoms changed this to recovery."] : []),
    ...(hardAnchor ? ["Hard boxing already owns the stress today; keep this short and easy."] : []),
    ...(input.phase?.phase === "tournament" && family !== input.generatedSession.family ? ["Tournament mode removes hard conditioning."] : []),
    ...(input.phase?.phase === "fight_week" && family !== input.generatedSession.family ? ["Fight week trims volume and keeps speed fresh."] : []),
    ...(input.painNotes && input.painNotes.length > 0 ? ["Pain noted: stop if symptoms rise."] : []),
    ...(input.generatedSession.readinessGate ? [input.generatedSession.readinessGate] : []),
    ...(input.generatedSession.confidenceImpact ? [input.generatedSession.confidenceImpact] : [])
  ];
  const cycleModifications =
    input.cycle.symptomBurden === "high"
      ? ["High cycle symptoms: optional volume trimmed; use symptoms, not phase certainty, to adjust."]
      : input.cycle.trackingEnabled
        ? [input.cycle.trainingAdjustment]
        : [];
  const allStopConditions = new Set([
    ...templateItem.stopConditions,
    ...sections.flatMap((workoutSection) => workoutSection.exercises.flatMap((exercise) => exercise.stopConditions))
  ]);
  const allSafetyNotes = new Set([
    ...templateItem.safetyNotes,
    ...sections.flatMap((workoutSection) => workoutSection.exercises.flatMap((exercise) => exercise.safetyNotes))
  ]);

  return {
    generatedSessionId: input.generatedSession.id,
    date: input.generatedSession.date,
    family,
    title: family === "recovery_reset" ? "Recovery reset" : plainWorkoutTitle(templateItem.title, family),
    durationMinutes,
    intensity: family === "recovery_reset" ? "recovery" : hardAnchor || input.phase?.phase === "tournament" ? "easy" : input.phase?.phase === "fight_week" ? "easy" : input.generatedSession.intensity,
    sections,
    fuelDemand: input.generatedSession.fuelDemand,
    readinessModifications,
    cycleModifications,
    whyThisMattersForBoxing: whyForFamily(family),
    stopConditions: [...allStopConditions, "Stop if dizziness, fainting, chest pain, or unusual pain appears."],
    safetyNotes: [...allSafetyNotes, "Live exchange work is out of scope; avoid aggressive neck loading or fatigue-chasing finishers."],
    noGeneratedSparring: true,
    boxingSkillTheme: input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme,
    tacticalTheme: input.generatedSession.tacticalTheme ?? templateItem.tacticalTheme,
    technicalEmphasis: input.generatedSession.technicalEmphasis ?? templateItem.technicalEmphasis,
    roundStructure: input.generatedSession.roundStructure ?? templateItem.roundStructure,
    skillLevel: input.generatedSession.skillLevel,
    equipmentMode: input.generatedSession.equipmentMode ?? templateItem.equipmentMode,
    addOnBlocks: input.generatedSession.addOnBlocks ?? templateItem.addOnBlocks,
    sessionPriority: input.generatedSession.sessionPriority ?? templateItem.sessionPriority,
    athleteQualityCues: athleteQualityCuesForFamily(family, input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme),
    sessionQualityCheckpoints: sessionQualityCheckpointsForFamily(family, input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme),
    selfCheckCues: selfCheckCuesForFamily(family),
    filmCue: filmCueForFamily(family, input.generatedSession.roundStructure ?? templateItem.roundStructure),
    nextSessionNote: "Keep the cleanest cue from today and simplify the next exposure before adding volume.",
    readinessGate: input.generatedSession.readinessGate,
    fuelingGate: input.generatedSession.fuelingGate,
    hydrationGate: input.generatedSession.hydrationGate,
    executionReadinessStatus: input.generatedSession.executionReadinessStatus,
    preSessionChecklist: input.generatedSession.preSessionChecklist,
    downshiftIf: input.generatedSession.downshiftIf,
    fuelBefore: input.generatedSession.fuelBefore,
    fuelAfter: input.generatedSession.fuelAfter,
    confidenceImpact: input.generatedSession.confidenceImpact,
    missingDataAdvisories: input.generatedSession.missingDataAdvisories
  };
}
