import { hasEquipmentCapability } from "../../athlete/equipmentAccess";
import type { AthleteTrainingProfile, BoxingModality, BoxingRoundPrescription, BoxingSkillSubFocus, SessionIntent } from "./types";

function modalityFor(input: { athlete: AthleteTrainingProfile; theme: BoxingSkillSubFocus | undefined; conditioning: boolean }): BoxingModality {
  if ((input.theme === "bag_skill" || input.conditioning) && hasEquipmentCapability(input.athlete.equipment, "bag")) {
    return "heavy_bag";
  }
  if (input.theme === "footwork_ringcraft" || input.theme === "outside_movement") {
    return "floor_line_footwork";
  }
  if (input.theme === "counter_timing" || input.theme === "defense_after_punching") {
    return hasEquipmentCapability(input.athlete.equipment, "mirror") ? "mirror_work" : "solo_reaction";
  }
  return "shadowboxing";
}

function roundIntent(theme: BoxingSkillSubFocus | undefined, roundNumber: number, conditioning: boolean): string {
  if (conditioning) {
    return roundNumber % 2 === 0 ? "Sustain round pace while preserving guard return." : "Build repeatable output without chasing fatigue.";
  }
  switch (theme) {
    case "entries_exits":
      return "Enter behind the jab, exit before admiring the work.";
    case "defense_after_punching":
      return "Finish every punch sequence with a defensive reset.";
    case "footwork_ringcraft":
      return "Win the floor position with stance integrity.";
    case "counter_timing":
      return "See the cue, answer once, and reset.";
    case "pressure_control":
      return "Step in behind shape, then angle before crowding.";
    case "outside_movement":
      return "Touch, move, and reclaim long range.";
    case "bag_skill":
      return "Put clean shape on the bag without loading up.";
    case "shadowboxing_mechanics":
      return "Move cleanly enough that every punch could be filmed.";
    case "jab_system":
    default:
      return "Build the jab rhythm and recover guard position.";
  }
}

function roundCue(theme: BoxingSkillSubFocus | undefined, roundNumber: number): string {
  const cues: Record<BoxingSkillSubFocus, readonly string[]> = {
    jab_system: ["Jab returns first.", "Step with the jab.", "Breathe on contact."],
    entries_exits: ["Exit after the final punch.", "Feet move before the head lifts.", "Do not cross stance."],
    defense_after_punching: ["Punch, defend, reset.", "Chin hidden on the exit.", "Defense is part of the combination."],
    footwork_ringcraft: ["Own the stance.", "Win the angle.", "No tall exits."],
    counter_timing: ["See it first.", "One answer, then reset.", "Do not chase the cue."],
    pressure_control: ["Close behind the jab.", "Stay compact.", "Angle after pressure."],
    outside_movement: ["Long guard, long step.", "Touch and leave.", "Circle with balance."],
    bag_skill: ["Shape before power.", "Hands return home.", "Move after contact."],
    shadowboxing_mechanics: ["Film-clean rhythm.", "Relax jaw and hands.", "Reset the stance."]
  };
  const themeCues = cues[theme ?? "jab_system"];
  return themeCues[(roundNumber - 1) % themeCues.length] ?? themeCues[0]!;
}

export function resolveBoxingRoundDose(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): BoxingRoundPrescription {
  const conditioning = input.intent.role === "boxing_conditioning" || input.intent.energySystemIntent === "boxing_round_conditioning";
  const rounds = Math.max(3, conditioning ? input.intent.doseAllocation.boxingConditioningRounds : input.intent.doseAllocation.boxingTechnicalRounds);
  const durationSeconds = conditioning ? 180 : 150;
  const restSeconds = conditioning ? 60 : 75;
  const theme = input.intent.boxingTheme;
  return {
    modality: modalityFor({ athlete: input.athlete, theme, conditioning }),
    purpose: conditioning ? "boxing_conditioning" : theme === "footwork_ringcraft" || theme === "outside_movement" ? "footwork_ringcraft" : theme === "counter_timing" ? "speed_timing" : "technical_consolidation",
    rounds: Array.from({ length: rounds }, (_, index) => {
      const roundNumber = index + 1;
      return {
        roundNumber,
        durationSeconds,
        restSeconds,
        intent: roundIntent(theme, roundNumber, conditioning),
        cue: roundCue(theme, roundNumber)
      };
    }),
    rpe: conditioning ? 7 : 5,
    technicalQualityCheckpoint: conditioning ? "Round output is only valid while guard return, stance, and breathing stay organized." : "A round counts only if the technical cue remains visible at the end.",
    stopRule: "Stop or downshift if dizziness, sharp pain, partner-impact work, or uncontrolled fatigue appears.",
    progressionRule: conditioning ? "Add one round before increasing intensity." : "Add one constraint or one round only after the cue is stable."
  };
}
