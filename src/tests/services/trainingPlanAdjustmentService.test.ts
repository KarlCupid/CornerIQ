import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { AthleteJourneyRepositories } from "../../services/supabase/loadAthleteJourney";
import { applyTrainingPlanAdjustmentService } from "../../services/training/applyTrainingPlanAdjustment";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

function createAdjustmentRepositories() {
  const insertTrainingPlanAdjustment = vi.fn(async () => ({ id: "adjustment_1" }));
  const insertTrainingBlockTimelineEvent = vi.fn(async () => ({ id: "timeline_event_1" }));
  const appendEvent = vi.fn(async () => ({ id: "event_1" }));
  const supersedeTrainingPlanAdjustments = vi.fn(async () => ({ ids: ["adjustment_old"] }));
  const repositories = {
    journey: { appendEvent },
    trainingBlock: {
      getActiveTrainingBlockForDate: vi.fn(async () => ({ id: "training_block_1" })),
      insertTrainingPlanAdjustment,
      supersedeTrainingPlanAdjustments
    },
    trainingProgression: {
      insertTrainingBlockTimelineEvent
    }
  } as unknown as Pick<AthleteJourneyRepositories, "journey" | "trainingBlock" | "trainingProgression">;
  return { repositories, calls: { appendEvent, insertTrainingBlockTimelineEvent, insertTrainingPlanAdjustment, supersedeTrainingPlanAdjustments } };
}

describe("applyTrainingPlanAdjustmentService", () => {
  it("persists rejected adjustment decisions with engine explanations", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const session = state.training.generatedSessions[0];
    if (!session) {
      throw new Error("fixture did not generate support");
    }
    const { repositories, calls } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      actor: {
        actorType: "coach",
        actorId: "coach_1",
        actorLabel: "Trusted coach"
      },
      trustedActor: true,
      command: {
        type: "move_generated_session",
        sessionId: session.id,
        fromDate: session.date,
        toDate: fixtureAsOfDate,
        reason: "Try moving onto sparring day",
        requestedBy: "coach"
      }
    });

    expect(result.status).toBe("rejected");
    expect(calls.insertTrainingPlanAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        trainingBlockId: "training_block_1",
        result: expect.objectContaining({ status: "rejected", explanation: expect.stringContaining("sparring") })
      })
    );
    expect(calls.appendEvent).toHaveBeenCalledWith("user_1", "TrainingPlanAdjusted", expect.objectContaining({ status: "rejected", adjustmentType: "move_generated_session" }));
  });

  it("persists athlete permission rejections for coach-only commands", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const { repositories, calls } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      command: {
        type: "coach_note",
        date: fixtureAsOfDate,
        note: "Coach-only note"
      }
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("athlete actor");
    expect(calls.insertTrainingPlanAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ status: "rejected", safetyFlags: ["training_adjustment_permission_rejected"] })
      })
    );
  });

  it("rejects athlete generated-session moves onto unsafe days after permission passes", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const session = state.training.generatedSessions[0];
    if (!session) {
      throw new Error("fixture did not generate support");
    }
    const { repositories, calls } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      command: {
        type: "move_generated_session",
        sessionId: session.id,
        fromDate: session.date,
        toDate: fixtureAsOfDate,
        reason: "Athlete tries to move generated support",
        requestedBy: "user"
      }
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("sparring");
    expect(result.safetyFlags).toEqual(["protected_boxing_anchor_conflict"]);
    expect(calls.insertTrainingPlanAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          status: "rejected",
          safetyFlags: ["protected_boxing_anchor_conflict"]
        })
      })
    );
  });

  it("allows coach actor only with active relationship lookup or trusted test flag", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const { repositories } = createAdjustmentRepositories();
    const baseCommand = {
      type: "coach_note" as const,
      date: fixtureAsOfDate,
      note: "Active relationship coach note",
      requestedBy: "coach" as const
    };

    const rejected = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      actor: { actorType: "coach", actorId: "coach_1" },
      command: baseCommand
    });
    expect(rejected.status).toBe("rejected");

    const active = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories: {
        ...repositories,
        coachRelationship: {
          hasActiveCoachRelationship: vi.fn(async (athleteUserId: string, coachUserId: string) => athleteUserId === "user_1" && coachUserId === "coach_1")
        }
      },
      actor: { actorType: "coach", actorId: "coach_1" },
      command: baseCommand
    });
    expect(active.status).toBe("applied");

    const trusted = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      actor: { actorType: "coach", actorId: "coach_1" },
      trustedActor: true,
      command: baseCommand
    });
    expect(trusted.status).toBe("applied");
  });

  it("appends TrainingPlanAdjusted and TrainingDeloadRequested for deload commands", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const { repositories, calls } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      command: {
        type: "request_deload",
        startDate: fixtureAsOfDate,
        endDate: fixtureAsOfDate,
        reason: "Accumulated fatigue",
        requestedBy: "user"
      }
    });

    expect(result.status).toBe("applied");
    expect(calls.appendEvent).toHaveBeenCalledWith("user_1", "TrainingPlanAdjusted", expect.objectContaining({ adjustmentType: "request_deload" }));
    expect(calls.appendEvent).toHaveBeenCalledWith("user_1", "TrainingDeloadRequested", expect.objectContaining({ reason: "Accumulated fatigue" }));
    expect(calls.insertTrainingBlockTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingBlockId: "training_block_1",
        event: expect.objectContaining({ eventType: "deload_requested" })
      })
    );
  });

  it("allows athlete protect-day requests with the default athlete actor", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const { repositories } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      command: {
        type: "protect_day",
        date: fixtureAsOfDate,
        reason: "Protect recovery today",
        requestedBy: "user"
      }
    });

    expect(result.status).toBe("applied");
  });

  it("restore_engine_plan supersedes active adjustments for the date before persisting restore", async () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const { repositories, calls } = createAdjustmentRepositories();

    const result = await applyTrainingPlanAdjustmentService({
      userId: "user_1",
      state,
      repositories,
      command: {
        type: "restore_engine_plan",
        date: fixtureAsOfDate,
        reason: "Restore default engine projection",
        requestedBy: "user"
      }
    });

    expect(result.status).toBe("applied");
    expect(calls.supersedeTrainingPlanAdjustments).toHaveBeenCalledWith("user_1", "training_block_1", fixtureAsOfDate);
    expect(calls.insertTrainingPlanAdjustment).toHaveBeenCalled();
  });
});
