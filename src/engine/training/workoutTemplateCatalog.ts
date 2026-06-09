import type {
  GeneratedSessionAddOnBlock,
  GeneratedSessionEquipmentMode,
  GeneratedSessionFamily,
  GeneratedSessionIntensity,
  GeneratedSessionPriority,
  GeneratedTrainingSession,
  PlanGenerationTrainingDose
} from "./types";
import type { NextWeekTrainingVolumeStrategy } from "./nextWeekMaterializationEngine";
import { addOnBlockFromLibrary } from "./addOnBlocks";
import { plainSectionIntent, plainSectionName, plainWorkoutTitle } from "../presentation/trainingCopy";

export const GENERATED_SESSION_FAMILIES = [
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_zone2",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning",
  "boxing_technical_shadowboxing",
  "boxing_bag_skill",
  "boxing_footwork_ringcraft",
  "boxing_defense_movement",
  "boxing_jab_entry_exit",
  "boxing_counter_timing",
  "boxing_round_skill_circuit",
  "agility_reactive_footwork",
  "mobility_recovery_flow",
  "movement_quality_prep",
  "footwork_agility",
  "reaction_rhythm",
  "trunk_durability",
  "shoulder_scap_durability",
  "neck_trap_durability",
  "wrist_hand_durability",
  "hip_ankle_mobility",
  "recovery_reset",
  "taper_maintenance"
] as const satisfies readonly GeneratedSessionFamily[];

export type WorkoutTemplateSectionKind = "warmup" | "main" | "accessory" | "support" | "cooldown" | "reset";

export interface WorkoutTemplateSection {
  sectionType: WorkoutTemplateSectionKind;
  name: string;
  intent: string;
  exerciseIds: readonly string[];
}

export interface WorkoutTemplate {
  templateId: string;
  family: GeneratedSessionFamily;
  title: string;
  intent: string;
  defaultDurationMinutes: number;
  defaultIntensity: GeneratedSessionIntensity;
  defaultFuelDemand: GeneratedTrainingSession["fuelDemand"];
  sections: readonly WorkoutTemplateSection[];
  protects: readonly string[];
  noviceEligible: boolean;
  equipmentTags: readonly string[];
  contraindications: readonly string[];
  safetyTags: readonly string[];
  preferredWhen: readonly string[];
  avoidWhen: readonly string[];
  progressionNotes: readonly string[];
  regressionNotes: readonly string[];
  safetyNotes: readonly string[];
  stopConditions: readonly string[];
  fallback: boolean;
  boxingSkillTheme?: string | undefined;
  tacticalTheme?: string | undefined;
  technicalEmphasis?: readonly string[] | undefined;
  roundStructure?: string | undefined;
  equipmentMode?: GeneratedSessionEquipmentMode | undefined;
  sessionPriority?: GeneratedSessionPriority | undefined;
  addOnBlocks?: readonly GeneratedSessionAddOnBlock[] | undefined;
}

export interface WorkoutTemplateSelectionInput {
  family: GeneratedSessionFamily;
  equipmentAccess: readonly string[];
  novice: boolean;
  readinessColor?: "green" | "amber" | "red" | "unknown" | undefined;
  highCycleSymptoms?: boolean | undefined;
  protectedHard?: boolean | undefined;
  conservativeFueling?: boolean | undefined;
  trainingDose?: PlanGenerationTrainingDose | undefined;
  volumeStrategy?: NextWeekTrainingVolumeStrategy | undefined;
  usedTemplateIds?: readonly string[] | undefined;
}

type TemplateDraft = Omit<WorkoutTemplate, "contraindications" | "progressionNotes" | "regressionNotes" | "safetyNotes" | "stopConditions"> &
  Partial<Pick<WorkoutTemplate, "contraindications" | "progressionNotes" | "regressionNotes" | "safetyNotes" | "stopConditions">>;

const EQUIPMENT_REQUIREMENT_TAGS = new Set(["bag", "bands", "bench", "bike", "dumbbells", "landmine", "medicine_ball", "rower", "trap_bar"]);
const CONSERVATIVE_STRATEGIES = new Set<NextWeekTrainingVolumeStrategy>(["conservative_start", "reduce_volume", "deload", "taper", "tournament_conserve", "hold_for_review"]);
const SECTION_DURATION_WEIGHTS: Record<WorkoutTemplateSectionKind, number> = {
  warmup: 1.2,
  main: 3,
  accessory: 2,
  support: 1.5,
  cooldown: 1,
  reset: 1
};
const STRENGTH_TEMPLATE_FAMILIES = new Set<GeneratedSessionFamily>(["strength_lower", "strength_upper", "strength_full_body"]);
const CONDITIONING_TEMPLATE_FAMILIES = new Set<GeneratedSessionFamily>([
  "alactic_sprints",
  "roadwork_zone2",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning"
]);
const MOBILITY_RECOVERY_TEMPLATE_FAMILIES = new Set<GeneratedSessionFamily>(["mobility_recovery_flow", "movement_quality_prep", "hip_ankle_mobility", "recovery_reset", "taper_maintenance"]);

function section(sectionType: WorkoutTemplateSectionKind, name: string, intent: string, exerciseIds: readonly string[]): WorkoutTemplateSection {
  return { sectionType, name, intent, exerciseIds };
}

function defaultProgressionNotesForFamily(family: GeneratedSessionFamily): readonly string[] {
  if (family.startsWith("boxing_") || family === "agility_reactive_footwork" || family === "footwork_agility" || family === "reaction_rhythm") {
    return [
      "Progress only when stance, guard, exits, timing, and the round's single constraint stay clean across repeated rounds.",
      "Add one round, one constraint, or one support block only after technical quality holds through the last round."
    ];
  }
  if (STRENGTH_TEMPLATE_FAMILIES.has(family)) {
    return [
      "Progress one variable only: add one set, 1-2 reps, 2.5-5% load, a slightly more complex variation, or longer rest for quality.",
      "Protect next-day boxing quality; clean speed and repeatable mechanics matter more than load."
    ];
  }
  if (CONDITIONING_TEMPLATE_FAMILIES.has(family)) {
    return [
      "Progress one variable only: add 5-10 min Zone 2, one tempo interval, a slightly longer interval, slightly shorter recovery, or easy-to-tempo density.",
      "Keep gait, breathing, and fueling evidence stable before increasing conditioning pressure."
    ];
  }
  if (MOBILITY_RECOVERY_TEMPLATE_FAMILIES.has(family)) {
    return [
      "Do not progress recovery or prep into load; progress only by improving range quality, reducing symptoms, or restoring stance comfort.",
      "Add an optional easy technical touch only when it improves coordination and leaves the athlete fresher."
    ];
  }
  return ["Progress only one small variable after multiple clean, symptom-free exposures."];
}

function defaultRegressionNotesForFamily(family: GeneratedSessionFamily): readonly string[] {
  if (family.startsWith("boxing_") || family === "agility_reactive_footwork" || family === "footwork_agility" || family === "reaction_rhythm") {
    return ["Regress when guard return fails, feet cross, balance is lost, the constraint disappears, or output chasing replaces skill."];
  }
  if (STRENGTH_TEMPLATE_FAMILIES.has(family)) {
    return ["Regress if pain changes mechanics, reps grind, RPE exceeds target, readiness is red, or next-day boxing quality is impaired."];
  }
  if (CONDITIONING_TEMPLATE_FAMILIES.has(family)) {
    return ["Regress if gait changes, breathing spikes unpredictably, dizziness appears, soreness compromises skill work, or under-fueling evidence is present."];
  }
  if (MOBILITY_RECOVERY_TEMPLATE_FAMILIES.has(family)) {
    return ["Regress to easier range, breathing, or walking only when symptoms, coordination, or stance comfort worsen."];
  }
  return ["Reduce range, load, or duration before removing the session when safety still allows easy work."];
}

function template(input: TemplateDraft): WorkoutTemplate {
  return {
    contraindications: ["Active hard-stop safety flag", "Pain or symptoms that change movement quality"],
    safetyNotes: ["Manual readiness is enough; do not require a wearable.", "Keep the session secondary to protected boxing work."],
    stopConditions: ["Stop if pain, dizziness, faintness, chest pain, or unusual symptoms appear.", "Stop when speed, posture, timing, or breathing quality clearly drops."],
    ...input,
    progressionNotes: input.progressionNotes ?? defaultProgressionNotesForFamily(input.family),
    regressionNotes: input.regressionNotes ?? defaultRegressionNotesForFamily(input.family)
  };
}

interface BoxingTemplateInput {
  templateId: string;
  family: GeneratedSessionFamily;
  title: string;
  intent: string;
  defaultDurationMinutes: number;
  defaultIntensity: GeneratedSessionIntensity;
  defaultFuelDemand: GeneratedTrainingSession["fuelDemand"];
  boxingSkillTheme: string;
  tacticalTheme: string;
  technicalEmphasis: readonly string[];
  roundStructure?: string | undefined;
  equipmentMode: GeneratedSessionEquipmentMode;
  sessionPriority: GeneratedSessionPriority;
  mainExerciseIds: readonly string[];
  supportExerciseIds?: readonly string[] | undefined;
  addOnBlocks?: readonly GeneratedSessionAddOnBlock[] | undefined;
  protects: readonly string[];
  noviceEligible: boolean;
  equipmentTags: readonly string[];
  safetyTags: readonly string[];
  preferredWhen: readonly string[];
  avoidWhen: readonly string[];
  fallback: boolean;
}

function boxingTemplate(input: BoxingTemplateInput): WorkoutTemplate {
  return template({
    templateId: input.templateId,
    family: input.family,
    title: input.title,
    intent: input.intent,
    defaultDurationMinutes: input.defaultDurationMinutes,
    defaultIntensity: input.defaultIntensity,
    defaultFuelDemand: input.defaultFuelDemand,
    boxingSkillTheme: input.boxingSkillTheme,
    tacticalTheme: input.tacticalTheme,
    technicalEmphasis: input.technicalEmphasis,
    ...(input.roundStructure ? { roundStructure: input.roundStructure } : {}),
    equipmentMode: input.equipmentMode,
    sessionPriority: input.sessionPriority,
    ...(input.addOnBlocks ? { addOnBlocks: input.addOnBlocks } : {}),
    sections: [
      section("warmup", "Warm-up", "Check how you feel, then warm up with short boxing movements.", ["movement_prep_flow"]),
      section("main", "Boxing rounds", input.intent, input.mainExerciseIds),
      ...(input.supportExerciseIds && input.supportExerciseIds.length > 0
        ? [section("support", "Support", "Add the smallest useful support layer while form stays clean.", input.supportExerciseIds)]
        : []),
      section("cooldown", "Cooldown", "Bring breathing down and keep one simple note from the session.", ["recovery_breathing_mobility"])
    ],
    protects: input.protects,
    noviceEligible: input.noviceEligible,
    equipmentTags: input.equipmentTags,
    safetyTags: [...new Set([...input.safetyTags, "quality_stop", "athlete_quality_checkpoint"])],
    preferredWhen: input.preferredWhen,
    avoidWhen: input.avoidWhen,
    progressionNotes: defaultProgressionNotesForFamily(input.family),
    regressionNotes: defaultRegressionNotesForFamily(input.family),
    safetyNotes: ["Solo skill work only; quality beats volume.", "Stop before fatigue changes stance, guard, head position, or foot placement."],
    stopConditions: ["Stop if pain, dizziness, unusual symptoms, balance loss, or repeated technical breakdown appears.", "Stop when the quality cue fails twice in a row."],
    fallback: input.fallback
  });
}

const boxingDevelopmentTemplates: readonly WorkoutTemplate[] = [
  boxingTemplate({
    templateId: "boxing_shadowboxing_jab_entry_rounds",
    family: "boxing_technical_shadowboxing",
    title: "Jab-Focused Shadowboxing",
    intent: "Build a sharper jab without rushing. Stay smooth first, then add snap only when feet and guard stay clean.",
    defaultDurationMinutes: 35,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Jab-focused shadowboxing",
    tacticalTheme: "Jab comes home, feet reset, and speed waits for clean shape",
    technicalEmphasis: ["low and slow shadow", "jab shape and guard home", "sharp jab round", "double jab rhythm", "jab entry and exit", "best clean jab round"],
    roundStructure: "6 x 3:00 jab-focused shadowboxing rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "primary",
    mainExerciseIds: ["shadowboxing_technical_rounds"],
    protects: ["jab mechanics", "guard return", "technical freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["boxing_skill", "quality_stop", "self_check"],
    preferredWhen: ["No protected boxing anchors", "Build or camp week", "Need a primary technical session"],
    avoidWhen: ["Readiness red", "Symptoms change coordination"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_shadowboxing_foundation_touch",
    family: "boxing_technical_shadowboxing",
    title: "Easy technical shadowboxing touch",
    intent: "Keep stance, jab, guard, and exit mechanics alive with a low-fatigue technical touch.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Stance, guard, jab, and simple exits",
    tacticalTheme: "Own position before adding speed",
    technicalEmphasis: ["guard reset", "single jab", "step out"],
    roundStructure: "4 x 2:00 easy technical rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["stance_guard_reset", "jab_line_mechanics", "shadowboxing_technical_rounds"],
    addOnBlocks: [addOnBlockFromLibrary("optional_film_self_check_5")],
    protects: ["skill retention", "freshness", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Recovery day", "Fight week", "No equipment"],
    avoidWhen: ["Any symptom that changes balance"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_bag_skill_quality_rounds",
    family: "boxing_bag_skill",
    title: "Technical bag skill rounds",
    intent: "Use the bag for accuracy, distance, exit, and defense-after-combination skill rather than fatigue chasing.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Bag skill with jab control and defensive exits",
    tacticalTheme: "Touch, exit, reset, and keep shape",
    technicalEmphasis: ["jab-only control", "jab-cross exit", "body-head variation", "defense after combination"],
    roundStructure: "5 x 3:00 bag skill rounds, 1:00 rest; RPE cap 6",
    equipmentMode: "bag",
    sessionPriority: "primary",
    mainExerciseIds: ["bag_jab_control_round", "bag_combo_exit_round", "defense_after_combo_round"],
    supportExerciseIds: ["pivot_out_reset", "rope_line_ringcraft"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["distance control", "defense after punching", "shoulder quality"],
    noviceEligible: false,
    equipmentTags: ["bag"],
    safetyTags: ["boxing_skill", "moderate_fuel", "quality_stop"],
    preferredWhen: ["Bag available", "Green or amber readiness", "Camp or build skill day"],
    avoidWhen: ["Hand, wrist, shoulder, or headache symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_bag_skill_shadow_substitution",
    family: "boxing_bag_skill",
    title: "Shadow bag-skill substitution",
    intent: "Run bag-skill themes through shadowboxing, mirror, or line-drill constraints when no bag is available.",
    defaultDurationMinutes: 38,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Bag-skill themes without bag dependency",
    tacticalTheme: "Punch, exit, and reset in shape",
    technicalEmphasis: ["jab control", "combo exit", "defense after combination"],
    roundStructure: "4 x 2:30 shadow skill rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["shadowboxing_technical_rounds", "double_jab_exit", "defense_after_combo_round"],
    addOnBlocks: [addOnBlockFromLibrary("optional_film_self_check_5")],
    protects: ["equipment independence", "technical quality", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "mirror", "line"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["No bag access", "Novice athlete", "Conservative week"],
    avoidWhen: ["Coordination worsens"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_ringcraft_footwork_day",
    family: "boxing_footwork_ringcraft",
    title: "Ringcraft and footwork day",
    intent: "Develop step-slide, L-step, pivot, circle-out, corner escape, and cut-off patterns with boxing stance first.",
    defaultDurationMinutes: 45,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Ringcraft and angle control",
    tacticalTheme: "Escape corners and reclaim center without rushing",
    technicalEmphasis: ["step-slide", "L-step", "pivot", "circle-out", "corner escape"],
    roundStructure: "6 x 2:00 footwork rounds, 1:00 rest",
    equipmentMode: "line",
    sessionPriority: "primary",
    mainExerciseIds: ["rope_line_ringcraft", "corner_escape_pattern", "ring_cutoff_step"],
    supportExerciseIds: ["reactive_footwork_callout"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_reactive_footwork_primer_8")],
    protects: ["ring position", "footwork economy", "stance recovery"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "line"],
    safetyTags: ["boxing_skill", "agility", "quality_stop"],
    preferredWhen: ["Build footwork", "Camp tactical specificity", "No bag access"],
    avoidWhen: ["Lower-leg pain changes stepping"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_ringcraft_easy_line_drills",
    family: "boxing_footwork_ringcraft",
    title: "Easy line-drill ringcraft",
    intent: "Keep ringcraft repeatable with small line drills and simple exits.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Simple exits and stance recovery",
    tacticalTheme: "Leave the line without crossing feet",
    technicalEmphasis: ["step-slide", "pivot out", "reset"],
    roundStructure: "5 x 90 sec line-drill rounds, 45 sec rest",
    equipmentMode: "line",
    sessionPriority: "secondary",
    mainExerciseIds: ["rope_line_ringcraft", "pivot_out_reset"],
    protects: ["footwork confidence", "freshness", "movement quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "line"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Recovery week", "Minimal equipment", "Lower complexity needed"],
    avoidWhen: ["Stepping pain"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_defense_movement_day",
    family: "boxing_defense_movement",
    title: "Defense movement day",
    intent: "Build slip-line, roll-under, pull-reset, and pivot-out mechanics without opponent dependency.",
    defaultDurationMinutes: 45,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Defensive responsibility after punching",
    tacticalTheme: "Make defense finish in stance, not in a lean",
    technicalEmphasis: ["slip line", "roll under", "pull reset", "pivot out"],
    roundStructure: "5 x 2:30 defense-first rounds, 1:00 rest",
    equipmentMode: "line",
    sessionPriority: "primary",
    mainExerciseIds: ["slip_line_entry", "roll_pivot_reset", "pivot_out_reset"],
    supportExerciseIds: ["counter_timing_shadow", "pallof_press"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_trunk_transfer_10")],
    protects: ["defensive posture", "balance", "counter position"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "line"],
    safetyTags: ["boxing_skill", "quality_stop", "self_check"],
    preferredWhen: ["Camp defense theme", "Day before harder boxing", "Need low-impact technical work"],
    avoidWhen: ["Dizziness or neck symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_defense_low_fatigue_touch",
    family: "boxing_defense_movement",
    title: "Low-fatigue defense touch",
    intent: "Touch defense mechanics at easy intensity for taper, recovery, or prep days.",
    defaultDurationMinutes: 28,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Clean defensive shapes",
    tacticalTheme: "Defend, reset, breathe",
    technicalEmphasis: ["slip", "roll", "reset"],
    roundStructure: "4 x 90 sec defense rounds, 60 sec rest",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["slip_line_entry", "roll_pivot_reset"],
    protects: ["freshness", "defense timing", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Fight week", "Recovery day", "High stress week"],
    avoidWhen: ["Dizziness or neck symptoms"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_jab_entry_exit_system",
    family: "boxing_jab_entry_exit",
    title: "Jab entry and exit system",
    intent: "Build lead-hand rhythm, double jab, body-line jab, feint entry, and pivot reset through constrained rounds.",
    defaultDurationMinutes: 45,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Jab and lead-hand system",
    tacticalTheme: "Win lead-foot and center-line position before exiting",
    technicalEmphasis: ["lead-hand rhythm", "double jab", "body-line jab", "feint entry", "jab-pivot reset"],
    roundStructure: "5 x 2:30 jab-system rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "primary",
    mainExerciseIds: ["jab_line_mechanics", "double_jab_exit", "jab_body_jab_head"],
    supportExerciseIds: ["pivot_out_reset"],
    addOnBlocks: [addOnBlockFromLibrary("required_technical_quality_gate_5")],
    protects: ["lead hand", "entries", "exits"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "mirror"],
    safetyTags: ["boxing_skill", "quality_stop", "self_check"],
    preferredWhen: ["No protected boxing anchors", "Before pads", "Build technical foundation"],
    avoidWhen: ["Shoulder or wrist symptoms worsen"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_jab_foundation_microdose",
    family: "boxing_jab_entry_exit",
    title: "Jab foundation microdose",
    intent: "Use a small jab-and-exit touch when the week needs technical skill without extra load.",
    defaultDurationMinutes: 28,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Jab foundation",
    tacticalTheme: "Touch, exit, reset",
    technicalEmphasis: ["single jab", "double jab", "pivot reset"],
    roundStructure: "4 x 90 sec jab rounds, 45 sec rest",
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["jab_line_mechanics", "double_jab_exit"],
    protects: ["skill frequency", "freshness", "guard mechanics"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Add-on before lift", "Recovery week", "Minimal equipment"],
    avoidWhen: ["Shoulder quality worsens"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_counter_timing_solo",
    family: "boxing_counter_timing",
    title: "Counter-timing solo day",
    intent: "Develop mirror cue, draw-counter, rhythm break, and reset timing without opponent dependency.",
    defaultDurationMinutes: 45,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Counter timing and rhythm breaks",
    tacticalTheme: "Draw, respond, reset before adding volume",
    technicalEmphasis: ["mirror cue", "slip-counter foot reset", "draw-counter", "rhythm change"],
    roundStructure: "5 x 2:30 counter-timing rounds, 1:00 rest",
    equipmentMode: "mirror",
    sessionPriority: "primary",
    mainExerciseIds: ["mirror_feint_reaction", "counter_timing_shadow", "rhythm_change_round"],
    supportExerciseIds: ["pivot_out_reset"],
    addOnBlocks: [addOnBlockFromLibrary("optional_film_self_check_5")],
    protects: ["timing", "counter position", "rhythm control"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "minimal", "mirror"],
    safetyTags: ["boxing_skill", "tactical", "quality_stop"],
    preferredWhen: ["Intermediate or advanced boxer", "Camp tactical week", "Power focus support"],
    avoidWhen: ["Reaction work creates stress or sloppy mechanics"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_counter_timing_reaction_touch",
    family: "boxing_counter_timing",
    title: "Easy counter-timing touch",
    intent: "Use a low-complexity timing touch for novice, taper, or conservative contexts.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Simple timing and reset",
    tacticalTheme: "React once, reset fully",
    technicalEmphasis: ["self-called cue", "single counter", "stance reset"],
    roundStructure: "4 x 90 sec timing rounds, 60 sec rest",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["mirror_feint_reaction", "counter_timing_shadow"],
    protects: ["fresh timing", "low stress", "coordination"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Fight week", "Novice timing touch", "Conservative week"],
    avoidWhen: ["Coordination fades quickly"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "boxing_round_skill_circuit",
    family: "boxing_round_skill_circuit",
    title: "Round skill circuit",
    intent: "Blend technical boxing, footwork, and defensive constraints across rounds with a quality cap.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Integrated round skill",
    tacticalTheme: "Carry skill quality through boxing-length rounds",
    technicalEmphasis: ["jab entry", "defense after punch", "ringcraft reset", "rhythm change"],
    roundStructure: "6 x 2:30 skill circuit rounds, 1:00 rest; RPE cap 6",
    equipmentMode: "none",
    sessionPriority: "primary",
    mainExerciseIds: ["shadowboxing_technical_rounds", "defense_after_combo_round", "rope_line_ringcraft", "rhythm_change_round"],
    supportExerciseIds: ["pallof_press", "serratus_wall_slide"],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["round skill", "technical endurance", "availability"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["boxing_skill", "moderate_fuel", "quality_stop"],
    preferredWhen: ["Camp", "Serious build week", "No protected boxing anchors"],
    avoidWhen: ["Under-fueling evidence", "Readiness red", "High symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_round_skill_low_volume",
    family: "boxing_round_skill_circuit",
    title: "Low-volume round skill",
    intent: "Use a smaller round skill circuit when the athlete needs technical frequency without a hard stimulus.",
    defaultDurationMinutes: 35,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Low-volume technical continuity",
    tacticalTheme: "One constraint per round",
    technicalEmphasis: ["jab", "exit", "defense reset"],
    roundStructure: "4 x 2:00 skill rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["shadowboxing_technical_rounds", "double_jab_exit", "roll_pivot_reset"],
    protects: ["skill frequency", "freshness", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Recovery or deload", "Novice", "Conservative week"],
    avoidWhen: ["Quality fades round to round"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "agility_reactive_footwork_boxing",
    family: "agility_reactive_footwork",
    title: "Reactive boxing footwork",
    intent: "Train low-volume reaction, direction change, deceleration, pivot, and stance recovery with boxing stance first.",
    defaultDurationMinutes: 40,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Reactive footwork and stance recovery",
    tacticalTheme: "React, brake, pivot, and recover shape",
    technicalEmphasis: ["direction callout", "deceleration", "pivot", "stance recovery"],
    roundStructure: "8 x 20 sec reaction bouts with 60 sec full reset",
    equipmentMode: "line",
    sessionPriority: "secondary",
    mainExerciseIds: ["reactive_footwork_callout", "pivot_out_reset", "low_impact_agility_clock"],
    supportExerciseIds: ["mobility_reset_flow"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["first-step quality", "braking", "stance recovery"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "line"],
    safetyTags: ["agility", "quality_stop"],
    preferredWhen: ["Power day primer", "Ringcraft week", "Green or amber readiness"],
    avoidWhen: ["Lower-leg symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "agility_reactive_footwork_microdose",
    family: "agility_reactive_footwork",
    title: "Reactive footwork microdose",
    intent: "Keep foot reaction and stance reset fresh with a short, low-impact dose.",
    defaultDurationMinutes: 25,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Foot reaction touch",
    tacticalTheme: "React once and reset",
    technicalEmphasis: ["small cue", "stance reset"],
    roundStructure: "6 x 15 sec easy cues, 45 sec rest",
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["reactive_footwork_callout", "reaction_cue_step"],
    protects: ["freshness", "coordination", "foot rhythm"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Add-on", "Taper", "Minimal equipment"],
    avoidWhen: ["Stepping pain"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "mobility_recovery_boxer_flow",
    family: "mobility_recovery_flow",
    title: "Mobility and recovery flow",
    intent: "Restore hips, ankles, shoulders, breathing, and stance range while keeping optional technical touch easy.",
    defaultDurationMinutes: 32,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Availability for the next boxing exposure",
    tacticalTheme: "Recover positions without adding load",
    technicalEmphasis: ["stance range", "guard relaxation", "easy shadow touch"],
    roundStructure: "Optional 3 x 90 sec easy shadow touch after mobility",
    equipmentMode: "none",
    sessionPriority: "secondary",
    mainExerciseIds: ["mobility_reset_flow", "lateral_lunge_regression", "serratus_wall_slide"],
    supportExerciseIds: ["shadowboxing_technical_rounds"],
    addOnBlocks: [addOnBlockFromLibrary("optional_easy_shadow_touch_10")],
    protects: ["recovery", "movement quality", "tomorrow's skill"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["recovery", "low_fuel", "novice_safe"],
    preferredWhen: ["Recovery day", "After hard boxing", "Deload"],
    avoidWhen: ["Symptoms worsen with easy movement"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "mobility_recovery_short_reset",
    family: "mobility_recovery_flow",
    title: "Short recovery reset flow",
    intent: "Use a short mobility and breathing reset when the athlete needs recovery only.",
    defaultDurationMinutes: 25,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Restore positions",
    tacticalTheme: "Downshift before adding work",
    technicalEmphasis: ["breathing", "hips", "shoulders"],
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["recovery_breathing_mobility", "mobility_reset_flow"],
    protects: ["health", "recovery", "readiness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Red readiness fallback", "Deload", "High stress"],
    avoidWhen: ["Symptoms worsen"],
    fallback: true
  }),
  boxingTemplate({
    templateId: "movement_quality_boxer_prep",
    family: "movement_quality_prep",
    title: "Movement quality prep",
    intent: "Prime hips, ankles, trunk, shoulders, guard, and stance mechanics before the main stimulus.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Movement quality for boxing positions",
    tacticalTheme: "Prepare the body to hold shape",
    technicalEmphasis: ["stance range", "guard reset", "trunk control"],
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["stance_guard_reset", "hip_switch_step", "dead_bug_anti_extension", "serratus_wall_slide"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_reactive_footwork_primer_8")],
    protects: ["movement quality", "guard posture", "availability"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["movement_quality", "low_fuel", "novice_safe"],
    preferredWhen: ["Add-on", "Same day as protected technical boxing", "Before strength"],
    avoidWhen: ["Pain changes movement"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "movement_quality_short_primer",
    family: "movement_quality_prep",
    title: "Short movement primer",
    intent: "A compact prep layer for days where the main work is already assigned.",
    defaultDurationMinutes: 25,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Short stance and guard primer",
    tacticalTheme: "Start clean before the main session",
    technicalEmphasis: ["stance", "guard", "breathing"],
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["stance_guard_reset", "movement_prep_flow", "recovery_breathing_mobility"],
    protects: ["freshness", "positions", "safe setup"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Protected boxing anchor day", "Minimal time", "Conservative week"],
    avoidWhen: ["Symptoms increase"],
    fallback: true
  })
];

const phaseDoseWorkoutTemplates: readonly WorkoutTemplate[] = [
  template({
    templateId: "strength_lower_force_transfer_day",
    family: "strength_lower",
    title: "Lower-body force transfer day",
    intent: "Use a higher-value lower-body strength exposure to connect stance force, lateral range, trunk control, and cooldown quality.",
    defaultDurationMinutes: 65,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Warm-up", "Prepare hips, ankles, and trunk before hard lower-body work.", ["movement_prep_flow"]),
      section("main", "Force transfer strength", "Use clean lower-body force work without grinding reps.", ["trap_bar_deadlift", "goblet_squat_to_box"]),
      section("accessory", "Split-stance and lateral support", "Build stance force and side-to-side range.", ["rear_foot_elevated_split_squat", "lateral_lunge_regression"]),
      section("support", "Trunk transfer", "Keep force transfer organized through the trunk.", ["pallof_press"]),
      section("cooldown", "Required reset", "Restore hips, ankles, and breathing after hard work.", ["mobility_reset_flow"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["stance force", "braking", "next-day boxing quality"],
    noviceEligible: false,
    equipmentTags: ["trap_bar", "dumbbells", "bench"],
    safetyTags: ["strength", "phase_variant", "high_fuel", "quality_stop"],
    preferredWhen: ["Serious or high dose", "Green readiness", "Strength focus needs a hard lift"],
    avoidWhen: ["Hard protected anchor today", "Lower-body pain", "Conservative fueling context"],
    fallback: false
  }),
  template({
    templateId: "strength_upper_punch_deceleration_day",
    family: "strength_upper",
    title: "Punch deceleration upper day",
    intent: "Build guard-friendly press, pull, cuff, trunk, and wrist tolerance for punch deceleration.",
    defaultDurationMinutes: 60,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare ribs, shoulder blades, and guard posture.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Press and pull contrast", "Press and pull on clean paths with no max loading.", ["landmine_press", "one_arm_row"]),
      section("support", "Deceleration support", "Support cuff and upper-back control after strength work.", ["band_external_rotation", "ytwl_raise"]),
      section("accessory", "Hand and trunk tolerance", "Finish with trunk and wrist control that preserves relaxation.", ["pallof_press", "wrist_pronation_supination"]),
      section("cooldown", "Reset", "Downshift shoulder and neck tone.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_shoulder_guard_durability_10")],
    protects: ["guard posture", "punch deceleration", "shoulder quality"],
    noviceEligible: false,
    equipmentTags: ["landmine", "dumbbells", "bands"],
    safetyTags: ["strength", "phase_variant", "moderate_fuel", "quality_stop"],
    preferredWhen: ["Upper-body strength focus", "Bag volume needs balancing", "Green or amber readiness"],
    avoidWhen: ["Shoulder, neck, wrist, numbness, or tingling symptoms"],
    fallback: false
  }),
  template({
    templateId: "strength_full_body_transfer_trunk_day",
    family: "strength_full_body",
    title: "Strength transfer and trunk day",
    intent: "Link whole-body strength, rotational trunk control, upper-back support, and stance durability.",
    defaultDurationMinutes: 62,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Warm-up", "Move hips, trunk, and shoulders before transfer work.", ["movement_prep_flow"]),
      section("main", "Whole-body strength", "Use a hinge or squat pattern with clean reps only.", ["hip_hinge_rdl", "goblet_squat_to_box"]),
      section("support", "Rotational trunk", "Hold transfer positions without breath-holding.", ["pallof_press", "dead_bug_anti_extension"]),
      section("accessory", "Upper back and stance", "Balance force work with row and stance capacity.", ["band_row", "split_squat_iso"]),
      section("cooldown", "Reset", "Downshift and restore range.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_trunk_transfer_10")],
    protects: ["force transfer", "trunk control", "stance durability"],
    noviceEligible: true,
    equipmentTags: ["dumbbells", "bands"],
    safetyTags: ["strength", "phase_variant", "novice_safe", "quality_stop"],
    preferredWhen: ["Strength plus trunk theme", "Standard or serious dose", "No hard boxing conflict"],
    avoidWhen: ["Red readiness", "Pain changes bracing"],
    fallback: false
  }),
  template({
    templateId: "power_rotational_jab_transfer",
    family: "power_rotational",
    title: "Power-to-jab transfer",
    intent: "Bridge low-volume rotational speed into lead-hand mechanics while keeping every rep fresh.",
    defaultDurationMinutes: 48,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare rotation and stance without fatigue.", ["movement_prep_flow"]),
      section("main", "Rotational speed", "Use short rotational power reps with complete reset.", ["med_ball_rotational_throw", "step_and_snap_rotation"]),
      section("support", "Jab transfer", "Connect rotation to clean jab line mechanics.", ["jab_line_mechanics", "single_jab_exit_reset"]),
      section("cooldown", "Power reset", "Stop while speed and timing are still sharp.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("required_power_reset_6")],
    protects: ["rotational speed", "jab mechanics", "freshness"],
    noviceEligible: true,
    equipmentTags: ["medicine_ball", "no_equipment", "minimal"],
    safetyTags: ["power", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["Power focus", "Skill transfer needs a bridge", "Green or amber readiness"],
    avoidWhen: ["Speed drops early", "Shoulder or trunk symptoms"],
    fallback: false
  }),
  template({
    templateId: "power_lower_braking_pivot",
    family: "power_lower",
    title: "Braking and pivot power",
    intent: "Tie lower-body speed to quiet braking, pivot quality, and stance recovery.",
    defaultDurationMinutes: 48,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare ankles, hips, and landing mechanics.", ["movement_prep_flow"]),
      section("main", "Landing and braking", "Use low-volume landing and foot contacts with full recovery.", ["snap_down_landing", "low_amplitude_pogo"]),
      section("support", "Pivot reaction", "Pair speed with small pivots and full stance reset.", ["pivot_reaction_pairing", "reactive_footwork_callout"]),
      section("cooldown", "Reset", "Restore lower-leg and hip range.", ["mobility_reset_flow"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_reactive_footwork_primer_8")],
    protects: ["braking", "first-step quality", "stance recovery"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["power", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["Power and footwork bridge", "Taper-safe speed touch", "No equipment"],
    avoidWhen: ["Calf, Achilles, foot, knee, or hip symptoms"],
    fallback: false
  }),
  template({
    templateId: "power_upper_reach_deceleration",
    family: "power_upper",
    title: "Reach-speed and deceleration",
    intent: "Train fast reach intent, then immediately support shoulder deceleration and trunk position.",
    defaultDurationMinutes: 48,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare ribs and shoulder blades.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Reach speed", "Use low-force speed reps and stop before shoulder tone rises.", ["fast_wall_push", "band_press_split_stance"]),
      section("support", "Deceleration support", "Keep cuff and upper back available after speed work.", ["band_external_rotation", "one_arm_row"]),
      section("cooldown", "Reset", "Release shoulders, hands, and breathing.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_shoulder_guard_durability_10")],
    protects: ["reach speed", "shoulder deceleration", "guard quality"],
    noviceEligible: true,
    equipmentTags: ["bands", "no_equipment", "minimal"],
    safetyTags: ["power", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["Upper power focus", "Minimal equipment", "Shoulder quality is clean"],
    avoidWhen: ["Shoulder pinching, numbness, tingling, or wrist symptoms"],
    fallback: false
  }),
  template({
    templateId: "alactic_sprints_hill_stride_touch",
    family: "alactic_sprints",
    title: "Hill stride speed touch",
    intent: "Use short hill strides as a bounded alactic exposure when gait quality and lower legs are ready.",
    defaultDurationMinutes: 42,
    defaultIntensity: "hard",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare gait, ankles, and landing mechanics.", ["movement_prep_flow", "snap_down_landing"]),
      section("main", "Hill stride gates", "Use very short hill strides with full recovery and strict quality stops.", ["hill_stride_gated"]),
      section("cooldown", "Required cooldown", "Downshift calves, gait, and breathing.", ["mobility_reset_flow", "recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["acceleration", "lower-leg quality", "fresh speed"],
    noviceEligible: false,
    equipmentTags: ["minimal"],
    safetyTags: ["conditioning", "phase_variant", "quality_stop"],
    preferredWhen: ["Green readiness", "Pain-free gait", "Speed target needs a hill option"],
    avoidWhen: ["Calf, Achilles, foot, knee, or gait symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_zone2_run_walk_base",
    family: "roadwork_zone2",
    title: "Run-walk aerobic base",
    intent: "Build aerobic base with a run-walk structure that keeps talk-test effort and gait quality intact.",
    defaultDurationMinutes: 50,
    defaultIntensity: "easy",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Prep", "Confirm talk-test breathing and pain-free gait.", ["movement_prep_flow"]),
      section("main", "Run-walk Zone 2", "Alternate easy jog and walk without chasing pace.", ["run_walk_zone2"]),
      section("support", "Lower-leg support", "Keep ankles and calves calm after aerobic work.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Downshift breathing and lower-leg tone.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["aerobic base", "lower-leg tolerance", "repeatability"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["roadwork", "phase_variant", "novice_safe"],
    preferredWhen: ["Novice or returning athlete", "Standard dose", "Impact is tolerated"],
    avoidWhen: ["Gait-changing pain", "Dizziness", "Red readiness"],
    fallback: false
  }),
  template({
    templateId: "roadwork_tempo_progression_run",
    family: "roadwork_tempo",
    title: "Tempo progression run",
    intent: "Use one controlled tempo segment inside an easy run so sustained pressure stays repeatable.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Ease into gait and breathing before tempo.", ["movement_prep_flow"]),
      section("main", "Tempo progression", "Build from easy running into one controlled tempo segment.", ["tempo_roadwork"]),
      section("support", "Calf and ankle reset", "Protect lower-leg quality after tempo work.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Return breathing to easy before stopping.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["pace control", "sustained pressure", "gait quality"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["roadwork", "phase_variant", "quality_stop"],
    preferredWhen: ["Intermediate athlete", "Serious dose", "No hard boxing conflict"],
    avoidWhen: ["Red readiness", "Hard protected anchor today", "Lower-leg symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_intervals_short_aerobic_power",
    family: "roadwork_intervals",
    title: "Short aerobic power intervals",
    intent: "Use short bounded intervals to build repeatability without all-out output.",
    defaultDurationMinutes: 50,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Warm up gait and breathing before interval work.", ["movement_prep_flow"]),
      section("main", "Short aerobic power", "Run controlled 60-90 second efforts with easy recovery.", ["roadwork_interval_400s"]),
      section("cooldown", "Required cooldown", "Stop while mechanics remain clean and breathing returns.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["repeatability", "gait quality", "round recovery"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["conditioning", "phase_variant", "quality_stop"],
    preferredWhen: ["Green readiness", "Conditioning target needs intervals", "No high-stress anchor conflict"],
    avoidWhen: ["Conservative fueling context", "Gait-changing pain", "Breathing control is poor"],
    fallback: false
  }),
  template({
    templateId: "round_conditioning_skill_constraints",
    family: "round_based_conditioning",
    title: "Conditioning with skill constraints",
    intent: "Use boxing-length rounds with one clear skill focus per round and a strict quality ceiling.",
    defaultDurationMinutes: 55,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Prepare stance, breathing, and quality gates.", ["movement_prep_flow", "technical_quality_gate"]),
      section("main", "Skill-constrained rounds", "Build work capacity through solo rounds while preserving shape.", ["round_based_conditioning_support", "guard_return_timer"]),
      section("support", "Trunk support", "Keep posture available after round work.", ["dead_bug_anti_extension", "side_plank_knee_down"]),
      section("cooldown", "Required cooldown", "Downshift breathing and coordination.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["work capacity", "skill shape", "breathing control"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["conditioning", "phase_variant", "quality_stop"],
    preferredWhen: ["Camp or serious dose", "Skill quality is stable", "No hard protected anchor today"],
    avoidWhen: ["Red readiness", "Technique breaks early", "Conservative fueling context"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_shadowboxing_advanced_tactical_rounds",
    family: "boxing_technical_shadowboxing",
    title: "Advanced tactical shadow rounds",
    intent: "Layer lead-hand entries, rhythm breaks, defense, and exits across clean tactical rounds.",
    defaultDurationMinutes: 60,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Integrated solo tactical shadowboxing",
    tacticalTheme: "Enter, change rhythm, defend, and exit before adding volume",
    technicalEmphasis: ["feint-to-jab entry", "jab-cross exit", "guard return timer", "defense reset"],
    roundStructure: "6 x 2:30-3:00 tactical shadow rounds, 1:00 rest",
    equipmentMode: "mirror",
    sessionPriority: "primary",
    mainExerciseIds: ["feint_jab_entry", "jab_cross_exit", "guard_return_timer", "shadowboxing_technical_rounds"],
    supportExerciseIds: ["defense_shape_quality_check", "optional_film_self_check"],
    addOnBlocks: [addOnBlockFromLibrary("required_technical_quality_gate_5")],
    protects: ["tactical clarity", "guard return", "solo skill quality"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "mirror", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop"],
    preferredWhen: ["Intermediate or advanced athlete", "No protected boxing anchor", "Skill density target"],
    avoidWhen: ["Novice skill base", "Symptoms change balance or guard"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_bag_skill_controlled_fatigue",
    family: "boxing_bag_skill",
    title: "Bag skill under controlled fatigue",
    intent: "Use bag rounds with a final quality round only while accuracy, guard return, and exits stay clean.",
    defaultDurationMinutes: 60,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    boxingSkillTheme: "Bag accuracy, rhythm, and exits under a quality cap",
    tacticalTheme: "Touch, change rhythm, exit, and check quality before adding another round",
    technicalEmphasis: ["accuracy marks", "body-head variation", "rhythm change", "round quality check"],
    roundStructure: "6-7 x 2:30-3:00 bag rounds, 1:00 rest; final round only if quality is clean",
    equipmentMode: "bag",
    sessionPriority: "primary",
    mainExerciseIds: ["bag_accuracy_marks", "bag_body_head_variation", "bag_rhythm_change_round", "bag_round_quality_check"],
    supportExerciseIds: ["bag_angle_reset_round", "wrist_pronation_supination"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_shoulder_guard_durability_10")],
    protects: ["bag accuracy", "exit discipline", "hand and shoulder quality"],
    noviceEligible: false,
    equipmentTags: ["bag"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop", "high_fuel"],
    preferredWhen: ["Bag available", "Advanced or camp athlete", "Green readiness"],
    avoidWhen: ["Hand, wrist, shoulder, headache, or accuracy symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_ringcraft_center_reclaim_corner_escape",
    family: "boxing_footwork_ringcraft",
    title: "Center reclaim and corner escape",
    intent: "Develop corner escape, circle-out, center reclaim, and cut-off logic through line-based solo rounds.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Ringcraft position and angle control",
    tacticalTheme: "Exit pressure, reclaim center, and cut off without chasing",
    technicalEmphasis: ["L-step escape", "circle-out center reclaim", "corner escape", "ring cut-off"],
    roundStructure: "5-6 x 2:00-2:30 ringcraft rounds, 1:00 rest",
    equipmentMode: "line",
    sessionPriority: "primary",
    mainExerciseIds: ["l_step_escape", "circle_out_center_reclaim", "corner_escape_pattern", "ring_cutoff_step"],
    supportExerciseIds: ["pivot_reaction_pairing"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["angle control", "center control", "stance recovery"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "line", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop"],
    preferredWhen: ["Ringcraft theme", "Footwork quality is stable", "No lower-leg symptoms"],
    avoidWhen: ["Feet cross repeatedly", "Lower-leg pain changes stepping"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_defense_after_offense",
    family: "boxing_defense_movement",
    title: "Defense after offense",
    intent: "Pair one punch or short combination with a small defensive shape and full reset.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Defensive responsibility after offense",
    tacticalTheme: "Punch, defend, pivot, and reset before adding work",
    technicalEmphasis: ["single jab exit", "pull reset", "roll pivot", "defense quality check"],
    roundStructure: "5-6 x 2:00-2:30 defense-after-offense rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "primary",
    mainExerciseIds: ["single_jab_exit_reset", "pull_reset_shadow", "roll_pivot_reset", "defense_shape_quality_check"],
    supportExerciseIds: ["dead_bug_anti_extension", "side_plank_knee_down"],
    addOnBlocks: [addOnBlockFromLibrary("recommended_trunk_transfer_10")],
    protects: ["defensive shape", "balance", "trunk position"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["Defense theme", "Build or camp week", "Needs trunk support"],
    avoidWhen: ["Neck, dizziness, balance, knee, hip, or back symptoms"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_jab_lead_hand_pressure_control",
    family: "boxing_jab_entry_exit",
    title: "Lead-hand pressure control",
    intent: "Use feints, body-head jabs, double jabs, and exits to develop lead-hand control.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Lead-hand pressure without overreaching",
    tacticalTheme: "Show, enter, touch two lines, and exit on balance",
    technicalEmphasis: ["feint-to-jab", "double jab", "body-head jab", "single jab exit"],
    roundStructure: "5 x 2:30 lead-hand rounds, 1:00 rest",
    equipmentMode: "none",
    sessionPriority: "primary",
    mainExerciseIds: ["feint_jab_entry", "double_jab_exit", "jab_body_jab_head", "single_jab_exit_reset"],
    supportExerciseIds: ["guard_return_timer"],
    addOnBlocks: [addOnBlockFromLibrary("required_technical_quality_gate_5")],
    protects: ["lead-hand rhythm", "entry timing", "exit quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["Jab development theme", "No bag needed", "Skill exposure target"],
    avoidWhen: ["Shoulder, wrist, balance, or breathing quality drops"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_counter_rhythm_break_tactical",
    family: "boxing_counter_timing",
    title: "Rhythm break tactical rounds",
    intent: "Use self-called cues, rhythm changes, and single counter exits to develop relaxed timing.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    boxingSkillTheme: "Counter timing and rhythm breaks",
    tacticalTheme: "Invite a cue, respond once, exit, and reset",
    technicalEmphasis: ["mirror feint reaction", "single counter exit", "rhythm change", "pull reset"],
    roundStructure: "6 x 2:00 cue-response rounds, 1:00 rest",
    equipmentMode: "mirror",
    sessionPriority: "primary",
    mainExerciseIds: ["mirror_feint_reaction", "single_counter_exit", "rhythm_change_round", "pull_reset_shadow"],
    supportExerciseIds: ["defense_shape_quality_check"],
    addOnBlocks: [addOnBlockFromLibrary("optional_film_self_check_5")],
    protects: ["timing", "relaxation", "reset discipline"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "mirror", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop"],
    preferredWhen: ["Intermediate or advanced skill theme", "Reaction rhythm target", "Fresh technical day"],
    avoidWhen: ["Rushing, stress, or tension increases"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "boxing_round_skill_quality_controlled_fatigue",
    family: "boxing_round_skill_circuit",
    title: "Skill quality under controlled fatigue",
    intent: "Blend jab, defense, ringcraft, and rhythm constraints through round structure with a strict quality cap.",
    defaultDurationMinutes: 62,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    boxingSkillTheme: "Integrated round skill quality",
    tacticalTheme: "Change one constraint per round and stop before shape collapses",
    technicalEmphasis: ["technical rounds", "defense after combination", "ringcraft line", "rhythm change"],
    roundStructure: "6-8 x 2:30-3:00 constrained solo rounds, 1:00 rest",
    equipmentMode: "line",
    sessionPriority: "primary",
    mainExerciseIds: ["shadowboxing_technical_rounds", "defense_after_combo_round", "rope_line_ringcraft", "rhythm_change_round"],
    supportExerciseIds: ["guard_return_timer", "recovery_breathing_mobility"],
    addOnBlocks: [addOnBlockFromLibrary("required_conditioning_cooldown_8")],
    protects: ["skill density", "round rhythm", "quality under load"],
    noviceEligible: false,
    equipmentTags: ["no_equipment", "line", "minimal"],
    safetyTags: ["boxing_skill", "phase_variant", "quality_stop", "high_fuel"],
    preferredWhen: ["Camp or serious dose", "Advanced skill quality is stable", "No protected high-stress anchor"],
    avoidWhen: ["Conservative fueling context", "Quality breaks twice", "Red readiness"],
    fallback: false
  }),
  template({
    templateId: "agility_reactive_ringcraft_add_on",
    family: "agility_reactive_footwork",
    title: "Agility and ringcraft add-on",
    intent: "Use a short reactive add-on after skill or power work to connect braking, pivots, and stance recovery.",
    defaultDurationMinutes: 32,
    defaultIntensity: "moderate",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Confirm feet are quiet and stance is available.", ["movement_prep_flow"]),
      section("main", "Reactive ringcraft", "Use low-volume reaction and pivot pairings with full reset.", ["reactive_footwork_callout", "pivot_reaction_pairing"]),
      section("cooldown", "Reset", "Restore hips, ankles, and breathing.", ["mobility_reset_flow"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_reactive_footwork_primer_8")],
    protects: ["reaction", "braking", "ringcraft transfer"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["agility", "phase_variant", "quality_stop", "novice_safe"],
    preferredWhen: ["After power day", "Footwork target needs a short add-on", "Taper-safe speed touch"],
    avoidWhen: ["Lower-leg pain", "Foot noise rises early"],
    fallback: false
  }),
  template({
    templateId: "mobility_recovery_post_hard_day_reset",
    family: "mobility_recovery_flow",
    title: "Post-hard-day reset",
    intent: "Use walking, breathing, hips, ankles, shoulders, and trunk reset to make recovery own the day.",
    defaultDurationMinutes: 32,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("reset", "Breathing and walk", "Downshift stress before mobility.", ["easy_walk_reset", "recovery_breathing_mobility"]),
      section("main", "Hip and shoulder reset", "Restore usable boxing positions without forced range.", ["mobility_reset_flow", "serratus_wall_slide"]),
      section("support", "Trunk reset", "Use low-stress trunk control only if it improves positions.", ["dead_bug_anti_extension"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_breathing_reset_5")],
    protects: ["recovery", "range", "next-session quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["recovery", "phase_variant", "low_fuel", "novice_safe"],
    preferredWhen: ["After hard day", "Recovery or deload week", "Symptoms improve with easy movement"],
    avoidWhen: ["Symptoms worsen with easy movement"],
    fallback: false
  }),
  boxingTemplate({
    templateId: "movement_quality_pre_lift_boxing_prep",
    family: "movement_quality_prep",
    title: "Pre-lift boxing prep",
    intent: "Prime stance, trunk, shoulders, and guard rhythm before a higher-stimulus lift without adding fatigue.",
    defaultDurationMinutes: 22,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    boxingSkillTheme: "Stance and guard prep before lifting",
    tacticalTheme: "Start the lift from boxing positions that feel organized",
    technicalEmphasis: ["stance reset", "trunk anti-extension", "shoulder rhythm", "guard return"],
    roundStructure: "Short primer blocks only; stop fresh",
    equipmentMode: "none",
    sessionPriority: "add_on",
    mainExerciseIds: ["stance_guard_reset", "dead_bug_anti_extension", "serratus_wall_slide", "guard_return_timer"],
    addOnBlocks: [addOnBlockFromLibrary("required_movement_prep_8")],
    protects: ["lift setup", "guard posture", "movement quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["mobility", "phase_variant", "novice_safe", "quality_stop"],
    preferredWhen: ["Before hard lift", "Movement quality target", "No equipment"],
    avoidWhen: ["Prep creates fatigue or symptoms"],
    fallback: false
  }),
  template({
    templateId: "footwork_agility_primer_add_on",
    family: "footwork_agility",
    title: "Footwork primer add-on",
    intent: "Use brief line steps, pivots, and guard resets before skill or power work.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Ease into stance range.", ["movement_prep_flow"]),
      section("main", "Footwork primer", "Use small steps, pivots, and clean guard return.", ["step_slide_stance_lane", "pivot_out_reset", "footwork_quality_finisher"]),
      section("cooldown", "Reset", "Stop fresh before the main work.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_reactive_footwork_primer_8")],
    protects: ["foot rhythm", "stance width", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["agility", "phase_variant", "low_fuel", "novice_safe"],
    preferredWhen: ["Before skill or power", "Short add-on target", "No equipment"],
    avoidWhen: ["Foot placement degrades", "Lower-leg symptoms"],
    fallback: false
  }),
  template({
    templateId: "reaction_rhythm_visual_support",
    family: "reaction_rhythm",
    title: "Visual rhythm support",
    intent: "Use mirror, timer, or ball cues to keep reaction timing sharp with low stress.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare stance and eyes before cues.", ["movement_prep_flow"]),
      section("main", "Visual rhythm", "Pair visual or self-called cues with one reaction and full reset.", ["mirror_feint_reaction", "reaction_cue_step", "tennis_ball_reaction_drop"]),
      section("cooldown", "Reset", "Downshift breathing and timing pressure.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_film_self_check_5")],
    protects: ["reaction timing", "rhythm", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "mirror", "minimal"],
    safetyTags: ["agility", "phase_variant", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Optional timing day", "Taper-safe rhythm touch", "No hard conditioning needed"],
    avoidWhen: ["Cues create stress or rushing"],
    fallback: false
  }),
  template({
    templateId: "trunk_durability_defense_position_support",
    family: "trunk_durability",
    title: "Defense-position trunk support",
    intent: "Support defensive posture with anti-rotation, side plank, and adductor/trunk control.",
    defaultDurationMinutes: 36,
    defaultIntensity: "moderate",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open stance range and ribs.", ["movement_prep_flow"]),
      section("main", "Defense-position trunk", "Use clean trunk positions that support slips, rolls, and pivots.", ["pallof_press", "side_plank_knee_down"]),
      section("support", "Adductor and anti-extension", "Keep stance-width support low stress.", ["adductor_side_plank_regression", "dead_bug_anti_extension"]),
      section("cooldown", "Reset", "Release trunk tone and breathing.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_trunk_transfer_10")],
    protects: ["defensive posture", "pivots", "trunk transfer"],
    noviceEligible: true,
    equipmentTags: ["bands", "no_equipment", "minimal"],
    safetyTags: ["durability", "phase_variant", "novice_safe"],
    preferredWhen: ["Defense theme", "Trunk support target", "Low fuel available"],
    avoidWhen: ["Back pain, rib flare, breath-holding, or shoulder discomfort"],
    fallback: false
  }),
  template({
    templateId: "shoulder_scap_punch_deceleration_support",
    family: "shoulder_scap_durability",
    title: "Punch deceleration support",
    intent: "Use reach control, row balance, cuff rhythm, and trunk support to preserve shoulder quality.",
    defaultDurationMinutes: 40,
    defaultIntensity: "moderate",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulder blades and ribs.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Deceleration support", "Build cuff and upper-back control around punching volume.", ["band_external_rotation", "one_arm_row", "push_up_plus"]),
      section("support", "Trunk support", "Keep reach connected to trunk position.", ["pallof_press"]),
      section("cooldown", "Reset", "Downshift shoulder and neck tone.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_shoulder_guard_durability_10")],
    protects: ["shoulder quality", "guard endurance", "punch deceleration"],
    noviceEligible: true,
    equipmentTags: ["bands", "dumbbells", "no_equipment"],
    safetyTags: ["durability", "phase_variant", "novice_safe", "quality_stop"],
    preferredWhen: ["After bag or upper-body work", "Shoulder support target", "Guard fatigue needs support"],
    avoidWhen: ["Pinching, numbness, tingling, or neck symptoms"],
    fallback: false
  }),
  template({
    templateId: "neck_trap_travel_posture_reset",
    family: "neck_trap_durability",
    title: "Travel and posture neck reset",
    intent: "Use gentle neck, shoulder, and breathing work as recovery-only posture support.",
    defaultDurationMinutes: 20,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("reset", "Posture reset", "Relax neck and shoulder tone before any isometrics.", ["recovery_breathing_mobility"]),
      section("main", "Gentle neck posture", "Use very light hand-resisted isometrics and upper-back rhythm.", ["neck_isometric_hand_resisted", "ytwl_raise"]),
      section("cooldown", "Breathing reset", "Finish with jaw, neck, and rib relaxation.", ["trap_posture_breathing_carry"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_breathing_reset_5")],
    protects: ["neck comfort", "guard posture", "recovery"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["durability", "phase_variant", "low_fuel", "novice_safe"],
    preferredWhen: ["Travel week", "Posture reset", "Recovery-only support"],
    avoidWhen: ["Headache, dizziness, neck pain, numbness, or tingling"],
    fallback: false
  }),
  template({
    templateId: "wrist_hand_forearm_capacity_support",
    family: "wrist_hand_durability",
    title: "Forearm capacity support",
    intent: "Build light wrist, hand, and carry tolerance while preserving relaxed guard and grip.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulders, wrists, and hands.", ["movement_prep_flow"]),
      section("main", "Forearm capacity", "Use smooth wrist control and light grip work without max squeezing.", ["wrist_pronation_supination", "wrist_extension_flexion_control", "grip_endurance_carry"]),
      section("support", "Release drills", "Finish with hand relaxation and breathing.", ["open_close_hand_pump", "towel_squeeze_breathing"]),
      section("cooldown", "Reset", "Relax hands, jaw, and shoulders.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_breathing_reset_5")],
    protects: ["hand tolerance", "wrist control", "relaxed guard"],
    noviceEligible: true,
    equipmentTags: ["dumbbells", "no_equipment", "minimal"],
    safetyTags: ["durability", "phase_variant", "low_fuel", "novice_safe"],
    preferredWhen: ["Bag tolerance support", "Forearm tension needs release", "Optional durability day"],
    avoidWhen: ["Hand, wrist, elbow, cramping, numbness, or tingling symptoms"],
    fallback: false
  }),
  template({
    templateId: "hip_ankle_post_roadwork_reset",
    family: "hip_ankle_mobility",
    title: "Post-roadwork lower-leg reset",
    intent: "Restore calf, ankle, hip, and breathing quality after roadwork without adding hidden load.",
    defaultDurationMinutes: 24,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("reset", "Lower-leg reset", "Release calves and ankles after roadwork.", ["calf_ankle_capacity"]),
      section("main", "Hip and ankle mobility", "Restore stance range and lateral positions.", ["hip_switch_step", "lateral_lunge_regression"]),
      section("cooldown", "Breathing reset", "Downshift before the next training stress.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("recommended_hip_ankle_reset_8")],
    protects: ["lower-leg recovery", "stance range", "tomorrow's footwork"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["mobility", "phase_variant", "low_fuel", "novice_safe"],
    preferredWhen: ["After roadwork", "Deload week", "Lower-leg stiffness without pain"],
    avoidWhen: ["Achilles, calf, foot, hip, groin, or knee pain rises"],
    fallback: false
  }),
  template({
    templateId: "recovery_reset_plus_skill_touch",
    family: "recovery_reset",
    title: "Recovery plus skill touch",
    intent: "Use recovery first, then add an optional easy technical touch only if the athlete feels better.",
    defaultDurationMinutes: 28,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("reset", "Recovery first", "Breathing and mobility own the session.", ["recovery_breathing_mobility", "mobility_reset_flow"]),
      section("support", "Optional easy skill touch", "Use a tiny jab-only touch only if symptoms and coordination improve.", ["stance_guard_reset", "single_jab_exit_reset"]),
      section("cooldown", "Stop fresh", "Let the session end without adding work.", ["optional_film_self_check"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_easy_shadow_touch_10")],
    protects: ["recovery", "confidence", "technical feel"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["recovery", "phase_variant", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Recovery day", "Symptoms improve with easy movement", "Taper or deload week"],
    avoidWhen: ["Symptoms worsen", "Coordination fades", "Any hard-stop safety flag"],
    fallback: false
  }),
  template({
    templateId: "taper_maintenance_tournament_repeatable_warmup",
    family: "taper_maintenance",
    title: "Tournament repeatable warm-up",
    intent: "Create a repeatable low-volume warm-up that preserves rhythm and confidence across tournament days.",
    defaultDurationMinutes: 24,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Mobility warm-up", "Open stance range without fatigue.", ["movement_prep_flow", "mobility_reset_flow"]),
      section("main", "Rhythm touch", "Use easy reaction and speed touches with long resets.", ["reaction_cue_step", "taper_speed_step"]),
      section("cooldown", "Reset", "Leave fresher and ready to repeat.", ["recovery_breathing_mobility"])
    ],
    addOnBlocks: [addOnBlockFromLibrary("optional_breathing_reset_5")],
    protects: ["freshness", "repeatability", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["taper", "phase_variant", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Tournament week", "Fight-week travel", "Need repeatable warm-up"],
    avoidWhen: ["Red readiness requires recovery only", "Timing or symptoms worsen"],
    fallback: false
  })
];

export const workoutTemplateCatalog: readonly WorkoutTemplate[] = [
  template({
    templateId: "strength_lower_stance_strength",
    family: "strength_lower",
    title: "Lower-body stance strength",
    intent: "Build lower-body force and stance control with submaximal reps that do not chase fatigue.",
    defaultDurationMinutes: 60,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Move hips, ankles, and trunk before lower-body loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Hinge strength with clean reps and no grind.", ["hip_hinge_rdl"]),
      section("accessory", "Stance accessory", "Single-leg control and ankle capacity for stance resets.", ["rear_foot_elevated_split_squat", "calf_ankle_capacity"]),
      section("cooldown", "Cooldown", "Restore hips and breathing after loading.", ["mobility_reset_flow"])
    ],
    protects: ["stance durability", "leg drive", "tomorrow's boxing quality"],
    noviceEligible: false,
    equipmentTags: ["dumbbells", "bench"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Green readiness", "Equipped athlete", "Build-strength or camp-support week"],
    avoidWhen: ["Red readiness", "Hard protected anchor on the same date", "Severe fueling risk"],
    fallback: false
  }),
  template({
    templateId: "strength_lower_minimal_hinge_unilateral",
    family: "strength_lower",
    title: "Hinge and unilateral strength",
    intent: "Keep lower-body strength simple, repeatable, and available without a heavy setup.",
    defaultDurationMinutes: 35,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare stance range without fatigue.", ["movement_prep_flow"]),
      section("main", "Main strength", "Own a light hinge pattern and split-stance control.", ["hip_hinge_rdl", "split_squat_iso"]),
      section("support", "Trunk support", "Finish with easy anti-extension control.", ["dead_bug_anti_extension"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["mobility_reset_flow"])
    ],
    protects: ["stance positions", "hips", "low-back tolerance"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "No-equipment or minimal-equipment setup", "Conservative fueling context"],
    avoidWhen: ["Any pain that changes hinge mechanics"],
    fallback: true
  }),
  template({
    templateId: "strength_upper_guard_press_pull",
    family: "strength_upper",
    title: "Guard-friendly press and pull",
    intent: "Build upper-body strength around reach, row, and shoulder-blade control.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulders, ribs, and upper back before pressing or pulling.", ["movement_prep_flow"]),
      section("main", "Press strength", "Press with a guard-friendly path and no max loading.", ["landmine_press"]),
      section("accessory", "Pulling strength", "Balance punching volume with upper-back strength.", ["one_arm_row"]),
      section("support", "Scap support", "Keep the shoulder blade and ribs controlled after strength work.", ["serratus_wall_slide", "pallof_press"]),
      section("cooldown", "Cooldown", "Downshift shoulder tone before the next boxing exposure.", ["recovery_breathing_mobility"])
    ],
    protects: ["guard position", "upper-back control", "trunk transfer"],
    noviceEligible: true,
    equipmentTags: ["landmine", "dumbbells", "bands"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Upper-body strength bias", "Equipment access supports pressing and rowing"],
    avoidWhen: ["Shoulder symptoms that worsen with pressing", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "strength_upper_upper_back_durability",
    family: "strength_upper",
    title: "Upper-back durability strength",
    intent: "Use low-complexity pulling, reaching, and cuff work to support guard endurance.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder and trunk prep.", ["movement_prep_flow"]),
      section("main", "Upper-back strength", "Pull and reach with clean shoulder control.", ["band_row", "push_up_plus"]),
      section("support", "Scap durability", "Finish with small shoulder-blade control work.", ["ytwl_raise", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Release neck and rib tension.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "guard position", "neck tone"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "Conservative fueling context", "Shoulder durability bias"],
    avoidWhen: ["Numbness, tingling, or shoulder pinching"],
    fallback: true
  }),
  template({
    templateId: "strength_full_body_whole_body_support",
    family: "strength_full_body",
    title: "Whole-body strength support",
    intent: "Link hinge, split stance, row, and anti-rotation work without replacing boxing practice.",
    defaultDurationMinutes: 65,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Move hips, trunk, and shoulders before loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Low-rep whole-body force work with clean reps only.", ["trap_bar_deadlift"]),
      section("accessory", "Secondary strength", "Build stance durability without a fatigue finisher.", ["split_squat_iso", "one_arm_row"]),
      section("support", "Trunk support", "Keep punch-transfer positions resilient.", ["pallof_press"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["recovery_breathing_mobility"])
    ],
    protects: ["force transfer", "stance durability", "trunk control"],
    noviceEligible: false,
    equipmentTags: ["trap_bar", "dumbbells", "bands"],
    safetyTags: ["strength", "moderate_fuel"],
    preferredWhen: ["Advanced athlete", "Build-strength week", "Green readiness"],
    avoidWhen: ["Red readiness", "Hard protected anchor on the same date", "Severe fueling risk"],
    fallback: false
  }),
  template({
    templateId: "strength_full_body_novice_support",
    family: "strength_full_body",
    title: "Novice full-body support",
    intent: "Build simple strength foundations with low-complexity exercises and clear stop gates.",
    defaultDurationMinutes: 38,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Move hips, trunk, and shoulders before loading.", ["movement_prep_flow"]),
      section("main", "Main strength", "Use a simple squat pattern with clean reps.", ["goblet_squat_to_box"]),
      section("accessory", "Secondary strength", "Add stance and upper-back control without novelty.", ["split_squat_iso", "band_row"]),
      section("support", "Shoulder and trunk support", "Keep the guard and trunk positions resilient.", ["push_up_plus", "dead_bug_anti_extension"]),
      section("cooldown", "Cooldown", "Downshift and restore range.", ["recovery_breathing_mobility"])
    ],
    protects: ["simple strength skill", "guard position", "stance control"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Novice athlete", "No-equipment or minimal-equipment setup", "Conservative fueling context"],
    avoidWhen: ["Pain that changes squat, hinge, or reach mechanics"],
    fallback: true
  }),
  template({
    templateId: "power_rotational_med_ball",
    family: "power_rotational",
    title: "Rotational med-ball power",
    intent: "Keep rotational power fast, low-volume, and fully recovered between efforts.",
    defaultDurationMinutes: 50,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare rotation without fatigue.", ["movement_prep_flow"]),
      section("main", "Rotational power", "Low-volume intent with full recovery.", ["med_ball_rotational_throw", "med_ball_scoop_toss"]),
      section("support", "Trunk control", "Hold transfer positions after speed work.", ["pallof_press"]),
      section("cooldown", "Cooldown", "Downshift before boxing or the next day.", ["recovery_breathing_mobility"])
    ],
    protects: ["speed", "rotation timing", "trunk transfer"],
    noviceEligible: true,
    equipmentTags: ["medicine_ball", "bands"],
    safetyTags: ["power", "moderate_fuel", "quality_stop"],
    preferredWhen: ["Power bias", "Medicine ball and clear throwing area available"],
    avoidWhen: ["Shoulder, back, or hip pain", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "power_rotational_step_snap",
    family: "power_rotational",
    title: "No-equipment step-and-snap power",
    intent: "Preserve rotational speed with quiet feet, short reps, and no equipment requirement.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare hips, ankles, and ribs.", ["movement_prep_flow"]),
      section("main", "Rotation speed", "Use short step-and-snap patterns with full reset.", ["step_and_snap_rotation", "hip_switch_step"]),
      section("support", "Trunk control", "Finish with easy anti-extension control.", ["dead_bug_anti_extension"]),
      section("cooldown", "Reset", "Leave coordinated, not tired.", ["recovery_breathing_mobility"])
    ],
    protects: ["timing", "freshness", "foot rhythm"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No equipment", "Conservative fueling context", "Taper-safe speed touch"],
    avoidWhen: ["Coordination drops quickly", "Foot or hip pain"],
    fallback: true
  }),
  template({
    templateId: "power_lower_landing_pogo",
    family: "power_lower",
    title: "Landing and pogo microdose",
    intent: "Touch lower-body speed with quiet landings and strict quality stops.",
    defaultDurationMinutes: 50,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare ankles and landings without fatigue.", ["movement_prep_flow"]),
      section("main", "Lower-body power", "Tiny dose of fast, quiet ground strikes only.", ["snap_down_landing", "low_amplitude_pogo"]),
      section("support", "Ankle capacity", "Keep the lower leg resilient after speed work.", ["calf_ankle_capacity"]),
      section("cooldown", "Cooldown", "Leave springy, not tired.", ["mobility_reset_flow"])
    ],
    protects: ["footwork bounce", "landing control", "calves"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["power", "quality_stop"],
    preferredWhen: ["Green or amber readiness", "Pain-free lower legs"],
    avoidWhen: ["Achilles, calf, foot, knee, or hip pain"],
    fallback: false
  }),
  template({
    templateId: "power_lower_speed_support",
    family: "power_lower",
    title: "Lower-body speed support",
    intent: "Use short speed-position work when jumps or sprints are not the right choice.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open stance range and ankles.", ["movement_prep_flow"]),
      section("main", "Speed positions", "Short stance switches and controlled landings.", ["hip_switch_step", "snap_down_landing"]),
      section("support", "Range support", "Keep lateral range easy and pain-free.", ["lateral_lunge_regression"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["feet", "hips", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Minimal equipment"],
    avoidWhen: ["Pain that changes stepping or landing mechanics"],
    fallback: true
  }),
  template({
    templateId: "power_upper_throw_speed",
    family: "power_upper",
    title: "Upper-body throw speed",
    intent: "Touch upper-body speed while protecting shoulder control and full recovery.",
    defaultDurationMinutes: 50,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Warm-up", "Prepare shoulder blade control before throws.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Upper-body power", "Low-volume throws with full recovery.", ["med_ball_shot_put_throw"]),
      section("support", "Deceleration support", "Balance speed with cuff and upper-back control.", ["band_external_rotation", "one_arm_row"]),
      section("cooldown", "Cooldown", "Downshift shoulders and grip.", ["recovery_breathing_mobility"])
    ],
    protects: ["punch speed", "shoulders", "upper-back control"],
    noviceEligible: true,
    equipmentTags: ["medicine_ball", "bands", "dumbbells"],
    safetyTags: ["power", "quality_stop"],
    preferredWhen: ["Power bias", "Clear throw setup available"],
    avoidWhen: ["Shoulder symptoms", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "power_upper_wall_speed_microdose",
    family: "power_upper",
    title: "Shoulder-safe speed microdose",
    intent: "Keep upper-body speed light and shoulder-safe when equipment or readiness is limited.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare ribs and shoulder blades.", ["movement_prep_flow", "serratus_wall_slide"]),
      section("main", "Speed microdose", "Use low-force fast wall pushes and stop before shoulder irritation.", ["fast_wall_push"]),
      section("support", "Cuff support", "Finish with easy rotator-cuff rhythm.", ["band_external_rotation"]),
      section("cooldown", "Reset", "Release neck and shoulder tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "speed", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No equipment", "Conservative fueling context", "Shoulder-safe speed touch"],
    avoidWhen: ["Shoulder pinching, numbness, or tingling"],
    fallback: true
  }),
  template({
    templateId: "alactic_sprints_gated",
    family: "alactic_sprints",
    title: "Alactic sprint gates",
    intent: "Use very short speed efforts only when readiness, gait, and full recovery gates are met.",
    defaultDurationMinutes: 50,
    defaultIntensity: "hard",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Warm-up", "Prepare ankles, hips, and landing mechanics before fast work.", ["movement_prep_flow", "snap_down_landing"]),
      section("main", "Alactic sprint support", "Very short efforts with full recovery and strict gates.", ["alactic_sprint_gated"]),
      section("cooldown", "Reset", "Downshift calves and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["short burst speed", "gait quality", "calves"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["high_fuel", "quality_stop"],
    preferredWhen: ["Green readiness", "Pain-free gait", "No hard protected anchor"],
    avoidWhen: ["Red readiness", "Under-fueling evidence", "Hard protected anchor", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "alactic_sprints_bike_alt",
    family: "alactic_sprints",
    title: "Bike alactic alternative",
    intent: "Preserve short burst intent without running impact when sprint gates are not met.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare breathing and lower legs.", ["movement_prep_flow"]),
      section("main", "Bike alactic support", "Use short spin-ups with generous recovery.", ["bike_alactic_spin"]),
      section("support", "Lower-leg support", "Keep calf work easy and optional.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Downshift breathing.", ["recovery_breathing_mobility"])
    ],
    protects: ["speed touch", "joints", "freshness"],
    noviceEligible: true,
    equipmentTags: ["bike", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["No sprint gate", "Conservative fueling context", "Impact should stay low"],
    avoidWhen: ["Dizziness, chest pain, or symptoms that rise with cadence"],
    fallback: true
  }),
  template({
    templateId: "roadwork_zone2_talk_test",
    family: "roadwork_zone2",
    title: "Talk-test roadwork",
    intent: "Build aerobic support at a conversational effort without requiring a wearable.",
    defaultDurationMinutes: 60,
    defaultIntensity: "easy",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Prep", "Check gait and breathing before easy aerobic work.", ["movement_prep_flow"]),
      section("main", "Zone 2 roadwork", "Talk-test aerobic work for repeatable recovery.", ["zone2_roadwork_talk_test"]),
      section("cooldown", "Reset", "Restore easy range after roadwork.", ["recovery_breathing_mobility"])
    ],
    protects: ["between-round recovery", "aerobic base", "legs"],
    noviceEligible: true,
    equipmentTags: ["no_equipment"],
    safetyTags: ["aerobic", "manual_input_first"],
    preferredWhen: ["Aerobic-base bias", "Pain-free gait", "Green or amber readiness"],
    avoidWhen: ["Gait-changing pain", "Hard protected anchor on the same date"],
    fallback: false
  }),
  template({
    templateId: "roadwork_zone2_bike_walk",
    family: "roadwork_zone2",
    title: "Bike or walk Zone 2",
    intent: "Keep easy aerobic support available when running impact is not appropriate.",
    defaultDurationMinutes: 24,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Start easy and confirm breathing is calm.", ["movement_prep_flow"]),
      section("main", "Low-impact aerobic", "Use bike, rower, walk-run, or brisk walking at talk-test effort.", ["bike_rower_zone2", "easy_walk_reset"]),
      section("cooldown", "Reset", "Finish with easy range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["recovery", "joints", "aerobic rhythm"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bike", "rower"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "manual_input_first"],
    preferredWhen: ["Conservative fueling context", "No wearable", "Running impact should stay low"],
    avoidWhen: ["Symptoms rise during easy breathing"],
    fallback: true
  }),
  template({
    templateId: "roadwork_tempo_controlled",
    family: "roadwork_tempo",
    title: "Controlled tempo",
    intent: "Use controlled tempo only when safety and readiness allow more than easy aerobic work.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Check gait, breathing, and readiness before tempo work.", ["movement_prep_flow"]),
      section("main", "Tempo roadwork", "Controlled tempo support without racing the workout.", ["tempo_roadwork"]),
      section("cooldown", "Reset", "Bring breathing down before the next training stress.", ["mobility_reset_flow"])
    ],
    protects: ["sustained pressure", "breathing control", "weekly cap"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "high_fuel"],
    preferredWhen: ["Green readiness", "Tempo bias", "No hard protected anchor"],
    avoidWhen: ["Under-fueling evidence", "Red readiness", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_tempo_bike",
    family: "roadwork_tempo",
    title: "Bike tempo",
    intent: "Use bike-based tempo when impact should stay lower and intensity still needs boundaries.",
    defaultDurationMinutes: 22,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Ease into cadence and confirm breathing control.", ["movement_prep_flow"]),
      section("main", "Bike tempo", "Controlled tempo blocks with plenty of easy recovery.", ["bike_tempo_blocks"]),
      section("cooldown", "Reset", "Leave breathing calm and repeatable.", ["recovery_breathing_mobility"])
    ],
    protects: ["joints", "breathing control", "freshness"],
    noviceEligible: true,
    equipmentTags: ["bike", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Impact should stay low", "Conservative fueling context", "Readiness is amber"],
    avoidWhen: ["Dizziness or symptoms rising with cadence"],
    fallback: true
  }),
  template({
    templateId: "roadwork_intervals_controlled",
    family: "roadwork_intervals",
    title: "Controlled interval support",
    intent: "Use short controlled efforts with clear intensity boundaries and no all-out finish.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "high",
    sections: [
      section("warmup", "Prep", "Warm up enough to protect gait and calves.", ["movement_prep_flow"]),
      section("main", "Roadwork intervals", "Short controlled efforts with clean mechanics.", ["roadwork_interval_controlled"]),
      section("cooldown", "Reset", "Stop while mechanics are still clean.", ["recovery_breathing_mobility"])
    ],
    protects: ["repeatable conditioning", "gait quality", "weekly cap"],
    noviceEligible: false,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "high_fuel"],
    preferredWhen: ["Green readiness", "Interval bias", "No hard protected anchor"],
    avoidWhen: ["Under-fueling evidence", "Red readiness", "High cycle symptoms"],
    fallback: false
  }),
  template({
    templateId: "roadwork_intervals_non_impact",
    family: "roadwork_intervals",
    title: "Non-impact interval support",
    intent: "Keep interval work lower impact and conservative when hard conditioning is not appropriate.",
    defaultDurationMinutes: 20,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Ease into cadence and confirm symptoms stay calm.", ["movement_prep_flow"]),
      section("main", "Non-impact intervals", "Use bike or rower intervals with conservative effort and long recovery.", ["bike_rower_intervals"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["mobility_reset_flow"])
    ],
    protects: ["joints", "freshness", "breathing control"],
    noviceEligible: true,
    equipmentTags: ["bike", "rower", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "Impact should stay low", "Reduce-volume strategy"],
    avoidWhen: ["Symptoms rise with cadence or breathing"],
    fallback: true
  }),
  template({
    templateId: "round_conditioning_solo_structure",
    family: "round_based_conditioning",
    title: "Solo round structure",
    intent: "Match boxing round timing with solo movement only and a strict quality ceiling.",
    defaultDurationMinutes: 55,
    defaultIntensity: "moderate",
    defaultFuelDemand: "moderate",
    sections: [
      section("warmup", "Prep", "Warm up movement and breathing before round-based work.", ["movement_prep_flow"]),
      section("main", "Round-based conditioning", "Solo conditioning in round structure without partner-impact work.", ["round_based_conditioning_support"]),
      section("cooldown", "Reset", "Finish before quality drops.", ["recovery_breathing_mobility"])
    ],
    protects: ["round rhythm", "breathing control", "technique quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment"],
    safetyTags: ["conditioning", "quality_stop"],
    preferredWhen: ["Round-based conditioning bias", "Green or amber readiness"],
    avoidWhen: ["Red readiness", "Under-fueling evidence", "Hard protected anchor"],
    fallback: false
  }),
  template({
    templateId: "round_conditioning_low_impact_circuit",
    family: "round_based_conditioning",
    title: "Low-impact round circuit",
    intent: "Keep round structure but reduce impact, intensity, and coordination risk.",
    defaultDurationMinutes: 18,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Prep", "Start with easy movement and breathing.", ["movement_prep_flow"]),
      section("main", "Low-impact round circuit", "Use low-impact movement, trunk, and mobility in short rounds.", ["low_impact_round_circuit"]),
      section("cooldown", "Reset", "Leave calmer than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["recovery", "round rhythm", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Reduce-volume strategy"],
    avoidWhen: ["Symptoms rise during easy round rhythm"],
    fallback: true
  }),
  ...boxingDevelopmentTemplates,
  ...phaseDoseWorkoutTemplates,
  template({
    templateId: "footwork_agility_rhythm",
    family: "footwork_agility",
    title: "Footwork rhythm",
    intent: "Touch foot rhythm and direction changes without turning agility into conditioning.",
    defaultDurationMinutes: 32,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare hips, ankles, and trunk.", ["movement_prep_flow"]),
      section("main", "Footwork rhythm", "Use short line drills and full resets.", ["line_footwork_rhythm", "low_impact_agility_clock"]),
      section("cooldown", "Reset", "Restore stance range.", ["mobility_reset_flow"])
    ],
    protects: ["feet", "timing", "calves"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Footwork bias", "Taper-safe movement touch", "No equipment"],
    avoidWhen: ["Foot, calf, knee, or hip pain changes stepping"],
    fallback: false
  }),
  template({
    templateId: "footwork_agility_low_impact",
    family: "footwork_agility",
    title: "Low-impact agility",
    intent: "Use small direction changes and ankle capacity when the week calls for easy movement.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Ease into stance range.", ["movement_prep_flow"]),
      section("main", "Low-impact agility", "Move around a small clock pattern and stop before fatigue.", ["low_impact_agility_clock"]),
      section("support", "Ankle support", "Keep lower-leg support small and optional.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["ankles", "coordination", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "quality_stop"],
    preferredWhen: ["Conservative fueling context", "High cycle symptoms", "Minimal equipment"],
    avoidWhen: ["Stepping pain or gait changes"],
    fallback: true
  }),
  template({
    templateId: "reaction_rhythm_touch",
    family: "reaction_rhythm",
    title: "Reaction rhythm touch",
    intent: "Touch reaction timing with easy cues, long rests, and no fatigue chase.",
    defaultDurationMinutes: 28,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare stance and shoulder rhythm.", ["movement_prep_flow"]),
      section("main", "Reaction rhythm", "Use external cues and simple ball drops to keep timing crisp.", ["reaction_cue_step", "tennis_ball_reaction_drop"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["recovery_breathing_mobility"])
    ],
    protects: ["timing", "freshness", "coordination"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Taper", "Power bias", "Low-fuel context"],
    avoidWhen: ["Coordination drops quickly or symptoms rise"],
    fallback: false
  }),
  template({
    templateId: "reaction_rhythm_taper_safe",
    family: "reaction_rhythm",
    title: "Taper-safe reaction touch",
    intent: "Keep timing awake during taper or conservative weeks with tiny speed touches.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Stay warm without adding fatigue.", ["movement_prep_flow"]),
      section("main", "Reaction touch", "Use short reaction steps and speed touches with long rests.", ["reaction_cue_step", "taper_speed_step"]),
      section("cooldown", "Reset", "Leave fresher than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "speed", "confidence"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Fight week", "Tournament conserve", "Conservative fueling context"],
    avoidWhen: ["Red readiness or symptoms that rise with stepping"],
    fallback: true
  }),
  template({
    templateId: "trunk_durability_anti_rotation",
    family: "trunk_durability",
    title: "Anti-rotation trunk",
    intent: "Build trunk stiffness for force transfer without adding a hard day.",
    defaultDurationMinutes: 36,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Move hips and ribs without fatigue.", ["movement_prep_flow"]),
      section("main", "Anti-rotation", "Use easy anti-rotation and anti-extension control.", ["pallof_press", "dead_bug_anti_extension"]),
      section("cooldown", "Reset", "Leave the trunk calmer, not exhausted.", ["recovery_breathing_mobility"])
    ],
    protects: ["trunk control", "stance positions", "recovery"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Conservative fueling context", "Durability bias", "Hard anchor nearby"],
    avoidWhen: ["Back pain or rib flare increases"],
    fallback: false
  }),
  template({
    templateId: "trunk_durability_adductor_stance",
    family: "trunk_durability",
    title: "Anti-extension and adductor stance",
    intent: "Support trunk and adductor capacity for stance width, pivots, and lateral exits.",
    defaultDurationMinutes: 30,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Open stance range and ribs.", ["movement_prep_flow"]),
      section("main", "Anti-extension", "Own low-stress trunk control.", ["dead_bug_anti_extension"]),
      section("support", "Adductor stance", "Keep side-plank work short and easy.", ["adductor_side_plank_regression"]),
      section("cooldown", "Reset", "Finish with easy mobility.", ["mobility_reset_flow"])
    ],
    protects: ["adductors", "trunk", "stance width"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bench"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Durability bias", "Minimal equipment", "Conservative week"],
    avoidWhen: ["Groin, hip, or back pain appears"],
    fallback: true
  }),
  template({
    templateId: "shoulder_scap_guard_durability",
    family: "shoulder_scap_durability",
    title: "Guard durability",
    intent: "Support rotator cuff, serratus, and guard position with low-load control work.",
    defaultDurationMinutes: 36,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder and trunk prep.", ["movement_prep_flow"]),
      section("main", "Shoulder and scap durability", "Short, easy control work around protected boxing.", ["band_external_rotation", "push_up_plus", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Finish with low-stress breathing.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "guard position", "upper back"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Hard protected anchor nearby", "Shoulder durability bias", "Conservative fueling context"],
    avoidWhen: ["Shoulder pinching, numbness, or tingling"],
    fallback: false
  }),
  template({
    templateId: "shoulder_scap_cuff_microdose",
    family: "shoulder_scap_durability",
    title: "Scap and rotator-cuff microdose",
    intent: "Keep shoulder support tiny, repeatable, and friendly to tired weeks.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Relax neck and open ribs.", ["movement_prep_flow"]),
      section("main", "Cuff microdose", "Use small cuff and shoulder-blade reps.", ["ytwl_raise", "band_external_rotation", "serratus_wall_slide"]),
      section("cooldown", "Reset", "Downshift shoulder tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["shoulders", "neck tone", "freshness"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Deload", "Taper", "High cycle symptoms"],
    avoidWhen: ["Symptoms increase with shoulder movement"],
    fallback: true
  }),
  template({
    templateId: "neck_trap_posture_durability",
    family: "neck_trap_durability",
    title: "Neck and trap posture durability",
    intent: "Support neck posture and upper-trap endurance with safe isometrics and breathing.",
    defaultDurationMinutes: 25,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Relax neck and prepare shoulder blades.", ["movement_prep_flow"]),
      section("main", "Neck posture", "Use gentle hand-resisted isometrics and posture carries.", ["neck_isometric_hand_resisted", "trap_posture_breathing_carry"]),
      section("cooldown", "Reset", "Release neck and breathing tone.", ["recovery_breathing_mobility"])
    ],
    protects: ["neck posture", "guard position", "upper-back tone"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Neck and trap durability bias", "No symptoms with gentle isometrics"],
    avoidWhen: ["Headache, dizziness, numbness, tingling, or neck pain"],
    fallback: false
  }),
  template({
    templateId: "neck_trap_isometric_microdose",
    family: "neck_trap_durability",
    title: "Isometric neck-safe microdose",
    intent: "Keep neck work very small and symptom-aware when fatigue or uncertainty is high.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy ribs, shoulders, and neck range.", ["movement_prep_flow"]),
      section("main", "Neck-safe isometrics", "Use gentle isometrics and low-load shoulder-blade work.", ["neck_isometric_hand_resisted", "ytwl_raise"]),
      section("cooldown", "Reset", "Downshift breathing and jaw tension.", ["recovery_breathing_mobility"])
    ],
    protects: ["neck", "shoulders", "freshness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Conservative fueling context", "Deload", "Minimal equipment"],
    avoidWhen: ["Any neurological symptom or neck pain increase"],
    fallback: true
  }),
  template({
    templateId: "wrist_hand_durability_control",
    family: "wrist_hand_durability",
    title: "Wrist and hand durability",
    intent: "Build wrist, hand, and forearm capacity without grip tension becoming the session.",
    defaultDurationMinutes: 25,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy shoulder, wrist, and hand prep.", ["movement_prep_flow"]),
      section("main", "Wrist and hand durability", "Use smooth forearm and wrist control.", ["wrist_pronation_supination", "wrist_extension_flexion_control", "open_close_hand_pump"]),
      section("cooldown", "Reset", "Release grip tension and downshift.", ["recovery_breathing_mobility"])
    ],
    protects: ["wrists", "hands", "relaxed guard tension"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Hand or wrist durability bias", "Low-stress support day"],
    avoidWhen: ["Wrist, elbow, numbness, or tingling symptoms"],
    fallback: false
  }),
  template({
    templateId: "wrist_hand_grip_microdose",
    family: "wrist_hand_durability",
    title: "Grip endurance microdose",
    intent: "Use tiny grip-endurance work and full relaxation so hands stay useful for boxing.",
    defaultDurationMinutes: 14,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Prepare wrists and shoulders.", ["movement_prep_flow"]),
      section("main", "Grip microdose", "Squeeze, carry, and release without locking up the forearm.", ["grip_endurance_carry", "towel_squeeze_breathing"]),
      section("cooldown", "Reset", "Relax hands, jaw, and shoulders.", ["recovery_breathing_mobility"])
    ],
    protects: ["hands", "forearms", "shoulders"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "dumbbells"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Minimal equipment", "Conservative week", "Low-stress support day"],
    avoidWhen: ["Forearm pain, numbness, tingling, or cramping"],
    fallback: true
  }),
  template({
    templateId: "hip_ankle_mobility_reset",
    family: "hip_ankle_mobility",
    title: "Hip and ankle mobility reset",
    intent: "Restore stance range and ankle capacity without adding conditioning stress.",
    defaultDurationMinutes: 36,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Easy range before stance mobility.", ["movement_prep_flow"]),
      section("main", "Hip and lateral range", "Build side-to-side positions without forcing depth.", ["lateral_lunge_regression"]),
      section("support", "Ankle capacity", "Support footwork bounce and braking with low stress.", ["calf_ankle_capacity"]),
      section("cooldown", "Mobility reset", "Finish with pain-free range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["hips", "ankles", "tomorrow's training"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Deload", "Reduce-volume strategy", "Stance range needs easy support"],
    avoidWhen: ["Hip, groin, ankle, or foot pain rises"],
    fallback: false
  }),
  template({
    templateId: "hip_ankle_stance_capacity",
    family: "hip_ankle_mobility",
    title: "Stance mobility and ankle capacity",
    intent: "Keep stance transitions and ankle range available with low stress.",
    defaultDurationMinutes: 18,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Ease into stance range.", ["movement_prep_flow"]),
      section("main", "Stance mobility", "Use hip switches and lateral range without forcing depth.", ["hip_switch_step", "lateral_lunge_regression"]),
      section("support", "Ankle support", "Keep ankle work slow and controlled.", ["calf_ankle_capacity"]),
      section("cooldown", "Reset", "Downshift range and breathing.", ["mobility_reset_flow"])
    ],
    protects: ["stance transitions", "ankles", "hips"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Minimal equipment", "High cycle symptoms", "Conservative week"],
    avoidWhen: ["Pain changes stance or gait"],
    fallback: true
  }),
  template({
    templateId: "recovery_reset_breathing_mobility",
    family: "recovery_reset",
    title: "Recovery breathing and mobility",
    intent: "Downshift stress and restore range without hiding extra work inside recovery.",
    defaultDurationMinutes: 16,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [section("reset", "Recovery reset", "Easy breathing, mobility, and optional walk only.", ["recovery_breathing_mobility", "mobility_reset_flow"])],
    protects: ["health", "recovery", "readiness"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe"],
    preferredWhen: ["Red readiness", "Hard stop allows recovery only", "Deload"],
    avoidWhen: ["Symptoms worsen with easy breathing or mobility"],
    fallback: false
  }),
  template({
    templateId: "recovery_reset_walk_reset",
    family: "recovery_reset",
    title: "Easy walk and reset",
    intent: "Use relaxed walking and breathing only when that improves recovery.",
    defaultDurationMinutes: 18,
    defaultIntensity: "recovery",
    defaultFuelDemand: "low",
    sections: [section("reset", "Easy walk reset", "Relaxed walking plus breathing and mobility, if symptoms allow.", ["easy_walk_reset", "recovery_breathing_mobility"])],
    protects: ["recovery", "stress downshift", "tomorrow's quality"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe"],
    preferredWhen: ["Recovery day", "No equipment", "Conservative fueling context"],
    avoidWhen: ["Dizziness, chest pain, or gait-changing pain"],
    fallback: true
  }),
  template({
    templateId: "taper_maintenance_speed_touch",
    family: "taper_maintenance",
    title: "Taper speed touch",
    intent: "Preserve speed while dropping volume so boxing sharpness stays protected.",
    defaultDurationMinutes: 22,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Stay warm without adding fatigue.", ["movement_prep_flow"]),
      section("main", "Speed maintenance", "Tiny dose of speed, long rests, no fatigue chasing.", ["taper_speed_step", "med_ball_rotational_throw"]),
      section("support", "Shoulder tune-up", "Keep the guard and shoulder rhythm fresh.", ["band_external_rotation"]),
      section("cooldown", "Reset", "Leave fresher than you started.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "speed", "confidence"],
    noviceEligible: true,
    equipmentTags: ["minimal", "no_equipment", "medicine_ball", "bands"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Fight week", "Taper strategy", "Tournament conserve"],
    avoidWhen: ["Red readiness that requires recovery only", "Speed or timing drops"],
    fallback: false
  }),
  template({
    templateId: "taper_maintenance_rhythm",
    family: "taper_maintenance",
    title: "Fight-week rhythm maintenance",
    intent: "Keep rhythm and confidence touched with the smallest useful dose.",
    defaultDurationMinutes: 16,
    defaultIntensity: "easy",
    defaultFuelDemand: "low",
    sections: [
      section("warmup", "Warm-up", "Warm up enough to feel coordinated.", ["movement_prep_flow"]),
      section("main", "Rhythm maintenance", "Use short reaction and speed touches with full recovery.", ["reaction_cue_step", "taper_speed_step"]),
      section("cooldown", "Reset", "Downshift breathing and range.", ["recovery_breathing_mobility"])
    ],
    protects: ["freshness", "timing", "speed"],
    noviceEligible: true,
    equipmentTags: ["no_equipment", "minimal"],
    safetyTags: ["fallback", "low_fuel", "novice_safe", "taper_safe", "quality_stop"],
    preferredWhen: ["Minimal equipment", "Conservative taper", "Tournament week"],
    avoidWhen: ["Symptoms rise or coordination fades"],
    fallback: true
  })
];

function normalizedEquipment(equipmentAccess: readonly string[]): Set<string> {
  return new Set(equipmentAccess.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function noEquipmentAccess(equipmentAccess: readonly string[]): boolean {
  const equipment = normalizedEquipment(equipmentAccess);
  return equipment.size === 0 || equipment.has("none") || equipment.has("bodyweight");
}

function templateRequiredEquipment(templateItem: WorkoutTemplate): readonly string[] {
  return templateItem.equipmentTags.filter((tag) => EQUIPMENT_REQUIREMENT_TAGS.has(tag));
}

function equipmentFits(templateItem: WorkoutTemplate, equipmentAccess: readonly string[]): boolean {
  const required = templateRequiredEquipment(templateItem);
  if (required.length === 0) {
    return true;
  }
  const equipment = normalizedEquipment(equipmentAccess);
  return required.every((item) => equipment.has(item));
}

function conservativeContext(input: WorkoutTemplateSelectionInput): boolean {
  return Boolean(
    input.readinessColor === "red" ||
      input.highCycleSymptoms ||
      input.protectedHard ||
      input.conservativeFueling ||
      (input.volumeStrategy && CONSERVATIVE_STRATEGIES.has(input.volumeStrategy))
  );
}

function scoreTemplate(templateItem: WorkoutTemplate, input: WorkoutTemplateSelectionInput): number {
  const noEquipment = noEquipmentAccess(input.equipmentAccess);
  const conservative = conservativeContext(input);
  const phaseDosePreferred = input.trainingDose === "serious" || input.trainingDose === "high";
  const used = new Set(input.usedTemplateIds ?? []);
  const required = templateRequiredEquipment(templateItem);
  const requiredEquipmentAvailable = equipmentFits(templateItem, input.equipmentAccess);
  let score = 0;

  if (used.has(templateItem.templateId)) {
    score -= 80;
  }
  if (required.includes("bag") && !requiredEquipmentAvailable) {
    score -= 120;
  }
  if (input.novice) {
    score += templateItem.noviceEligible ? 40 : -100;
  } else if (!conservative && !templateItem.noviceEligible) {
    score += 12;
  }
  if (noEquipment) {
    score += templateItem.equipmentTags.includes("no_equipment") ? 40 : -25;
  } else if (requiredEquipmentAvailable) {
    score += 12;
  }
  if (conservative) {
    score += templateItem.defaultFuelDemand === "low" ? 30 : -30;
    score += templateItem.defaultIntensity === "easy" || templateItem.defaultIntensity === "recovery" ? 20 : -30;
    score += templateItem.safetyTags.includes("fallback") ? 10 : 0;
  }
  if (input.volumeStrategy === "taper" || input.volumeStrategy === "tournament_conserve") {
    score += templateItem.safetyTags.includes("taper_safe") ? 30 : 0;
  }
  if (phaseDosePreferred && !conservative && requiredEquipmentAvailable && templateItem.safetyTags.includes("phase_variant")) {
    score += 24;
  }
  if (!phaseDosePreferred && templateItem.safetyTags.includes("phase_variant")) {
    score -= 4;
  }
  if (templateItem.fallback) {
    score -= conservative ? 0 : 18;
  }
  return score;
}

export function sectionDurationPlan(templateItem: WorkoutTemplate, targetDurationMinutes = templateItem.defaultDurationMinutes): readonly number[] {
  if (templateItem.sections.length === 0) {
    return [];
  }
  if (templateItem.sections.length === 1) {
    return [targetDurationMinutes];
  }
  const weights = templateItem.sections.map((workoutSection) => SECTION_DURATION_WEIGHTS[workoutSection.sectionType]);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (targetDurationMinutes * weight) / totalWeight);
  const sectionMinutes = raw.map((minutes) => Math.max(2, Math.floor(minutes)));
  let remaining = targetDurationMinutes - sectionMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const order = raw
    .map((minutes, index) => ({ index, remainder: minutes - Math.floor(minutes) }))
    .sort((left, right) => right.remainder - left.remainder)
    .map((item) => item.index);

  while (remaining > 0) {
    for (const index of order) {
      if (remaining <= 0) {
        break;
      }
      sectionMinutes[index] = (sectionMinutes[index] ?? 0) + 1;
      remaining -= 1;
    }
  }
  while (remaining < 0) {
    const index = [...order].reverse().find((candidate) => (sectionMinutes[candidate] ?? 0) > 2);
    if (index === undefined) {
      break;
    }
    sectionMinutes[index] = (sectionMinutes[index] ?? 0) - 1;
    remaining += 1;
  }

  return sectionMinutes;
}

export function templatesForFamily(family: GeneratedSessionFamily): readonly WorkoutTemplate[] {
  return workoutTemplateCatalog.filter((templateItem) => templateItem.family === family);
}

export function fallbackTemplateForFamily(family: GeneratedSessionFamily): WorkoutTemplate {
  const fallback = templatesForFamily(family).find((templateItem) => templateItem.fallback) ?? templatesForFamily(family)[0];
  if (!fallback) {
    throw new Error(`No workout template exists for generated family: ${family}`);
  }
  return fallback;
}

export function findWorkoutTemplate(templateId: string): WorkoutTemplate {
  const found = workoutTemplateCatalog.find((templateItem) => templateItem.templateId === templateId);
  if (!found) {
    throw new Error(`Unknown workout template id: ${templateId}`);
  }
  return found;
}

export function findWorkoutTemplateByTitle(family: GeneratedSessionFamily, title: string): WorkoutTemplate | null {
  return templatesForFamily(family).find((templateItem) => templateItem.title === title || plainWorkoutTitle(templateItem.title, templateItem.family) === title) ?? null;
}

export function selectWorkoutTemplate(input: WorkoutTemplateSelectionInput): WorkoutTemplate {
  const candidates = templatesForFamily(input.family);
  if (candidates.length === 0) {
    throw new Error(`No workout templates exist for generated family: ${input.family}`);
  }
  return candidates.reduce((best, candidate) => {
    const candidateScore = scoreTemplate(candidate, input);
    const bestScore = scoreTemplate(best, input);
    return candidateScore > bestScore ? candidate : best;
  }, candidates[0]!);
}

export function generatedSessionShapeFromTemplate(
  templateItem: WorkoutTemplate,
  targetDurationMinutes = templateItem.defaultDurationMinutes
): Pick<GeneratedTrainingSession, "title" | "durationMinutes" | "intensity" | "prescription" | "rationale" | "protects" | "modifications" | "fuelDemand"> {
  const sectionDurations = sectionDurationPlan(templateItem, targetDurationMinutes);
  return {
    title: plainWorkoutTitle(templateItem.title, templateItem.family),
    durationMinutes: targetDurationMinutes,
    intensity: templateItem.defaultIntensity,
    prescription: templateItem.sections.map(
      (workoutSection, index) => `${plainSectionName(workoutSection.name)} (${sectionDurations[index] ?? 0} min): ${plainSectionIntent(workoutSection.intent)}`
    ),
    rationale: plainSectionIntent(templateItem.intent),
    protects: templateItem.protects,
    modifications: [],
    fuelDemand: templateItem.defaultFuelDemand
  };
}

export function workoutTemplateText(templateItem: WorkoutTemplate): string {
  return [
    templateItem.templateId,
    templateItem.family,
    templateItem.title,
    templateItem.intent,
    ...templateItem.protects,
    ...templateItem.equipmentTags,
    ...templateItem.contraindications,
    ...templateItem.safetyTags,
    ...templateItem.preferredWhen,
    ...templateItem.avoidWhen,
    ...templateItem.progressionNotes,
    ...templateItem.regressionNotes,
    ...templateItem.safetyNotes,
    ...templateItem.stopConditions,
    templateItem.boxingSkillTheme ?? "",
    templateItem.tacticalTheme ?? "",
    ...(templateItem.technicalEmphasis ?? []),
    templateItem.roundStructure ?? "",
    templateItem.equipmentMode ?? "",
    templateItem.sessionPriority ?? "",
    ...(templateItem.addOnBlocks ?? []).flatMap((block) => [
      block.id,
      block.label,
      block.intent,
      block.priority,
      block.placementType,
      block.athleteFacingPurpose,
      block.safetyBoundary,
      ...block.cues
    ]),
    ...templateItem.sections.flatMap((workoutSection) => [workoutSection.name, workoutSection.intent, ...workoutSection.exerciseIds])
  ].join(" ");
}
