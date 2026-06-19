import type { PersistedTrainingNextWeekPreview } from "../supabase/trainingNextWeekPreviewRepository";

function occurredBy(recordedAt: string | null, cutoff: string): boolean {
  return recordedAt !== null && recordedAt <= cutoff;
}

function lifecycleRecordedAt(
  preview: PersistedTrainingNextWeekPreview,
  explicitAt: string | null,
  lifecycleStatuses: readonly PersistedTrainingNextWeekPreview["status"][]
): string | null {
  if (explicitAt) {
    return explicitAt;
  }
  return lifecycleStatuses.includes(preview.status) ? preview.updatedAt : null;
}

export function replayTrainingNextWeekPreview(
  preview: PersistedTrainingNextWeekPreview,
  generatedAt?: string | undefined
): PersistedTrainingNextWeekPreview | null {
  if (generatedAt === undefined) {
    return preview;
  }
  if (preview.createdAt > generatedAt) {
    return null;
  }

  const acceptedRecordedAt = lifecycleRecordedAt(preview, preview.acceptedAt, ["accepted", "materialized", "superseded"]);
  const materializedRecordedAt = lifecycleRecordedAt(preview, preview.materializedAt, ["materialized", "superseded"]);
  const supersededRecordedAt = lifecycleRecordedAt(preview, preview.supersededAt, ["superseded"]);

  const acceptedVisible = occurredBy(acceptedRecordedAt, generatedAt);
  const materializedVisible = occurredBy(materializedRecordedAt, generatedAt);
  const supersededVisible = occurredBy(supersededRecordedAt, generatedAt);

  if (preview.status === "rejected") {
    return preview.updatedAt <= generatedAt ? preview : { ...preview, status: "preview" };
  }

  return {
    ...preview,
    status: supersededVisible ? "superseded" : materializedVisible ? "materialized" : acceptedVisible ? "accepted" : "preview",
    acceptedAt: acceptedVisible ? preview.acceptedAt : null,
    materializedAt: materializedVisible ? preview.materializedAt : null,
    supersededAt: supersededVisible ? preview.supersededAt : null
  };
}

export function replayTrainingNextWeekPreviews(
  previews: readonly PersistedTrainingNextWeekPreview[],
  generatedAt?: string | undefined
): readonly PersistedTrainingNextWeekPreview[] {
  return previews.flatMap((preview) => {
    const replayed = replayTrainingNextWeekPreview(preview, generatedAt);
    return replayed ? [replayed] : [];
  });
}
