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
  WorkoutRoundPlan,
  WorkoutSection
} from "../core/types";
import { prescribeExercise } from "./substitutionEngine";
import { findWorkoutTemplateByTitle, sectionDurationPlan, selectWorkoutTemplate, type WorkoutTemplate, type WorkoutTemplateSection } from "./workoutTemplateCatalog";
import { plainGeneratedSessionFamilyWhy, plainSectionIntent, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "../presentation/trainingCopy";

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

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function timeLabel(value: string): string {
  const cleaned = value.trim().replace(/\bsecs?\b/gi, "sec").replace(/\bmins?\b/gi, "min");
  const clock = cleaned.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!clock?.[1] || !clock[2]) {
    return cleaned;
  }
  const minutes = Number(clock[1]);
  const seconds = Number(clock[2]);
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function exerciseDose(exercise: ExercisePrescription): string {
  const firstSet = exercise.sets[0];
  const setCount = Math.max(1, exercise.sets.length);
  const dose = [
    countLabel(setCount, "set"),
    exercise.repsText ?? firstSet?.repsText,
    exercise.durationText ?? firstSet?.durationText,
    exercise.rpeTarget ?? firstSet?.rpeTarget ? `RPE ${exercise.rpeTarget ?? firstSet?.rpeTarget}` : undefined,
    exercise.rirTarget ?? firstSet?.rirTarget ? `RIR ${exercise.rirTarget ?? firstSet?.rirTarget}` : undefined
  ].filter((item): item is string => Boolean(item));
  return dose.join(", ");
}

function exerciseInstruction(exercise: ExercisePrescription): string {
  const load = plainTrainingCopy(exercise.loadGuidance);
  const tempo = exercise.tempo ? ` Tempo: ${plainTrainingCopy(exercise.tempo)}.` : "";
  return `${load}${tempo}`;
}

function walkthroughItem(exercise: ExercisePrescription) {
  return {
    exerciseId: exercise.exerciseId,
    title: plainWorkoutTitle(exercise.name),
    dose: exerciseDose(exercise),
    instruction: exerciseInstruction(exercise),
    rest: plainTrainingCopy(exercise.restText),
    cue: plainTrainingCopy(exercise.coachingNotes[0] ?? exercise.boxingTransfer)
  };
}

function sectionInstruction(sectionItem: WorkoutSection): string {
  const intent = plainSectionIntent(sectionItem.intent);
  const exerciseCount = sectionItem.exercises.length;
  const base = `${sectionItem.durationMinutes} min. ${intent}`;
  if (exerciseCount <= 1) {
    return `${base} Complete the listed work, then move on.`;
  }
  return `${base} Work top to bottom before repeating anything.`;
}

function checkpointForSection(sectionItem: WorkoutSection): string {
  const firstExercise = sectionItem.exercises[0];
  if (!firstExercise) {
    return "Move on when breathing and posture are under control.";
  }
  const cue = firstExercise.coachingNotes[0] ?? firstExercise.boxingTransfer;
  return `Move on when this is still true: ${plainTrainingCopy(cue)}`;
}

function parseRoundPlan(roundStructure: string | undefined, family: GeneratedSessionFamily, technicalEmphasis: readonly string[]): WorkoutRoundPlan | null {
  if (!roundStructure) {
    return null;
  }
  const raw = plainTrainingCopy(roundStructure);
  const normalized = raw.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(?:Optional\s+)?(\d+(?:-\d+)?)\s*x\s*(.+)$/i);
  const isRoundFamily = family.startsWith("boxing_") || family === "round_based_conditioning" || family === "agility_reactive_footwork" || family === "reaction_rhythm";
  const defaultInstructions = isRoundFamily
    ? [
        "Start each round in stance. Pick one constraint and keep it for the whole round.",
        "Use the rest to breathe down, loosen shoulders, and check stance before the next round.",
        "Shorten or end the next round if the cue breaks twice."
      ]
    : [
        "Use the work interval for clean movement only.",
        "Rest until breathing and posture are back under control.",
        "End the interval work if speed, gait, or coordination changes."
      ];

  if (!match?.[1] || !match[2]) {
    return {
      format: normalized,
      instructions: technicalEmphasis.length > 0 ? [`Main constraints: ${technicalEmphasis.map(plainTrainingCopy).join(", ")}.`, ...defaultInstructions] : defaultInstructions
    };
  }

  const count = match[1];
  const detail = match[2];
  const restMatch = detail.match(/(?:,\s*|;\s*| with\s+)(\d+(?::[0-5]\d)?(?:\s*-\s*\d+(?::[0-5]\d)?)?|\d+\s*(?:sec|seconds?|min|minutes?))\s*(?:full\s*)?(?:rest|reset)/i);
  const workPart = restMatch?.index === undefined ? detail : detail.slice(0, restMatch.index).trim();
  const workMatch = workPart.match(/^(\d+(?::[0-5]\d)?(?:\s*-\s*\d+(?::[0-5]\d)?)?|\d+\s*(?:sec|seconds?|min|minutes?))\s*(.*)$/i);
  const work = workMatch?.[1] ? timeLabel(workMatch[1]) : workPart;
  const focus = workMatch?.[2]
    ? workMatch[2].replace(/\brounds?\b/gi, "").replace(/\bbouts?\b/gi, "").trim()
    : "";
  const rest = restMatch?.[1] ? timeLabel(restMatch[1]) : null;
  const focusText = focus ? ` for ${focus}` : "";
  const format = `${count} rounds: work ${work} each${focusText}.${rest ? ` Rest ${rest} between rounds.` : ""}`;

  return {
    format,
    instructions: technicalEmphasis.length > 0 ? [`Main constraints: ${technicalEmphasis.map(plainTrainingCopy).join(", ")}.`, ...defaultInstructions] : defaultInstructions
  };
}

function buildWorkoutWalkthrough(input: {
  title: string;
  family: GeneratedSessionFamily;
  durationMinutes: number;
  sections: readonly WorkoutSection[];
  roundStructure?: string | undefined;
  technicalEmphasis?: readonly string[] | undefined;
  preSessionChecklist?: readonly string[] | undefined;
  downshiftIf?: readonly string[] | undefined;
  fuelBefore?: string | undefined;
  stopConditions: readonly string[];
}) {
  const sectionCount = input.sections.length;
  const exerciseCount = input.sections.reduce((total, sectionItem) => total + sectionItem.exercises.length, 0);
  const firstSection = input.sections[0];
  const firstExercise = firstSection?.exercises[0];
  const roundPlan = parseRoundPlan(input.roundStructure, input.family, input.technicalEmphasis ?? []);
  const beforeYouStart = [
    ...(input.preSessionChecklist ?? []).map(plainTrainingCopy),
    input.fuelBefore ? plainTrainingCopy(input.fuelBefore) : undefined,
    "Have water nearby and leave enough space to move in stance.",
    firstSection && firstExercise ? `Start with ${plainSectionName(firstSection.name)}: ${plainWorkoutTitle(firstExercise.name)}.` : "Start with the first listed block."
  ].filter((item): item is string => Boolean(item));

  return {
    title: "Workout walkthrough",
    summary: `${plainWorkoutTitle(input.title, input.family)} is ${input.durationMinutes} min: ${countLabel(sectionCount, "block")}, ${countLabel(exerciseCount, "exercise")}. Follow the blocks in order and keep the quality cue clean before adding effort.`,
    beforeYouStart: [...new Set(beforeYouStart)].slice(0, 4),
    roundPlan,
    steps: input.sections.map((sectionItem, index) => ({
      id: `step:${index}:${sectionItem.name}`,
      label: `Block ${index + 1}`,
      title: plainSectionName(sectionItem.name),
      durationMinutes: sectionItem.durationMinutes,
      instruction: sectionInstruction(sectionItem),
      items: sectionItem.exercises.map(walkthroughItem),
      checkpoint: checkpointForSection(sectionItem)
    })),
    finish: "Finish with breathing down, one note on what stayed clean, and no extra volume.",
    safety: [
      ...(input.downshiftIf ?? []).map(plainTrainingCopy),
      ...input.stopConditions.map(plainTrainingCopy)
    ].slice(0, 4)
  };
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
  const title = family === "recovery_reset" ? "Recovery reset" : plainWorkoutTitle(templateItem.title, family);
  const roundStructure = input.generatedSession.roundStructure ?? templateItem.roundStructure;
  const technicalEmphasis = input.generatedSession.technicalEmphasis ?? templateItem.technicalEmphasis;
  const stopConditions = [...allStopConditions, "Stop if dizziness, fainting, chest pain, or unusual pain appears."];
  const safetyNotes = [...allSafetyNotes, "Live exchange work is out of scope; avoid aggressive neck loading or fatigue-chasing finishers."];
  const walkthrough = buildWorkoutWalkthrough({
    title,
    family,
    durationMinutes,
    sections,
    roundStructure,
    technicalEmphasis,
    preSessionChecklist: input.generatedSession.preSessionChecklist,
    downshiftIf: input.generatedSession.downshiftIf,
    fuelBefore: input.generatedSession.fuelBefore,
    stopConditions
  });

  return {
    generatedSessionId: input.generatedSession.id,
    date: input.generatedSession.date,
    family,
    title,
    durationMinutes,
    intensity: family === "recovery_reset" ? "recovery" : hardAnchor || input.phase?.phase === "tournament" ? "easy" : input.phase?.phase === "fight_week" ? "easy" : input.generatedSession.intensity,
    sections,
    walkthrough,
    fuelDemand: input.generatedSession.fuelDemand,
    readinessModifications,
    cycleModifications,
    whyThisMattersForBoxing: whyForFamily(family),
    stopConditions,
    safetyNotes,
    noGeneratedSparring: true,
    boxingSkillTheme: input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme,
    tacticalTheme: input.generatedSession.tacticalTheme ?? templateItem.tacticalTheme,
    technicalEmphasis,
    roundStructure,
    skillLevel: input.generatedSession.skillLevel,
    equipmentMode: input.generatedSession.equipmentMode ?? templateItem.equipmentMode,
    addOnBlocks: input.generatedSession.addOnBlocks ?? templateItem.addOnBlocks,
    sessionPriority: input.generatedSession.sessionPriority ?? templateItem.sessionPriority,
    athleteQualityCues: athleteQualityCuesForFamily(family, input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme),
    sessionQualityCheckpoints: sessionQualityCheckpointsForFamily(family, input.generatedSession.boxingSkillTheme ?? templateItem.boxingSkillTheme),
    selfCheckCues: selfCheckCuesForFamily(family),
    filmCue: filmCueForFamily(family, roundStructure),
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
