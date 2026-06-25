import type {
  AthleteJourney,
  BodyMassLog,
  CompletedTrainingSession,
  CycleLog,
  ElectrolyteLog,
  ExerciseResultRecord,
  FightOpportunity,
  FoodLog,
  GeneratedTrainingSession,
  JourneyEvent,
  NutritionSafetyReviewEvent,
  PersistedNutritionSafetyReview,
  PersistedTrainingPlanAdjustment,
  ProtectedWorkout,
  ReadinessCheckIn,
  RiskFlag,
  TournamentDetails,
  TrainingBlock,
  TrainingBlockTimelineEvent,
  TrainingProgressionDecision,
  TrainingWeekSummary,
  WaterLog,
  WearableSignal
} from "./types";

function fallbackRecordedAt(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function datePart(value: string | null | undefined): string | null {
  if (!value || value.length < 10) {
    return null;
  }
  return value.slice(0, 10);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstStringValue(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = stringValue(source[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function generatedCutoffAllows(recordedAt: string | null, generatedAt?: string | undefined): boolean {
  return generatedAt === undefined || recordedAt === null || recordedAt <= generatedAt;
}

function datedItemVisible(date: string, recordedAt: string | null, asOfDate: string, generatedAt?: string | undefined): boolean {
  return date <= asOfDate && generatedCutoffAllows(recordedAt, generatedAt);
}

function completionEffectiveDate(session: CompletedTrainingSession): string {
  return session.performedDate ?? session.date;
}

function completionRecordedAt(session: CompletedTrainingSession): string {
  return session.recordedAt ?? fallbackRecordedAt(completionEffectiveDate(session));
}

function exerciseResultEffectiveDate(result: ExerciseResultRecord): string {
  return (result.completedAt ?? result.recordedAt).slice(0, 10);
}

function readinessRecordedAt(checkIn: ReadinessCheckIn): string {
  return checkIn.recordedAt ?? fallbackRecordedAt(checkIn.date);
}

function bodyMassRecordedAt(log: BodyMassLog): string {
  return log.recordedAt ?? fallbackRecordedAt(log.date);
}

function foodLoggedAt(log: FoodLog): string {
  return log.loggedAt ?? fallbackRecordedAt(log.date);
}

function waterLoggedAt(log: WaterLog): string {
  return log.recordedAt ?? fallbackRecordedAt(log.date);
}

function electrolyteLoggedAt(log: ElectrolyteLog): string {
  return log.recordedAt ?? fallbackRecordedAt(log.date);
}

function cycleLoggedAt(log: CycleLog): string {
  return log.recordedAt ?? fallbackRecordedAt(log.date);
}

function protectedWorkoutRecordedAt(workout: ProtectedWorkout): string {
  return workout.recordedAt ?? fallbackRecordedAt(workout.date);
}

function fightRecordedAt(fight: FightOpportunity): string {
  return fight.recordedAt ?? fallbackRecordedAt(fight.boutDate);
}

function tournamentRecordedAt(tournament: TournamentDetails): string {
  return tournament.recordedAt ?? fallbackRecordedAt(tournament.tournamentStartDate);
}

function trainingBlockRecordedAt(block: TrainingBlock): string {
  return block.recordedAt ?? fallbackRecordedAt(block.startDate);
}

function trainingWeekSummaryRecordedAt(summary: TrainingWeekSummary): string {
  return summary.finalizedAt ?? summary.generatedAt ?? fallbackRecordedAt(summary.weekEndDate);
}

function trainingProgressionDecisionRecordedAt(decision: TrainingProgressionDecision): string {
  return decision.generatedAt ?? fallbackRecordedAt("9999-12-31");
}

function timelineEventRecordedAt(event: TrainingBlockTimelineEvent): string {
  const payloadRecordedAt = firstStringValue(event.payload, ["generatedAt", "finalizedAt", "createdAt", "occurredAt", "recordedAt"]);
  return payloadRecordedAt ?? fallbackRecordedAt(event.eventDate);
}

function riskFlagEffectiveDate(flag: RiskFlag): string | null {
  const evidenceDate = firstStringValue(flag.evidence, ["date", "asOfDate", "activeFrom", "startedAt", "occurredAt", "recordedAt", "createdAt", "raisedAt"]);
  return datePart(evidenceDate);
}

function riskFlagRecordedAt(flag: RiskFlag): string | null {
  return firstStringValue(flag.evidence, ["recordedAt", "createdAt", "raisedAt", "occurredAt"]);
}

function riskFlagEndAt(flag: RiskFlag): string | null {
  return firstStringValue(flag.evidence, ["resolvedAt", "activeUntil", "endedAt", "clearedAt"]);
}

function journeyEventEffectiveDate(event: JourneyEvent): string {
  const intentPayload = objectValue(event.payload.planGenerationIntent);
  const planStartDate = stringValue(intentPayload?.planStartDate) ?? stringValue(event.payload.planStartDate);
  if (planStartDate) {
    const requestedAt = stringValue(intentPayload?.requestedAt) ?? stringValue(event.payload.requestedAt);
    return [planStartDate.slice(0, 10), datePart(requestedAt), event.occurredAt.slice(0, 10)]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? event.occurredAt.slice(0, 10);
  }
  const payloadDate = stringValue(event.payload.date) ?? stringValue(event.payload.asOfDate);
  return payloadDate?.slice(0, 10) ?? event.occurredAt.slice(0, 10);
}

function moveAdjustmentVisibleForSession(
  sessionId: string,
  adjustments: readonly PersistedTrainingPlanAdjustment[]
): boolean {
  return adjustments.some(
    (adjustment) =>
      adjustment.status === "applied" &&
      adjustment.command.type === "move_generated_session" &&
      adjustment.command.sessionId === sessionId
  );
}

function newerRecordedItem<TItem extends { id?: string | undefined }>(
  left: TItem,
  right: TItem,
  recordedAt: (item: TItem) => string
): TItem {
  const recordedOrder = recordedAt(left).localeCompare(recordedAt(right));
  if (recordedOrder !== 0) {
    return recordedOrder > 0 ? left : right;
  }
  return (left.id ?? "").localeCompare(right.id ?? "") >= 0 ? left : right;
}

export function selectAsOfCompletedTrainingSessions(
  sessions: readonly CompletedTrainingSession[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly CompletedTrainingSession[] {
  const visible = sessions.filter((session) => {
    if (session.resolutionLifecycle === "superseded" && (generatedAt === undefined || !session.supersededAt || session.supersededAt <= generatedAt)) {
      return false;
    }
    const effectiveDate = completionEffectiveDate(session);
    const recordedAt = completionRecordedAt(session);
    return effectiveDate <= asOfDate && (generatedAt === undefined || recordedAt <= generatedAt);
  });
  const canonicalByGeneratedSessionId = new Map<string, CompletedTrainingSession>();
  const passthrough: CompletedTrainingSession[] = [];

  for (const session of visible) {
    if (session.completionSource !== "generated_session" || !session.generatedSessionId) {
      passthrough.push(session);
      continue;
    }
    const existing = canonicalByGeneratedSessionId.get(session.generatedSessionId);
    canonicalByGeneratedSessionId.set(
      session.generatedSessionId,
      existing ? newerRecordedItem(session, existing, completionRecordedAt) : session
    );
  }

  return [...passthrough, ...canonicalByGeneratedSessionId.values()].sort((left, right) => {
    const dateOrder = completionEffectiveDate(left).localeCompare(completionEffectiveDate(right));
    if (dateOrder !== 0) {
      return dateOrder;
    }
    return completionRecordedAt(left).localeCompare(completionRecordedAt(right));
  });
}

export function selectAsOfExerciseResults(
  results: readonly ExerciseResultRecord[],
  asOfDate: string,
  generatedAt?: string | undefined,
  completedSessions?: readonly CompletedTrainingSession[] | undefined
): readonly ExerciseResultRecord[] {
  const visibleCompletedSessionIds = completedSessions ? new Set(completedSessions.filter((session) => session.completionStatus === "completed").map((session) => session.id)) : null;
  return results.filter((result) => {
    if (visibleCompletedSessionIds && result.completedTrainingSessionId && !visibleCompletedSessionIds.has(result.completedTrainingSessionId)) {
      return false;
    }
    const effectiveDate = exerciseResultEffectiveDate(result);
    return effectiveDate <= asOfDate && (generatedAt === undefined || result.recordedAt <= generatedAt);
  });
}

export function selectAsOfReadinessHistory(
  checkIns: readonly ReadinessCheckIn[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly ReadinessCheckIn[] {
  return checkIns.filter((checkIn) => checkIn.date <= asOfDate && (generatedAt === undefined || readinessRecordedAt(checkIn) <= generatedAt));
}

export function selectLatestReadinessForDate(
  checkIns: readonly ReadinessCheckIn[],
  date: string,
  generatedAt?: string | undefined
): ReadinessCheckIn | null {
  const sameDate = selectAsOfReadinessHistory(checkIns, date, generatedAt).filter((checkIn) => checkIn.date === date);
  return sameDate.reduce<ReadinessCheckIn | null>((latest, checkIn) => {
    if (!latest) {
      return checkIn;
    }
    const recordedOrder = readinessRecordedAt(checkIn).localeCompare(readinessRecordedAt(latest));
    return recordedOrder >= 0 ? checkIn : latest;
  }, null);
}

export function selectAsOfBodyMassHistory(
  logs: readonly BodyMassLog[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly BodyMassLog[] {
  return logs.filter((log) => datedItemVisible(log.date, bodyMassRecordedAt(log), asOfDate, generatedAt));
}

export function selectAsOfFoodLogs(
  logs: readonly FoodLog[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly FoodLog[] {
  return logs.filter((log) => datedItemVisible(log.date, foodLoggedAt(log), asOfDate, generatedAt));
}

export function selectAsOfWaterLogs(
  logs: readonly WaterLog[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly WaterLog[] {
  return logs.filter((log) => datedItemVisible(log.date, waterLoggedAt(log), asOfDate, generatedAt));
}

export function selectAsOfElectrolyteLogs(
  logs: readonly ElectrolyteLog[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly ElectrolyteLog[] {
  return logs.filter((log) => datedItemVisible(log.date, electrolyteLoggedAt(log), asOfDate, generatedAt));
}

export function selectAsOfCycleLogs(
  logs: readonly CycleLog[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly CycleLog[] {
  return logs.filter((log) => datedItemVisible(log.date, cycleLoggedAt(log), asOfDate, generatedAt));
}

export function selectAsOfWearableSignals(
  signals: readonly WearableSignal[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly WearableSignal[] {
  return signals.filter((signal) => datedItemVisible(signal.recordedAt.slice(0, 10), signal.recordedAt, asOfDate, generatedAt));
}

export function selectAsOfProtectedWorkouts(
  workouts: readonly ProtectedWorkout[],
  generatedAt?: string | undefined
): readonly ProtectedWorkout[] {
  return workouts.filter((workout) => generatedCutoffAllows(protectedWorkoutRecordedAt(workout), generatedAt));
}

export function selectAsOfActiveFightOpportunity(
  fight: FightOpportunity | null,
  generatedAt?: string | undefined
): FightOpportunity | null {
  if (!fight) {
    return null;
  }
  return generatedCutoffAllows(fightRecordedAt(fight), generatedAt) ? fight : null;
}

export function selectAsOfActiveTournament(
  tournament: TournamentDetails | null,
  generatedAt?: string | undefined
): TournamentDetails | null {
  if (!tournament) {
    return null;
  }
  return generatedCutoffAllows(tournamentRecordedAt(tournament), generatedAt) ? tournament : null;
}

export function selectAsOfActiveTrainingBlock(
  block: TrainingBlock | null,
  generatedAt?: string | undefined
): TrainingBlock | null {
  if (!block) {
    return null;
  }
  return generatedCutoffAllows(trainingBlockRecordedAt(block), generatedAt) ? block : null;
}

function activeObjectiveForSnapshot(
  journey: AthleteJourney,
  fight: FightOpportunity | null,
  tournament: TournamentDetails | null
): string {
  if (tournament) {
    return "tournament";
  }
  if (fight?.status === "short_notice") {
    return "short_notice_camp";
  }
  if (fight) {
    return "camp";
  }
  return journey.activeFightOpportunity || journey.activeTournament ? "build" : journey.activeObjective;
}

export function selectAsOfJourneyEvents(
  events: readonly JourneyEvent[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly JourneyEvent[] {
  return events.filter((event) => journeyEventEffectiveDate(event) <= asOfDate && generatedCutoffAllows(event.occurredAt, generatedAt));
}

export function selectAsOfRiskFlags(
  flags: readonly RiskFlag[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly RiskFlag[] {
  return flags.flatMap((flag) => {
    const effectiveDate = riskFlagEffectiveDate(flag);
    if (effectiveDate && effectiveDate > asOfDate) {
      return [];
    }
    const recordedAt = riskFlagRecordedAt(flag) ?? (effectiveDate ? fallbackRecordedAt(effectiveDate) : null);
    if (!generatedCutoffAllows(recordedAt, generatedAt)) {
      return [];
    }
    const endAt = riskFlagEndAt(flag);
    const endDate = datePart(endAt);
    if (endDate && endDate < asOfDate) {
      return [];
    }
    if (generatedAt && endAt && endAt <= generatedAt) {
      return [];
    }
    if (flag.status === "resolved") {
      return generatedAt && endAt && generatedAt < endAt ? [{ ...flag, status: "active" }] : [];
    }
    return [flag];
  });
}

export function selectAsOfTrainingPlanAdjustments(
  adjustments: readonly PersistedTrainingPlanAdjustment[],
  _asOfDate: string,
  generatedAt?: string | undefined
): readonly PersistedTrainingPlanAdjustment[] {
  if (generatedAt === undefined) {
    return adjustments;
  }
  return adjustments.filter((adjustment) => adjustment.createdAt <= generatedAt);
}

export function selectAsOfGeneratedTrainingSessions(
  sessions: readonly GeneratedTrainingSession[],
  visibleAdjustments: readonly PersistedTrainingPlanAdjustment[],
  generatedAt?: string | undefined
): readonly GeneratedTrainingSession[] {
  return sessions.map((session) => {
    const originalDate = session.originalPlannedDate ?? session.date;
    const currentDate = session.currentScheduledDate ?? session.date;
    if (
      generatedAt !== undefined &&
      session.generatedSessionLifecycle === "moved" &&
      originalDate !== currentDate &&
      !moveAdjustmentVisibleForSession(session.id, visibleAdjustments)
    ) {
      return {
        ...session,
        date: originalDate,
        currentScheduledDate: originalDate,
        generatedSessionLifecycle: "active"
      };
    }
    return session;
  });
}

export function selectAsOfTrainingWeekSummaries(
  summaries: readonly TrainingWeekSummary[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly TrainingWeekSummary[] {
  return summaries.filter((summary) => {
    if (summary.weekStartDate > asOfDate) {
      return false;
    }
    return generatedCutoffAllows(trainingWeekSummaryRecordedAt(summary), generatedAt);
  });
}

export function selectAsOfTrainingProgressionDecisions(
  decisions: readonly TrainingProgressionDecision[],
  _asOfDate: string,
  generatedAt?: string | undefined
): readonly TrainingProgressionDecision[] {
  return decisions.filter((decision) => {
    const recordedAt = trainingProgressionDecisionRecordedAt(decision);
    return generatedCutoffAllows(recordedAt, generatedAt);
  });
}

export function selectAsOfTrainingBlockTimelineEvents(
  events: readonly TrainingBlockTimelineEvent[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly TrainingBlockTimelineEvent[] {
  return events.filter((event) => event.eventDate <= asOfDate && generatedCutoffAllows(timelineEventRecordedAt(event), generatedAt));
}

export function selectAsOfNutritionSafetyReviews(
  reviews: readonly PersistedNutritionSafetyReview[],
  asOfDate: string,
  generatedAt?: string | undefined
): readonly PersistedNutritionSafetyReview[] {
  return reviews.filter((review) => review.asOfDate <= asOfDate && generatedCutoffAllows(review.createdAt, generatedAt));
}

export function selectAsOfNutritionSafetyReviewEvents(
  events: readonly NutritionSafetyReviewEvent[],
  _asOfDate: string,
  generatedAt?: string | undefined
): readonly NutritionSafetyReviewEvent[] {
  return events.filter((event) => generatedCutoffAllows(event.createdAt, generatedAt));
}

export function buildAthleteJourneySnapshot(
  journey: AthleteJourney,
  asOfDate: string,
  generatedAt?: string | undefined
): AthleteJourney {
  const trainingPlanAdjustments = selectAsOfTrainingPlanAdjustments(journey.trainingPlanAdjustments, asOfDate, generatedAt);
  const completedTrainingSessions = selectAsOfCompletedTrainingSessions(journey.completedTrainingSessions, asOfDate, generatedAt);
  const activeFightOpportunity = selectAsOfActiveFightOpportunity(journey.activeFightOpportunity, generatedAt);
  const activeTournament = selectAsOfActiveTournament(journey.activeTournament, generatedAt);
  const activeTrainingBlock = selectAsOfActiveTrainingBlock(journey.activeTrainingBlock, generatedAt);
  return {
    ...journey,
    athlete: {
      ...journey.athlete,
      protectedBoxingSchedule: selectAsOfProtectedWorkouts(journey.athlete.protectedBoxingSchedule, generatedAt)
    },
    activeObjective: activeObjectiveForSnapshot(journey, activeFightOpportunity, activeTournament),
    activeFightOpportunity,
    activeTournament,
    currentTrainingBlock: activeTrainingBlock ? journey.currentTrainingBlock : null,
    activeTrainingBlock,
    trainingWeekSummaries: selectAsOfTrainingWeekSummaries(journey.trainingWeekSummaries, asOfDate, generatedAt),
    trainingProgressionDecisions: selectAsOfTrainingProgressionDecisions(journey.trainingProgressionDecisions, asOfDate, generatedAt),
    trainingBlockTimelineEvents: selectAsOfTrainingBlockTimelineEvents(journey.trainingBlockTimelineEvents, asOfDate, generatedAt),
    bodyMassHistory: selectAsOfBodyMassHistory(journey.bodyMassHistory, asOfDate, generatedAt),
    nutritionHistory: selectAsOfFoodLogs(journey.nutritionHistory, asOfDate, generatedAt),
    nutritionSafetyReviews: selectAsOfNutritionSafetyReviews(journey.nutritionSafetyReviews, asOfDate, generatedAt),
    nutritionSafetyReviewEvents: selectAsOfNutritionSafetyReviewEvents(journey.nutritionSafetyReviewEvents, asOfDate, generatedAt),
    hydrationHistory: selectAsOfWaterLogs(journey.hydrationHistory, asOfDate, generatedAt),
    electrolyteHistory: selectAsOfElectrolyteLogs(journey.electrolyteHistory, asOfDate, generatedAt),
    cycleHistory: selectAsOfCycleLogs(journey.cycleHistory, asOfDate, generatedAt),
    readinessHistory: selectAsOfReadinessHistory(journey.readinessHistory, asOfDate, generatedAt),
    wearableSignalHistory: selectAsOfWearableSignals(journey.wearableSignalHistory, asOfDate, generatedAt),
    completedTrainingSessions,
    exerciseResults: selectAsOfExerciseResults(journey.exerciseResults, asOfDate, generatedAt, completedTrainingSessions),
    trainingHistory: selectAsOfGeneratedTrainingSessions(journey.trainingHistory, trainingPlanAdjustments, generatedAt),
    trainingPlanAdjustments,
    protectedWorkouts: selectAsOfProtectedWorkouts(journey.protectedWorkouts, generatedAt),
    safetyFlags: selectAsOfRiskFlags(journey.safetyFlags, asOfDate, generatedAt),
    journeyEvents: selectAsOfJourneyEvents(journey.journeyEvents, asOfDate, generatedAt)
  };
}
