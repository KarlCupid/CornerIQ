import { describe, expect, it } from "vitest";
import type { DetailedTrainingSession, ExercisePrescription, GuidedWorkoutStep } from "../../engine/core/types";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import { recipeWhy } from "../../engine/presentation/workoutRecipePresentation";
import { resolveWorkoutPlayerMode } from "../../engine/presentation/workoutPlayerMode";
import { buildWorkoutPlayerTimeline, parseWorkoutTimerSeconds } from "../../engine/presentation/workoutPlayerTimeline";
import { buildGuidedStepsForExercise, movementTeachingForExercise } from "../../engine/training/guidedExerciseCatalog";
import { fixtureAsOfDate, pro_4_round_build_strength } from "../fixtures/engineFixtures";

function detailedFixture(): DetailedTrainingSession {
  const state = resolvePerformanceState({ journey: pro_4_round_build_strength, asOfDate: fixtureAsOfDate });
  const detail = state.viewModels.train.detailedTodaySessions[0]?.detail;
  if (!detail) {
    throw new Error("fixture did not produce detailed session");
  }
  return detail;
}

function step(input: Omit<GuidedWorkoutStep, "id"> & { id?: string | undefined }): GuidedWorkoutStep {
  return {
    ...input,
    id: input.id ?? `${input.kind}:${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  };
}

function testExercise(input: {
  exerciseId: string;
  name: string;
  category: ExercisePrescription["category"];
  repsText?: string | undefined;
  durationText?: string | undefined;
  restText?: string | undefined;
  timerBehavior: NonNullable<ExercisePrescription["guidedProfile"]>["timerBehavior"];
  work: readonly GuidedWorkoutStep[];
  setupTitle?: string | undefined;
  beginnerName?: string | undefined;
}): ExercisePrescription {
  return {
    exerciseId: input.exerciseId,
    name: input.name,
    category: input.category,
    repsText: input.repsText,
    durationText: input.durationText,
    loadGuidance: "Use a controlled effort that keeps boxing mechanics clean.",
    rpeTarget: input.category === "main_strength" ? 6 : 5,
    restText: input.restText ?? "30 sec",
    sets: [
      {
        setLabel: "Block 1",
        repsText: input.repsText,
        durationText: input.durationText,
        loadGuidance: "Controlled and repeatable.",
        rpeTarget: input.category === "main_strength" ? 6 : 5,
        restText: input.restText ?? "30 sec"
      }
    ],
    coachingNotes: ["Stay relaxed enough to repeat the next rep cleanly."],
    boxingTransfer: "Supports clean solo boxing positions.",
    substitutions: [],
    safetyNotes: ["Stop if pain, dizziness, or technique breakdown appears."],
    stopConditions: ["Stop if quality drops or symptoms change."],
    guidedProfile: {
      exerciseId: input.exerciseId,
      beginnerName: input.beginnerName ?? input.name,
      oneLineGoal: `Practice ${input.name} with clean mechanics.`,
      setup: [
        step({
          kind: "setup",
          title: input.setupTitle ?? `Set up ${input.name}`,
          beginnerInstruction: `Set your space for ${input.name} and start from a balanced stance.`,
          intent: "Prepare the position before any timed work starts.",
          cue: "Breathe out, soften the shoulders, and check your stance.",
          durationSeconds: 30,
          safetyStop: "Stop if setup creates pain or dizziness."
        })
      ],
      work: input.work,
      commonMistakes: ["Rushing the pattern before posture is set."],
      safetyStops: ["Stop if pain, dizziness, or technique breakdown appears."],
      timerBehavior: input.timerBehavior,
      beginnerEligible: true
    }
  };
}

function movementPrepExercise(): ExercisePrescription {
  return testExercise({
    exerciseId: "timeline_movement_prep",
    name: "Movement prep flow",
    category: "warm_up",
    durationText: "15 sec each",
    timerBehavior: "continuous",
    work: [
      "Shoulder circles forward",
      "Shoulder circles backward",
      "Punch and twist",
      "Scoops",
      "Hip hinges"
    ].map((title) =>
      step({
        kind: "work",
        title,
        beginnerInstruction: `${title} with relaxed breathing and no bouncing.`,
        intent: "Raise temperature and check joint comfort before harder work.",
        cue: "Move smoothly and keep the neck relaxed.",
        durationSeconds: 15,
        safetyStop: "Stop if the warm-up creates pain or dizziness."
      })
    )
  });
}

function shadowboxingRoundsExercise(): ExercisePrescription {
  const titles = ["Low and slow shadow", "Sharp jab focused round", "Jab entry and exit", "Best clean jab round"];
  const cues = ["Feel your feet.", "Hands return to guard after every jab.", "Exit on balance before you punch again.", "Best clean jab with calm shoulders."];
  return testExercise({
    exerciseId: "shadowboxing_technical_rounds",
    name: "Technical shadowboxing",
    category: "boxing_skill",
    durationText: "4 x 2 min rounds",
    restText: "60 sec",
    timerBehavior: "rounds",
    beginnerName: "Jab-Focused Shadowboxing",
    setupTitle: "Set up Technical shadowboxing",
    work: titles.map((title, index) =>
      step({
        kind: "work",
        title,
        beginnerInstruction: index === 0 ? "Start easy, feel your feet, and let the jab come back to guard." : "Keep the jab sharp while the feet stay underneath you.",
        intent: "Build clean jab rhythm with solo round structure.",
        cue: cues[index] ?? "Keep the jab clean and come back to stance.",
        microCues: index === 1 ? ["Make sure hands are coming back.", "Stay on the balls of your feet."] : undefined,
        durationSeconds: 120,
        restAfterSeconds: index < titles.length - 1 ? 60 : undefined,
        repsText: "2 min round",
        safetyStop: "Stop if speed creates sloppy guard returns."
      })
    )
  });
}

function cooldownExercise(): ExercisePrescription {
  return testExercise({
    exerciseId: "timeline_recovery_breathing",
    name: "Recovery breathing mobility",
    category: "recovery",
    durationText: "60 sec",
    timerBehavior: "continuous",
    work: [
      step({
        kind: "cooldown",
        title: "Easy breathing reset",
        beginnerInstruction: "Slow the breathing, shake out the arms, and finish calm.",
        intent: "Bring the session down without adding fatigue.",
        cue: "Long exhale and quiet shoulders.",
        durationSeconds: 60,
        safetyStop: "Stop if symptoms increase."
      })
    ]
  });
}

function stanceGuardResetExercise(): ExercisePrescription {
  const titles = ["Stance base", "Guard home", "Step and reset", "Jab shape to guard"];
  return testExercise({
    exerciseId: "stance_guard_reset",
    name: "Stance and guard reset",
    category: "technical",
    durationText: "4 x 45 sec segments",
    restText: "20 sec",
    timerBehavior: "continuous",
    work: titles.map((title, index) =>
      step({
        kind: "work",
        title,
        beginnerInstruction: index === 0 ? "Stand in boxing stance with soft knees, chin tucked, and quiet shoulders." : "Move just enough to reset stance and bring both hands back home.",
        intent: "Rehearse stance and guard positions as solo work.",
        cue: index === 1 ? "Hands return to cheekbone height before you move again." : "Keep feet under hips and shoulders quiet.",
        durationSeconds: 45,
        restAfterSeconds: index < titles.length - 1 ? 20 : undefined,
        repsText: "45 sec segment",
        safetyStop: "Stop if posture or balance breaks down."
      })
    )
  });
}

function gobletStrengthExercise(): ExercisePrescription {
  return testExercise({
    exerciseId: "goblet_squat_to_box",
    name: "Goblet squat to box",
    category: "main_strength",
    repsText: "2 x 8 reps",
    restText: "60 sec",
    timerBehavior: "self_paced_sets",
    work: [0, 1].map((index) =>
      step({
        kind: "work",
        title: `Set ${index + 1}: Controlled squat`,
        beginnerInstruction: "Sit back to a comfortable box height, stand tall, and keep the ribs stacked.",
        intent: "Build controlled leg strength for stance stability.",
        cue: "Knees track over toes and feet stay rooted.",
        repsText: "8 reps",
        restAfterSeconds: index === 0 ? 60 : undefined,
        safetyStop: "Stop if knee or back pain changes the movement."
      })
    )
  });
}

describe("workout player timeline", () => {
  it("routes player modes by workout content", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const strengthSession: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      guidedSections: undefined,
      sections: [{ ...sourceSection, guidedSteps: undefined, exercises: [gobletStrengthExercise()] }]
    };
    const boxingSession: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      guidedSections: undefined,
      sections: [{ ...sourceSection, guidedSteps: undefined, exercises: [shadowboxingRoundsExercise()] }]
    };
    const movementSession: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      guidedSections: undefined,
      sections: [{ ...sourceSection, name: "Mobility reset", guidedSteps: undefined, exercises: [movementPrepExercise(), cooldownExercise()] }]
    };
    const warmupPlusStrength: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      guidedSections: undefined,
      sections: [
        { ...sourceSection, name: "Warm-up", guidedSteps: undefined, exercises: [movementPrepExercise()] },
        { ...sourceSection, name: "Strength", guidedSteps: undefined, exercises: [gobletStrengthExercise()] }
      ]
    };
    const strengthPlusBoxing: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      guidedSections: undefined,
      sections: [
        { ...sourceSection, name: "Strength", guidedSteps: undefined, exercises: [gobletStrengthExercise()] },
        { ...sourceSection, name: "Boxing rounds", guidedSteps: undefined, exercises: [shadowboxingRoundsExercise()] }
      ]
    };

    expect(resolveWorkoutPlayerMode(boxingSession)).toBe("round_timer");
    expect(resolveWorkoutPlayerMode(strengthSession)).toBe("strength_sets");
    expect(resolveWorkoutPlayerMode(movementSession)).toBe("movement_flow");
    expect(["strength_sets", "hybrid"]).toContain(resolveWorkoutPlayerMode(warmupPlusStrength));
    expect(resolveWorkoutPlayerMode(strengthPlusBoxing)).toBe("hybrid");
  });

  it("allocates each section timer across every movement in that section", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const timeline = buildWorkoutPlayerTimeline(detail);
    const warmupIndex = detail.sections.findIndex((section) => /warm|prep/i.test(section.name));
    const warmup = detail.sections[warmupIndex];
    if (!warmup) {
      throw new Error("fixture did not include a warmup/prep section");
    }

    const warmupSteps = timeline.steps.filter((step) => step.sectionIndex === warmupIndex);
    const warmupExerciseIds = new Set(warmup.exercises.map((exercise) => exercise.exerciseId));
    const warmupTimelineExerciseIds = new Set(warmupSteps.map((step) => step.exerciseId));

    expect(timeline.totalSeconds).toBeGreaterThan(0);
    expect(warmupTimelineExerciseIds).toEqual(warmupExerciseIds);
    expect(warmupSteps.every((step) => step.durationSeconds > 0 && step.timerLabel.toLowerCase().includes("timer"))).toBe(true);
    expect(warmupSteps.every((step) => step.kind === "work")).toBe(true);
    expect(warmupSteps.map((step) => step.title)).not.toContain("Readiness check");
    expect(warmupSteps.some((step) => step.title === "Preparation")).toBe(false);
    expect(warmupSteps.every((step) => step.blockAccent === "blue")).toBe(true);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("expands generated V2 warm-ups into live timed movement steps", () => {
    const detail = detailedFixture();
    const timeline = buildWorkoutPlayerTimeline(detail);
    const warmupIndex = detail.sections.findIndex((section) => /warm|prep/i.test(section.name));
    const warmup = detail.sections[warmupIndex];
    if (!warmup) {
      throw new Error("fixture did not include a warmup/prep section");
    }
    const warmupSteps = timeline.steps.filter((step) => step.sectionIndex === warmupIndex);
    const warmupRecipeBlock = detail.recipe?.blocks.find((block) => block.type === "warmup");
    const warmupText = warmupSteps.map((step) => `${step.title} ${step.instruction} ${step.cue}`).join(" ");

    expect(warmup.guidedSteps?.length).toBeGreaterThan(6);
    expect(warmupSteps.length).toBeGreaterThan(6);
    expect(warmupSteps[0]).toEqual(expect.objectContaining({ autoAdvance: true, kind: "work" }));
    expect(warmupSteps.every((step) => step.kind === "work" && step.autoAdvance)).toBe(true);
    expect(warmupSteps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBeGreaterThanOrEqual(190);
    expect(warmupSteps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBeLessThanOrEqual(300);
    expect(warmupSteps.every((step) => step.durationSeconds >= 20 && step.durationSeconds <= 45)).toBe(true);
    expect(warmupText).toMatch(/\b(shoulder|hip|stance|jab|squat|walk|ankle|bag)\b/i);
    expect(warmupRecipeBlock?.steps.length).toBe(warmup.guidedSteps?.length);
    expect(warmupRecipeBlock?.steps.map((step) => step.title)).not.toContain("Readiness check");
    expect(warmupText.toLowerCase()).not.toMatch(/\breadiness\b/);
    expect(warmupText.toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("keeps movement prep flow as individual warm-up movement titles", () => {
    const base = movementPrepExercise();
    const { guidedProfile: _guidedProfile, ...withoutGuidance } = base;
    const catalogWarmup: ExercisePrescription = {
      ...withoutGuidance,
      exerciseId: "movement_prep_flow",
      name: "Movement prep flow"
    };

    const steps = buildGuidedStepsForExercise(catalogWarmup, { exerciseIndex: 0, sectionIndex: 0 });

    expect(steps.map((step) => step.title)).toEqual([
      "Shoulder circles forward",
      "Shoulder circles backward",
      "Punch and twist",
      "Scoops",
      "Hip hinges",
      "Stance bounce",
      "Step and guard reset"
    ]);
  });

  it("keeps generated live cues from ending on filler words", () => {
    const base = movementPrepExercise();
    const { guidedProfile: _guidedProfile, ...withoutGuidance } = base;
    const generatedWarmup: ExercisePrescription = {
      ...withoutGuidance,
      coachingNotes: ["Warm up slowly and check how you feel before the main work."],
      exerciseId: "generated_warm_up_cue",
      name: "Generated warm-up cue"
    };

    const teaching = movementTeachingForExercise(generatedWarmup);

    expect(teaching.liveCue).toBe("Warm up slowly and check how you feel before the main work.");
    expect(teaching.liveCue).not.toContain("before the.");
  });

  it("formats jab-focused shadowboxing as colored timed blocks with micro-cues", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const warmup = movementPrepExercise();
    const shadowboxing = shadowboxingRoundsExercise();
    const cooldown = cooldownExercise();
    const session: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      title: "Jab-Focused Shadowboxing",
      durationMinutes: 15,
      guidedSections: undefined,
      sections: [
        { ...sourceSection, name: "Warm-up", intent: "Warm up with short boxing movements.", durationMinutes: 2, guidedSteps: undefined, exercises: [warmup] },
        { ...sourceSection, name: "Boxing rounds", intent: "Build a sharper jab without rushing.", durationMinutes: 11, guidedSteps: undefined, exercises: [shadowboxing] },
        { ...sourceSection, name: "Cooldown", intent: "Bring breathing down.", durationMinutes: 2, guidedSteps: undefined, exercises: [cooldown] }
      ]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const warmupSteps = timeline.steps.filter((step) => step.sectionIndex === 0);
    const warmupWorkSteps = warmupSteps.filter((step) => step.kind === "work");
    const boxingSteps = timeline.steps.filter((step) => step.sectionIndex === 1);
    const cooldownSteps = timeline.steps.filter((step) => step.sectionIndex === 2);

    expect(warmupWorkSteps.slice(0, 5).map((step) => `${step.title} - ${step.durationLabel}`)).toEqual([
      "Shoulder circles forward - 15 sec",
      "Shoulder circles backward - 15 sec",
      "Punch and twist - 15 sec",
      "Scoops - 15 sec",
      "Hip hinges - 15 sec"
    ]);
    expect(boxingSteps.slice(1, 7).map((step) => `${step.title} - ${step.durationLabel}`)).toEqual([
      "Round 1: Low and slow shadow - 2:00",
      "Rest 1 - 60 sec",
      "Round 2: Sharp jab focused round - 2:00",
      "Rest 2 - 60 sec",
      "Round 3: Jab entry and exit - 2:00",
      "Rest 3 - 60 sec"
    ]);
    expect(boxingSteps.find((step) => step.title.includes("Sharp jab"))?.microCues).toContain("Make sure hands are coming back.");
    expect(boxingSteps.filter((step) => step.kind === "rest").every((step) => step.autoAdvance)).toBe(true);
    expect(warmupSteps.every((step) => step.blockAccent === "blue")).toBe(true);
    expect(boxingSteps.every((step) => step.blockAccent === "red")).toBe(true);
    expect(cooldownSteps.every((step) => step.blockAccent === "green")).toBe(true);
    expect(JSON.stringify(timeline)).not.toMatch(/readiness gate|movement prep|durability|T-spine|quality-capped|technical constraint|open hips/i);
  });

  it("expands repeated timed movement prescriptions into individual timer steps", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    const sourceExercise = sourceSection?.exercises[0];
    if (!sourceSection || !sourceExercise) {
      throw new Error("fixture did not include a source exercise");
    }
    const { guidedProfile: _guidedProfile, ...sourceWithoutGuidance } = sourceExercise;
    const repeatedExercise: ExercisePrescription = {
      ...sourceWithoutGuidance,
      exerciseId: "repeated_timer_step",
      name: "Repeated timer step",
      durationText: "3 x 2 min controlled tempo",
      sets: [{ ...sourceExercise.sets[0]!, durationText: "3 x 2 min controlled tempo" }]
    };
    const session: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      durationMinutes: 6,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 6, guidedSteps: undefined, exercises: [repeatedExercise] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps).toHaveLength(3);
    expect(workSteps.map((step) => step.actionLabel)).toEqual(["movement 1", "movement 2", "movement 3"]);
    expect(timeline.steps.some((step) => step.kind === "setup")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "checkpoint")).toBe(false);
    expect(workSteps.every((step) => step.instruction.includes("controlled tempo"))).toBe(true);
  });

  it("breaks stance and guard reset into named boxer-facing timer segments", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const stanceReset = stanceGuardResetExercise();
    const session: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      durationMinutes: 4,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 4, guidedSteps: undefined, exercises: [stanceReset] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps).toHaveLength(4);
    expect(workSteps.map((step) => step.actionLabel)).toEqual(["segment 1", "segment 2", "segment 3", "segment 4"]);
    expect(workSteps.map((step) => step.title)).toEqual([
      "Segment 1: Stance base",
      "Segment 2: Guard home",
      "Segment 3: Step and reset",
      "Segment 4: Jab shape to guard"
    ]);
    expect(workSteps[1]?.cue).toContain("Hands return");
    expect(timeline.steps.reduce((sum, step) => sum + step.durationSeconds, 0)).toBeGreaterThan(0);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(timeline.steps.some((step) => step.kind === "checkpoint")).toBe(true);
  });

  it("turns technical boxing timers into distinct round goals", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const shadowboxing = shadowboxingRoundsExercise();
    const session: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      durationMinutes: 8,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 8, guidedSteps: undefined, exercises: [shadowboxing] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const workSteps = timeline.steps.filter((step) => step.kind === "work");

    expect(workSteps).toHaveLength(4);
    expect(workSteps.slice(0, 4).map((step) => step.actionLabel)).toEqual(["round 1", "round 2", "round 3", "round 4"]);
    expect(workSteps.slice(0, 4).map((step) => step.title)).toEqual([
      "Round 1: Low and slow shadow",
      "Round 2: Sharp jab focused round",
      "Round 3: Jab entry and exit",
      "Round 4: Best clean jab round"
    ]);
    expect(workSteps[1]?.microCues).toContain("Stay on the balls of your feet.");
    expect(new Set(workSteps.map((step) => step.cue)).size).toBeGreaterThanOrEqual(4);
    expect(timeline.steps.some((step) => step.kind === "rest")).toBe(true);
    expect(JSON.stringify(timeline).toLowerCase()).not.toMatch(/\b(contact|sparring|fight simulation|partner drill)\b/);
  });

  it("marks setup and self-paced strength as tap-to-advance while rest and timed boxing can auto-advance", () => {
    const detail = { ...detailedFixture(), recipe: undefined };
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const goblet = gobletStrengthExercise();
    const stanceReset = stanceGuardResetExercise();
    const session: DetailedTrainingSession = {
      ...detail,
      recipe: undefined,
      durationMinutes: 10,
      guidedSections: undefined,
      sections: [{ ...sourceSection, durationMinutes: 10, guidedSteps: undefined, exercises: [goblet, stanceReset] }]
    };

    const timeline = buildWorkoutPlayerTimeline(session);
    const gobletSetup = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "setup");
    const gobletWork = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "work");
    const gobletRest = timeline.steps.find((step) => step.exerciseId === "goblet_squat_to_box" && step.kind === "rest");
    const stanceWork = timeline.steps.find((step) => step.exerciseId === "stance_guard_reset" && step.kind === "work");

    expect(gobletSetup).toEqual(expect.objectContaining({ autoAdvance: false }));
    expect(gobletWork).toEqual(expect.objectContaining({ autoAdvance: false, tracksCompletion: true }));
    expect(gobletRest).toEqual(expect.objectContaining({ autoAdvance: true, tracksCompletion: false }));
    expect(stanceWork).toEqual(expect.objectContaining({ autoAdvance: true, tracksCompletion: true }));
  });

  it("keeps generated player timelines guided and free of broad fallback titles", () => {
    const detail = detailedFixture();
    const timeline = buildWorkoutPlayerTimeline(detail);
    const allStepText = timeline.steps.map((step) => `${step.title} ${step.instruction} ${step.intent} ${step.cue}`).join(" ");
    const finalExerciseIds = new Set(detail.sections.flatMap((section) => section.exercises.map((exercise) => exercise.exerciseId)));
    const timelineExerciseIds = new Set(timeline.steps.map((step) => step.exerciseId));

    expect(detail.recipe).toBeTruthy();
    expect(detail.guidedSections?.length).toBeGreaterThan(0);
    expect([...finalExerciseIds].every((exerciseId) => timelineExerciseIds.has(exerciseId))).toBe(true);
    expect(timeline.steps.every((step) => !step.guidedStepId.startsWith("recipe:"))).toBe(true);
    expect(timeline.totalSeconds).toBe(timeline.steps.reduce((sum, step) => sum + step.durationSeconds, 0));
    expect(timeline.steps.every((step) => step.instruction.length > 20 && step.cue.length > 8)).toBe(true);
    expect(timeline.steps.filter((step) => step.kind !== "setup").every((step) => step.intent.length > 20)).toBe(true);
    expect(allStepText).not.toMatch(/\b(base shape|primary action|quality round|clean repeat|guard return rounds|shadowboxing rounds|defense round|rhythm round|technical round|execute cleanly|focus on quality|reset shape)\b/i);
    expect(timeline.steps.filter((step) => step.kind === "work").every((step) => step.safetyStop)).toBe(true);
  });

  it("explains preview why with workout function, boxing importance, and quality check", () => {
    const detail = detailedFixture();
    const sourceSection = detail.sections[0];
    if (!sourceSection) {
      throw new Error("fixture did not include a source section");
    }
    const session: DetailedTrainingSession = {
      ...detail,
      family: "strength_full_body",
      recipe: undefined,
      whyThisMattersForBoxing: "Protect the boxing anchor.",
      sessionQualityCheckpoints: ["No grinding reps."],
      sections: [
        {
          ...sourceSection,
          name: "Strength primer",
          intent: "Build smooth support strength for boxing.",
          exercises: [gobletStrengthExercise()]
        }
      ]
    };

    const why = recipeWhy(session);

    expect(why).toContain("Function:");
    expect(why).toContain("Why it matters:");
    expect(why).toContain("Quality check: No grinding reps.");
    expect(why).toMatch(/\b(stance|guard|boxing)\b/i);
    expect(why).not.toMatch(/\b(generic fitness|MMA|sparring|contact drill|fight simulation)\b/i);
  });

  it("keeps recipe-backed preview why boxer-facing instead of generic recipe copy", () => {
    const detail = detailedFixture();

    const why = recipeWhy(detail);

    expect(detail.recipe).toBeTruthy();
    expect(why).toContain("Function:");
    expect(why).toContain("Why it matters:");
    expect(why).toMatch(/\bboxing\b/i);
    expect(why).not.toContain("This recipe follows the compiled workout exactly.");
  });

  it("parses common boxing-support timer formats", () => {
    expect(parseWorkoutTimerSeconds("3 x 2 min controlled tempo")).toBe(120);
    expect(parseWorkoutTimerSeconds("4 x 2:30 rounds")).toBe(150);
    expect(parseWorkoutTimerSeconds("45-60 sec easy reset")).toBe(45);
  });
});
