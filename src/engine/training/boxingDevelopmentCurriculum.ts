import type { AthleteProfile } from "../athlete/types";
import type { PhaseState } from "../phase/phaseTypes";
import type { GeneratedSessionFamily, PlanGenerationPrimaryFocus } from "./types";

export type BoxingCurriculumSkillLevel = "novice" | "intermediate" | "advanced";
export type BoxingCurriculumPhaseFit = "build" | "camp" | "fight_week" | "tournament" | "recovery" | "deload";

export type BoxingDevelopmentThemeId =
  | "stance_guard_foundation"
  | "jab_system"
  | "entries_exits"
  | "defense_after_punching"
  | "ringcraft_angle_control"
  | "counter_timing"
  | "pressure_control"
  | "outside_boxer_movement"
  | "inside_position_without_contact"
  | "round_skill_quality"
  | "fight_week_sharpness"
  | "tournament_reset"
  | "recovery_skill_touch";

export interface BoxingDevelopmentCurriculumTheme {
  themeId: BoxingDevelopmentThemeId;
  athleteFacingTitle: string;
  athleteFacingPurpose: string;
  skillLevel: BoxingCurriculumSkillLevel;
  phaseFit: readonly BoxingCurriculumPhaseFit[];
  preferredFamilies: readonly GeneratedSessionFamily[];
  supportingFamilies: readonly GeneratedSessionFamily[];
  requiredTechnicalEmphasis: readonly string[];
  qualityCheckpoints: readonly string[];
  progressionRules: readonly string[];
  regressionRules: readonly string[];
  safetyBoundaries: readonly string[];
  noGeneratedSparring: true;
}

const NOVICE_LEVELS = new Set(["aspiring_boxer", "amateur_novice"]);
const ADVANCED_LEVELS = new Set(["amateur_elite", "pro_development", "pro_4_6_round", "pro_8_10_round", "pro_12_round"]);

function curriculumSkillLevel(athlete: AthleteProfile): BoxingCurriculumSkillLevel {
  if (NOVICE_LEVELS.has(athlete.boxingLevel)) {
    return "novice";
  }
  if (ADVANCED_LEVELS.has(athlete.boxingLevel)) {
    return "advanced";
  }
  return "intermediate";
}

function phaseFit(phase: PhaseState): BoxingCurriculumPhaseFit {
  if (phase.phase === "short_notice_camp") {
    return "camp";
  }
  if (phase.phase === "fight_week") {
    return "fight_week";
  }
  if (phase.phase === "tournament") {
    return "tournament";
  }
  if (phase.phase === "recovery") {
    return "recovery";
  }
  if (phase.phase === "deload") {
    return "deload";
  }
  if (phase.phase === "camp") {
    return "camp";
  }
  return "build";
}

function theme(input: BoxingDevelopmentCurriculumTheme): BoxingDevelopmentCurriculumTheme {
  return input;
}

export const boxingDevelopmentCurriculum: readonly BoxingDevelopmentCurriculumTheme[] = [
  theme({
    themeId: "stance_guard_foundation",
    athleteFacingTitle: "Stance, guard, and jab foundation",
    athleteFacingPurpose: "Build the shape that lets every jab, exit, lift, and roadwork dose support boxing instead of leaking posture.",
    skillLevel: "novice",
    phaseFit: ["build", "recovery", "deload"],
    preferredFamilies: ["boxing_technical_shadowboxing", "boxing_jab_entry_exit", "movement_quality_prep"],
    supportingFamilies: ["strength_full_body", "mobility_recovery_flow", "shoulder_scap_durability"],
    requiredTechnicalEmphasis: ["stance width", "guard return", "single jab", "simple exit"],
    qualityCheckpoints: ["Guard returns before the next step.", "Feet reset under the hips after the jab.", "Breathing stays easy enough to keep shape."],
    progressionRules: ["Progress to jab entries when guard return stays clean across repeated rounds."],
    regressionRules: ["Return to stance and single-jab touches when balance or guard return breaks twice."],
    safetyBoundaries: ["Solo skill only.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "jab_system",
    athleteFacingTitle: "Jab and lead-hand system",
    athleteFacingPurpose: "Use the jab to win position, control distance, and create exits without turning the week into volume chasing.",
    skillLevel: "intermediate",
    phaseFit: ["build", "camp"],
    preferredFamilies: ["boxing_jab_entry_exit", "boxing_technical_shadowboxing", "boxing_bag_skill"],
    supportingFamilies: ["power_rotational", "strength_upper", "mobility_recovery_flow"],
    requiredTechnicalEmphasis: ["lead-hand rhythm", "double jab", "body-line jab", "jab-pivot reset"],
    qualityCheckpoints: ["Lead hand returns home after every entry.", "Exit happens before adding another combination.", "Shoulders stay relaxed enough to repeat the round."],
    progressionRules: ["Add feint entry or body-line variation after clean jab and exit rounds."],
    regressionRules: ["Simplify to single and double jab if rhythm changes pull the guard open."],
    safetyBoundaries: ["Keep the skill quality-capped.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "entries_exits",
    athleteFacingTitle: "Entries and exits",
    athleteFacingPurpose: "Make every entry finish with a recoverable exit so power, conditioning, and skill work do not teach stuck positions.",
    skillLevel: "intermediate",
    phaseFit: ["build", "camp"],
    preferredFamilies: ["boxing_jab_entry_exit", "boxing_footwork_ringcraft", "agility_reactive_footwork"],
    supportingFamilies: ["strength_lower", "power_lower", "hip_ankle_mobility"],
    requiredTechnicalEmphasis: ["entry step", "pivot exit", "stance recovery", "guard return"],
    qualityCheckpoints: ["Exit foot lands quietly.", "Head and ribs stay stacked through the pivot.", "Next stance is ready before the next cue."],
    progressionRules: ["Layer rhythm change after exits stay repeatable under moderate fatigue."],
    regressionRules: ["Cut round length or remove the second action when exits get rushed."],
    safetyBoundaries: ["Solo movement and bag skill only when equipment is available.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "defense_after_punching",
    athleteFacingTitle: "Defense after punching",
    athleteFacingPurpose: "Train the habit of finishing offense in a defensive shape instead of admiring the punch or leaning out of stance.",
    skillLevel: "intermediate",
    phaseFit: ["build", "camp"],
    preferredFamilies: ["boxing_defense_movement", "boxing_bag_skill", "boxing_round_skill_circuit"],
    supportingFamilies: ["trunk_durability", "shoulder_scap_durability", "mobility_recovery_flow"],
    requiredTechnicalEmphasis: ["slip line", "roll reset", "pull reset", "defense after combination"],
    qualityCheckpoints: ["Defense ends in stance.", "Head movement stays small and controlled.", "Counter shape appears only after balance returns."],
    progressionRules: ["Add draw-counter timing after defense resets stay clean."],
    regressionRules: ["Return to one punch plus one defensive reset if posture or breathing breaks."],
    safetyBoundaries: ["Use solo, line, mirror, or bag constraints.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "ringcraft_angle_control",
    athleteFacingTitle: "Ringcraft and angle control",
    athleteFacingPurpose: "Develop exits, center reclaim, and angle control so the boxer can move with purpose rather than just move more.",
    skillLevel: "intermediate",
    phaseFit: ["build", "camp"],
    preferredFamilies: ["boxing_footwork_ringcraft", "agility_reactive_footwork", "boxing_jab_entry_exit"],
    supportingFamilies: ["power_lower", "roadwork_zone2", "hip_ankle_mobility"],
    requiredTechnicalEmphasis: ["step-slide", "L-step", "pivot", "circle out", "corner escape"],
    qualityCheckpoints: ["Feet do not cross during exits.", "The last step restores stance width.", "Hands stay available while moving."],
    progressionRules: ["Progress to callout or angle constraints after line-drill quality is consistent."],
    regressionRules: ["Remove reaction cues when lower-leg quality or stance width breaks."],
    safetyBoundaries: ["Low-impact footwork first.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "counter_timing",
    athleteFacingTitle: "Counter timing and rhythm breaks",
    athleteFacingPurpose: "Practice drawing, responding, and resetting without external pressure or fatigue chasing.",
    skillLevel: "advanced",
    phaseFit: ["camp", "build"],
    preferredFamilies: ["boxing_counter_timing", "boxing_defense_movement", "reaction_rhythm"],
    supportingFamilies: ["power_rotational", "trunk_durability", "mobility_recovery_flow"],
    requiredTechnicalEmphasis: ["mirror cue", "draw-counter", "rhythm change", "foot reset"],
    qualityCheckpoints: ["Counter cue stays one action, not a flurry.", "Feet recover before the next cue.", "Timing improves without tension rising."],
    progressionRules: ["Add tactical constraint density only after timing stays crisp with full resets."],
    regressionRules: ["Return to self-called cues when reaction work gets rushed or stressful."],
    safetyBoundaries: ["Opponent-style scenarios must stay solo and self-directed.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "pressure_control",
    athleteFacingTitle: "Pressure control without fatigue chasing",
    athleteFacingPurpose: "Build controlled forward pressure, exit options, and breathing without confusing pressure with all-out output.",
    skillLevel: "advanced",
    phaseFit: ["camp", "build"],
    preferredFamilies: ["boxing_round_skill_circuit", "boxing_bag_skill", "roadwork_tempo"],
    supportingFamilies: ["strength_full_body", "mobility_recovery_flow", "shoulder_scap_durability"],
    requiredTechnicalEmphasis: ["step-in pressure", "body-head variation", "exit after pressure", "breathing reset"],
    qualityCheckpoints: ["Pressure stays balanced.", "The exit is planned before volume rises.", "Breathing is controlled enough to keep skill."],
    progressionRules: ["Add round density only when the athlete can keep exits and breathing under control."],
    regressionRules: ["Drop tempo or round count when pressure turns into fatigue chasing."],
    safetyBoundaries: ["No all-out finishers.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "outside_boxer_movement",
    athleteFacingTitle: "Outside-boxer movement",
    athleteFacingPurpose: "Keep distance, jab, and angle changes connected so the boxer can stay long without drifting.",
    skillLevel: "advanced",
    phaseFit: ["build", "camp"],
    preferredFamilies: ["boxing_footwork_ringcraft", "boxing_jab_entry_exit", "roadwork_zone2"],
    supportingFamilies: ["power_lower", "hip_ankle_mobility", "movement_quality_prep"],
    requiredTechnicalEmphasis: ["long stance recovery", "jab exit", "circle out", "center reclaim"],
    qualityCheckpoints: ["The jab controls distance before the feet leave.", "Circle-out finishes in punch range or safely out.", "Posture stays tall without locking."],
    progressionRules: ["Add reaction cues after distance and stance stay repeatable."],
    regressionRules: ["Remove reaction cues and return to line drills if the boxer drifts or crosses feet."],
    safetyBoundaries: ["Solo and line-drill constraints only.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "inside_position_without_contact",
    athleteFacingTitle: "Inside-position solo shapes",
    athleteFacingPurpose: "Practice stance, trunk, and exit shapes that help compact-position boxing without creating tie-up drills.",
    skillLevel: "advanced",
    phaseFit: ["camp", "build"],
    preferredFamilies: ["boxing_defense_movement", "boxing_round_skill_circuit", "trunk_durability"],
    supportingFamilies: ["strength_upper", "mobility_recovery_flow", "shoulder_scap_durability"],
    requiredTechnicalEmphasis: ["compact guard", "short reset", "pivot out", "trunk position"],
    qualityCheckpoints: ["Compact shape does not collapse posture.", "Exit happens before speed rises.", "Shoulders stay relaxed enough to breathe."],
    progressionRules: ["Add round constraints only when trunk and exit shape stay clean."],
    regressionRules: ["Return to easy defensive shape touches when shoulders, neck, or trunk tension rises."],
    safetyBoundaries: ["Inside-shape work stays solo and position-based.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "round_skill_quality",
    athleteFacingTitle: "Round skill quality",
    athleteFacingPurpose: "Carry one technical demand through boxing-length rounds while stopping before quality collapses.",
    skillLevel: "advanced",
    phaseFit: ["camp", "build"],
    preferredFamilies: ["boxing_round_skill_circuit", "boxing_bag_skill", "roadwork_tempo"],
    supportingFamilies: ["strength_full_body", "mobility_recovery_flow", "trunk_durability"],
    requiredTechnicalEmphasis: ["one constraint per round", "defense after punch", "ringcraft reset", "breathing control"],
    qualityCheckpoints: ["The last round still looks like boxing.", "One constraint stays clear each round.", "Breathing and posture recover during rest."],
    progressionRules: ["Add a round or one constraint only after repeated clean exposures."],
    regressionRules: ["Cut a round or simplify the constraint when technical quality drops late."],
    safetyBoundaries: ["Quality cap beats volume.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "fight_week_sharpness",
    athleteFacingTitle: "Fight-week sharpness",
    athleteFacingPurpose: "Preserve rhythm, confidence, and easy speed while dropping fatigue and protecting fueling.",
    skillLevel: "advanced",
    phaseFit: ["fight_week"],
    preferredFamilies: ["taper_maintenance", "boxing_technical_shadowboxing", "reaction_rhythm"],
    supportingFamilies: ["mobility_recovery_flow", "shoulder_scap_durability"],
    requiredTechnicalEmphasis: ["easy speed", "guard return", "first-step rhythm", "breathing reset"],
    qualityCheckpoints: ["Leave the session feeling sharper, not drained.", "Speed stays easy.", "No fatigue finishers are added."],
    progressionRules: ["Preserve sharpness only; do not chase new volume in fight week."],
    regressionRules: ["Drop to recovery and light technical touch if readiness or fueling is poor."],
    safetyBoundaries: ["No fatigue chasing or acute fueling pressure.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "tournament_reset",
    athleteFacingTitle: "Tournament reset and repeatable warm-up",
    athleteFacingPurpose: "Keep a low-risk technical rhythm and reset routine that can repeat between bouts without adding hard conditioning.",
    skillLevel: "intermediate",
    phaseFit: ["tournament"],
    preferredFamilies: ["mobility_recovery_flow", "boxing_technical_shadowboxing", "taper_maintenance"],
    supportingFamilies: ["hip_ankle_mobility", "recovery_reset"],
    requiredTechnicalEmphasis: ["repeatable warm-up", "easy jab rhythm", "mobility reset", "breathing reset"],
    qualityCheckpoints: ["Warm-up feels familiar.", "Movement restores range without fatigue.", "No extra hard conditioning is added."],
    progressionRules: ["Repeat the reset; tournament weeks prioritize consistency over novelty."],
    regressionRules: ["Use recovery only when symptoms, fatigue, or schedule pressure rises."],
    safetyBoundaries: ["Fueling and hydration stay conservative.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  }),
  theme({
    themeId: "recovery_skill_touch",
    athleteFacingTitle: "Recovery skill touch",
    athleteFacingPurpose: "Keep boxing positions alive at low intensity while mobility and recovery own the training day.",
    skillLevel: "novice",
    phaseFit: ["recovery", "deload", "fight_week", "tournament"],
    preferredFamilies: ["mobility_recovery_flow", "boxing_technical_shadowboxing", "movement_quality_prep"],
    supportingFamilies: ["hip_ankle_mobility", "recovery_reset", "shoulder_scap_durability"],
    requiredTechnicalEmphasis: ["easy stance", "guard relaxation", "low-intensity jab touch", "breathing"],
    qualityCheckpoints: ["The session restores quality.", "Technical touch stays optional and easy.", "Symptoms guide the stop point."],
    progressionRules: ["Return to the prior skill theme after recovery quality and readiness improve."],
    regressionRules: ["Remove skill touch and keep recovery only if symptoms increase."],
    safetyBoundaries: ["Recovery days are not hidden hard sessions.", "Generated work stays solo, bag-based, line-based, mirror-based, equipment-based, or bodyweight-based."],
    noGeneratedSparring: true
  })
];

function candidatesForLevel(level: BoxingCurriculumSkillLevel): readonly BoxingDevelopmentCurriculumTheme[] {
  if (level === "novice") {
    return boxingDevelopmentCurriculum.filter((item) => item.skillLevel === "novice" || item.themeId === "entries_exits");
  }
  if (level === "intermediate") {
    return boxingDevelopmentCurriculum.filter((item) => item.skillLevel !== "advanced" || item.themeId === "round_skill_quality");
  }
  return boxingDevelopmentCurriculum;
}

export function selectBoxingDevelopmentCurriculumTheme(input: {
  athlete: AthleteProfile;
  phase: PhaseState;
  primaryFocus?: PlanGenerationPrimaryFocus | undefined;
  previousThemeIds?: readonly BoxingDevelopmentThemeId[] | undefined;
}): BoxingDevelopmentCurriculumTheme {
  const level = curriculumSkillLevel(input.athlete);
  const fit = phaseFit(input.phase);
  const phaseCandidates = candidatesForLevel(level).filter((item) => item.phaseFit.includes(fit));
  const pool = phaseCandidates.length > 0 ? phaseCandidates : boxingDevelopmentCurriculum.filter((item) => item.themeId === "recovery_skill_touch");
  const recent = new Set(input.previousThemeIds ?? []);
  const preferredByFocus = pool.find((item) => {
    if (recent.has(item.themeId)) {
      return false;
    }
    if (input.primaryFocus === "conditioning") {
      return item.themeId === "round_skill_quality" || item.themeId === "pressure_control";
    }
    if (input.primaryFocus === "power") {
      return item.themeId === "counter_timing" || item.themeId === "entries_exits";
    }
    if (input.primaryFocus === "strength") {
      return item.themeId === "jab_system" || item.themeId === "stance_guard_foundation";
    }
    if (input.primaryFocus === "mobility") {
      return item.themeId === "recovery_skill_touch" || item.themeId === "stance_guard_foundation";
    }
    return false;
  });
  if (preferredByFocus) {
    return preferredByFocus;
  }
  return pool.find((item) => !recent.has(item.themeId)) ?? pool[0]!;
}

export function curriculumAwareFamilySequence(input: {
  theme: BoxingDevelopmentCurriculumTheme;
  baseSequence: readonly GeneratedSessionFamily[];
}): readonly GeneratedSessionFamily[] {
  const ordered: GeneratedSessionFamily[] = [];
  const baseSpineCount = Math.min(3, input.baseSequence.length);
  for (const family of input.baseSequence.slice(0, baseSpineCount)) {
    if (!ordered.includes(family)) {
      ordered.push(family);
    }
  }
  const remainingBase = input.baseSequence.slice(baseSpineCount);
  const maxLength = Math.max(remainingBase.length, input.theme.preferredFamilies.length);
  for (let index = 0; index < maxLength; index += 1) {
    const themeFamily = input.theme.preferredFamilies[index];
    if (themeFamily && !ordered.includes(themeFamily)) {
      ordered.push(themeFamily);
    }
    const baseFamily = remainingBase[index];
    if (baseFamily && !ordered.includes(baseFamily)) {
      ordered.push(baseFamily);
    }
  }
  for (const family of input.theme.supportingFamilies) {
    if (!ordered.includes(family)) {
      ordered.push(family);
    }
  }
  return ordered;
}
