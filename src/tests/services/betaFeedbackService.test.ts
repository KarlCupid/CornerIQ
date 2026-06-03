import { describe, expect, it, vi } from "vitest";
import { submitBetaFeedback } from "../../services/feedback/submitBetaFeedback";
import type { BetaFeedbackReport, InsertBetaFeedbackReportInput } from "../../services/supabase/betaFeedbackRepository";

function betaFeedbackReport(overrides: Partial<BetaFeedbackReport> = {}): BetaFeedbackReport {
  return {
    id: "feedback_1",
    userId: "user_1",
    screen: "profile",
    category: "confusing",
    severity: "medium",
    message: "The first action was hard to spot.",
    status: "received",
    feedbackPayload: { source: "beta_feedback" },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

function unsignedJwtWithRole(role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("submitBetaFeedback", () => {
  it("inserts a sanitized payload with safe app context", async () => {
    const insertBetaFeedbackReport = vi.fn(async (input: InsertBetaFeedbackReportInput) => betaFeedbackReport({ message: input.message, feedbackPayload: input.feedbackPayload ?? {} }));
    const result = await submitBetaFeedback({
      userId: "user_1",
      screen: "fuel",
      category: "fuel_feedback",
      severity: "low",
      message: "Fuel Command helped me tell what to do first.",
      context: {
        appSection: "fuel",
        engineVersion: "0.2.0",
        viewModelStatusLabels: ["command ready"]
      },
      feedbackPayload: {
        smokeRunId: "corneriq_live_smoke_123",
        accessToken: "secret-token-value",
        note: "Bearer abc.def.ghi"
      },
      repositories: { betaFeedback: { insertBetaFeedbackReport } }
    });

    expect(result.status).toBe("submitted");
    expect(insertBetaFeedbackReport).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        screen: "fuel",
        category: "fuel_feedback",
        severity: "low",
        message: "Fuel Command helped me tell what to do first.",
        feedbackPayload: expect.objectContaining({
          appSection: "fuel",
          engineVersion: "0.2.0",
          smokeRunId: "corneriq_live_smoke_123",
          extra: expect.objectContaining({
            accessToken: "[redacted]",
            note: "Bearer [redacted]"
          })
        })
      })
    );
  });

  it("rejects missing user id, empty messages, long messages, and invalid categories before persistence", async () => {
    const insertBetaFeedbackReport = vi.fn();
    const base = {
      userId: "user_1",
      screen: "profile",
      category: "confusing",
      severity: "medium",
      message: "Useful feedback.",
      repositories: { betaFeedback: { insertBetaFeedbackReport } }
    };

    await expect(submitBetaFeedback({ ...base, userId: "" })).resolves.toMatchObject({ status: "error" });
    await expect(submitBetaFeedback({ ...base, message: "   " })).resolves.toMatchObject({ status: "error", message: expect.stringContaining("short note") });
    await expect(submitBetaFeedback({ ...base, message: "x".repeat(2001) })).resolves.toMatchObject({ status: "error", message: expect.stringContaining("2000") });
    await expect(submitBetaFeedback({ ...base, category: "generic_fitness" })).resolves.toMatchObject({ status: "error", message: expect.stringContaining("valid feedback category") });
    expect(insertBetaFeedbackReport).not.toHaveBeenCalled();
  });

  it("redacts smoke password variable names and access tokens from messages", async () => {
    const insertBetaFeedbackReport = vi.fn(async (input: InsertBetaFeedbackReportInput) => betaFeedbackReport({ message: input.message }));
    const result = await submitBetaFeedback({
      userId: "user_1",
      screen: "profile",
      category: "bug",
      severity: "high",
      message: "I pasted CORNERIQ_SMOKE_PASSWORD=do-not-save and access_token=abc123 by mistake.",
      repositories: { betaFeedback: { insertBetaFeedbackReport } }
    });

    expect(result.status).toBe("submitted");
    const savedMessage = insertBetaFeedbackReport.mock.calls[0]?.[0].message as string;
    expect(savedMessage).not.toContain("CORNERIQ_SMOKE_PASSWORD");
    expect(savedMessage).not.toContain("do-not-save");
    expect(savedMessage).not.toContain("abc123");
    expect(savedMessage).toContain("[redacted");
  });

  it("redacts API keys, authorization strings, JWT-like text, and server-only role markers from messages", async () => {
    const insertBetaFeedbackReport = vi.fn(async (input: InsertBetaFeedbackReportInput) => betaFeedbackReport({ message: input.message }));
    const jwt = unsignedJwtWithRole("authenticated");
    const result = await submitBetaFeedback({
      userId: "user_1",
      screen: "profile",
      category: "bug",
      severity: "high",
      message: `api_key=abc123 anon_key=anon-secret authorization: Bearer secret-token pasted ${jwt} by mistake.`,
      repositories: { betaFeedback: { insertBetaFeedbackReport } }
    });

    expect(result.status).toBe("submitted");
    const savedMessage = insertBetaFeedbackReport.mock.calls[0]?.[0].message as string;
    expect(savedMessage).not.toContain("abc123");
    expect(savedMessage).not.toContain("anon-secret");
    expect(savedMessage).not.toContain("secret-token");
    expect(savedMessage).not.toContain(jwt);
    expect(savedMessage).toContain("[redacted");
  });

  it("deeply sanitizes feedback payloads with key redaction and bounded text", async () => {
    const insertBetaFeedbackReport = vi.fn(async (input: InsertBetaFeedbackReportInput) => betaFeedbackReport({ feedbackPayload: input.feedbackPayload ?? {} }));
    const result = await submitBetaFeedback({
      userId: "user_1",
      screen: "profile",
      category: "other",
      severity: "medium",
      message: "Payload redaction check.",
      feedbackPayload: {
        nested: { a: { b: { c: { tooDeep: "do not keep" } } } },
        tokenBundle: { value: "do-not-keep" },
        longText: "x".repeat(700),
        list: Array.from({ length: 25 }, (_, index) => index)
      },
      repositories: { betaFeedback: { insertBetaFeedbackReport } }
    });

    expect(result.status).toBe("submitted");
    const payload = insertBetaFeedbackReport.mock.calls[0]?.[0].feedbackPayload as { extra: Record<string, unknown> };
    expect(payload.extra.tokenBundle).toBe("[redacted]");
    expect(payload.extra.longText).toHaveLength(500);
    expect(payload.extra.list).toHaveLength(20);
    expect(payload.extra.nested).toEqual({ a: { b: { c: "[truncated]" } } });
  });

  it("does not expose service-role behavior", () => {
    expect(String(submitBetaFeedback).toLowerCase()).not.toContain("service_role");
  });
});
