import { describe, expect, it } from "vitest";
import type { CompiledTrainingWeek, TrainingSessionBlock } from "../../engine/training/compiler";
import { buildWorkoutPlayerTimeline } from "../../engine/presentation/workoutPlayerTimeline";
import { projectCompiledWeekToGeneratedSessions } from "../../engine/training/compiledWeekProjection";
import { buildDetailedTrainingSession } from "../../engine/training/detailedSessionEngine";
import { resolveWarmupStructure } from "../../engine/training/warmupStructures";
import type { GeneratedTrainingSession } from "../../engine/training/types";
import { compileTemplateCase, templateAthlete, templateCycle, templateReadiness } from "./workoutTemplateTestUtils";

type BoxingTrainingSessionBlock = TrainingSessionBlock & {
  boxingRounds: NonNullable<TrainingSessionBlock["boxingRounds"]>;
};

function boxingBlocks(week: CompiledTrainingWeek): readonly BoxingTrainingSessionBlock[] {
  return week.compiledSessions
    .flatMap((session) => session.blocks)
    .filter((block): block is BoxingTrainingSessionBlock => Boolean(block.boxingRounds));
}

function firstBoxingBlock(week: CompiledTrainingWeek): BoxingTrainingSessionBlock {
  const block = boxingBlocks(week)[0];
  if (!block) {
    throw new Error("expected compiled boxing block");
  }
  return block;
}

function firstGeneratedBoxingSession(week: CompiledTrainingWeek): GeneratedTrainingSession {
  const generated = projectCompiledWeekToGeneratedSessions({
    week,
    source: "active_plan_generation"
  }).find((session) => session.structuredPrescriptionV2?.compiledSession.blocks.some((block) => block.boxingRounds));
  if (!generated) {
    throw new Error("expected generated boxing session");
  }
  return generated;
}

function roundText(block: BoxingTrainingSessionBlock): string {
  return [
    block.boxingRounds.technicalQualityCheckpoint,
    block.boxingRounds.progressionRule,
    block.boxingRounds.stopRule,
    ...block.boxingRounds.rounds.flatMap((round) => [round.title, round.job, round.doThis, round.intent, round.cue, round.doNotAdd, round.qualityCheck, round.downshift])
  ].join(" ");
}

function playerRoundSteps(input: { week: CompiledTrainingWeek; equipment: readonly string[] }) {
  const generatedSession = firstGeneratedBoxingSession(input.week);
  const athlete = templateAthlete({ equipmentAccess: input.equipment });
  const detail = buildDetailedTrainingSession({
    generatedSession,
    athlete,
    readiness: templateReadiness(),
    cycle: templateCycle(),
    protectedWorkouts: [],
    equipmentAccess: athlete.equipmentAccess
  });
  const timeline = buildWorkoutPlayerTimeline(detail);
  return timeline.steps.filter((step) => step.kind === "work" && step.actionLabel.startsWith("round"));
}

function playerRoundText(input: { week: CompiledTrainingWeek; equipment: readonly string[] }): string {
  return playerRoundSteps(input)
    .map((step) => [step.title, step.instruction, step.cue, step.successCheck ?? "", step.safetyStop ?? ""].join(" "))
    .join(" ");
}

const prohibitedGeneratedBoxingCopy = /\b(?:generated sparring|sparring round|contact drill|partner drill|fight simulation|clinch|feel the movement|jab shape|best round|quality round|primary action)\b/i;

describe("boxing workout structures", () => {
  it("projects concrete solo shadowboxing entry and exit rounds into the player", () => {
    const equipment = ["bodyweight"];
    const week = compileTemplateCase({
      focus: "boxing_skill",
      subFocus: "entries_exits",
      dose: "standard",
      equipment
    });
    const block = firstBoxingBlock(week);
    const compiledText = roundText(block);
    const timelineSteps = playerRoundSteps({ week, equipment });
    const timelineText = playerRoundText({ week, equipment });

    expect(block.boxingRounds.modality).toBe("shadowboxing");
    expect(block.boxingRounds.rounds[0]).toMatchObject({
      title: "In Out Stance",
      durationSeconds: 150,
      restSeconds: 60,
      job: "Own the entry and the exit before punching.",
      doThis: "Step in from stance, step out, and recover stance width. Freeze for one beat before repeating.",
      doNotAdd: "Do not punch until the feet reset."
    });
    expect(compiledText).toContain("Throw a jab-cross, bring both hands back, then take a small L-step out and reset.");
    expect(compiledText).toContain("The freeze should show guard, soft knees, and stance width.");
    expect(timelineSteps[0]).toMatchObject({
      title: "Round 1: In Out Stance",
      instruction: "Step in from stance, step out, and recover stance width. Freeze for one beat before repeating.",
      intent: "Own the entry and the exit before punching.",
      commonMistake: "Do not punch until the feet reset.",
      successCheck: "This round counts if the job stays clean through the final 30 seconds.",
      regression: "If the job breaks twice, slow down and use the simplest version."
    });
    expect(timelineText).not.toMatch(prohibitedGeneratedBoxingCopy);
  });

  it("keeps bag rounds technical, capped, and exit-first", () => {
    const equipment = ["bag"];
    const week = compileTemplateCase({
      focus: "boxing_skill",
      subFocus: "bag_skill",
      dose: "standard",
      equipment
    });
    const block = firstBoxingBlock(week);
    const text = `${roundText(block)} ${playerRoundText({ week, equipment })}`;

    expect(block.boxingRounds.modality).toBe("heavy_bag");
    expect(block.boxingRounds.rounds[0]).toMatchObject({ title: "Find Range", durationSeconds: 150, restSeconds: 60 });
    expect(text).toContain("Stand where your jab can touch the bag.");
    expect(text).toContain("Touch body line, touch head line, bring both hands home, then step out.");
    expect(text).toContain("power stays capped");
    expect(text).toContain("step off the bag");
    expect(text).toContain("accuracy and exits hold");
    expect(text).not.toMatch(prohibitedGeneratedBoxingCopy);
  });

  it("structures boxing conditioning as repeatable solo rounds without fatigue chasing", () => {
    const equipment = ["bodyweight"];
    const week = compileTemplateCase({
      focus: "conditioning",
      subFocus: "boxing_specific_conditioning",
      dose: "standard",
      equipment
    });
    const block = firstBoxingBlock(week);
    const text = roundText(block);

    expect(block.boxingRounds.purpose).toBe("boxing_conditioning");
    expect(block.boxingRounds.modality).toBe("shadowboxing");
    expect(block.boxingRounds.rounds[0]).toMatchObject({ durationSeconds: 150, restSeconds: 60 });
    expect(block.boxingRounds.rpe).toBe(7);
    expect(text).toContain("Move in stance. Every 20 seconds, check hands at guard and feet under hips.");
    expect(text).toContain("Do not add a sprint finish or bonus round.");
    expect(text).toContain("Add one round before increasing pace.");
    expect(text).not.toMatch(prohibitedGeneratedBoxingCopy);
  });

  it("uses short speed-timing rounds for counter work and includes non-jab actions", () => {
    const equipment = ["bodyweight"];
    const week = compileTemplateCase({
      focus: "boxing_skill",
      subFocus: "counter_timing",
      dose: "standard",
      equipment
    });
    const block = firstBoxingBlock(week);
    const text = `${roundText(block)} ${playerRoundText({ week, equipment })}`;

    expect(block.boxingRounds.purpose).toBe("speed_timing");
    expect(block.boxingRounds.rounds[0]).toMatchObject({ durationSeconds: 60, restSeconds: 90 });
    expect(block.boxingRounds.rpe).toBe(6);
    expect(text).toContain("touch a straight rear hand");
    expect(text).toContain("Keep rounds short.");
    expect(text).not.toMatch(prohibitedGeneratedBoxingCopy);
  });

  it("walks through the shared shadow and bag warm-ups with clean direct copy", () => {
    const shadow = resolveWarmupStructure({
      durationMinutes: 8,
      family: "boxing_technical_shadowboxing",
      templateId: "boxing_skill_shadow",
      templateTitle: "Solo shadowboxing skill"
    });
    const bag = resolveWarmupStructure({
      durationMinutes: 8,
      equipmentMode: "bag",
      family: "boxing_bag_skill",
      templateId: "boxing_bag_skill",
      templateTitle: "Bag skill rounds"
    });
    const shadowText = shadow.steps.map((step) => `${step.title} ${step.instruction} ${step.cue}`).join(" ");
    const bagText = bag.steps.map((step) => `${step.title} ${step.instruction} ${step.cue}`).join(" ");

    expect(shadowText).toContain("Push your hips back, let your chest tip forward, then stand tall again.");
    expect(shadowText).toContain("Bounce lightly without letting your feet come together.");
    expect(shadowText).toContain("Move the nearest foot first, then bring the other foot back under you.");
    expect(shadowText).toContain("Bring the jab hand back to your cheek before you move again.");
    expect(shadowText).toContain("Do not add another punch until your feet are set.");
    expect(bagText).toContain("Stand where your jab can touch the bag without reaching.");
    expect(bagText).toContain("step out before the bag swings back into you.");
    expect(`${shadowText} ${bagText}`).not.toMatch(prohibitedGeneratedBoxingCopy);
  });
});
