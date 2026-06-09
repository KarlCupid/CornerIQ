import type { DetailedTrainingSession, WorkoutRecipe } from "../core/types";
import { plainTrainingCopy, plainWorkoutTitle } from "./trainingCopy";

function lowerFirst(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

function compactStepTitle(title: string): string {
  return lowerFirst(title.replace(/^(Round|Movement|Set|Segment|Interval)\s+\d+:\s*/i, "").replace(/^(Rest)\s+\d+:\s*/i, "$1 ").replace(/\s+/g, " ").trim());
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
  const recipe = session.recipe;
  if (recipe?.previewFlow?.length) {
    return recipe.previewFlow.map((line, index) => `${index + 1}. ${plainTrainingCopy(line)}`);
  }
  if (recipe) {
    return recipe.blocks.map((block, index) => {
      const stepTitles = block.steps.slice(0, 5).map((step) => compactStepTitle(step.title)).join(", ");
      return `${index + 1}. ${block.title}${stepTitles ? ` - ${stepTitles}` : ""}`;
    });
  }
  return session.walkthrough.steps.map((step, index) => {
    const itemTitles = step.items.slice(0, 4).map((item) => plainWorkoutTitle(item.title)).join(", ");
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
