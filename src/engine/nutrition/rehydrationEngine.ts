import { makeConfidence } from "../core/confidence";
import type { FightOpportunity, RehydrationPlan, WeighInContext } from "../core/types";

const seekMedicalHelpIf = [
  "dizziness",
  "confusion",
  "fainting",
  "chest pain",
  "severe cramping",
  "inability to urinate",
  "very dark urine with symptoms",
  "persistent vomiting",
  "severe headache"
];

export function resolveRehydrationPlan(input: {
  fight: FightOpportunity | null;
  phase: string;
  weighInContext: WeighInContext;
  blocked: boolean;
}): RehydrationPlan {
  if (!input.fight || input.phase !== "post_weigh_in") {
    return {
      status: "not_applicable",
      timeWindowHours: null,
      immediateActions: [],
      firstMeal: null,
      nextMeal: null,
      fluidsAndElectrolytes: null,
      carbPriority: null,
      gutComfortRules: [],
      warnings: [],
      seekMedicalHelpIf,
      confidence: makeConfidence(0.72, ["not post-weigh-in"])
    };
  }
  if (input.blocked) {
    return {
      status: "blocked",
      timeWindowHours: null,
      immediateActions: [],
      firstMeal: null,
      nextMeal: null,
      fluidsAndElectrolytes: null,
      carbPriority: null,
      gutComfortRules: [],
      warnings: ["Rehydration plan is blocked by active safety flags. Seek qualified support."],
      seekMedicalHelpIf,
      confidence: makeConfidence(0.82, ["safety block is active"])
    };
  }
  const timeWindowHours =
    input.fight.weighInType === "same_day" ? 4 : input.fight.weighInType === "day_before" ? 24 : input.fight.tournamentDetails?.rehydrationWindowHoursByDay[0] ?? 4;
  if (timeWindowHours <= 4 || input.fight.weighInType === "same_day") {
    return {
      status: "active",
      timeWindowHours,
      immediateActions: ["Small repeated fluids with electrolytes", "Familiar quick carbs", "Stop if nausea or symptoms worsen"],
      firstMeal: "Small familiar carb plus sodium-containing food if tolerated.",
      nextMeal: "Another small familiar carb serving 60-90 minutes later if gut feels settled.",
      fluidsAndElectrolytes: "Sip fluids with electrolytes; avoid overdrinking plain water.",
      carbPriority: "Top up usable fuel without gut overload.",
      gutComfortRules: ["No novel supplements", "Small portions", "Avoid forcing food through nausea"],
      warnings: input.weighInContext.postWeighInWeightCapKg ? ["Post-weigh-in cap limits aggressive refueling volume."] : ["Same-day window prioritizes function over full restoration."],
      seekMedicalHelpIf,
      confidence: makeConfidence(0.72, ["same-day conservative rehydration path"])
    };
  }
  return {
    status: "active",
    timeWindowHours,
    immediateActions: ["Start fluids plus electrolytes", "Begin familiar carbohydrate restoration", "Use sodium-containing foods"],
    firstMeal: "Familiar carb-forward meal with moderate protein and sodium.",
    nextMeal: "Second staged meal with carbs, fluids, and tolerated fiber level.",
    fluidsAndElectrolytes: "Rehydrate in stages with sodium; do not chase plain water volume.",
    carbPriority: "Restore glycogen across the available window.",
    gutComfortRules: ["No novel supplements", "Use familiar foods", "Stop escalation if gut distress appears"],
    warnings: input.weighInContext.postWeighInWeightCapKg ? ["Post-weigh-in cap applies; monitor body mass during restoration."] : [],
    seekMedicalHelpIf,
    confidence: makeConfidence(0.8, ["day-before staged rehydration path"])
  };
}

export function rehydrationPlan(fight: FightOpportunity | null, hoursAvailable: number): readonly string[] {
  if (!fight) {
    return [];
  }
  if (hoursAvailable <= 4 || fight.weighInType === "same_day") {
    return ["Small repeated fluids with electrolytes.", "Familiar carbs in small portions.", "Avoid overdrinking plain water."];
  }
  return ["Start fluids plus electrolytes immediately.", "Restore carbs in staged meals.", "Use familiar sodium-containing foods.", "Avoid novel supplements."];
}
