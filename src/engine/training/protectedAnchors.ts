import { addDays } from "../core/dates";
import type { ISODateString, ProtectedWorkout, RecurringProtectedWorkoutAnchor, WeeklyProtectedAnchorWeekday } from "../core/types";

const WEEKDAY_INDEX: Record<WeeklyProtectedAnchorWeekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export function anchorsForDate(anchors: readonly ProtectedWorkout[], date: string): readonly ProtectedWorkout[] {
  return anchors.filter((anchor) => anchor.date === date);
}

export function hasProtectedSparring(anchors: readonly ProtectedWorkout[], date: string): boolean {
  return anchors.some((anchor) => anchor.date === date && anchor.type === "sparring");
}

export function hasProtectedCompetition(anchors: readonly ProtectedWorkout[], date: string): boolean {
  return anchors.some((anchor) => anchor.date === date && anchor.type === "competition");
}

function weekdayForDate(date: ISODateString): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function anchorActiveOnDate(anchor: RecurringProtectedWorkoutAnchor, date: ISODateString): boolean {
  if (anchor.activeFrom && date < anchor.activeFrom) {
    return false;
  }
  if (anchor.activeUntil && date > anchor.activeUntil) {
    return false;
  }
  return WEEKDAY_INDEX[anchor.weekday] === weekdayForDate(date);
}

function protectedWorkoutKey(workout: ProtectedWorkout): string {
  return [
    workout.type,
    workout.date,
    workout.startTime ?? workout.localStartTime ?? "",
    workout.durationMinutes,
    workout.intensity,
    workout.rounds ?? "",
    workout.note ?? ""
  ].join("|");
}

function materializedRecurringAnchor(anchor: RecurringProtectedWorkoutAnchor, date: ISODateString): ProtectedWorkout {
  return {
    id: `recurring_${anchor.id}_${date}`,
    type: anchor.type,
    date,
    ...(anchor.localStartTime ? { startTime: anchor.localStartTime, localStartTime: anchor.localStartTime } : {}),
    durationMinutes: anchor.durationMinutes,
    intensity: anchor.intensity,
    protected: true,
    ...(anchor.rounds === undefined ? {} : { rounds: anchor.rounds }),
    ...(anchor.note ? { note: anchor.note } : {}),
    recurringAnchorId: anchor.id,
    recurringAnchorWeekday: anchor.weekday
  };
}

export function materializeRecurringProtectedAnchors(input: {
  recurringAnchors: readonly RecurringProtectedWorkoutAnchor[];
  startDate: ISODateString;
  endDate: ISODateString;
  existingWorkouts?: readonly ProtectedWorkout[] | undefined;
}): ProtectedWorkout[] {
  const existingKeys = new Set((input.existingWorkouts ?? []).map(protectedWorkoutKey));
  const materialized = new Map<string, ProtectedWorkout>();
  for (let date = input.startDate; date <= input.endDate; date = addDays(date, 1)) {
    for (const anchor of input.recurringAnchors) {
      if (!anchorActiveOnDate(anchor, date)) {
        continue;
      }
      const workout = materializedRecurringAnchor(anchor, date);
      const key = protectedWorkoutKey(workout);
      if (existingKeys.has(key)) {
        continue;
      }
      materialized.set(`${workout.id}|${key}`, workout);
    }
  }
  return [...materialized.values()].sort((left, right) => {
    const date = left.date.localeCompare(right.date);
    if (date !== 0) {
      return date;
    }
    return (left.startTime ?? left.localStartTime ?? "").localeCompare(right.startTime ?? right.localStartTime ?? "");
  });
}

export function materializeProtectedWorkoutAnchors(input: {
  concreteWorkouts: readonly ProtectedWorkout[];
  recurringAnchors: readonly RecurringProtectedWorkoutAnchor[];
  startDate: ISODateString;
  endDate: ISODateString;
}): ProtectedWorkout[] {
  const recurring = materializeRecurringProtectedAnchors({
    recurringAnchors: input.recurringAnchors,
    startDate: input.startDate,
    endDate: input.endDate,
    existingWorkouts: input.concreteWorkouts
  });
  const byKey = new Map<string, ProtectedWorkout>();
  for (const workout of [...input.concreteWorkouts, ...recurring]) {
    byKey.set(protectedWorkoutKey(workout), workout);
  }
  return [...byKey.values()].sort((left, right) => {
    const date = left.date.localeCompare(right.date);
    if (date !== 0) {
      return date;
    }
    return (left.startTime ?? left.localStartTime ?? "").localeCompare(right.startTime ?? right.localStartTime ?? "");
  });
}
