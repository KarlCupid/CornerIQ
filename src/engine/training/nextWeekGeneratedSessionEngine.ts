import type {
  AthleteProfile,
  CycleState,
  FightOpportunity,
  GeneratedSessionFamily,
  GeneratedTrainingSession,
  ISODateString,
  ProtectedWorkout,
  ReadinessState,
  RiskFlag,
  TournamentDetails
} from "../core/types";
import type { NextWeekTrainingMaterialization } from "./nextWeekMaterializationEngine";
import type { TrainingDayPlan, TrainingMicrocycle } from "./trainingBlockTypes";
import { generatedSupportAllowedOnDate } from "./supportAvailability";

export interface NextWeekGeneratedSessionMaterializationInput {
  materialization: NextWeekTrainingMaterialization;
  microcycle: TrainingMicrocycle;
  dayPlans: readonly TrainingDayPlan[];
  athlete: AthleteProfile;
  protectedWorkouts: readonly ProtectedWorkout[];
  readiness: ReadinessState;
  cycle: CycleState;
  safetyFlags: readonly RiskFlag[];
  fight: FightOpportunity | null;
  tournament: TournamentDetails | null;
  engineVersion: string;
  previewId?: string | undefined;
  previewHash?: string | undefined;
}

type SessionShape = Pick<GeneratedTrainingSession, "title" | "durationMinutes" | "intensity" | "prescription" | "rationale" | "protects" | "modifications" | "fuelDemand">;

const HIGH_DEMAND_FAMILIES = new Set<GeneratedSessionFamily>([
  "strength_lower",
  "strength_upper",
  "strength_full_body",
  "power_rotational",
  "power_lower",
  "power_upper",
  "alactic_sprints",
  "roadwork_tempo",
  "roadwork_intervals",
  "round_based_conditioning"
]);

const HARD_CONDITIONING_FAMILIES = new Set<GeneratedSessionFamily>(["alactic_sprints", "roadwork_tempo", "roadwork_intervals", "round_based_conditioning"]);
const DELOAD_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "hip_ankle_mobility", "trunk_durability", "shoulder_scap_durability"]);
const TAPER_FAMILIES = new Set<GeneratedSessionFamily>(["taper_maintenance", "reaction_rhythm"]);
const TOURNAMENT_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "taper_maintenance"]);
const HOLD_FAMILIES = new Set<GeneratedSessionFamily>(["recovery_reset", "trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility"]);
const PROHIBITED_OUTPUT = /\b(sparring|contact|sauna|sweat\s*suit|sweatsuit|weight\s*cut|cut\s*weight)\b/i;

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function activeUnderfueling(flags: readonly RiskFlag[]): boolean {
  return flags.some(
    (flag) =>
      flag.status === "active" &&
      (flag.code === "rapid_weight_loss" ||
        flag.code === "repeated_low_intake" ||
        flag.code === "missed_period_underfueling_risk" ||
        flag.code === "high_underfueling_blocks_deficit")
  );
}

function activeHardStop(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness" | "safetyFlags">): boolean {
  return input.safetyFlags.some((flag) => flag.status === "active" && flag.hardStop);
}

function redReadiness(input: Pick<NextWeekGeneratedSessionMaterializationInput, "readiness">): boolean {
  return input.readiness.color === "red";
}

function highCycleSymptoms(cycle: CycleState): boolean {
  return cycle.trackingEnabled && cycle.symptomBurden === "high";
}

function anchorsForDate(anchors: readonly ProtectedWorkout[], date: ISODateString): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

function hasCompetitionAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "competition");
}

function hasProtectedHardAnchor(anchors: readonly ProtectedWorkout[]): boolean {
  return anchors.some((anchor) => anchor.type === "sparring" || anchor.type === "competition" || anchor.intensity === "hard" || anchor.intensity === "max");
}

function familyBiases(input: NextWeekGeneratedSessionMaterializationInput): readonly GeneratedSessionFamily[] {
  const biases: readonly GeneratedSessionFamily[] = input.materialization.sessionFamilyBiases.length > 0 ? input.materialization.sessionFamilyBiases : ["trunk_durability"];
  switch (input.materialization.materializedVolumeStrategy) {
    case "progress_small":
      return Array.from(new Set<GeneratedSessionFamily>([...biases, "trunk_durability", "shoulder_scap_durability"]));
    case "repeat_same":
      return Array.from(new Set<GeneratedSessionFamily>(biases));
    case "reduce_volume":
      return ["trunk_durability", "shoulder_scap_durability", "hip_ankle_mobility", "recovery_reset"];
    case "deload":
      return ["recovery_reset", "hip_ankle_mobility", "trunk_durability"];
    case "taper":
      return ["taper_maintenance", "reaction_rhythm"];
    case "tournament_conserve":
      return ["recovery_reset", "taper_maintenance"];
    case "hold_for_review":
      return ["recovery_reset", "trunk_durability"];
  }
}

function targetSessionCount(input: NextWeekGeneratedSessionMaterializationInput): number {
  const hardStop = activeHardStop(input);
  const underfueling = activeUnderfueling(input.safetyFlags);
  const cycleTrim = highCycleSymptoms(input.cycle);
  if (hardStop || redReadiness(input)) {
    return 1;
  }
  const base =
    input.materialization.materializedVolumeStrategy === "progress_small"
      ? 3
      : input.materialization.materializedVolumeStrategy === "repeat_same"
        ? 2
        : input.materialization.materializedVolumeStrategy === "hold_for_review"
          ? 1
          : 2;
  const trimmedForFuel = underfueling && input.materialization.materializedVolumeStrategy === "progress_small" ? Math.min(base, 1) : base;
  return Math.max(1, cycleTrim ? trimmedForFuel - 1 : trimmedForFuel);
}

function allowedFamilyForContext(input: NextWeekGeneratedSessionMaterializationInput, family: GeneratedSessionFamily, protectedHard: boolean): GeneratedSessionFamily {
  const strategy = input.materialization.materializedVolumeStrategy;
  const hardStop = activeHardStop(input);
  const underfueling = activeUnderfueling(input.safetyFlags);
  const cycleTrim = highCycleSymptoms(input.cycle);
  if (hardStop || redReadiness(input)) {
    return "recovery_reset";
  }
  if (strategy === "tournament_conserve") {
    return TOURNAMENT_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if (strategy === "taper") {
    return TAPER_FAMILIES.has(family) ? family : "taper_maintenance";
  }
  if (strategy === "deload") {
    return DELOAD_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if (strategy === "hold_for_review") {
    return HOLD_FAMILIES.has(family) ? family : "recovery_reset";
  }
  if (underfueling && HIGH_DEMAND_FAMILIES.has(family)) {
    return "trunk_durability";
  }
  if ((cycleTrim || protectedHard) && HIGH_DEMAND_FAMILIES.has(family)) {
    return "shoulder_scap_durability";
  }
  if (HARD_CONDITIONING_FAMILIES.has(family) && (strategy === "reduce_volume" || protectedHard)) {
    return "trunk_durability";
  }
  return family;
}

function eligibleDays(input: NextWeekGeneratedSessionMaterializationInput): readonly TrainingDayPlan[] {
  const strategy = input.materialization.materializedVolumeStrategy;
  const days = input.dayPlans
    .filter((day) => day.date >= input.microcycle.weekStartDate && day.date <= input.microcycle.weekEndDate)
    .filter((day) => generatedSupportAllowedOnDate(input.athlete.scheduleAvailability, day.date))
    .filter((day) => !hasCompetitionAnchor(anchorsForDate([...input.protectedWorkouts, ...day.protectedAnchors], day.date)));
  const preferred = days.filter((day) => {
    if (strategy === "progress_small" || strategy === "repeat_same") {
      return !day.hardDay && (day.role === "support_day" || day.role === "recovery_day");
    }
    if (strategy === "deload" || strategy === "reduce_volume" || strategy === "hold_for_review") {
      return day.role === "recovery_day" || day.role === "support_day";
    }
    return day.role === "taper_day" || day.role === "tournament_conservation_day" || day.role === "recovery_day" || day.role === "support_day";
  });
  return preferred.length > 0 ? preferred : days;
}

function baseShape(family: GeneratedSessionFamily): SessionShape {
  switch (family) {
    case "strength_lower":
    case "strength_upper":
    case "strength_full_body":
      return {
        title: "Boxing strength support",
        durationMinutes: 35,
        intensity: "moderate",
        prescription: ["Movement prep", "Submaximal strength pattern with crisp reps", "Row or press variation with clean form", "Trunk anti-rotation", "Mobility cooldown"],
        rationale: "Small support strength keeps force transfer and stance control available without inferring a load jump.",
        protects: ["boxing quality", "stance durability", "trunk control"],
        modifications: [],
        fuelDemand: "moderate"
      };
    case "power_rotational":
    case "power_lower":
    case "power_upper":
      return {
        title: "Low-volume power support",
        durationMinutes: 25,
        intensity: "moderate",
        prescription: ["Dynamic warm-up", "Low-volume fast throws or jumps", "Full recovery between efforts", "Stop when speed drops", "Easy cooldown"],
        rationale: "Power stays crisp and short so skill quality stays protected.",
        protects: ["speed", "freshness", "movement quality"],
        modifications: [],
        fuelDemand: "moderate"
      };
    case "roadwork_zone2":
      return {
        title: "Easy aerobic base",
        durationMinutes: 30,
        intensity: "easy",
        prescription: ["Talk-test pace", "Smooth breathing", "Stop if gait changes", "Easy mobility reset"],
        rationale: "Easy aerobic work supports recovery between rounds without adding hard conditioning.",
        protects: ["between-round recovery", "legs", "next session quality"],
        modifications: [],
        fuelDemand: "moderate"
      };
    case "roadwork_tempo":
    case "roadwork_intervals":
    case "round_based_conditioning":
    case "alactic_sprints":
      return {
        title: "Conditioning support held easy",
        durationMinutes: 20,
        intensity: "easy",
        prescription: ["Movement prep", "Easy rhythm intervals with generous rest", "Stop before mechanics change", "Breathing reset"],
        rationale: "The preview converts conditioning summaries through a conservative mapping instead of adding hard work.",
        protects: ["movement quality", "recovery", "weekly cap"],
        modifications: ["Hard conditioning removed."],
        fuelDemand: "low"
      };
    case "footwork_agility":
    case "reaction_rhythm":
      return {
        title: "Reaction rhythm touch",
        durationMinutes: 18,
        intensity: "easy",
        prescription: ["Dynamic warm-up", "Short rhythm steps", "Easy reaction cues", "Long rests", "Mobility reset"],
        rationale: "A tiny rhythm touch preserves speed without chasing fatigue.",
        protects: ["timing", "freshness", "feet"],
        modifications: [],
        fuelDemand: "low"
      };
    case "trunk_durability":
      return {
        title: "Trunk durability",
        durationMinutes: 22,
        intensity: "easy",
        prescription: ["Breathing reset", "Dead bug or anti-extension control", "Anti-rotation hold", "Hip mobility reset"],
        rationale: "Durability support keeps transfer positions available while staying low stress.",
        protects: ["trunk control", "stance positions", "recovery"],
        modifications: [],
        fuelDemand: "low"
      };
    case "shoulder_scap_durability":
    case "neck_trap_durability":
    case "wrist_hand_durability":
      return {
        title: "Guard durability microdose",
        durationMinutes: 18,
        intensity: "easy",
        prescription: ["Easy shoulder prep", "Scap control", "External rotation or wrist control", "Breathing cooldown"],
        rationale: "Short durability work supports the guard and upper back without adding a hard day.",
        protects: ["shoulders", "guard position", "upper back"],
        modifications: [],
        fuelDemand: "low"
      };
    case "hip_ankle_mobility":
      return {
        title: "Hip and ankle mobility",
        durationMinutes: 18,
        intensity: "recovery",
        prescription: ["Easy walk-in", "Hip mobility flow", "Ankle range and calf reset", "Breathing cooldown"],
        rationale: "Mobility keeps stance range available while recovery stays first.",
        protects: ["hips", "ankles", "tomorrow's training"],
        modifications: [],
        fuelDemand: "low"
      };
    case "taper_maintenance":
      return {
        title: "Taper maintenance",
        durationMinutes: 20,
        intensity: "easy",
        prescription: ["Dynamic warm-up", "Tiny speed touch", "Shoulder rhythm", "Mobility reset"],
        rationale: "Taper work keeps rhythm touched while total volume stays very low.",
        protects: ["freshness", "speed", "confidence"],
        modifications: [],
        fuelDemand: "low"
      };
    case "recovery_reset":
      return {
        title: "Recovery reset",
        durationMinutes: 16,
        intensity: "recovery",
        prescription: ["Breathing reset", "Easy walk if symptoms allow", "Hip and thoracic mobility", "Stop if symptoms rise"],
        rationale: "Recovery detail protects health and the next boxing exposure.",
        protects: ["health", "recovery", "readiness"],
        modifications: [],
        fuelDemand: "low"
      };
  }
}

function adjustedShape(input: NextWeekGeneratedSessionMaterializationInput, family: GeneratedSessionFamily, protectedHard: boolean): SessionShape {
  const shape = baseShape(family);
  const hardStop = activeHardStop(input);
  const readinessRed = redReadiness(input);
  const underfueling = activeUnderfueling(input.safetyFlags);
  const cycleTrim = highCycleSymptoms(input.cycle);
  const conservativeStrategy =
    input.materialization.materializedVolumeStrategy === "deload" ||
    input.materialization.materializedVolumeStrategy === "taper" ||
    input.materialization.materializedVolumeStrategy === "tournament_conserve" ||
    input.materialization.materializedVolumeStrategy === "hold_for_review";
  return {
    ...shape,
    durationMinutes: Math.max(12, Math.min(shape.durationMinutes, hardStop || readinessRed ? 16 : cycleTrim || protectedHard || conservativeStrategy ? 22 : shape.durationMinutes)),
    intensity: hardStop || readinessRed ? "recovery" : conservativeStrategy && shape.intensity === "moderate" ? "easy" : shape.intensity,
    modifications: [
      ...shape.modifications,
      ...(underfueling ? ["Under-fueling risk: progression and high fuel-demand work removed."] : []),
      ...(cycleTrim ? ["High cycle symptoms: optional volume trimmed."] : []),
      ...(hardStop ? ["Safety hard stop active: recovery only."] : []),
      ...(readinessRed && !hardStop ? ["Readiness is red, so CornerIQ generated recovery-only work."] : []),
      ...(protectedHard ? ["Protected hard boxing anchor owns the stress; generated work stays easy."] : [])
    ],
    fuelDemand: underfueling || conservativeStrategy || hardStop || readinessRed ? "low" : shape.fuelDemand === "high" ? "moderate" : shape.fuelDemand
  };
}

function deterministicSessionId(input: NextWeekGeneratedSessionMaterializationInput, date: ISODateString, family: GeneratedSessionFamily): string {
  const previewKey = input.previewId ?? input.previewHash ?? "preview-unpersisted";
  return `next-week:${stableHash(`${input.athlete.athleteId}|${input.materialization.nextWeekIndex}|${date}|${family}|${input.engineVersion}|${previewKey}`)}`;
}

function assertSafeOutput(session: GeneratedTrainingSession): GeneratedTrainingSession {
  const output = [session.id, session.title, session.rationale, ...session.prescription, ...session.protects, ...session.modifications].join(" ");
  if (PROHIBITED_OUTPUT.test(output)) {
    throw new Error(`nextWeekGeneratedSessionEngine produced prohibited generated-session copy for ${session.id}`);
  }
  return session;
}

export function materializeGeneratedSessionsFromPreview(input: NextWeekGeneratedSessionMaterializationInput): readonly GeneratedTrainingSession[] {
  const days = eligibleDays(input);
  if (days.length === 0) {
    return [];
  }
  const families = familyBiases(input);
  const count = Math.min(targetSessionCount(input), days.length);
  const sessions: GeneratedTrainingSession[] = [];
  const used = new Set<string>();

  for (const day of days) {
    if (sessions.length >= count) {
      break;
    }
    const protectedHard = hasProtectedHardAnchor(anchorsForDate([...input.protectedWorkouts, ...day.protectedAnchors], day.date));
    const rawFamily = families[sessions.length % families.length] ?? "trunk_durability";
    const family = allowedFamilyForContext(input, rawFamily, protectedHard);
    const key = `${day.date}:${family}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    const shape = adjustedShape(input, family, protectedHard);
    sessions.push(
      assertSafeOutput({
        id: deterministicSessionId(input, day.date, family),
        date: day.date,
        family,
        ...shape
      })
    );
  }

  return sessions;
}
