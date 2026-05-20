import { describe, expect, it } from "vitest";
import type { GeneratedTrainingSession, PersistedTrainingPlanAdjustment, TrainingBlock, TrainingDayPlan } from "../../engine/core/types";
import { applyTrainingPlanAdjustment, applyTrainingPlanAdjustments } from "../../engine/training/planAdjustmentEngine";

const generatedHard: GeneratedTrainingSession = {
  id: "generated_hard_1",
  date: "2026-05-20",
  family: "strength_lower",
  title: "Strength support",
  durationMinutes: 35,
  intensity: "hard",
  prescription: ["Trap bar pattern"],
  rationale: "Support boxing force production.",
  protects: ["boxing quality"],
  modifications: [],
  fuelDemand: "high"
};

const supportDay: TrainingDayPlan = {
  date: "2026-05-20",
  protectedAnchors: [],
  generatedSessions: [generatedHard],
  completedSessions: [],
  hardDay: true,
  role: "hard_day",
  recoveryPriority: "low",
  fuelDemand: "high",
  cycleAdjustment: null,
  safetyFlags: [],
  explanation: "Generated hard support."
};

const sparringDay: TrainingDayPlan = {
  date: "2026-05-21",
  protectedAnchors: [{ id: "sparring_1", type: "sparring", date: "2026-05-21", durationMinutes: 75, intensity: "hard", protected: true }],
  generatedSessions: [],
  completedSessions: [],
  hardDay: true,
  role: "hard_day",
  recoveryPriority: "moderate",
  fuelDemand: "high",
  cycleAdjustment: null,
  safetyFlags: [],
  explanation: "Coach sparring owns the day."
};

const openDay: TrainingDayPlan = {
  date: "2026-05-22",
  protectedAnchors: [],
  generatedSessions: [],
  completedSessions: [],
  hardDay: false,
  role: "support_day",
  recoveryPriority: "low",
  fuelDemand: "low",
  cycleAdjustment: null,
  safetyFlags: [],
  explanation: "Open support day."
};

const hardStopDay: TrainingDayPlan = {
  ...openDay,
  date: "2026-05-23",
  recoveryPriority: "hard_stop",
  safetyFlags: ["Safety override blocks hard work."]
};

const activeBlock: TrainingBlock = {
  id: "block:athlete:2026-05-20:build_strength",
  athleteId: "athlete_1",
  startDate: "2026-05-20",
  endDate: "2026-06-16",
  phase: "build_strength",
  primaryGoal: "strength_base",
  secondaryGoals: ["aerobic_capacity"],
  weeklyStructure: {
    weekStartDate: "2026-05-20",
    weekEndDate: "2026-05-26",
    hardDayCap: 2,
    plannedHardDays: 2,
    protectedAnchorCount: 1,
    generatedSupportCount: 1,
    recoveryDays: [],
    dayPlans: [supportDay, sparringDay, openDay, hardStopDay],
    summary: "Test week."
  },
  progressionState: {
    weekIndex: 1,
    status: "build",
    progressionRecommendation: "progress",
    reason: "Test progression."
  },
  createdBy: "engine",
  engineVersion: "test"
};

const athleteActor = { actorType: "athlete" as const, actorId: "athlete_1" };
const coachActor = { actorType: "coach" as const, actorId: "coach_1" };

describe("planAdjustmentEngine", () => {
  it("protect_day removes generated work while protected boxing remains untouched", () => {
    const result = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay, sparringDay],
      command: { type: "protect_day", date: "2026-05-20", reason: "Family conflict", requestedBy: "user", actor: athleteActor }
    });

    expect(result.status).toBe("applied");
    expect(result.modifiedDayPlans[0]?.generatedSessions).toHaveLength(0);
    expect(result.modifiedDayPlans[0]?.role).toBe("recovery_day");
  });

  it("move_generated_session rejects moves onto protected sparring or competition days", () => {
    const result = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay, sparringDay],
      command: { type: "move_generated_session", sessionId: "generated_hard_1", fromDate: "2026-05-20", toDate: "2026-05-21", reason: "Schedule change", requestedBy: "coach", actor: coachActor }
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("sparring");
    expect(result.safetyFlags).toContain("protected_boxing_anchor_conflict");
  });

  it("move_generated_session applies when the target stays inside the hard-day cap", () => {
    const result = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay, sparringDay, openDay],
      command: { type: "move_generated_session", sessionId: "generated_hard_1", fromDate: "2026-05-20", toDate: "2026-05-22", reason: "Work travel", requestedBy: "coach", actor: coachActor }
    });

    expect(result.status).toBe("applied");
    expect(result.modifiedDayPlans.find((day) => day.date === "2026-05-22")?.generatedSessions[0]?.date).toBe("2026-05-22");
  });

  it("move_generated_session cannot bypass hard-stop safety flags", () => {
    const result = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay, hardStopDay],
      command: { type: "move_generated_session", sessionId: "generated_hard_1", fromDate: "2026-05-20", toDate: "2026-05-23", reason: "Schedule change", requestedBy: "coach", actor: coachActor }
    });

    expect(result.status).toBe("rejected");
    expect(result.explanation).toContain("hard-stop");
  });

  it("request_deload changes day plans and block progression state through engine application", () => {
    const adjustment: PersistedTrainingPlanAdjustment = {
      id: "adjustment_1",
      trainingBlockId: "training_block_1",
      planDate: "2026-05-20",
      adjustmentType: "request_deload",
      command: { type: "request_deload", startDate: "2026-05-20", endDate: "2026-05-22", reason: "Accumulated fatigue", requestedBy: "user", actor: athleteActor },
      status: "applied",
      engineResponse: {
        status: "applied",
        explanation: "Deload request applied.",
        modifiedDayPlans: [],
        safetyFlags: [],
        persistedAdjustmentPayload: {}
      },
      createdAt: "2026-05-20T00:00:00.000Z"
    };

    const application = applyTrainingPlanAdjustments({ activeBlock, dayPlans: [supportDay, sparringDay, openDay], adjustments: [adjustment] });

    expect(application.activeBlock.progressionState.status).toBe("deload");
    expect(application.dayPlans.find((day) => day.date === "2026-05-20")?.generatedSessions).toHaveLength(0);
  });

  it("mark_unavailable removes generated support and restore_engine_plan has no programming side effect", () => {
    const unavailable = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay],
      command: { type: "mark_unavailable", date: "2026-05-20", reason: "Travel", requestedBy: "user", actor: athleteActor }
    });
    const restore = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay],
      command: { type: "restore_engine_plan", date: "2026-05-20", reason: "Undo protection", requestedBy: "user", actor: athleteActor }
    });

    expect(unavailable.modifiedDayPlans[0]?.generatedSessions).toHaveLength(0);
    expect(restore.status).toBe("applied");
    expect(restore.modifiedDayPlans).toHaveLength(0);
  });

  it("blocks athlete actors from coach-only commands while allowing athlete notes", () => {
    const coachOnly = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay],
      command: { type: "coach_note", date: "2026-05-20", note: "Coach-only review", actor: athleteActor }
    });
    const athleteNote = applyTrainingPlanAdjustment({
      activeBlock,
      dayPlans: [supportDay],
      command: { type: "note", date: "2026-05-20", note: "Athlete schedule context", actor: athleteActor }
    });

    expect(coachOnly.status).toBe("rejected");
    expect(coachOnly.safetyFlags).toContain("training_adjustment_permission_rejected");
    expect(athleteNote.status).toBe("applied");
  });
});
