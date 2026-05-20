import type { ExerciseHistoryViewModel, ExerciseResultRecord } from "../core/types";

function resultDate(result: ExerciseResultRecord): string {
  return (result.completedAt ?? result.recordedAt).slice(0, 10);
}

function latestStrengthSummary(results: readonly ExerciseResultRecord[]): string | null {
  const latest = [...results]
    .filter((result) => {
      const category = typeof result.prescribed.category === "string" ? result.prescribed.category : "";
      return (result.resultStatus === "completed" || result.resultStatus === "partial") && (category.includes("strength") || result.section.toLowerCase().includes("strength"));
    })
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .at(-1);
  if (!latest) {
    return null;
  }
  const load = latest.loadText?.trim();
  const loadNote = load ? `${load}; notes only, no numeric load progression inferred` : "no load text logged; no numeric load progression inferred";
  return `${latest.exerciseName}: ${latest.resultStatus}, ${loadNote}`;
}

function mostRepeatedExercise(results: readonly ExerciseResultRecord[]): string | null {
  const counts = new Map<string, number>();
  for (const result of results.filter((item) => item.resultStatus !== "prescribed_only")) {
    counts.set(result.exerciseName, (counts.get(result.exerciseName) ?? 0) + 1);
  }
  const [name, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
  return name && count ? `${name} (${count} completed or partial result row(s))` : null;
}

export function buildExerciseHistoryViewModel(results: readonly ExerciseResultRecord[]): ExerciseHistoryViewModel {
  const recent = [...results].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)).slice(0, 6);
  const completed = results.filter((result) => result.resultStatus === "completed");
  const partial = results.filter((result) => result.resultStatus === "partial");
  const prescribedOnly = results.filter((result) => result.resultStatus === "prescribed_only");
  const skipped = results.filter((result) => result.resultStatus === "skipped");
  const painFlagsByExercise = [...new Set(results.filter((result) => result.painFlag).map((result) => result.exerciseName))];
  const rpes = recent
    .filter((result) => result.resultStatus === "completed" || result.resultStatus === "partial")
    .map((result) => (result.rpe === undefined ? null : `${result.exerciseName}: RPE ${result.rpe}`))
    .filter((value): value is string => value !== null);

  return {
    title: "Exercise history",
    recentExerciseResults: recent.map((result) => {
      const load = result.loadText?.trim() ? `, load note: ${result.loadText.trim()}` : "";
      const rpe = result.rpe === undefined ? "" : `, RPE ${result.rpe}`;
      const pain = result.painFlag ? ", pain flagged" : "";
      return `${resultDate(result)}: ${result.exerciseName} ${result.resultStatus}${rpe}${load}${pain}`;
    }),
    statusCounts: {
      completed: completed.length,
      partial: partial.length,
      prescribedOnly: prescribedOnly.length,
      skipped: skipped.length
    },
    painFlagsByExercise,
    recentRpeValues: rpes,
    latestStrengthExerciseSummary: latestStrengthSummary(results),
    loadProgressionNote: "Free-text load is not used for numeric progression yet. Pain flags stop automatic progression.",
    mostRepeatedExercise: mostRepeatedExercise(results)
  };
}
