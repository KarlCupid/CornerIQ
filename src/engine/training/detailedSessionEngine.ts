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
  if (input.readiness.color === "red") {
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
      templateSection.name,
      templateSection.intent,
      durations[index] ?? 0,
      templateSection.exerciseIds.map((exerciseId) => exerciseForSection(input, templateSection, exerciseId))
    )
  );
}

function whyForFamily(family: GeneratedSessionFamily): string {
  switch (family) {
    case "boxing_technical_shadowboxing":
      return "Technical shadowboxing develops stance, guard, jab entries, exits, and self-review without requiring equipment.";
    case "boxing_bag_skill":
      return "Bag skill turns equipment access into accuracy, distance, exit, and defense-after-combination practice with a quality cap.";
    case "boxing_footwork_ringcraft":
      return "Ringcraft work develops angle control, corner escape, and stance recovery so movement becomes tactical.";
    case "boxing_defense_movement":
      return "Defense movement work builds slip, roll, pivot, and reset habits while keeping head movement small and controlled.";
    case "boxing_jab_entry_exit":
      return "Jab-system work links lead-hand mechanics to entries and exits so the boxer wins position before adding volume.";
    case "boxing_counter_timing":
      return "Counter-timing work develops rhythm breaks, draw-counter shape, and foot reset with solo cues.";
    case "boxing_round_skill_circuit":
      return "Round skill circuits carry technical constraints through boxing-length rounds while stopping before quality collapses.";
    case "agility_reactive_footwork":
      return "Reactive footwork builds first-step quality, braking, pivots, and stance recovery with low volume.";
    case "mobility_recovery_flow":
      return "Mobility and recovery flow restores boxing positions and optional easy skill touch without adding another hard stress.";
    case "movement_quality_prep":
      return "Movement quality prep primes stance range, guard posture, trunk control, and shoulders before the main stimulus.";
    case "strength_full_body":
    case "strength_lower":
    case "strength_upper":
      return "Strength support builds force transfer, trunk stiffness, and stance durability without replacing boxing practice.";
    case "roadwork_zone2":
      return "Zone 2 roadwork builds the aerobic base that helps recovery between rounds and between hard sessions.";
    case "roadwork_tempo":
    case "roadwork_intervals":
      return "Roadwork support builds repeatable conditioning with clear intensity gates so boxing quality stays protected.";
    case "power_rotational":
      return "Rotational power work keeps speed crisp and low-volume so punching transfer improves without fatigue chasing.";
    case "power_lower":
    case "power_upper":
      return "Power support keeps fast force production crisp while stopping before fatigue changes skill quality.";
    case "alactic_sprints":
      return "Alactic sprint support trains short bursts with full recovery and strict stop gates.";
    case "round_based_conditioning":
      return "Round-based conditioning supports boxing work capacity without replacing protected technical boxing practice.";
    case "taper_maintenance":
      return "Taper work preserves speed while dropping volume so boxing sharpness stays protected.";
    case "recovery_reset":
      return "Recovery detail protects health and tomorrow's boxing when readiness or symptoms say hard work is not appropriate.";
    default:
      return "Durability support keeps shoulders, trunk, and movement quality available for boxing-specific training.";
  }
}

function athleteQualityCuesForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_") || family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return [
      `Keep the main focus visible: ${theme ?? "stance, guard return, balance, and reset quality"}.`,
      "Stay clean enough that the last round still looks like boxing.",
      "Simplify before adding volume when the cue breaks twice."
    ];
  }
  return ["Keep speed, posture, timing, and breathing clean enough to protect the next boxing exposure."];
}

function sessionQualityCheckpointsForFamily(family: GeneratedSessionFamily, theme?: string | undefined): readonly string[] {
  if (family.startsWith("boxing_")) {
    return [
      theme ? `${theme} stays recognizable from first round to last.` : "The main boxing skill stays recognizable from first round to last.",
      "Guard returns before the next action.",
      "Feet recover to stance before speed or volume rises."
    ];
  }
  if (family === "agility_reactive_footwork" || family === "movement_quality_prep") {
    return ["Feet brake quietly before the next cue.", "Stance width returns after every step.", "The drill ends before coordination fades."];
  }
  if (family.startsWith("strength_")) {
    return ["No grinding reps.", "Trunk and shoulder position stay clean.", "The cooldown restores boxing positions."];
  }
  if (family.startsWith("roadwork") || family === "round_based_conditioning" || family === "alactic_sprints") {
    return ["Breathing stays inside the session cap.", "Gait and posture stay clean.", "Stop before conditioning turns into fatigue chasing."];
  }
  return ["Movement feels easier after the session.", "No symptom increase.", "Tomorrow's boxing quality is protected."];
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
    return `Film one technical round${roundStructure ? ` from ${roundStructure}` : ""} and check guard return, stance width, breathing, and reset after the final action.`;
  }
  if (family === "agility_reactive_footwork") {
    return "Film one short callout set and check whether feet brake quietly before the next cue.";
  }
  return "Use one self-review note only if it improves tomorrow's boxing quality.";
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
    ...(input.readiness.color === "red" ? ["Red readiness: generated work changed to recovery detail."] : []),
    ...(hardAnchor ? ["Protected hard boxing or competition owns hard stress today; detail stays short and easy."] : []),
    ...(input.phase?.phase === "tournament" && family !== input.generatedSession.family ? ["Tournament mode: hard conditioning is removed and no dehydration pressure is added."] : []),
    ...(input.phase?.phase === "fight_week" && family !== input.generatedSession.family ? ["Fight week: volume is trimmed to taper-safe speed and durability support."] : []),
    ...(input.painNotes && input.painNotes.length > 0 ? ["Pain note present: stop on symptom increase and seek qualified clinical help if it persists."] : [])
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
    title: family === input.generatedSession.family ? templateItem.title : family === "recovery_reset" ? "Recovery reset detail" : templateItem.title,
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
    nextSessionNote: "Keep the cleanest cue from today and simplify the next exposure before adding volume."
  };
}
