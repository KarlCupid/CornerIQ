import { hasEquipmentCapability } from "../../athlete/equipmentAccess";
import type { AthleteTrainingProfile, ConditioningDose, EnergySystemIntent, SessionIntent } from "./types";

function textIncludes(values: readonly string[], pattern: RegExp): boolean {
  return values.some((value) => pattern.test(value.toLowerCase()));
}

function chooseModality(input: {
  athlete: AthleteTrainingProfile;
  energySystem: EnergySystemIntent;
}): ConditioningDose["modality"] {
  if (input.energySystem === "boxing_round_conditioning") {
    return hasEquipmentCapability(input.athlete.equipment, "bag") ? "heavy_bag" : "shadowboxing";
  }
  const avoidRunning =
    textIncludes(input.athlete.modalityAvoidances, /\brun|running|roadwork/) ||
    textIncludes(input.athlete.currentLimitations, /\bknee|ankle|shin|foot/);
  const preferBike = textIncludes(input.athlete.modalityPreferences, /\bbike|cycle|cycling/);
  const preferRower = textIncludes(input.athlete.modalityPreferences, /\brow|rower/);
  if ((avoidRunning || preferBike) && hasEquipmentCapability(input.athlete.equipment, "bike")) {
    return "bike";
  }
  if ((avoidRunning || preferRower) && hasEquipmentCapability(input.athlete.equipment, "rower")) {
    return "rower";
  }
  if (avoidRunning) {
    return "incline_walk";
  }
  if (hasEquipmentCapability(input.athlete.equipment, "bike") && preferBike) {
    return "bike";
  }
  if (hasEquipmentCapability(input.athlete.equipment, "rower") && preferRower) {
    return "rower";
  }
  return "run";
}

function progressedCount(base: number, intent: SessionIntent, minimum: number): number {
  if (intent.progressionIntent === "progress") return base + 1;
  if (intent.progressionIntent === "regress") return Math.max(minimum, base - 1);
  return base;
}

function progressedSeconds(base: number, intent: SessionIntent, stepSeconds: number, minimum: number): number {
  if (intent.progressionIntent === "progress") return base + stepSeconds;
  if (intent.progressionIntent === "regress") return Math.max(minimum, base - stepSeconds);
  return base;
}

function progressedRpe(base: number, intent: SessionIntent): number {
  return intent.progressionIntent === "regress" ? Math.max(3, base - 1) : base;
}

export function resolveConditioningDose(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): ConditioningDose {
  const energySystem = input.intent.energySystemIntent ?? "aerobic_base";
  const modality = chooseModality({ athlete: input.athlete, energySystem });
  switch (energySystem) {
    case "intervals": {
      const repetitions = progressedCount(Math.max(4, input.intent.doseAllocation.intervalRepetitions), input.intent, 3);
      return {
        modality,
        energySystem,
        warmupSeconds: 600,
        workSeconds: 90,
        restSeconds: 90,
        repetitions,
        cooldownSeconds: 480,
        rpe: progressedRpe(8, input.intent),
        progressionTrigger: "Add one interval only when the final rep matches the first two and recovery stays predictable.",
        stopCondition: "Stop if mechanics, breathing control, or foot strike quality breaks.",
        substitution: modality === "run" ? "Use bike or rower intervals with the same work/rest if impact is not right today." : "Use run intervals only if impact is clearly tolerated."
      };
    }
    case "tempo": {
      const totalTempoSeconds = progressedSeconds(Math.max(720, input.intent.doseAllocation.tempoMinutes * 60), input.intent, 180, 540);
      return {
        modality,
        energySystem,
        warmupSeconds: 600,
        workSeconds: Math.round(totalTempoSeconds / 3),
        restSeconds: 120,
        repetitions: 3,
        cooldownSeconds: 420,
        rpe: progressedRpe(7, input.intent),
        progressionTrigger: "Add one minute per tempo rep only when breathing remains controlled.",
        stopCondition: "Stop if the pace turns into a sprint or shoulders tighten.",
        substitution: "Use bike, rower, or incline walk tempo with the same total work when running is not appropriate."
      };
    }
    case "alactic": {
      const repetitions = progressedCount(Math.max(5, input.intent.doseAllocation.alacticEfforts), input.intent, 4);
      return {
        modality: modality === "run" ? "run" : modality,
        energySystem,
        warmupSeconds: 720,
        workSeconds: 10,
        restSeconds: 110,
        repetitions,
        cooldownSeconds: 420,
        rpe: progressedRpe(8, input.intent),
        progressionTrigger: "Add only one effort when every effort stays fast and relaxed.",
        stopCondition: "Stop when speed drops, ground contact gets noisy, or recovery is incomplete.",
        substitution: "Use bike spin-ups when impact is not appropriate."
      };
    }
    case "boxing_round_conditioning":
      return {
        modality,
        energySystem,
        warmupSeconds: 480,
        workSeconds: 180,
        restSeconds: 60,
        repetitions: progressedCount(Math.max(4, input.intent.doseAllocation.boxingConditioningRounds), input.intent, 3),
        cooldownSeconds: 420,
        rpe: progressedRpe(7, input.intent),
        progressionTrigger: "Add one round only when technical quality holds through the final round.",
        stopCondition: "Stop if punch mechanics, guard return, or breathing control drops.",
        substitution: "Use shadowboxing rounds only when bag work is unavailable or impact needs to be lower."
      };
    case "threshold_support":
    case "recovery_aerobic":
    case "aerobic_base":
    default: {
      const workSeconds = progressedSeconds(Math.max(30 * 60, input.intent.doseAllocation.aerobicMinutes * 60), input.intent, 5 * 60, 20 * 60);
      return {
        modality,
        energySystem,
        warmupSeconds: 480,
        workSeconds,
        restSeconds: 0,
        repetitions: 1,
        cooldownSeconds: 300,
        rpe: progressedRpe(energySystem === "recovery_aerobic" ? 3 : 5, input.intent),
        progressionTrigger: "Add five minutes only when the session finishes with calm breathing and normal legs.",
        stopCondition: "Stop if the session stops feeling conversational or pain changes mechanics.",
        substitution: "Use bike, rower, or incline walking to preserve the aerobic target."
      };
    }
  }
}
