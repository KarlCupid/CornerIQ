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
  const loadNote = structuredActualSummary(latest) ?? (load ? "load text saved as notes only; no numeric load progression inferred" : "no structured load logged; no numeric load progression inferred");
  return `${latest.exerciseName}: ${latest.resultStatus}, ${loadNote}`;
}

function structuredActualSummary(result: ExerciseResultRecord): string | null {
  const parts = [
    result.loadValue === undefined || result.loadUnit === undefined ? null : `${result.loadValue}${result.loadUnit}`,
    result.repsCompleted === undefined ? null : `${result.repsCompleted} reps`,
    result.timeSeconds === undefined ? null : `${result.timeSeconds}s`,
    result.distanceMeters === undefined ? null : `${result.distanceMeters}m`,
    result.side === undefined ? null : result.side.replaceAll("_", " "),
    result.technicalQuality === undefined ? null : result.technicalQuality.replaceAll("_", " ")
  ].filter((item): item is string => item !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

function structuredLoadSummary(results: readonly ExerciseResultRecord[]): string {
  const structuredRows = results.filter((result) => structuredActualSummary(result) !== null);
  if (structuredRows.length === 0) {
    return "Not enough structured data for progression. Load notes remain notes and are not parsed.";
  }
  const latest = [...structuredRows].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))[0];
  return latest ? `Structured load available for ${structuredRows.length} result row(s). Latest: ${latest.exerciseName} ${structuredActualSummary(latest)}.` : "Not enough structured data for progression.";
}

function mostRepeatedExercise(results: readonly ExerciseResultRecord[]): string | null {
  const counts = new Map<string, number>();
  for (const result of results.filter((item) => item.resultStatus !== "prescribed_only")) {
    counts.set(result.exerciseName, (counts.get(result.exerciseName) ?? 0) + 1);
  }
  const [name, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
  return name && count ? `${name} (${count} completed or partial result row(s))` : null;
}

function groupedExercises(results: readonly ExerciseResultRecord[]): ExerciseHistoryViewModel["groupedExercises"] {
  const byName = new Map<string, ExerciseResultRecord[]>();
  for (const result of results) {
    byName.set(result.exerciseName, [...(byName.get(result.exerciseName) ?? []), result]);
  }
  return [...byName.entries()]
    .map(([exerciseName, exerciseResults]) => {
      const sorted = [...exerciseResults].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
      const recentRpeResult = sorted.find((result) => result.rpe !== undefined && (result.resultStatus === "completed" || result.resultStatus === "partial"));
      const latestLoad = sorted.find((result) => result.loadText?.trim());
      const latestStructured = sorted.find((result) => structuredActualSummary(result) !== null);
      return {
        exerciseName,
        completedCount: exerciseResults.filter((result) => result.resultStatus === "completed").length,
        partialCount: exerciseResults.filter((result) => result.resultStatus === "partial").length,
        prescribedOnlyCount: exerciseResults.filter((result) => result.resultStatus === "prescribed_only").length,
        painFlagCount: exerciseResults.filter((result) => result.painFlag).length,
        recentRpe: recentRpeResult?.rpe === undefined ? null : `RPE ${recentRpeResult.rpe}`,
        structuredActualSummary: latestStructured ? structuredActualSummary(latestStructured) : null,
        latestLoadTextNote: latestLoad?.loadText?.trim() ? `${latestLoad.loadText.trim()} (notes only)` : "No load text logged.",
        noNumericProgressionCopy: "No numeric progression inferred."
      };
    })
    .sort((left, right) => right.completedCount + right.partialCount - (left.completedCount + left.partialCount) || left.exerciseName.localeCompare(right.exerciseName));
}

function topPainFlaggedExercises(results: readonly ExerciseResultRecord[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const result of results.filter((item) => item.painFlag)) {
    counts.set(result.exerciseName, (counts.get(result.exerciseName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([exercise, count]) => `${exercise}: ${count} pain flag(s)`);
}

function topRepeatedExercises(results: readonly ExerciseResultRecord[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const result of results.filter((item) => item.resultStatus !== "prescribed_only")) {
    counts.set(result.exerciseName, (counts.get(result.exerciseName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([exercise, count]) => `${exercise}: ${count} completed/partial/skipped row(s)`);
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
  const structuredSummary = structuredLoadSummary(results);

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
    loadProgressionNote: "Free-text load is not used for numeric progression. Pain flags stop automatic progression.",
    structuredLoadStatus: results.some((result) => structuredActualSummary(result) !== null) ? "available" : "not_enough_data",
    structuredLoadSummary: structuredSummary,
    mostRepeatedExercise: mostRepeatedExercise(results),
    groupedExercises: groupedExercises(results),
    topPainFlaggedExercises: topPainFlaggedExercises(results),
    topRepeatedExercises: topRepeatedExercises(results)
  };
}
