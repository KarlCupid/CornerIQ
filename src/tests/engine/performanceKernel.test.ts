import { describe, expect, it } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import {
  apple_health_wearable_enhanced,
  fixtureAsOfDate,
  hormonal_contraception_athlete_symptom_based,
  menstruating_athlete_build_phase_scale_noise,
  menstruating_athlete_camp_heavy_symptoms,
  minor_athlete_weight_cut_blocked,
  no_data_low_confidence,
  no_wearable_manual_only,
  short_notice_unsafe_cut
} from "../fixtures/engineFixtures";

describe("Corner Engine performance kernel", () => {
  it("blocks unsafe short-notice same-day weight cuts", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.bodyMass.feasibility.status).toBe("blocked");
    expect(state.nutrition.acuteProtocolStatus).toBe("blocked");
    expect(state.safety.riskFlags.map((flag) => flag.code)).toContain("same_day_acute_loss_blocked");
    expect(state.viewModels.today.riskSummary.length).toBeGreaterThan(0);
  });

  it("blocks minor athlete acute weight manipulation", () => {
    const state = resolvePerformanceState({ journey: minor_athlete_weight_cut_blocked, asOfDate: fixtureAsOfDate });

    expect(state.bodyMass.feasibility.status).toBe("blocked");
    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("minor_acute_cut_blocked");
  });

  it("uses cycle-related scale noise instead of cutting calories from a one-day spike", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_build_phase_scale_noise, asOfDate: fixtureAsOfDate });

    expect(state.cycle.cycleRelatedWeightNoiseRisk).toBe("moderate");
    expect(state.bodyMass.scaleNoise.explanation).toContain("Use the trend");
    expect(state.nutrition.explanation).toContain("Fuel target protects boxing quality");
    expect(state.viewModels.fuel.cycleNote).not.toBeNull();
  });

  it("hard-stops cut and hard training when heavy bleeding and dizziness are logged", () => {
    const state = resolvePerformanceState({ journey: menstruating_athlete_camp_heavy_symptoms, asOfDate: fixtureAsOfDate });

    expect(state.safety.hardStops.map((flag) => flag.code)).toContain("heavy_bleeding_with_dizziness");
    expect(state.readiness.color).toBe("red");
    expect(state.training.todaySessions[0]?.intensity).toBe("recovery");
    expect(state.nutrition.acuteProtocolStatus).toBe("blocked");
  });

  it("supports manual-only athletes without wearable shame copy", () => {
    const state = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });

    expect(state.wearable.hasWearable).toBe(false);
    expect(state.wearable.explanation).toContain("No wearable needed");
    expect(state.viewModels.today.title).toBe("Today: protect sparring");
    expect(state.training.todaySessions[0]?.intensity).toBe("easy");
  });

  it("raises confidence when wearable signals are available but keeps symptoms authoritative", () => {
    const manual = resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate });
    const wearable = resolvePerformanceState({ journey: apple_health_wearable_enhanced, asOfDate: fixtureAsOfDate });

    expect(wearable.wearable.hasWearable).toBe(true);
    expect(wearable.wearable.signalConfidence.score).toBeGreaterThan(manual.wearable.signalConfidence.score);
    expect(wearable.wearable.explanation).toContain("not replacements for symptoms");
  });

  it("lowers confidence when key data is missing", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.confidence.level === "low" || state.confidence.level === "unknown").toBe(true);
    expect(state.bodyMass.confidence.missingInputs).toContain("four recent body-mass logs");
  });

  it("records explainable decisions for phase, weight feasibility, training, and nutrition", () => {
    const state = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });

    expect(state.decisionTrace.map((trace) => trace.step)).toEqual(["phase", "body_mass_feasibility", "training", "nutrition"]);
    expect(state.decisionTrace.find((trace) => trace.step === "body_mass_feasibility")?.rejectedAlternatives).toContain("automatic acute protocol");
  });

  it("builds Today decision stack and recent log summaries from engine view models", () => {
    const state = resolvePerformanceState({ journey: no_data_low_confidence, asOfDate: fixtureAsOfDate });

    expect(state.viewModels.today.decisionStack[0]?.label).toBe("Primary action");
    expect(state.viewModels.today.decisionStack.some((item) => item.label === "Body mass" && item.summary.includes("Trend unknown"))).toBe(true);
    expect(state.viewModels.recentLogs.bodyMassTrendSummary).toContain("unknown");
    expect(state.viewModels.recentLogs.today.length).toBeGreaterThan(0);
  });

  it("surfaces risk, fuel, and cycle context without unsafe acute-cut instructions", () => {
    const blocked = resolvePerformanceState({ journey: short_notice_unsafe_cut, asOfDate: fixtureAsOfDate });
    const cycle = resolvePerformanceState({ journey: hormonal_contraception_athlete_symptom_based, asOfDate: fixtureAsOfDate });

    expect(blocked.viewModels.today.decisionStack.some((item) => item.label === "Safety" && item.severity !== "info")).toBe(true);
    expect(blocked.viewModels.fuel.fightWeekFuel?.summary).toBeTruthy();
    expect(JSON.stringify(blocked.viewModels.fuel.fightWeekFuel)).not.toMatch(/dehydrat|water cut/i);
    expect(cycle.viewModels.cycle?.privacyReminder).toContain("not a window-prediction tool");
    expect(cycle.viewModels.cycle?.estimatedPhase).toContain("hormonal contraception");
  });
});
