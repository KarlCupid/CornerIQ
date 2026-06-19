import type { CompletedTrainingSession, ExerciseResultRecord, ReadinessCheckIn } from "./types";

function fallbackRecordedAt(date: string): string {
  return `${date}T00:00:00.000Z`;
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
    if (session.resolutionLifecycle === "superseded") {
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
  generatedAt?: string | undefined
): readonly ExerciseResultRecord[] {
  return results.filter((result) => {
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
