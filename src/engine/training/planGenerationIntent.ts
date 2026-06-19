import type { AthleteJourney, JourneyEvent } from "../athlete/types";
import type { ISODateString } from "../core/sharedTypes";
import { stableHash } from "../core/stableHash";
import type { PlanGenerationAction, PlanGenerationGoalMode, PlanGenerationIntent, PlanGenerationPrimaryFocus, PlanGenerationTrainingDose } from "./types";
import { normalizeGeneratedSupportWeekdays } from "./supportAvailability";

const PLAN_WIZARD_SOURCES = new Set(["plan_wizard_new_plan", "plan_wizard_amendment"]);
const PRIMARY_FOCUS_VALUES = new Set(["balanced", "power", "conditioning", "strength", "mobility"]);
const TRAINING_DOSE_VALUES = new Set(["minimal", "standard", "serious", "high"]);
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
    goalMode: goalModeFromEvent(event, intentPayload),
    primaryFocus: primaryFocusFromPayload(payload, intentPayload),
    trainingDose,
    selectedSupportDays,
    planStartDate,
    requestedAt,
    seed,
    source: "plan_wizard",
    status: "active"
  };
}
