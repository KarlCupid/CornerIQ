import type { DetailedTrainingSession, WorkoutBlockAccent, WorkoutRecipe } from "../core/types";
import { plainSectionIntent, plainSectionName, plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

export interface WorkoutGuidanceItem {
  body: string;
  detail?: string | undefined;
  label: string;
  tone: WorkoutBlockAccent | "muted";
}

export interface WorkoutPlanSummaryBlock {
  detail: string;
  durationLabel: string;
  label: string;
  steps: readonly string[];
  title: string;
  tone: WorkoutBlockAccent | "muted";
}

const STOP_DETAIL = "Pain notes keep future training conservative.";
type WorkoutSection = DetailedTrainingSession["sections"][number];

function firstSentence(value: string | undefined): string {
  const copy = plainTrainingCopy(value ?? "").trim();
  const match = copy.match(/^.+?[.!?](?:\s|$)/);
  return (match?.[0] ?? copy).trim();
}

function nonEmpty(value: string | undefined): string | undefined {
  const copy = firstSentence(value);
  return copy.length > 0 ? copy : undefined;
}

function ensureSentence(value: string): string {
  const copy = plainTrainingCopy(value).trim();
  if (!copy) {
    return "";
  }
  return /[.!?]$/.test(copy) ? copy : `${copy}.`;
}

function sentenceFragment(value: string): string {
  return plainTrainingCopy(value).trim().replace(/[.!?]+$/g, "");
}

function technicalFocus(session: DetailedTrainingSession): string {
  return sentenceFragment(session.boxingSkillTheme ?? session.technicalEmphasis?.[0] ?? "").toLowerCase();
}

function familyFunction(session: DetailedTrainingSession): string {
  const focus = technicalFocus(session);
  const skill = focus || "the main boxing skill";
  if (session.family.startsWith("boxing_")) {
    return `Rehearse ${skill} in controlled boxing-length rounds so stance, guard, feet, and reset stay repeatable before effort rises.`;
  }
  if (session.family === "agility_reactive_footwork" || session.family === "footwork_agility" || session.family === "reaction_rhythm") {
    return "Practice braking, rhythm, angles, and stance resets so footwork stays clean when boxing pace changes.";
  }
  if (session.family.startsWith("strength_")) {
    return "Build controlled support strength for stance, trunk, and guard positions while leaving boxing practice available.";
  }
  if (session.family.startsWith("power_")) {
    return "Train fast, low-fatigue reps that support first step, punch snap, and stance recovery without turning the day into conditioning.";
  }
  if (session.family.startsWith("roadwork") || session.family === "round_based_conditioning" || session.family === "alactic_sprints") {
    return "Build repeatable breathing and round-to-round recovery while keeping posture and movement controlled.";
  }
  if (session.family.includes("durability")) {
    return "Strengthen the support positions behind guard, punching volume, pivots, and posture without chasing load.";
  }
  if (session.family.includes("mobility") || session.family === "mobility_recovery_flow" || session.family === "recovery_reset") {
    return "Restore boxing positions, breathing, and joint comfort so the next boxing session starts cleaner.";
  }
  if (session.family === "movement_quality_prep") {
    return "Check readiness and organize hips, shoulders, stance, and guard before harder boxing work.";
  }
  if (session.family === "taper_maintenance") {
    return "Keep timing and speed awake while volume stays low enough to protect fight-week freshness.";
  }
  return "Support the next boxing session with controlled work that has a clear quality cap.";
}

function familyImportance(session: DetailedTrainingSession): string {
  if (session.family.startsWith("boxing_")) {
    return "The value is making the skill repeatable under round structure, not adding random extra volume.";
  }
  if (session.family === "agility_reactive_footwork" || session.family === "footwork_agility" || session.family === "reaction_rhythm") {
    return "The value is cleaner entries, exits, and resets when the feet have to answer quickly.";
  }
  if (session.family.startsWith("strength_")) {
    return "The value is a stronger, cleaner position that carries back to stance and punching, not more fatigue.";
  }
  if (session.family.startsWith("power_")) {
    return "The value is speed you can repeat while still recovering for boxing skill work.";
  }
  if (session.family.startsWith("roadwork") || session.family === "round_based_conditioning" || session.family === "alactic_sprints") {
    return "The value is better recovery between rounds without letting conditioning work make movement sloppy.";
  }
  if (session.family.includes("durability")) {
    return "The value is keeping common boxing support areas ready without pretending pain or missing history is safe.";
  }
  if (session.family.includes("mobility") || session.family === "mobility_recovery_flow" || session.family === "recovery_reset") {
    return "The value is leaving joints, breathing, and symptoms better for the next boxing session.";
  }
  if (session.family === "movement_quality_prep") {
    return "The value is finding readiness problems early and making the first real boxing work cleaner.";
  }
  if (session.family === "taper_maintenance") {
    return "The value is staying sharp without adding fatigue that competes with the bout.";
  }
  return "The value is useful boxing support without treating missing data as permission to push harder.";
}

function isGenericRecipeWhy(value: string): boolean {
  return /\b(?:this recipe follows the compiled workout exactly|follow this block as written|do not add extra work)\b/i.test(value);
}

function whyImportance(session: DetailedTrainingSession): string {
  const raw = plainTrainingCopy(session.recipe?.why ?? session.whyThisMattersForBoxing);
  const base = firstSentence(raw);
  const familyLine = familyImportance(session);
  if (!base || isGenericRecipeWhy(base)) {
    return familyLine;
  }
  return `${ensureSentence(base)} ${familyLine}`;
}

function qualityCheck(session: DetailedTrainingSession): string {
  return (
    nonEmpty(session.sessionQualityCheckpoints?.[0]) ??
    nonEmpty(session.athleteQualityCues?.[0]) ??
    nonEmpty(session.selfCheckCues?.[0]) ??
    nonEmpty(session.stopConditions[0]) ??
    "Keep the main cue clean; if it breaks twice, make the next block easier."
  );
}

function shouldPreviewGuidedSteps(section: WorkoutSection): boolean {
  const searchable = `${section.name} ${section.intent}`.toLowerCase();
  return Boolean(section.guidedSteps?.length && /\b(warm|prep)\b/.test(searchable));
}

function sectionPreviewSteps(section: WorkoutSection, limit: number): readonly string[] {
  if (shouldPreviewGuidedSteps(section)) {
    return (section.guidedSteps ?? [])
      .filter((step) => step.kind !== "rest" && step.kind !== "checkpoint")
      .slice(0, limit)
      .map((step) => plainWorkoutTitle(step.title));
  }
  return section.exercises.slice(0, limit).map((exercise) => plainWorkoutTitle(exercise.name));
}

function uniqueGuidance(items: readonly WorkoutGuidanceItem[], limit: number): readonly WorkoutGuidanceItem[] {
  const seen = new Set<string>();
  const output: WorkoutGuidanceItem[] = [];
  for (const item of items) {
    const key = `${item.label}:${item.body}`.toLowerCase();
    if (!item.body.trim() || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

export function recipeTitle(session: DetailedTrainingSession): string {
  return plainWorkoutTitle(session.recipe?.title ?? session.title, session.family);
}

export function recipeWhy(session: DetailedTrainingSession): string {
  return [
    `Function: ${familyFunction(session)}`,
    `Why it matters: ${whyImportance(session)}`,
    `Quality check: ${qualityCheck(session)}`
  ].join(" ");
}

export function recipeEquipmentLabel(recipe: WorkoutRecipe | undefined): string {
  if (!recipe) {
    return "equipment varies";
  }
  return recipe.equipment.length === 0 ? "no equipment" : recipe.equipment.join(", ");
}

export function recipeFlowLines(session: DetailedTrainingSession): readonly string[] {
  return session.walkthrough.steps.map((step, index) => {
    const section = session.sections[index];
    const itemTitles = (section ? sectionPreviewSteps(section, 4) : step.items.slice(0, 4).map((item) => plainWorkoutTitle(item.title))).join(", ");
    return `${index + 1}. ${step.title}${itemTitles ? ` - ${itemTitles}` : ""}`;
  });
}

export function recipeQuickLogContext(session: DetailedTrainingSession): { whatToDo: string; mainJob: string; logPrompt: string } {
  if (session.recipe?.quickLog) {
    return {
      whatToDo: plainTrainingCopy(session.recipe.quickLog.whatToDo),
      mainJob: plainTrainingCopy(session.recipe.quickLog.mainJob),
      logPrompt: plainTrainingCopy(session.recipe.quickLog.logPrompt)
    };
  }
  return {
    whatToDo: recipeFlowLines(session).map((line) => line.replace(/^\d+\.\s*/, "")).join("; "),
    mainJob: plainTrainingCopy(
      session.walkthrough.roundPlan?.instructions[0] ??
        session.sessionQualityCheckpoints?.[0] ??
        session.walkthrough.steps.find((step) => step.items.length > 0)?.items[0]?.cue ??
        session.whyThisMattersForBoxing
    ),
    logPrompt: "Session RPE - pain notes - completed / partial / skipped"
  };
}

export function recipePlanSummaryBlocks(session: DetailedTrainingSession): readonly WorkoutPlanSummaryBlock[] {
  return session.sections.map((section, index) => ({
    detail: firstSentence(plainSectionIntent(section.intent)),
    durationLabel: section.durationMinutes > 0 ? `${section.durationMinutes} min` : `${section.exercises.length} move${section.exercises.length === 1 ? "" : "s"}`,
    label: String(index + 1).padStart(2, "0"),
    steps: sectionPreviewSteps(section, 3),
    title: plainSectionName(section.name),
    tone: index === 0 ? "gold" : index === session.sections.length - 1 ? "green" : "blue"
  }));
}

export function recipeWhyHighlights(session: DetailedTrainingSession): readonly WorkoutGuidanceItem[] {
  return uniqueGuidance(
    [
      {
        body: firstSentence(recipeWhy(session)),
        detail: "This is the reason the session exists today.",
        label: "Aim",
        tone: "gold"
      },
      {
        body: nonEmpty(session.athleteQualityCues?.[0] ?? session.sessionQualityCheckpoints?.[0] ?? recipeQuickLogContext(session).mainJob) ?? "Keep the first clean cue repeatable before adding effort.",
        detail: "Quality beats adding extra volume.",
        label: "Quality cue",
        tone: "green"
      },
      {
        body: nonEmpty(session.selfCheckCues?.[0] ?? session.readinessGate) ?? "Build only if warm-up movement and breathing stay steady.",
        detail: "Treat missing or unclear readiness as unknown.",
        label: "Readiness check",
        tone: "blue"
      },
      {
        body: nonEmpty(session.nextSessionNote ?? session.confidenceImpact) ?? "Pain notes and high RPE make the next call more conservative.",
        detail: "The useful log is what changed, not a perfect workout diary.",
        label: "Next signal",
        tone: "purple"
      },
      {
        body: nonEmpty(session.stopConditions[0]) ?? "Stop if pain, dizziness, or unusual symptoms appear.",
        detail: STOP_DETAIL,
        label: "Stop rule",
        tone: "red"
      }
    ],
    5
  );
}

export function recipeAdjustGuidance(session: DetailedTrainingSession): readonly WorkoutGuidanceItem[] {
  const qualityFallback = session.athleteQualityCues?.[0] ?? session.sessionQualityCheckpoints?.[0] ?? recipeQuickLogContext(session).mainJob;
  return uniqueGuidance(
    [
      ...(session.downshiftIf ?? []).slice(0, 2).map((item, index) => ({
        body: firstSentence(item),
        detail: index === 0 ? "Make the next block easier before technique breaks." : "Shorten or simplify the next exposure.",
        label: index === 0 ? "Downshift trigger" : "Second trigger",
        tone: "orange" as const
      })),
      ...(session.readinessModifications ?? []).slice(0, 1).map((item) => ({
        body: firstSentence(item),
        detail: "Use this before chasing the written prescription.",
        label: "Readiness change",
        tone: "blue" as const
      })),
      ...(session.cycleModifications ?? []).slice(0, 1).map((item) => ({
        body: firstSentence(item),
        detail: "Keep cycle support private, optional, and symptom-aware.",
        label: "Cycle-aware option",
        tone: "purple" as const
      })),
      {
        body: nonEmpty(session.fuelingGate ?? session.hydrationGate) ?? "If fuel, fluids, or warm-up feel off, cap the session at controlled effort.",
        detail: "Log RPE and the missing input instead of guessing it was safe.",
        label: "Fuel or hydration",
        tone: "gold"
      },
      {
        body: nonEmpty(qualityFallback) ?? "If the main cue fails twice, turn the next round into easy technique.",
        detail: "Keep the skill clean instead of adding harder work.",
        label: "Skill quality",
        tone: "green"
      },
      {
        body: nonEmpty(session.stopConditions[0]) ?? "Stop if pain, dizziness, or unusual symptoms appear.",
        detail: STOP_DETAIL,
        label: "Stop",
        tone: "red"
      }
    ],
    5
  );
}

export function recipeQuickLogImpactRows(session: DetailedTrainingSession): readonly WorkoutGuidanceItem[] {
  const quickLog = recipeQuickLogContext(session);
  return [
    {
      body: "Session RPE sets the effort signal the engine can trust.",
      detail: "Use 1-10. A high RPE asks for review before more load.",
      label: "RPE",
      tone: "blue"
    },
    {
      body: "Pain notes and pain flags change safety confidence.",
      detail: "Location, timing, and whether it changed movement are most useful.",
      label: "Pain",
      tone: "red"
    },
    {
      body: quickLog.logPrompt,
      detail: "Sets, load, reps, quality, and skipped work improve future prescriptions when you have time.",
      label: "Actuals",
      tone: "green"
    }
  ];
}
