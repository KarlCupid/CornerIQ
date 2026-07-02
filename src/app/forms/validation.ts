export interface ValidationCopyOptions {
  example?: string;
  required?: boolean;
}

export class FormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormValidationError";
  }
}

function formatRequirement(label: string, message: string, options: ValidationCopyOptions = {}): string {
  const requiredCopy = options.required === false ? "" : " is required";
  const example = options.example ? ` Example: ${options.example}.` : "";
  return `${label}${requiredCopy}: ${message}.${example}`;
}

function parseFiniteNumber(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FormValidationError(formatRequirement(label, "enter a number", options));
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new FormValidationError(formatRequirement(label, "enter a valid number", options));
  }
  return parsed;
}

export function parseRequiredPositiveNumber(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const parsed = parseFiniteNumber(value, label, options);
  if (parsed <= 0) {
    throw new FormValidationError(formatRequirement(label, "enter a number greater than 0", options));
  }
  return parsed;
}

export function parseOptionalPositiveNumber(value: string, label: string, options: ValidationCopyOptions = {}): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  return parseRequiredPositiveNumber(value, label, { ...options, required: false });
}

export function parseRequiredNonNegativeNumber(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const parsed = parseFiniteNumber(value, label, options);
  if (parsed < 0) {
    throw new FormValidationError(formatRequirement(label, "enter 0 or a positive number", options));
  }
  return parsed;
}

export function parseOptionalNonNegativeNumber(value: string, label: string, options: ValidationCopyOptions = {}): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  return parseRequiredNonNegativeNumber(value, label, { ...options, required: false });
}

export function parseRequiredInteger(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const parsed = parseFiniteNumber(value, label, options);
  if (!Number.isInteger(parsed)) {
    throw new FormValidationError(formatRequirement(label, "enter a whole number", options));
  }
  return parsed;
}

export function parseRequiredPositiveInteger(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const parsed = parseRequiredInteger(value, label, options);
  if (parsed <= 0) {
    throw new FormValidationError(formatRequirement(label, "enter a whole number greater than 0", options));
  }
  return parsed;
}

export function parseOptionalPositiveInteger(value: string, label: string, options: ValidationCopyOptions = {}): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  return parseRequiredPositiveInteger(value, label, { ...options, required: false });
}

export function parseOptionalNonNegativeInteger(value: string, label: string, options: ValidationCopyOptions = {}): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = parseRequiredInteger(value, label, { ...options, required: false });
  if (parsed < 0) {
    throw new FormValidationError(formatRequirement(label, "enter 0 or a positive whole number", options));
  }
  return parsed;
}

function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parts = value.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseRequiredDateYYYYMMDD(value: string, label: string, options: ValidationCopyOptions = {}): string {
  const trimmed = value.trim();
  if (!isRealCalendarDate(trimmed)) {
    throw new FormValidationError(formatRequirement(label, "enter a real date as YYYY-MM-DD", { example: "2026-06-20", ...options }));
  }
  return trimmed;
}

export function parseOptionalISODateTime(value: string, label: string, options: ValidationCopyOptions = {}): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const candidate = trimmed.includes("T") ? trimmed : trimmed.replace(/\s+/, "T");
  if (!candidate.includes("T") || !Number.isFinite(Date.parse(candidate))) {
    throw new FormValidationError(formatRequirement(label, "enter a valid date and time", { example: "2026-06-20 08:00 or 2026-06-20T08:00:00.000Z", ...options, required: false }));
  }
  return new Date(candidate).toISOString();
}

export function parseRequiredTimeHHMM(value: string, label: string, options: ValidationCopyOptions = {}): string {
  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    throw new FormValidationError(formatRequirement(label, "enter a 24-hour time as HH:MM", { example: "08:00", ...options }));
  }
  return trimmed;
}

export function validateOneToFive(value: string, label: string, options: ValidationCopyOptions = {}): number {
  const parsed = parseRequiredInteger(value, label, options);
  if (parsed < 1 || parsed > 5) {
    throw new FormValidationError(formatRequirement(label, "choose a whole number from 1 to 5", options));
  }
  return parsed;
}

export function validateCommaSeparatedDates(value: string, label: string, options: ValidationCopyOptions = {}): string[] {
  const dates = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => parseRequiredDateYYYYMMDD(item, `${label} #${index + 1}`, options));
  if (dates.length === 0) {
    throw new FormValidationError(formatRequirement(label, "enter at least one date", { example: "2026-06-20, 2026-06-21", ...options }));
  }
  return dates;
}

export function validateNonEmptyText(value: string, label: string, options: ValidationCopyOptions = {}): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FormValidationError(formatRequirement(label, "enter text", options));
  }
  return trimmed;
}

export function validationError(error: unknown, fallback = "Please check the highlighted form values."): string {
  return error instanceof Error ? error.message : fallback;
}
