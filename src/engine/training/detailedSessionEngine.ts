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
  return ["power_lower", "power_rotational", "power_upper", "alactic_sprints", "roadwork_intervals", "roadwork_tempo", "round_based_conditioning", "strength_lower", "strength_upper", "strength_full_body"].includes(family);
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

function lowerStrengthSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const novice = isNovice(input.athlete);
  const highSymptoms = input.cycle.symptomBurden === "high";
  const hinge = prescription(input, novice ? "hip_hinge_rdl" : "trap_bar_deadlift");
  const splitSquat = prescription(input, novice ? "split_squat_iso" : "rear_foot_elevated_split_squat");
  const ankle = prescription(input, "calf_ankle_capacity");
  return [
    section("Warm-up", "Open hips, ankles, and trunk before lower-body loading.", [prescription(input, "movement_prep_flow")]),
    section("Lower-body strength", "Build stance force without grinding reps.", [hinge]),
    section("Unilateral stance capacity", "Keep split-stance control specific to boxing movement.", [highSymptoms ? trimExercise(splitSquat, "High cycle symptoms: trim unilateral volume.") : splitSquat]),
    section("Ankle and trunk support", "Finish with lower-leg capacity and anti-extension control.", [highSymptoms ? trimExercise(ankle, "High cycle symptoms: keep ankle work easy.") : ankle, prescription(input, "dead_bug_anti_extension")]),
    section("Cooldown", "Restore hips and breathing after loading.", [prescription(input, "mobility_reset_flow")])
  ];
}

function upperStrengthSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const press = prescription(input, "landmine_press");
  const row = prescription(input, "one_arm_row");
  const serratus = prescription(input, "serratus_wall_slide");
  return [
    section("Warm-up", "Prepare shoulders, ribs, and upper back before pressing or pulling.", [prescription(input, "movement_prep_flow")]),
    section("Press and reach strength", "Build guard-friendly pressing without max loading.", [highSymptoms ? trimExercise(press, "High cycle symptoms: one clean press set only.") : press]),
    section("Pulling strength", "Balance punching volume with upper-back strength.", [row]),
    section("Scap and trunk durability", "Keep the shoulder blade and ribs controlled after strength work.", [serratus, prescription(input, "pallof_press")]),
    section("Cooldown", "Downshift shoulder tone before the next boxing exposure.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function shoulderScapSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const externalRotation = prescription(input, "band_external_rotation");
  const pushUpPlus = prescription(input, "push_up_plus");
  const serratus = prescription(input, "serratus_wall_slide");
  const ytwl = prescription(input, "ytwl_raise");
  return [
    section("Warm-up", "Easy shoulder and trunk prep.", [prescription(input, "movement_prep_flow")]),
    section("Shoulder and scap durability", "Short, easy control work around protected boxing.", [highSymptoms ? trimExercise(externalRotation, "High symptoms: keep this as a microdose.") : externalRotation, pushUpPlus, serratus, ytwl]),
    section("Trunk reset", "Finish with low-stress anti-rotation and breathing.", [prescription(input, "pallof_press"), prescription(input, "recovery_breathing_mobility")])
  ];
}

function trunkDurabilitySections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const antiExtension = prescription(input, "dead_bug_anti_extension");
  const adductor = prescription(input, "adductor_side_plank_regression");
  return [
    section("Warm-up", "Open hips and ribs without fatigue.", [prescription(input, "movement_prep_flow")]),
    section("Anti-extension and anti-rotation", "Build trunk stiffness for force transfer.", [highSymptoms ? trimExercise(antiExtension, "High symptoms: keep trunk work easy.") : antiExtension, prescription(input, "pallof_press")]),
    section("Adductor and stance durability", "Support wide stance positions and direction changes.", [highSymptoms ? trimExercise(adductor, "High symptoms: one easy side-plank set only.") : adductor]),
    section("Reset", "Leave the trunk calmer, not exhausted.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function wristHandSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const wrist = prescription(input, "wrist_pronation_supination");
  const grip = prescription(input, "grip_endurance_carry");
  return [
    section("Warm-up", "Easy shoulder, wrist, and hand prep.", [prescription(input, "movement_prep_flow")]),
    section("Wrist and hand durability", "Build small-dose capacity for wraps, bag work, and guard tension.", [highSymptoms ? trimExercise(wrist, "High symptoms: use a small microdose.") : wrist, grip]),
    section("Shoulder balance", "Keep hand work connected to scap control.", [prescription(input, "band_external_rotation"), prescription(input, "serratus_wall_slide")]),
    section("Reset", "Release grip tension and downshift.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function hipAnkleSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  const highSymptoms = input.cycle.symptomBurden === "high";
  const lateral = prescription(input, "lateral_lunge_regression");
  const ankle = prescription(input, "calf_ankle_capacity");
  return [
    section("Warm-up", "Easy range before stance mobility.", [prescription(input, "movement_prep_flow")]),
    section("Hip and lateral range", "Build side-to-side positions without forcing depth.", [highSymptoms ? trimExercise(lateral, "High symptoms: trim lateral volume.") : lateral]),
    section("Ankle capacity", "Support footwork bounce and braking with low stress.", [highSymptoms ? trimExercise(ankle, "High symptoms: easy ankle set only.") : ankle]),
    section("Mobility reset", "Finish with pain-free range and breathing.", [prescription(input, "mobility_reset_flow")])
  ];
}

function zone2RoadworkSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Check gait and breathing before easy aerobic work.", [prescription(input, "movement_prep_flow")]),
    section("Zone 2 roadwork", "Talk-test aerobic work for repeatable recovery.", [prescription(input, "zone2_roadwork_talk_test")]),
    section("Reset", "Restore easy range after roadwork.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function tempoRoadworkSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Check gait, breathing, and readiness before tempo work.", [prescription(input, "movement_prep_flow")]),
    section("Tempo roadwork", "Controlled tempo support without racing the workout.", [prescription(input, "tempo_roadwork")]),
    section("Reset", "Bring breathing down before the next training stress.", [prescription(input, "mobility_reset_flow")])
  ];
}

function intervalRoadworkSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Warm up enough to protect gait and calves.", [prescription(input, "movement_prep_flow")]),
    section("Roadwork intervals", "Short controlled efforts with clear intensity boundaries.", [prescription(input, "bike_rower_zone2"), prescription(input, "tempo_roadwork")]),
    section("Reset", "Stop while mechanics are still clean.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function alacticSprintSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Prepare ankles, hips, and landing mechanics before fast work.", [prescription(input, "movement_prep_flow"), prescription(input, "snap_down_landing")]),
    section("Alactic sprint support", "Very short efforts with full recovery and strict gates.", [prescription(input, "alactic_sprint_gated")]),
    section("Reset", "Downshift calves and breathing.", [prescription(input, "mobility_reset_flow")])
  ];
}

function roundConditioningSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Prep", "Warm up movement and breathing before round-based work.", [prescription(input, "movement_prep_flow")]),
    section("Round-based conditioning", "Solo conditioning in boxing round structure without partner impact.", [prescription(input, "round_based_conditioning_support")]),
    section("Reset", "Finish before quality drops.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function rotationalPowerSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Warm-up", "Prepare rotation without fatigue.", [prescription(input, "movement_prep_flow")]),
    section("Rotational power", "Low-volume intent with full recovery.", [prescription(input, "med_ball_rotational_throw"), prescription(input, "med_ball_scoop_toss")]),
    section("Trunk control", "Hold transfer positions after speed work.", [prescription(input, "pallof_press")]),
    section("Cooldown", "Downshift before boxing or the next day.", [prescription(input, "recovery_breathing_mobility")])
  ];
}

function lowerPowerSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Warm-up", "Prepare ankles and landings without fatigue.", [prescription(input, "movement_prep_flow")]),
    section("Lower-body power", "Tiny dose of fast, quiet ground strikes only.", [prescription(input, "snap_down_landing"), prescription(input, "low_amplitude_pogo")]),
    section("Ankle capacity", "Keep the lower leg resilient after speed work.", [prescription(input, "calf_ankle_capacity")]),
    section("Cooldown", "Leave springy, not tired.", [prescription(input, "mobility_reset_flow")])
  ];
}

function upperPowerSections(input: BuildDetailedTrainingSessionInput): readonly WorkoutSection[] {
  return [
    section("Warm-up", "Prepare shoulder blade control before throws.", [prescription(input, "movement_prep_flow"), prescription(input, "serratus_wall_slide")]),
    section("Upper-body power", "Low-volume throws or band speed with full recovery.", [prescription(input, "med_ball_shot_put_throw")]),
    section("Deceleration support", "Balance speed with rotator-cuff and upper-back control.", [prescription(input, "band_external_rotation"), prescription(input, "one_arm_row")]),
    section("Cooldown", "Downshift shoulders and grip.", [prescription(input, "recovery_breathing_mobility")])
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
    section("Recovery reset", "Easy breathing, mobility, and optional walk only.", [prescription(input, "recovery_breathing_mobility"), prescription(input, "easy_walk_reset")])
  ];
}

function sectionsForFamily(input: BuildDetailedTrainingSessionInput, family: GeneratedSessionFamily): readonly WorkoutSection[] {
  switch (family) {
    case "strength_full_body":
      return strengthSections(input);
    case "strength_lower":
      return lowerStrengthSections(input);
    case "strength_upper":
      return upperStrengthSections(input);
    case "shoulder_scap_durability":
    case "neck_trap_durability":
      return shoulderScapSections(input);
    case "trunk_durability":
      return trunkDurabilitySections(input);
    case "wrist_hand_durability":
      return wristHandSections(input);
    case "hip_ankle_mobility":
      return hipAnkleSections(input);
    case "roadwork_zone2":
      return zone2RoadworkSections(input);
    case "roadwork_tempo":
      return tempoRoadworkSections(input);
    case "roadwork_intervals":
      return intervalRoadworkSections(input);
    case "alactic_sprints":
      return alacticSprintSections(input);
    case "round_based_conditioning":
      return roundConditioningSections(input);
    case "power_rotational":
      return rotationalPowerSections(input);
    case "power_lower":
      return lowerPowerSections(input);
    case "power_upper":
      return upperPowerSections(input);
    case "footwork_agility":
    case "reaction_rhythm":
      return lowerPowerSections(input);
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
  if (input.phase?.phase === "tournament" && isHighIntensityFamily(input.generatedSession.family)) {
    return "hip_ankle_mobility";
  }
  if (input.phase?.phase === "fight_week" && isHighIntensityFamily(input.generatedSession.family)) {
    return "taper_maintenance";
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
      return "Round-based conditioning supports boxing work capacity without replacing coached skill practice.";
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
    ...(input.phase?.phase === "tournament" && family !== input.generatedSession.family ? ["Tournament mode: hard conditioning is removed and no dehydration pressure is added."] : []),
    ...(input.phase?.phase === "fight_week" && family !== input.generatedSession.family ? ["Fight week: volume is trimmed to taper-safe speed and durability support."] : []),
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
          : input.phase?.phase === "fight_week"
            ? Math.min(input.generatedSession.durationMinutes, 25)
            : input.phase?.phase === "tournament"
              ? Math.min(input.generatedSession.durationMinutes, 20)
          : input.cycle.symptomBurden === "high"
            ? Math.min(input.generatedSession.durationMinutes, 30)
            : input.generatedSession.durationMinutes,
    intensity: family === "recovery_reset" ? "recovery" : hardAnchor || input.phase?.phase === "tournament" ? "easy" : input.phase?.phase === "fight_week" ? "easy" : input.generatedSession.intensity,
    sections,
    fuelDemand: input.generatedSession.fuelDemand,
    readinessModifications,
    cycleModifications,
    whyThisMattersForBoxing: whyForFamily(family),
    stopConditions: [...allStopConditions, "Stop if dizziness, fainting, chest pain, or unusual pain appears."],
    safetyNotes: [...allSafetyNotes, "No partner-impact drills, aggressive neck loading, or fatigue-chasing finishers."],
    noGeneratedSparring: true
  };
}
