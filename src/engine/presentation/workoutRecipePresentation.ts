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
  return plainTrainingCopy(session.recipe?.why ?? session.whyThisMattersForBoxing);
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
