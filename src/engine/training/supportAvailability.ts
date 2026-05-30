import type { ISODateString } from "../core/sharedTypes";

export const GENERATED_SUPPORT_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export type GeneratedSupportWeekday = (typeof GENERATED_SUPPORT_WEEKDAYS)[number];

const weekdayLabels: Record<GeneratedSupportWeekday, { short: string; long: string }> = {
  monday: { short: "Mon", long: "Monday" },
  tuesday: { short: "Tue", long: "Tuesday" },
  wednesday: { short: "Wed", long: "Wednesday" },
  thursday: { short: "Thu", long: "Thursday" },
  friday: { short: "Fri", long: "Friday" },
  saturday: { short: "Sat", long: "Saturday" },
  sunday: { short: "Sun", long: "Sunday" }
};

const tokenPatterns: readonly [GeneratedSupportWeekday, RegExp][] = [
  ["monday", /^mon(day)?(?:$|[^a-z])/],
  ["tuesday", /^tue(s|sday)?(?:$|[^a-z])/],
  ["wednesday", /^wed(nesday)?(?:$|[^a-z])/],
  ["thursday", /^thu(r|rs|rsday)?(?:$|[^a-z])/],
  ["friday", /^fri(day)?(?:$|[^a-z])/],
  ["saturday", /^sat(urday)?(?:$|[^a-z])/],
  ["sunday", /^sun(day)?(?:$|[^a-z])/]
];

export function generatedSupportWeekdayFromToken(value: string): GeneratedSupportWeekday | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) {
    return null;
  }
  return tokenPatterns.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

export function normalizeGeneratedSupportWeekdays(values: readonly string[]): readonly GeneratedSupportWeekday[] {
  const selected = new Set<GeneratedSupportWeekday>();
  for (const value of values) {
    const day = generatedSupportWeekdayFromToken(value);
    if (day) {
      selected.add(day);
    }
  }
  return GENERATED_SUPPORT_WEEKDAYS.filter((day) => selected.has(day));
}

export function generatedSupportWeekdayForDate(date: ISODateString): GeneratedSupportWeekday {
  const index = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return GENERATED_SUPPORT_WEEKDAYS[(index + 6) % 7] ?? "monday";
}

export function generatedSupportAllowedOnDate(values: readonly string[], date: ISODateString): boolean {
  const selected = normalizeGeneratedSupportWeekdays(values);
  if (selected.length === 0) {
    return false;
  }
  return selected.includes(generatedSupportWeekdayForDate(date));
}

export function generatedSupportWeekdayShortLabel(day: GeneratedSupportWeekday): string {
  return weekdayLabels[day].short;
}

export function generatedSupportWeekdayLongLabel(day: GeneratedSupportWeekday): string {
  return weekdayLabels[day].long;
}

export function formatGeneratedSupportWeekdays(days: readonly GeneratedSupportWeekday[]): string {
  if (days.length === 0) {
    return "No generated-support days selected.";
  }
  return days.map(generatedSupportWeekdayShortLabel).join(", ");
}

export function mergeScheduleAvailabilityWithGeneratedSupportDays(input: {
  currentAvailability: readonly string[];
  selectedDays: readonly GeneratedSupportWeekday[];
}): readonly string[] {
  const selected = new Set(input.selectedDays);
  const next: string[] = [];
  const covered = new Set<GeneratedSupportWeekday>();
  for (const item of input.currentAvailability) {
    const day = generatedSupportWeekdayFromToken(item);
    if (!day) {
      next.push(item);
      continue;
    }
    if (selected.has(day)) {
      next.push(item);
      covered.add(day);
    }
  }
  for (const day of GENERATED_SUPPORT_WEEKDAYS) {
    if (selected.has(day) && !covered.has(day)) {
      next.push(day);
    }
  }
  return next;
}
