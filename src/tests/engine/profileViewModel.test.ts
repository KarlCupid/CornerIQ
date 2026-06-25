import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { JourneyEvent, ProtectedWorkout, RecurringProtectedWorkoutAnchor } from "../../engine/core/types";
import { fixtureAsOfDate, minor_athlete_weight_cut_blocked, no_data_low_confidence, no_wearable_manual_only } from "../fixtures/engineFixtures";

describe("profile view model", () => {
  it("derives athlete setup and app input summaries from engine-owned state", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.identity.title).toContain("Amateur Open");
    expect(profile.athleteSetup.statusLabel).toBe("Ready");
    expect(profile.athleteSetup.contextLabel).toContain("Week");
    expect(profile.keySetup.map((item) => item.label)).toEqual(["Goal", "Schedule", "Equipment", "Units"]);
    expect(profile.keySetup.find((item) => item.label === "Schedule")?.value).toContain("available day");
    expect(profile.schedulePresentation.map((item) => item.label)).toEqual([
      "General availability",
      "Plan support days",
      "Weekly boxing sessions",
      "Upcoming dated sessions"
    ]);
    expect(profile.schedulePresentation.find((item) => item.label === "General availability")?.value).toContain("available days");
    expect(profile.appInputs.map((item) => item.label)).toEqual(["Training", "Fuel", "Readiness", "Cycle support"]);
    expect(profile.appInputs.find((item) => item.label === "Readiness")?.detail).toContain("Manual logs");
  });

  it("keeps missing profile inputs unknown instead of safe", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.athleteSetup.statusLabel).toBe("Needs details");
    expect(profile.athleteSetup.explanation).toContain("current weight");
    expect(profile.keySetup.find((item) => item.label === "Schedule")?.tone).toBe("green");
    expect(profile.appInputs.find((item) => item.label === "Fuel")?.tone).toBe("orange");
    expect(profile.dataConstellation.find((item) => item.label === "Body mass")?.value).toBe("Trend unknown");
    expect(profile.privacyMatrix.find((item) => item.label === "Cycle vault")?.value).toBe("Undecided");
  });

  it("presents profile availability separately from plan support days and boxing commitments", () => {
    const weeklyAnchor: RecurringProtectedWorkoutAnchor = {
      id: "weekly_boxing_monday",
      type: "boxing_class",
      weekday: "monday",
      localStartTime: "18:00",
      durationMinutes: 60,
      intensity: "moderate",
      protected: true
    };
    const datedBoxing: ProtectedWorkout = {
      id: "dated_pads_wednesday",
      type: "pads_mitts",
      date: "2026-05-21",
      localStartTime: "17:30",
      durationMinutes: 45,
      intensity: "moderate",
      protected: true
    };
    const travel: ProtectedWorkout = {
      id: "travel_friday",
      type: "travel",
      date: "2026-05-22",
      durationMinutes: 90,
      intensity: "easy",
      protected: true
    };
    const planEvent: JourneyEvent = {
      id: "event_profile_plan_support",
      type: "BuildPhaseStarted",
      occurredAt: "2026-05-19T09:00:00.000Z",
      payload: {
        primaryFocus: "balanced",
        source: "plan_wizard_new_plan",
        scheduleAvailability: ["tuesday", "thursday"],
        planGenerationIntent: {
          id: "profile_plan_support",
          userId: no_wearable_manual_only.athlete.athleteId,
          action: "start_new_plan",
          goalMode: "build",
          primaryFocus: "balanced",
          trainingDose: "standard",
          selectedSupportDays: ["tuesday", "thursday"],
          planStartDate: fixtureAsOfDate,
          requestedAt: "2026-05-19T09:00:00.000Z",
          seed: "profile_plan_support",
          source: "plan_wizard",
          status: "active"
        }
      }
    };
    const state = resolvePerformanceState({
      journey: {
        ...no_wearable_manual_only,
        athlete: {
          ...no_wearable_manual_only.athlete,
          scheduleAvailability: ["monday", "wednesday", "friday"],
          protectedBoxingSchedule: [datedBoxing],
          recurringProtectedAnchors: [weeklyAnchor]
        },
        protectedWorkouts: [datedBoxing, travel],
        journeyEvents: [planEvent]
      },
      asOfDate: fixtureAsOfDate
    });

    expect(state.viewModels.profile.keySetup.find((item) => item.label === "Schedule")?.value).toBe("3 available days");
    expect(state.viewModels.profile.schedulePresentation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "General availability", value: "3 available days", detail: expect.stringContaining("Monday") }),
        expect.objectContaining({ label: "Plan support days", value: "2 plan support days", detail: expect.stringContaining("Thursday") }),
        expect.objectContaining({ label: "Weekly boxing sessions", value: "1 weekly boxing session" }),
        expect.objectContaining({ label: "Upcoming dated sessions", value: "1 upcoming dated session" })
      ])
    );
  });

  it("keeps active safety stops visible and read-only", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });
    const profile = state.viewModels.profile;

    expect(profile.healthWarning.active).toBe(true);
    expect(profile.healthWarning.title).toBe("Health warning active");
    expect(profile.athleteSetup.statusLabel).toBe("Health note");
    expect(profile.healthSafetyItems.find((item) => item.label === "Fuel safety history")?.value).toBe("Cut paused");
    expect(profile.safetyLedger[0]?.title).toMatch(/safety stop/i);
    expect(profile.safetyLedger.find((item) => item.label === "Fuel")?.subtitle).toContain("app will not let an athlete resolve");
  });
});
