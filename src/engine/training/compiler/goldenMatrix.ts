import type { AthleteProfile } from "../../athlete/types";
import type { ISODateString } from "../../core/sharedTypes";
import type { ProtectedWorkout } from "../types";
import { normalizeAthleteTrainingProfile, normalizePlanIntent } from "./normalizePlanInputs";
import type {
  CompileTrainingWeekInput,
  CompiledTrainingSession,
  CompiledTrainingWeek,
  PersistentSafetyConstraint,
  PlanSubFocus,
  TrainingDose,
  TrainingGoalMode,
  TrainingPrimaryFocus
} from "./types";
import { compileTrainingWeek } from "./compileTrainingWeek";

export interface GoldenMatrixVariantDefinition {
  id: string;
  label: string;
  athlete: AthleteProfile;
  focus: TrainingPrimaryFocus;
  subFocus?: PlanSubFocus | undefined;
  goalMode?: TrainingGoalMode | undefined;
  dose: TrainingDose;
  selectedSupportDays: readonly string[];
  preferredSessionDurationMinutes?: number | undefined;
  maxSessionDurationMinutes?: number | undefined;
  fixedBoxing?: readonly ProtectedWorkout[] | undefined;
  preferences?: readonly string[] | undefined;
  persistentSafetyConstraints?: readonly PersistentSafetyConstraint[] | undefined;
}

export interface GoldenMatrixCaseDefinition {
  id: string;
  title: string;
  reviewQuestion: string;
  variants: readonly GoldenMatrixVariantDefinition[];
}

export interface GoldenMatrixVariantResult {
  definition: GoldenMatrixVariantDefinition;
  week: CompiledTrainingWeek;
}

export interface GoldenMatrixCaseResult {
  definition: GoldenMatrixCaseDefinition;
  variants: readonly GoldenMatrixVariantResult[];
}

export const GOLDEN_MATRIX_WEEK_START: ISODateString = "2026-06-01";

function baseAthlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    athleteId: "golden_athlete",
    height: { value: 178, unit: "cm" },
    currentBodyMass: { value: 72, unit: "kg" },
    preferredUnits: "metric",
    boxingLevel: "amateur_open",
    amateurOrPro: "amateur",
    stance: "orthodox",
    trainingAgeYears: 3,
    typicalWalkAroundWeightKg: 72,
    lowestRecentFightingWeightKg: null,
    coachInvolved: true,
    dietitianInvolved: false,
    equipmentAccess: ["bodyweight"],
    scheduleAvailability: [],
    protectedBoxingSchedule: [],
    cycleTrackingPreference: "disabled",
    wearablePreference: "manual_only",
    ...overrides
  };
}

function fixedWorkout(input: {
  id: string;
  type: ProtectedWorkout["type"];
  date: ISODateString;
  durationMinutes: number;
  intensity: ProtectedWorkout["intensity"];
  rounds?: number | undefined;
}): ProtectedWorkout {
  return {
    ...input,
    protected: true
  };
}

function safetyConstraint(input: {
  id: string;
  region: PersistentSafetyConstraint["affectedBodyRegion"];
  domains: PersistentSafetyConstraint["affectedTrainingDomains"];
  reviewDate?: ISODateString | undefined;
}): PersistentSafetyConstraint {
  return {
    id: input.id,
    source: "manual",
    observedDate: "2026-05-28",
    lastConfirmedDate: "2026-06-01",
    status: "active",
    severity: "high",
    affectedBodyRegion: input.region,
    affectedTrainingDomains: input.domains,
    hardStopScope: "affected_domain",
    reassessmentRequirement: `Reassess ${input.region} tolerance before restoring affected high-output work.`,
    reviewDate: input.reviewDate ?? "2026-06-08",
    returnToTrainingStage: "intro"
  };
}

const noEquipmentNovice = baseAthlete({
  athleteId: "golden_novice_no_equipment",
  boxingLevel: "amateur_novice",
  trainingAgeYears: 0.5,
  equipmentAccess: ["none"]
});

const intermediateDbBands = baseAthlete({
  athleteId: "golden_intermediate_db_bands",
  boxingLevel: "amateur_open",
  trainingAgeYears: 2.5,
  equipmentAccess: ["dumbbells", "bands"]
});

const advancedRunBike = baseAthlete({
  athleteId: "golden_advanced_run_bike",
  boxingLevel: "amateur_elite",
  trainingAgeYears: 5,
  equipmentAccess: ["bike", "hill", "jump_rope"]
});

const advancedFullGym = baseAthlete({
  athleteId: "golden_advanced_full_gym",
  boxingLevel: "pro_8_10_round",
  trainingAgeYears: 7,
  equipmentAccess: ["full_gym", "medicine_ball", "bag", "bike"]
});

const fightCampAnchors: readonly ProtectedWorkout[] = [
  fixedWorkout({ id: "camp_class_mon", type: "boxing_class", date: "2026-06-02", durationMinutes: 75, intensity: "moderate", rounds: 8 }),
  fixedWorkout({ id: "camp_class_thu", type: "boxing_class", date: "2026-06-05", durationMinutes: 75, intensity: "moderate", rounds: 8 }),
  fixedWorkout({ id: "camp_sparring_sat", type: "sparring", date: "2026-06-06", durationMinutes: 45, intensity: "hard", rounds: 6 })
];

const twoClassesAndSparringAthlete = baseAthlete({
  athleteId: "golden_fight_camp",
  boxingLevel: "amateur_elite",
  trainingAgeYears: 5,
  equipmentAccess: ["dumbbells", "bands", "bike", "bag"],
  protectedBoxingSchedule: fightCampAnchors
});

const legacyProfile = baseAthlete({
  athleteId: "golden_legacy_profile",
  stance: undefined,
  boxingLevel: "amateur_novice",
  trainingAgeYears: 1,
  equipmentAccess: ["dbs", "boxing_bag", "stationary_bike"],
  scheduleAvailability: ["Mon after work", "Wed home", "Fri gym"]
});

export function goldenMatrixCases(): readonly GoldenMatrixCaseDefinition[] {
  const doseAthlete = baseAthlete({
    athleteId: "golden_dose_comparison",
    boxingLevel: "amateur_open",
    trainingAgeYears: 3,
    equipmentAccess: ["dumbbells", "bands", "bike"]
  });
  return [
    {
      id: "novice-balanced-standard-no-equipment",
      title: "Novice balanced standard no equipment",
      reviewQuestion: "Does a novice balanced plan still include a real mix without pretending shadowboxing is strength?",
      variants: [
        {
          id: "novice-balanced-standard-no-equipment",
          label: "Novice balanced standard",
          athlete: noEquipmentNovice,
          focus: "balanced",
          dose: "standard",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["home", "limited space"]
        }
      ]
    },
    {
      id: "intermediate-strength-serious-db-bands",
      title: "Intermediate strength serious dumbbells and bands",
      reviewQuestion: "Does serious strength produce actual movement-pattern volume with equipment-aware selections?",
      variants: [
        {
          id: "intermediate-strength-serious-db-bands",
          label: "Intermediate serious strength",
          athlete: intermediateDbBands,
          focus: "strength",
          subFocus: "full_body_strength",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer strength"]
        }
      ]
    },
    {
      id: "advanced-conditioning-serious-run-bike",
      title: "Advanced conditioning serious running and bike access",
      reviewQuestion: "Does conditioning identify the energy system and choose a real modality?",
      variants: [
        {
          id: "advanced-conditioning-serious-run-bike",
          label: "Advanced serious intervals",
          athlete: advancedRunBike,
          focus: "conditioning",
          subFocus: "intervals",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer running", "prefer bike"]
        }
      ]
    },
    {
      id: "advanced-power-high-full-gym-med-ball",
      title: "Advanced power high full gym and medicine ball",
      reviewQuestion: "Does high-dose power prioritize freshness and full recovery instead of fatigue conditioning?",
      variants: [
        {
          id: "advanced-power-high-full-gym-med-ball",
          label: "Advanced high power",
          athlete: advancedFullGym,
          focus: "power",
          subFocus: "rotational_power",
          dose: "high",
          selectedSupportDays: ["monday", "wednesday", "friday", "saturday"],
          preferences: ["gym", "prefer power"]
        }
      ]
    },
    {
      id: "fight-camp-two-classes-one-sparring",
      title: "Fight camp with two boxing classes and one sparring session",
      reviewQuestion: "Does fight-camp support respect fixed boxing and keep app work away from sparring?",
      variants: [
        {
          id: "fight-camp-two-classes-one-sparring",
          label: "Fight camp support",
          athlete: twoClassesAndSparringAthlete,
          goalMode: "fight_camp",
          focus: "strength",
          subFocus: "strength_maintenance",
          dose: "standard",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          fixedBoxing: fightCampAnchors,
          preferences: ["fight camp", "prefer bike"]
        }
      ]
    },
    {
      id: "recovery-after-difficult-week",
      title: "Recovery plan after a difficult week",
      reviewQuestion: "Does recovery/reset prescribe useful restorative work rather than vague empty days?",
      variants: [
        {
          id: "recovery-after-difficult-week",
          label: "Recovery reset",
          athlete: baseAthlete({ athleteId: "golden_recovery", equipmentAccess: ["bodyweight"] }),
          goalMode: "recovery_reset",
          focus: "mobility_recovery",
          subFocus: "soreness_management",
          dose: "standard",
          selectedSupportDays: ["tuesday", "thursday"],
          preferences: ["soreness management", "low noise"]
        }
      ]
    },
    {
      id: "knee-constrained-conditioning-bike",
      title: "Knee-constrained conditioning athlete with bike access",
      reviewQuestion: "Does an active knee constraint preserve conditioning with bike access and scope the constraint?",
      variants: [
        {
          id: "knee-constrained-conditioning-bike",
          label: "Knee constrained intervals",
          athlete: baseAthlete({
            athleteId: "golden_knee_bike",
            boxingLevel: "amateur_open",
            trainingAgeYears: 3,
            equipmentAccess: ["bike", "bands"]
          }),
          focus: "conditioning",
          subFocus: "intervals",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["avoid running", "prefer bike"],
          persistentSafetyConstraints: [safetyConstraint({ id: "golden_knee_active", region: "knee", domains: ["running", "jumping", "squatting", "lunging"] })]
        }
      ]
    },
    {
      id: "shoulder-constrained-strength",
      title: "Shoulder-constrained strength athlete",
      reviewQuestion: "Does shoulder-constrained strength preserve lower/trunk work while reducing affected pressing or bag volume?",
      variants: [
        {
          id: "shoulder-constrained-strength",
          label: "Shoulder constrained strength",
          athlete: baseAthlete({
            athleteId: "golden_shoulder_strength",
            boxingLevel: "amateur_open",
            trainingAgeYears: 3,
            equipmentAccess: ["dumbbells", "bands"]
          }),
          focus: "strength",
          subFocus: "upper_body_trunk_strength",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          persistentSafetyConstraints: [safetyConstraint({ id: "golden_shoulder_active", region: "shoulder", domains: ["pressing", "bag_work"] })]
        }
      ]
    },
    {
      id: "legacy-profile-normalized",
      title: "Legacy profile normalized into a new plan",
      reviewQuestion: "Does legacy equipment and missing stance normalize into explicit V2 inputs?",
      variants: [
        {
          id: "legacy-profile-normalized",
          label: "Legacy profile normalized",
          athlete: legacyProfile,
          focus: "balanced",
          dose: "standard",
          selectedSupportDays: ["Mon", "Wed", "Fri"],
          preferences: ["prefer bike", "prefer bag work"]
        }
      ]
    },
    {
      id: "same-athlete-dose-comparison",
      title: "Same athlete across minimal, standard, serious, and high",
      reviewQuestion: "Does dose change weekly budgets and exact work rather than titles only?",
      variants: (["minimal", "standard", "serious", "high"] as const).map((dose) => ({
        id: `same-athlete-${dose}`,
        label: `Same athlete ${dose}`,
        athlete: doseAthlete,
        focus: "strength" as const,
        subFocus: "full_body_strength" as const,
        dose,
        selectedSupportDays: ["monday", "wednesday", "friday", "saturday"],
        preferences: ["prefer strength"]
      }))
    },
    {
      id: "lower-body-vs-posterior-chain",
      title: "Lower-body-strength sub-focus versus posterior-chain sub-focus",
      reviewQuestion: "Do strength sub-focuses change set distribution and exercise emphasis?",
      variants: [
        {
          id: "lower-body-strength",
          label: "Lower-body strength",
          athlete: intermediateDbBands,
          focus: "strength",
          subFocus: "lower_body_strength",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"]
        },
        {
          id: "posterior-chain-strength",
          label: "Posterior-chain strength",
          athlete: intermediateDbBands,
          focus: "strength",
          subFocus: "posterior_chain_strength",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"]
        }
      ]
    },
    {
      id: "aerobic-base-vs-intervals",
      title: "Aerobic-base sub-focus versus interval sub-focus",
      reviewQuestion: "Do conditioning sub-focuses change energy-system structure?",
      variants: [
        {
          id: "aerobic-base",
          label: "Aerobic base",
          athlete: advancedRunBike,
          focus: "conditioning",
          subFocus: "aerobic_base",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer running"]
        },
        {
          id: "intervals",
          label: "Intervals",
          athlete: advancedRunBike,
          focus: "conditioning",
          subFocus: "intervals",
          dose: "serious",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer running"]
        }
      ]
    },
    {
      id: "rotational-vs-first-step-power",
      title: "Rotational-power sub-focus versus first-step-power sub-focus",
      reviewQuestion: "Do power sub-focuses change explosive allocation and exercise choices?",
      variants: [
        {
          id: "rotational-power",
          label: "Rotational power",
          athlete: advancedFullGym,
          focus: "power",
          subFocus: "rotational_power",
          dose: "high",
          selectedSupportDays: ["monday", "wednesday", "friday", "saturday"],
          preferences: ["medicine ball"]
        },
        {
          id: "first-step-power",
          label: "First-step power",
          athlete: advancedFullGym,
          focus: "power",
          subFocus: "first_step_explosiveness",
          dose: "high",
          selectedSupportDays: ["monday", "wednesday", "friday", "saturday"],
          preferences: ["first step"]
        }
      ]
    },
    {
      id: "bag-conditioning-vs-technical-shadowboxing",
      title: "Heavy-bag boxing conditioning versus technical shadowboxing",
      reviewQuestion: "Does bag conditioning differ materially from technical shadowboxing?",
      variants: [
        {
          id: "heavy-bag-boxing-conditioning",
          label: "Heavy-bag boxing conditioning",
          athlete: baseAthlete({
            athleteId: "golden_bag_conditioning",
            boxingLevel: "amateur_open",
            trainingAgeYears: 3,
            equipmentAccess: ["bag", "gloves"]
          }),
          focus: "conditioning",
          subFocus: "boxing_specific_conditioning",
          dose: "standard",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer bag work"]
        },
        {
          id: "technical-shadowboxing",
          label: "Technical shadowboxing mechanics",
          athlete: noEquipmentNovice,
          focus: "boxing_skill",
          subFocus: "shadowboxing_mechanics",
          dose: "standard",
          selectedSupportDays: ["monday", "wednesday", "friday"],
          preferences: ["prefer shadowboxing", "limited space"]
        }
      ]
    }
  ];
}

function compileVariant(definition: GoldenMatrixVariantDefinition): GoldenMatrixVariantResult {
  const fixedBoxingSchedule = definition.fixedBoxing ?? definition.athlete.protectedBoxingSchedule;
  const athlete = normalizeAthleteTrainingProfile({
    athlete: {
      ...definition.athlete,
      protectedBoxingSchedule: fixedBoxingSchedule
    },
    fixedBoxingSchedule,
    userPreferences: definition.preferences,
    preferredSessionDurationMinutes: definition.preferredSessionDurationMinutes
  });
  const planIntent = normalizePlanIntent({
    userId: `golden_user:${definition.id}`,
    requestedStartDate: GOLDEN_MATRIX_WEEK_START,
    goalMode: definition.goalMode,
    primaryFocus: definition.focus,
    subFocus: definition.subFocus,
    trainingDose: definition.dose,
    selectedSupportDays: definition.selectedSupportDays,
    preferredSessionDurationMinutes: definition.preferredSessionDurationMinutes ?? 50,
    maxSessionDurationMinutes: definition.maxSessionDurationMinutes ?? 70,
    userPreferences: definition.preferences,
    activeRevisionId: `golden:${definition.id}`
  });
  const input: CompileTrainingWeekInput = {
    athlete,
    planIntent,
    weekStartDate: GOLDEN_MATRIX_WEEK_START,
    persistentSafetyConstraints: definition.persistentSafetyConstraints
  };
  return {
    definition,
    week: compileTrainingWeek(input)
  };
}

export function compileGoldenMatrix(): readonly GoldenMatrixCaseResult[] {
  return goldenMatrixCases().map((definition) => ({
    definition,
    variants: definition.variants.map(compileVariant)
  }));
}

function lineForSession(session: CompiledTrainingSession): string {
  const blocks = session.blocks
    .map((block) => {
      const exercises = block.exercises
        .map((exercise) => {
          const dose = typeof exercise.durationSeconds === "number" ? `${exercise.durationSeconds}s` : `${exercise.sets ?? 1}x${exercise.reps ?? 1}`;
          return `${exercise.name} ${dose} RPE ${exercise.rpe ?? "n/a"} rest ${exercise.restSeconds}s`;
        })
        .join("; ");
      const conditioning = block.conditioning
        ? `${block.conditioning.modality} ${block.conditioning.energySystem} ${block.conditioning.repetitions}x${block.conditioning.workSeconds}/${block.conditioning.restSeconds}s RPE ${block.conditioning.rpe}`
        : "";
      const boxing = block.boxingRounds
        ? `${block.boxingRounds.modality} ${block.boxingRounds.rounds.length} rounds x ${block.boxingRounds.rounds[0]?.durationSeconds ?? 0}/${block.boxingRounds.rounds[0]?.restSeconds ?? 0}s RPE ${block.boxingRounds.rpe}`
        : "";
      return [block.title, exercises, conditioning, boxing].filter(Boolean).join(": ");
    })
    .join(" | ");
  return `- ${session.date} ${session.role} ${session.displayedDurationMinutes} min: ${blocks}`;
}

function renderVariant(result: GoldenMatrixVariantResult): string {
  const { week } = result;
  const budget = week.adaptationBudget;
  const strengthSets = budget.strength.squatSets + budget.strength.hingeSets + budget.strength.unilateralSets + budget.strength.pushSets + budget.strength.pullSets + budget.strength.trunkSets;
  return [
    `### ${result.definition.label}`,
    "",
    `- Normalized inputs: ${week.planIntent.goalMode} / ${week.planIntent.primaryFocus} / ${week.planIntent.subFocus} / ${week.planIntent.trainingDose}; support ${week.planIntent.selectedSupportDays.join(", ")}; equipment ${week.athleteProfile.equipment.join(", ") || "none"}.`,
    `- Athlete needs: ${week.athleteNeeds.primaryNeed}; secondary ${week.athleteNeeds.secondaryNeeds.join(", ")}; ${week.athleteNeeds.fixedTrainingSummary}`,
    `- Adaptation budget: strength ${strengthSets} sets across ${budget.strength.exposures} exposures; aerobic ${budget.conditioning.aerobicMinutes} min; tempo ${budget.conditioning.tempoWorkMinutes} min; intervals ${budget.conditioning.intervalRepetitions}; alactic ${budget.conditioning.alacticEfforts}; boxing tech ${budget.boxingSkill.technicalRounds} rounds; boxing conditioning ${budget.boxingSkill.conditioningRounds} rounds; power ${budget.power.explosiveRepetitions} explosive reps; mobility ${budget.mobility.targetMinutes} min.`,
    `- Fixed contribution: strength ${budget.fixedTrainingContribution.strengthSets} sets; aerobic ${budget.fixedTrainingContribution.aerobicMinutes} min; technical rounds ${budget.fixedTrainingContribution.boxingTechnicalRounds}; conditioning rounds ${budget.fixedTrainingContribution.boxingConditioningRounds}; hard fixed days ${budget.fixedTrainingContribution.hardDayCount}.`,
    `- Session intents: ${week.sessionIntents.map((intent) => `${intent.date} ${intent.role} ${intent.primaryAdaptation} ${intent.hardness}`).join("; ")}.`,
    `- Progression decisions: ${week.sessionIntents.map((intent) => `${intent.role}:${intent.progressionIntent}`).join("; ")}.`,
    `- Sessions:`,
    ...week.compiledSessions.map(lineForSession),
    `- Unresolved deficits: ${week.unresolvedTargetDeficits.length === 0 ? "none" : week.unresolvedTargetDeficits.map((deficit) => `${deficit.label} ${deficit.unresolvedDeficit} ${deficit.unit}`).join("; ")}.`,
    `- Validation: ${week.validation.passed ? "passed" : "failed"}${week.validation.failures.length > 0 ? ` (${week.validation.failures.join("; ")})` : ""}.`,
    `- Fingerprint: ${week.materialFingerprint}`,
    ""
  ].join("\n");
}

export function renderGoldenMatrixMarkdown(results: readonly GoldenMatrixCaseResult[] = compileGoldenMatrix()): string {
  return [
    "# Training Compiler V2 Golden Matrix",
    "",
    "Generated from the deterministic V2 compiler. These internal programming ranges are product policy defaults for pre-launch calibration, not absolute scientific claims.",
    "",
    ...results.flatMap((result) => [
      `## ${result.definition.id}: ${result.definition.title}`,
      "",
      `Review question: ${result.definition.reviewQuestion}`,
      "",
      ...result.variants.map(renderVariant)
    ])
  ].join("\n");
}
