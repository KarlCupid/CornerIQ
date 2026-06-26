import type { AthleteJourney, JourneyEvent } from "../athlete/types";
import type { ISODateString } from "../core/sharedTypes";
import { stableHash } from "../core/stableHash";
import type { PlanGenerationAction, PlanGenerationGoalMode, PlanGenerationIntent, PlanGenerationPrimaryFocus, PlanGenerationTrainingDose } from "./types";
import { defaultSubFocusFor } from "./compiler/normalizePlanInputs";
import type { PlanSubFocus, TrainingGoalMode, TrainingPrimaryFocus } from "./compiler/types";
import { normalizeGeneratedSupportWeekdays } from "./supportAvailability";

const PLAN_WIZARD_SOURCES = new Set(["plan_wizard_new_plan", "plan_wizard_amendment"]);
const PRIMARY_FOCUS_VALUES = new Set(["balanced", "power", "conditioning", "strength", "mobility", "boxing_skill"]);
const TRAINING_DOSE_VALUES = new Set(["minimal", "standard", "serious", "high"]);
const PLAN_SUB_FOCUS_VALUES = new Set<PlanSubFocus>([
  "full_body_strength",
  "lower_body_strength",
  "posterior_chain_strength",
  "upper_body_trunk_strength",
  "unilateral_control",
  "stance_posture_strength",
  "strength_maintenance",
  "rotational_power",
  "first_step_explosiveness",
  "alactic_speed",
  "reaction_timing",
  "power_maintenance",
  "aerobic_base",
  "repeatable_rounds",
  "tempo",
  "intervals",
  "sprint_alactic_conditioning",
  "boxing_specific_conditioning",
  "recovery_conditioning",
  "jab_system",
  "entries_exits",
  "defense_after_punching",
  "footwork_ringcraft",
  "counter_timing",
  "pressure_control",
  "outside_movement",
  "bag_skill",
  "shadowboxing_mechanics",
  "hips_ankles",
  "shoulders_thoracic",
  "trunk_guard_posture",
  "general_recovery",
  "post_bout",
  "travel",
  "soreness_management"
]);
const USER_PLAN_EVENT_TYPES = new Set<JourneyEvent["type"]>([
  "BuildPhaseStarted",
  "CampStarted",
  "FightOpportunityCreated",
  "FightOpportunityConfirmed",
  "FightOpportunityRescheduled",
  "TournamentStarted",
  "RecoveryStarted"
]);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveIntegerValue(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stringArrayValue(...candidates: readonly unknown[]): readonly string[] {
  for (const value of candidates) {
    if (Array.isArray(value)) {
      const normalized = [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return [];
}

function isoDateValue(value: unknown): ISODateString | null {
  const text = stringValue(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function dateFromDateTimeValue(value: unknown): ISODateString | null {
  const text = stringValue(value);
  return text ? isoDateValue(text.slice(0, 10)) : null;
}

function actionFromPayload(payload: Record<string, unknown>, intentPayload: Record<string, unknown> | null): PlanGenerationAction | null {
  const action = stringValue(intentPayload?.action) ?? stringValue(payload.planAction);
  if (action === "start_new_plan" || action === "amend_current_plan") {
    return action;
  }
  const source = stringValue(payload.source);
  if (source === "plan_wizard_new_plan") {
    return "start_new_plan";
  }
  if (source === "plan_wizard_amendment") {
    return "amend_current_plan";
  }
  return null;
}

function goalModeFromEvent(event: JourneyEvent, intentPayload: Record<string, unknown> | null): PlanGenerationGoalMode {
  const goalMode = stringValue(intentPayload?.goalMode);
  if (goalMode === "build" || goalMode === "fight" || goalMode === "tournament" || goalMode === "recovery") {
    return goalMode;
  }
  if (event.type === "CampStarted" || event.type === "FightOpportunityCreated" || event.type === "FightOpportunityConfirmed" || event.type === "FightOpportunityRescheduled") {
    return "fight";
  }
  if (event.type === "TournamentStarted") {
    return "tournament";
  }
  if (event.type === "RecoveryStarted") {
    return "recovery";
  }
  return "build";
}

function primaryFocusFromPayload(payload: Record<string, unknown>, intentPayload: Record<string, unknown> | null): PlanGenerationPrimaryFocus | undefined {
  const value = stringValue(intentPayload?.primaryFocus) ?? stringValue(payload.primaryFocus);
  return value && PRIMARY_FOCUS_VALUES.has(value) ? (value as PlanGenerationPrimaryFocus) : undefined;
}

function compilerGoalMode(goalMode: PlanGenerationGoalMode): TrainingGoalMode {
  switch (goalMode) {
    case "fight":
      return "fight_camp";
    case "tournament":
      return "tournament";
    case "recovery":
      return "recovery_reset";
    case "build":
      return "build";
  }
}

function compilerPrimaryFocus(focus: PlanGenerationPrimaryFocus | undefined, goalMode: PlanGenerationGoalMode): TrainingPrimaryFocus {
  if (focus === "mobility") {
    return "mobility_recovery";
  }
  if (focus) {
    return focus;
  }
  if (goalMode === "fight") {
    return "power";
  }
  if (goalMode === "tournament" || goalMode === "recovery") {
    return "mobility_recovery";
  }
  return "balanced";
}

function subFocusFromPayload(input: {
  goalMode: PlanGenerationGoalMode;
  intentPayload: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  primaryFocus: PlanGenerationPrimaryFocus | undefined;
}): PlanSubFocus {
  const value = stringValue(input.intentPayload?.subFocus) ?? stringValue(input.payload.subFocus);
  if (value && PLAN_SUB_FOCUS_VALUES.has(value as PlanSubFocus)) {
    return value as PlanSubFocus;
  }
  return defaultSubFocusFor(compilerPrimaryFocus(input.primaryFocus, input.goalMode), compilerGoalMode(input.goalMode));
}

export function defaultTrainingDoseForSupportDays(selectedSupportDayCount: number): PlanGenerationTrainingDose {
  return selectedSupportDayCount >= 5 ? "serious" : selectedSupportDayCount >= 3 ? "standard" : "minimal";
}

function trainingDoseFromPayload(
  payload: Record<string, unknown>,
  intentPayload: Record<string, unknown> | null,
  selectedSupportDayCount: number
): PlanGenerationTrainingDose {
  const value = stringValue(intentPayload?.trainingDose) ?? stringValue(payload.trainingDose) ?? stringValue(payload.selectedTrainingDose);
  return value && TRAINING_DOSE_VALUES.has(value) ? (value as PlanGenerationTrainingDose) : defaultTrainingDoseForSupportDays(selectedSupportDayCount);
}

function selectedSupportDaysFromPayload(
  journey: AthleteJourney,
  payload: Record<string, unknown>,
  intentPayload: Record<string, unknown> | null
): PlanGenerationIntent["selectedSupportDays"] {
  const candidates = [
    intentPayload?.selectedSupportDays,
    payload.selectedSupportDays,
    payload.scheduleAvailability,
    payload.generatedSupportAvailableDays,
    journey.athlete.scheduleAvailability
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) {
      const normalized = normalizeGeneratedSupportWeekdays(value.filter((item): item is string => typeof item === "string"));
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return [];
}

function sourceForAction(action: PlanGenerationAction): "plan_wizard_new_plan" | "plan_wizard_amendment" {
  return action === "start_new_plan" ? "plan_wizard_new_plan" : "plan_wizard_amendment";
}

function eventHasCanonicalPlanIntent(event: JourneyEvent): boolean {
  const payload = event.payload;
  return Boolean(objectValue(payload.planGenerationIntent));
}

function eventHasLegacyUserPlanSource(event: JourneyEvent): boolean {
  if (!USER_PLAN_EVENT_TYPES.has(event.type)) {
    return false;
  }
  const payload = event.payload;
  const source = stringValue(payload.source);
  return Boolean(source && PLAN_WIZARD_SOURCES.has(source));
}

function eventHasResolvablePlanIntent(event: JourneyEvent): boolean {
  return eventHasCanonicalPlanIntent(event) || eventHasLegacyUserPlanSource(event);
}

export function latestPlanWizardIntentSource(journey: AthleteJourney): "plan_wizard_new_plan" | "plan_wizard_amendment" | null {
  const event = [...journey.journeyEvents].reverse().find(eventHasResolvablePlanIntent);
  if (!event) {
    return null;
  }
  const payload = event.payload;
  const intentPayload = objectValue(payload.planGenerationIntent);
  const action = actionFromPayload(payload, intentPayload);
  if (action) {
    return sourceForAction(action);
  }
  const source = stringValue(payload.source);
  return source === "plan_wizard_new_plan" || source === "plan_wizard_amendment" ? source : null;
}

export function resolveActivePlanGenerationIntent(journey: AthleteJourney, asOfDate: ISODateString): PlanGenerationIntent | null {
  const event = [...journey.journeyEvents].reverse().find(eventHasResolvablePlanIntent);
  if (!event) {
    return null;
  }
  const payload = event.payload;
  const intentPayload = objectValue(payload.planGenerationIntent);
  const action = actionFromPayload(payload, intentPayload);
  if (!action) {
    return null;
  }
  const selectedSupportDays = selectedSupportDaysFromPayload(journey, payload, intentPayload);
  const trainingDose = trainingDoseFromPayload(payload, intentPayload, selectedSupportDays.length);
  const goalMode = goalModeFromEvent(event, intentPayload);
  const primaryFocus = primaryFocusFromPayload(payload, intentPayload);
  const subFocus = subFocusFromPayload({ goalMode, intentPayload, payload, primaryFocus });
  const requestedAt = stringValue(intentPayload?.requestedAt) ?? event.occurredAt;
  const id =
    stringValue(intentPayload?.id) ??
    stringValue(payload.planRevisionId) ??
    `plan:${stableHash({ eventId: event.id, payload, requestedAt })}`;
  const seed = stringValue(intentPayload?.seed) ?? stringValue(payload.seed) ?? id;
  const planStartDate =
    isoDateValue(intentPayload?.planStartDate) ??
    isoDateValue(payload.planStartDate) ??
    dateFromDateTimeValue(event.occurredAt) ??
    journey.activeTrainingBlock?.startDate ??
    asOfDate;

  return {
    id,
    userId: stringValue(intentPayload?.userId) ?? journey.athlete.athleteId,
    action,
    goalMode,
    primaryFocus,
    subFocus,
    trainingDose,
    selectedSupportDays,
    preferredSessionDurationMinutes: positiveIntegerValue(intentPayload?.preferredSessionDurationMinutes) ?? positiveIntegerValue(payload.preferredSessionDurationMinutes) ?? 45,
    maxSessionDurationMinutes: positiveIntegerValue(intentPayload?.maxSessionDurationMinutes) ?? positiveIntegerValue(payload.maxSessionDurationMinutes) ?? 70,
    targetBlockLengthWeeks: positiveIntegerValue(intentPayload?.targetBlockLengthWeeks) ?? positiveIntegerValue(payload.targetBlockLengthWeeks) ?? 4,
    equipment: stringArrayValue(intentPayload?.equipment, payload.equipment, journey.athlete.equipmentAccess),
    modalityPreferences: stringArrayValue(intentPayload?.modalityPreferences, payload.modalityPreferences, payload.userPreferences),
    modalityAvoidances: stringArrayValue(intentPayload?.modalityAvoidances, payload.modalityAvoidances),
    currentLimitations: stringArrayValue(intentPayload?.currentLimitations, payload.currentLimitations, [...journey.athlete.injuryHistory, ...journey.athlete.medicalFlags]),
    userPreferences: stringArrayValue(intentPayload?.userPreferences, payload.userPreferences, payload.modalityPreferences),
    planStartDate,
    requestedAt,
    seed,
    source: "plan_wizard",
    status: "active"
  };
}
