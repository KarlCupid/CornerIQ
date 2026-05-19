import type { ISODateString, ISODateTimeString } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDate(value: ISODateString | ISODateTimeString): Date {
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
}

export function daysBetween(start: ISODateString | ISODateTimeString, end: ISODateString | ISODateTimeString): number {
  const startTime = Date.UTC(toDate(start).getUTCFullYear(), toDate(start).getUTCMonth(), toDate(start).getUTCDate());
  const endTime = Date.UTC(toDate(end).getUTCFullYear(), toDate(end).getUTCMonth(), toDate(end).getUTCDate());
  return Math.round((endTime - startTime) / MS_PER_DAY);
}

export function addDays(date: ISODateString, days: number): ISODateString {
  const next = toDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function dateOnly(value: ISODateTimeString): ISODateString {
  return value.slice(0, 10);
}

export function isWithinInclusive(date: ISODateString, start: ISODateString, end: ISODateString): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0;
}
