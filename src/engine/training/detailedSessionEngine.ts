import type {
  AthleteProfile,
  CycleState,
  DetailedTrainingSession,
  ExercisePrescription,
  GeneratedSessionAddOnBlock,
  GeneratedSessionDurationPolicyCategory,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  PhaseState,
  ProtectedWorkout,
  ReadinessState,
  WorkoutRoundPlan,
  WorkoutSection
} from "../core/types";
import { buildGuidedWorkoutSections, guidedProfileForExercise } from "./guidedExerciseCatalog";
import { prescribeExercise } from "./substitutionEngine";
import { findWorkoutTemplateByTitle, sectionDurationPlan, selectWorkoutTemplate, type WorkoutTemplate, type WorkoutTemplateSection } from "./workoutTemplateCatalog";
import { resolveWorkoutRecipe } from "./workoutRecipeCatalog";
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

type PlannedTemplateSection = WorkoutTemplateSection & {
  sourceAddOnBlockId?: string | undefined;
};

const COMPANION_SECTION_TYPES = new Set<WorkoutTemplateSection["sectionType"]>(["support"]);
const ACCESSORY_SECTION_TYPES = new Set<WorkoutTemplateSection["sectionType"]>(["accessory"]);

function isRestrictiveDurationCategory(category: GeneratedSessionDurationPolicyCategory | undefined): boolean {
  return category === "safety_capped" || category === "recovery" || category === "taper" || category === "workload_moderated";
}

function isProtectiveContext(input: BuildDetailedTrainingSessionInput, family: GeneratedSessionFamily, hardAnchor: boolean): boolean {
  return (
    isRestrictiveDurationCategory(input.generatedSession.durationPolicyCategory) ||
    family === "recovery_reset" ||
    family === "taper_maintenance" ||
    hardAnchor ||
    input.phase?.phase === "fight_week" ||
    input.phase?.phase === "tournament" ||
    input.cycle.symptomBurden === "high" ||
    input.generatedSession.executionReadinessStatus === "red_hard_stop"
  );
}

function selectedTemplateSections(
  templateItem: WorkoutTemplate,
  targetDurationMinutes: number,
  protectiveContext: boolean
): readonly WorkoutTemplateSection[] {
  const sections = templateItem.sections;
  const primary = sections.filter((item) => item.sectionType === "main");
  const prepare = sections.filter((item) => item.sectionType === "warmup");
  const reset = sections.filter((item) => item.sectionType === "cooldown" || item.sectionType === "reset");
  const companionOrAccessory = sections.filter((item) => COMPANION_SECTION_TYPES.has(item.sectionType) || ACCESSORY_SECTION_TYPES.has(item.sectionType));

  if (sections.length <= 2 || primary.length === 0) {
    return sections;
  }
  if (protectiveContext || targetDurationMinutes < 30) {
    return [...prepare, ...primary, ...reset].filter((item, index, list) => list.indexOf(item) === index);
  }
  if (targetDurationMinutes < 45) {
    return [...prepare, ...primary, ...companionOrAccessory.slice(0, 1), ...reset].filter((item, index, list) => list.indexOf(item) === index);
  }
  const companion = sections.find((item) => COMPANION_SECTION_TYPES.has(item.sectionType));
  const accessory = sections.find((item) => ACCESSORY_SECTION_TYPES.has(item.sectionType));
  return [...prepare, ...primary, ...[companion, accessory].filter((item): item is WorkoutTemplateSection => Boolean(item)), ...reset].filter((item, index, list) => list.indexOf(item) === index);
}

function addOnSectionType(block: GeneratedSessionAddOnBlock): WorkoutTemplateSection["sectionType"] {
  switch (block.sectionRole) {
    case "prepare":
      return "warmup";
    case "primary":
      return "main";
    case "companion":
      return "support";
    case "accessory":
      return "accessory";
    case "reset":
    default:
      return block.placementType === "recovery" ? "cooldown" : "reset";
  }
}

function equipmentAvailable(required: readonly string[] | undefined, equipmentAccess: readonly string[]): boolean {
  if (!required || required.length === 0) {
    return true;
  }
  const available = new Set(equipmentAccess.map((item) => item.trim().toLowerCase()).filter(Boolean));
  return required.every((item) => available.has(item.toLowerCase()));
}

function addOnAllowed(input: {
  block: GeneratedSessionAddOnBlock;
  equipmentAccess: readonly string[];
  family: GeneratedSessionFamily;
  protectiveContext: boolean;
  targetDurationMinutes: number;
}): boolean {
  const { block, equipmentAccess, family, protectiveContext, targetDurationMinutes } = input;
  if (!block.exerciseIds || block.exerciseIds.length === 0) {
    return false;
  }
  if (block.compatibleFamilies && !block.compatibleFamilies.includes(family)) {
    return false;
  }
  if (!equipmentAvailable(block.requiredEquipment, equipmentAccess)) {
    return false;
  }
  if (protectiveContext) {
    return block.priority === "required" && (block.sectionRole === "prepare" || block.sectionRole === "reset");
  }
  if (targetDurationMinutes < 30) {
    return block.priority === "required" && (block.sectionRole === "prepare" || block.sectionRole === "reset");
  }
  if (targetDurationMinutes < 45 && block.priority === "optional") {
    return false;
  }
  return true;
}

function materializedAddOnSections(input: {
  addOnBlocks: readonly GeneratedSessionAddOnBlock[];
  equipmentAccess: readonly string[];
  existingExerciseIds: Set<string>;
  family: GeneratedSessionFamily;
  protectiveContext: boolean;
  targetDurationMinutes: number;
}): readonly PlannedTemplateSection[] {
  const seen = new Set(input.existingExerciseIds);
  return input.addOnBlocks
    .filter((block) => addOnAllowed({ ...input, block }))
    .map((block): PlannedTemplateSection | null => {
      const exerciseIds = (block.exerciseIds ?? []).filter((exerciseId) => {
        if (seen.has(exerciseId)) {
          return false;
        }
        seen.add(exerciseId);
        return true;
      });
      if (exerciseIds.length === 0) {
        return null;
      }
      return {
        sectionType: addOnSectionType(block),
        name: block.label,
        intent: block.athleteFacingPurpose,
        exerciseIds,
        sourceAddOnBlockId: block.id
      };
    })
    .filter((item): item is PlannedTemplateSection => item !== null);
}

function composePlannedSections(baseSections: readonly WorkoutTemplateSection[], addOnSections: readonly PlannedTemplateSection[]): readonly PlannedTemplateSection[] {
  const prepare = addOnSections.filter((item) => item.sectionType === "warmup");
  const companion = addOnSections.filter((item) => item.sectionType === "support");
  const accessory = addOnSections.filter((item) => item.sectionType === "accessory");
  const reset = addOnSections.filter((item) => item.sectionType === "cooldown" || item.sectionType === "reset");
  const output: PlannedTemplateSection[] = [];
  let insertedPrepare = false;
  let insertedMiddle = false;

  for (const base of baseSections) {
    if (!insertedPrepare && base.sectionType !== "warmup") {
      output.push(...prepare);
      insertedPrepare = true;
    }
    if (!insertedMiddle && (base.sectionType === "cooldown" || base.sectionType === "reset")) {
      output.push(...companion, ...accessory);
      insertedMiddle = true;
    }
    output.push(base);
    if (!insertedPrepare && base.sectionType === "warmup") {
      output.push(...prepare);
      insertedPrepare = true;
    }
    if (!insertedMiddle && base.sectionType === "main") {
      output.push(...companion, ...accessory);
      insertedMiddle = true;
    }
  }

  if (!insertedPrepare) {
    output.unshift(...prepare);
  }
  if (!insertedMiddle) {
    output.push(...companion, ...accessory);
  }
  output.push(...reset);
  return output;
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

function sectionsFromTemplate(input: BuildDetailedTrainingSessionInput, templateItem: WorkoutTemplate, family: GeneratedSessionFamily, targetDurationMinutes: number, hardAnchor: boolean): readonly WorkoutSection[] {
  const protectiveContext = isProtectiveContext(input, family, hardAnchor);
  const addOnBlocks = input.generatedSession.addOnBlocks ?? templateItem.addOnBlocks ?? [];
  const baseSections = selectedTemplateSections(templateItem, targetDurationMinutes, protectiveContext);
  const existingExerciseIds = new Set(baseSections.flatMap((templateSection) => templateSection.exerciseIds));
  const addOnSections = materializedAddOnSections({
    addOnBlocks,
    equipmentAccess: input.equipmentAccess,
    existingExerciseIds,
    family,
    protectiveContext,
    targetDurationMinutes
  });
  const plannedSections = composePlannedSections(baseSections, addOnSections);
  const durations = sectionDurationPlan({ ...templateItem, sections: plannedSections }, targetDurationMinutes);
  return plannedSections.map((templateSection, index) =>
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
    return [`Keep this clean: ${theme ?? "stance, guard return, balance, and reset"}.`, "Last round should still look clean.", "Simplify if the cue breaks twice."];
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
  const firstGuidedWork = guidedProfileForExercise(exercise).work[0];
  if (firstGuidedWork?.repsText) {
    return firstGuidedWork.repsText;
  }
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
  const firstGuidedWork = guidedProfileForExercise(exercise).work[0];
  if (firstGuidedWork?.beginnerInstruction) {
    return firstGuidedWork.beginnerInstruction;
  }
  const load = plainTrainingCopy(exercise.loadGuidance);
  const tempo = exercise.tempo ? ` Tempo: ${plainTrainingCopy(exercise.tempo)}.` : "";
  return `${load}${tempo}`;
}

function secondsLabel(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) {
    return null;
  }
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function walkthroughItem(exercise: ExercisePrescription) {
  const profile = guidedProfileForExercise(exercise);
  const firstWork = profile.work[0];
  const rest = secondsLabel(firstWork?.restAfterSeconds);
  return {
    exerciseId: exercise.exerciseId,
    title: plainWorkoutTitle(profile.beginnerName),
    dose: exerciseDose(exercise),
    instruction: exerciseInstruction(exercise),
    rest: rest ? `${rest} reset after work steps.` : plainTrainingCopy(exercise.restText),
    cue: plainTrainingCopy(firstWork?.cue ?? exercise.coachingNotes[0] ?? exercise.boxingTransfer)
  };
}

function sectionInstruction(sectionItem: WorkoutSection): string {
  const intent = plainSectionIntent(sectionItem.intent);
  const exerciseCount = sectionItem.exercises.length;
  const guidedStepCount = sectionItem.guidedSteps?.length ?? 0;
  const base = `${sectionItem.durationMinutes} min. ${intent}`;
  if (guidedStepCount > 0) {
    return `${base} Follow ${guidedStepCount} timed steps in order.`;
  }
  if (exerciseCount <= 1) {
    return `${base} Complete the listed work, then go to the next block.`;
  }
  return `${base} Work top to bottom before repeating anything.`;
}

function checkpointForSection(sectionItem: WorkoutSection): string {
  const guidedCheckpoint = sectionItem.guidedSteps?.find((step) => step.kind === "checkpoint");
  if (guidedCheckpoint?.successCheck) {
    return guidedCheckpoint.successCheck;
  }
  const firstExercise = sectionItem.exercises[0];
  if (!firstExercise) {
    return "Keep breathing and posture under control before the next block.";
  }
  const cue = firstExercise.coachingNotes[0] ?? firstExercise.boxingTransfer;
  return `Keep this true before the next block: ${plainTrainingCopy(cue)}`;
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
  const firstSection = input.sections[0];
  const firstExercise = firstSection?.exercises[0];
  const roundPlan = parseRoundPlan(input.roundStructure, input.family, input.technicalEmphasis ?? []);
  const firstGuidedStep = firstSection?.guidedSteps?.[0];
  const beforeYouStart = [
    ...(input.preSessionChecklist ?? []).map(plainTrainingCopy),
    input.fuelBefore ? plainTrainingCopy(input.fuelBefore) : undefined,
    "Have water nearby and leave enough space to move in stance.",
    firstGuidedStep
      ? `Start with ${plainSectionName(firstSection?.name ?? "first block")}: ${plainWorkoutTitle(firstGuidedStep.title)}.`
      : firstSection && firstExercise
        ? `Start with ${plainSectionName(firstSection.name)}: ${plainWorkoutTitle(firstExercise.name)}.`
        : "Start with the first listed block."
  ].filter((item): item is string => Boolean(item));

  return {
    title: "Workout walkthrough",
    summary: `${plainWorkoutTitle(input.title, input.family)} is ${input.durationMinutes} min across ${countLabel(sectionCount, "block")}. Follow the blocks in order and keep the main cue clean before adding effort.`,
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
  const rawSections = sectionsFromTemplate(input, templateItem, family, durationMinutes, hardAnchor);
  const guidedSections = buildGuidedWorkoutSections(rawSections);
  const sections = rawSections.map((workoutSection, index) => ({
    ...workoutSection,
    guidedSteps: guidedSections[index]?.steps ?? []
  }));
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
  const recipe = resolveWorkoutRecipe({
    family,
    title,
    durationMinutes,
    sections,
    safetyStops: stopConditions,
    skillLevel: input.generatedSession.skillLevel,
    templateId: templateItem.templateId,
    templateTitle: templateItem.title,
    equipmentMode: input.generatedSession.equipmentMode ?? templateItem.equipmentMode
  });
  const displayTitle = recipe.title;
  const walkthrough = buildWorkoutWalkthrough({
    title: displayTitle,
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
    title: displayTitle,
    durationMinutes,
    intensity: family === "recovery_reset" ? "recovery" : hardAnchor || input.phase?.phase === "tournament" ? "easy" : input.phase?.phase === "fight_week" ? "easy" : input.generatedSession.intensity,
    sections,
    guidedSections,
    recipe,
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
