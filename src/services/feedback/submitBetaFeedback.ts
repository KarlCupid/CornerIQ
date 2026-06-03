import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_SCREENS,
  BETA_FEEDBACK_SEVERITIES,
  type BetaFeedbackReport,
  type BetaFeedbackScreen,
  type createBetaFeedbackRepository
} from "../supabase/betaFeedbackRepository";
import { assertUserId } from "../supabase/repositoryTypes";

const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
const SECRET_KEY_PATTERN = /(password|token|secret|service[_-]?role|authorization|api[_-]?key|anon[_-]?key)/i;
const SERVER_ROLE_ENV_PATTERN = new RegExp(`\\bSUPABASE_${["SERVICE", "ROLE"].join("_")}(?:_KEY)?\\b(?:\\s*[:=]\\s*[^\\s,;]+)?`, "gi");
const SERVER_ROLE_TEXT_PATTERN = new RegExp(`\\b${["service", "role"].join("[_-]?")}\\b\\s*[:=]\\s*[^\\s,;]+`, "gi");
const TEXT_REDACTIONS: readonly [RegExp, string][] = [
  [/\bCORNERIQ_SMOKE_PASSWORD\b(?:\s*[:=]\s*[^\s,;]+)?/gi, "[redacted-secret]"],
  [SERVER_ROLE_ENV_PATTERN, "[redacted-secret]"],
  [SERVER_ROLE_TEXT_PATTERN, "server-only-key=[redacted]"],
  [/\b(api|anon)[_-]?key\b\s*[:=]\s*[^\s,;]+/gi, "$1_key=[redacted]"],
  [/\b(access|refresh)[_-]?token\b\s*[:=]\s*[^\s,;]+/gi, "$1_token=[redacted]"],
  [/\bauthorization\b\s*[:=]\s*bearer\s+[^\s,;]+/gi, "authorization=Bearer [redacted]"],
  [/\bbearer\s+[a-z0-9._~-]+/gi, "Bearer [redacted]"],
  [/\bsbp_[a-z0-9]{12,}\b/gi, "[redacted-token]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]"]
];

export interface SubmitBetaFeedbackContext {
  appSection?: string | undefined;
  engineVersion?: string | undefined;
  viewModelStatusLabels?: readonly string[] | undefined;
}

export interface SubmitBetaFeedbackInput {
  userId: string;
  screen: string;
  category: string;
  severity?: string | undefined;
  message: string;
  context?: SubmitBetaFeedbackContext | undefined;
  feedbackPayload?: Record<string, unknown> | undefined;
  repositories: {
    betaFeedback: Pick<ReturnType<typeof createBetaFeedbackRepository>, "insertBetaFeedbackReport">;
  };
}

export type SubmitBetaFeedbackResult =
  | {
      status: "submitted";
      report: BetaFeedbackReport;
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function includesValue<TValue extends string>(values: readonly TValue[], value: string): value is TValue {
  return values.includes(value as TValue);
}

function errorResult(message: string): SubmitBetaFeedbackResult {
  return { status: "error", message };
}

function redactSecretsFromText(value: string): string {
  return TEXT_REDACTIONS.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return redactSecretsFromText(value).slice(0, 500);
  }
  if (Array.isArray(value)) {
    if (depth >= 4) {
      return "[truncated]";
    }
    return value.slice(0, 20).map((item) => sanitizeUnknown(item, depth + 1));
  }
  if (isRecord(value)) {
    if (depth >= 4) {
      return "[truncated]";
    }
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 50)) {
      output[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeUnknown(entry, depth + 1);
    }
    return output;
  }
  return undefined;
}

function sanitizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) {
    return {};
  }
  const sanitized = sanitizeUnknown(payload);
  return isRecord(sanitized) ? sanitized : {};
}

function safeString(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? redactSecretsFromText(trimmed).slice(0, maxLength) : undefined;
}

function safeStatusLabels(labels: readonly string[] | undefined): readonly string[] {
  return (labels ?? []).map((label) => safeString(label, 120)).filter((label): label is string => Boolean(label)).slice(0, 12);
}

function safeSmokeRunId(payload: Record<string, unknown>): string | undefined {
  const value = payload.smokeRunId;
  return typeof value === "string" && value.startsWith("corneriq_live_smoke_") ? value.slice(0, 160) : undefined;
}

function buildSafeFeedbackPayload(input: {
  context: SubmitBetaFeedbackContext | undefined;
  payload: Record<string, unknown> | undefined;
  screen: BetaFeedbackScreen;
}): Record<string, unknown> {
  const extra = sanitizePayload(input.payload);
  return {
    source: "beta_feedback",
    appSection: safeString(input.context?.appSection, 80) ?? input.screen,
    engineVersion: safeString(input.context?.engineVersion, 80) ?? null,
    viewModelStatusLabels: safeStatusLabels(input.context?.viewModelStatusLabels),
    smokeRunId: safeSmokeRunId(extra) ?? null,
    extra
  };
}

export async function submitBetaFeedback(input: SubmitBetaFeedbackInput): Promise<SubmitBetaFeedbackResult> {
  try {
    const userId = assertUserId(input.userId, "submitBetaFeedback");
    const screen = input.screen.trim();
    const category = input.category.trim();
    const severity = (input.severity ?? "medium").trim();
    const message = redactSecretsFromText(input.message.trim());

    if (!includesValue(BETA_FEEDBACK_SCREENS, screen)) {
      return errorResult("Choose a valid app section before sending feedback.");
    }
    if (!includesValue(BETA_FEEDBACK_CATEGORIES, category)) {
      return errorResult("Choose a valid feedback category before sending feedback.");
    }
    if (!includesValue(BETA_FEEDBACK_SEVERITIES, severity)) {
      return errorResult("Choose a valid feedback severity before sending feedback.");
    }
    if (message.length === 0) {
      return errorResult("Add a short note before sending feedback.");
    }
    if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
      return errorResult(`Keep feedback to ${MAX_FEEDBACK_MESSAGE_LENGTH} characters or fewer.`);
    }

    const report = await input.repositories.betaFeedback.insertBetaFeedbackReport({
      userId,
      screen,
      category,
      severity,
      message,
      feedbackPayload: buildSafeFeedbackPayload({
        context: input.context,
        payload: input.feedbackPayload,
        screen
      })
    });

    return {
      status: "submitted",
      report,
      message: "Feedback received. It is saved to your account for beta review."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown beta feedback error.";
    return errorResult(`Feedback could not be saved: ${redactSecretsFromText(message)}`);
  }
}
