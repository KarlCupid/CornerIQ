import type {
  AthleteProfile,
  CycleState,
  DetailedTrainingSession,
  ExercisePrescription,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  ProtectedWorkout,
  ReadinessState,
  WorkoutSection
} from "../core/types";
import { prescribeExercise } from "./substitutionEngine";

export interface BuildDetailedTrainingSessionInput {
  generatedSession: GeneratedTrainingSession;
  athlete: AthleteProfile;
  readiness: ReadinessState;
  cycle: CycleState;
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

function section(name: string, intent: string, exercises: readonly ExercisePrescription[]): WorkoutSection {
  return { name, intent, exercises };
}

function strengthSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const novice = isNovice(input.athlete);
  const highSymptoms = input.cycle.symptomBurden === "high";
  const main = prescription(input, novice ? "goblet_squat_to_box" : "trap_bar_deadlift");
  const secondary = prescription(input, "split_squat_iso");
  const upper = prescription(input, "band_row");
  const trunk = prescription(input, "pallof_press");
  const durability = prescription(input, "push_up_plus");
  return [
    section("Warm-up", "Open hips, trunk, and shoulders before loading.", [prescription(input, "movement_prep_flow")]),
    section("Main strength", "Low-rep force work with clean reps only.", [main]),
    section("Secondary and unilateral strength", "Build stance durability without a fatigue finisher.", [highSymptoms ? trimExercise(secondary, "High cycle symptoms: one quality set is enough.") : secondary]),
    section("Trunk and shoulder durability", "Keep punch-transfer positions resilient.", [highSymptoms ? trimExercise(trunk, "High cycle symptoms: trimmed trunk volume.") : trunk, durability, upper]),
    section("Cooldown", "Downshift and restore range.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function shoulderScapSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const externalRotation = prescription(input, "band_external_rotation");
  const pushUpPlus = prescription(input, "push_up_plus");
  const trunk = prescription(input, "pallof_press");
  return [
    section("Warm-up", "Easy shoulder and trunk prep.", [prescription(input, "movement_prep_flow")]),
    section("Shoulder and scap durability", "Short, easy control work around protected boxing.", [highSymptoms ? trimExercise(externalRotation, "High symptoms: keep this as a microdose.") : externalRotation, pushUpPlus]),
    section("Trunk reset", "Finish with low-stress anti-rotation and breathing.", [highSymptoms ? trimExercise(trunk, "High symptoms: one easy set only.") : trunk, prescription(input, "recovery_breathing_mobility")])
  ];
}

function roadworkSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Check gait and breathing before easy aerobic work.", [prescription(input, "movement_prep_flow")]),
    section("Zone 2 roadwork", "Talk-test aerobic work for repeatable recovery.", [prescription(input, "zone2_roadwork_talk_test")]),
    section("Reset", "Restore easy range after roadwork.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function powerSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Warm-up", "Prepare rotation without fatigue.", [prescription(input, "movement_prep_flow")]),
    section("Rotational power", "Low-volume intent with full recovery.", [prescription(input, "med_ball_rotational_throw")]),
    section("Trunk control", "Hold transfer positions after speed work.", [prescription(input, "pallof_press")]),
    section("Cooldown", "Downshift before boxing or the next day.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function taperSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Warm-up", "Stay warm without adding fatigue.", [prescription(input, "movement_prep_flow")]),
    section("Speed maintenance", "Tiny dose of speed, long rests, no fatigue chasing.", [prescription(input, "taper_speed_step"), trimExercise(prescription(input, "med_ball_rotational_throw"), "Fight week: volume is intentionally dropped.")]),
    section("Shoulder tune-up", "Keep the guard and shoulder rhythm fresh.", [trimExercise(prescription(input, "band_external_rotation"), "Taper keeps durability work short.")]),
    section("Reset", "Leave fresher than you started.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function recoverySections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Recovery reset", "Easy breathing, mobility, and optional walk only.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function sectionsForFamily(input: BuildDetailedTrainingSessionInput, family: GeneratedSessionFamily): readonly WorkoutSection[] {
  switch (family) {
    case "strength_full_body":
    case "strength_lower":
    case "strength_upper":
      return strengthSections(input);
    case "shoulder_scap_durability":
    case "trunk_durability":
    case "wrist_hand_durability":
    case "hip_ankle_mobility":
    case "neck_trap_durability":
      return shoulderScapSections(input);
    case "roadwork_zone2":
    case "roadwork_tempo":
    case "roadwork_intervals":
    case "alactic_sprints":
    case "round_based_conditioning":
      return roadworkSections(input);
    case "power_rotational":
    case "power_lower":
    case "power_upper":
    case "footwork_agility":
    case "reaction_rhythm":
      return powerSections(input);
    case "taper_maintenance":
      return taperSections(input);
    case "recovery_reset":
      return recoverySections(input);
  }
}

function familyOverride(input: BuildDetailedTrainingSessionInput): GeneratedSessionFamily {
  if (input.readiness.color === "red") {
    return "recovery_reset";
  }
  if (hasHardBoxingAnchor(input.protectedWorkouts, input.generatedSession.date) && input.generatedSession.family !== "recovery_reset") {
    return "shoulder_scap_durability";
  }
  return input.generatedSession.family;
}

function whyForFamily(family: GeneratedSessionFamily): string {
  switch (family) {
    case "strength_full_body":
    case "strength_lower":
    case "strength_upper":
      return "Strength support builds force transfer, trunk stiffness, and stance durability without replacing boxing practice.";
    case "roadwork_zone2":
      return "Zone 2 roadwork builds the aerobic base that helps recovery between rounds and between hard sessions.";
    case "power_rotational":
      return "Rotational power work keeps speed crisp and low-volume so punching transfer improves without fatigue chasing.";
    case "taper_maintenance":
      return "Taper work preserves speed while dropping volume so boxing sharpness stays protected.";
    case "recovery_reset":
      return "Recovery detail protects health and tomorrow's boxing when readiness or symptoms say hard work is not appropriate.";
    default:
      return "Durability support keeps shoulders, trunk, and movement quality available for boxing-specific training.";
  }
}

export function buildDetailedTrainingSession(input: BuildDetailedTrainingSessionInput): DetailedTrainingSession {
  const family = familyOverride(input);
  const hardAnchor = hasHardBoxingAnchor(input.protectedWorkouts, input.generatedSession.date);
  const readinessModifications = [
    ...input.generatedSession.modifications,
    ...(input.readiness.color === "red" ? ["Red readiness: generated work changed to recovery detail."] : []),
    ...(hardAnchor ? ["Protected hard boxing or competition owns hard stress today; detail stays short and easy."] : []),
    ...(input.painNotes && input.painNotes.length > 0 ? ["Pain note present: stop on symptom increase and seek coach/clinician review if it persists."] : [])
  ];
  const cycleModifications =
    input.cycle.symptomBurden === "high"
      ? ["High cycle symptoms: optional volume trimmed; use symptoms, not phase certainty, to adjust."]
      : input.cycle.trackingEnabled
        ? [input.cycle.trainingAdjustment]
        : [];
  const sections = sectionsForFamily(input, family);
  const allStopConditions = new Set(sections.flatMap((workoutSection) => workoutSection.exercises.flatMap((exercise) => exercise.stopConditions)));
  const allSafetyNotes = new Set(sections.flatMap((workoutSection) => workoutSection.exercises.flatMap((exercise) => exercise.safetyNotes)));

  return {
    generatedSessionId: input.generatedSession.id,
    date: input.generatedSession.date,
    family,
    title: family === input.generatedSession.family ? input.generatedSession.title : family === "recovery_reset" ? "Recovery reset detail" : "Hard-day support detail",
    durationMinutes:
      family === "recovery_reset"
        ? Math.min(input.generatedSession.durationMinutes, 20)
        : hardAnchor
          ? Math.min(input.generatedSession.durationMinutes, 20)
          : input.cycle.symptomBurden === "high"
            ? Math.min(input.generatedSession.durationMinutes, 30)
            : input.generatedSession.durationMinutes,
    intensity: family === "recovery_reset" ? "recovery" : hardAnchor ? "easy" : input.generatedSession.intensity,
    sections,
    fuelDemand: input.generatedSession.fuelDemand,
    readinessModifications,
    cycleModifications,
    whyThisMattersForBoxing: whyForFamily(family),
    stopConditions: [...allStopConditions, "Stop if dizziness, fainting, chest pain, or unusual pain appears."],
    safetyNotes: [...allSafetyNotes, "No partner-impact drills, loaded neck bridges, or fatigue-chasing finishers."],
    noGeneratedSparring: true
  };
}
