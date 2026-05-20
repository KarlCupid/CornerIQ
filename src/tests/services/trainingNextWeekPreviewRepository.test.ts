import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolvePerformanceState } from "../../engine/core/performanceKernel";
import type { NextWeekTrainingMaterialization } from "../../engine/training/nextWeekMaterializationEngine";
import type { CornerSupabaseClient } from "../../services/supabase/client";
import type { TableInsert, TableRow, TableUpdate } from "../../services/supabase/repositoryTypes";
import { RepositoryError } from "../../services/supabase/repositoryTypes";
import { createTrainingNextWeekPreviewRepository } from "../../services/supabase/trainingNextWeekPreviewRepository";
import { fixtureAsOfDate, no_wearable_manual_only } from "../fixtures/engineFixtures";

type PreviewRow = TableRow<"training_next_week_previews">;
type PreviewInsert = TableInsert<"training_next_week_previews">;
type PreviewUpdate = TableUpdate<"training_next_week_previews">;
type RemoteResponse<TData> = { data: TData | null; error: null };
type Filter = { column: string; op: "eq" | "neq" | "in"; value: unknown };

function previewFixture(): NextWeekTrainingMaterialization {
  return resolvePerformanceState({ journey: no_wearable_manual_only, asOfDate: fixtureAsOfDate }).training.nextWeekMaterialization;
}

function definedPatch(patch: PreviewUpdate): Partial<PreviewRow> {
  return Object.fromEntries(Object.entries(patch).filter((entry) => entry[1] !== undefined)) as Partial<PreviewRow>;
}

function rowFromInsert(record: PreviewInsert, id: string, createdAt: string): PreviewRow {
  return {
    accepted_at: record.accepted_at ?? null,
    created_at: record.created_at ?? createdAt,
    engine_version: record.engine_version,
    generated_support_bias: record.generated_support_bias,
    id: record.id ?? id,
    input_hash: record.input_hash,
    materialized_at: record.materialized_at ?? null,
    materialized_decision: record.materialized_decision,
    materialized_phase: record.materialized_phase,
    output_hash: record.output_hash,
    preview_payload: record.preview_payload ?? {},
    status: record.status ?? "preview",
    superseded_at: record.superseded_at ?? null,
    target_hard_day_cap: record.target_hard_day_cap,
    training_block_id: record.training_block_id,
    updated_at: record.updated_at ?? createdAt,
    user_id: record.user_id,
    volume_strategy: record.volume_strategy,
    week_end_date: record.week_end_date,
    week_index: record.week_index,
    week_start_date: record.week_start_date
  };
}

class PreviewQuery {
  private readonly filters: Filter[] = [];
  private readonly orders: { column: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private insertRecord: PreviewInsert | null = null;
  private updateRecord: PreviewUpdate | null = null;

  constructor(
    private readonly rows: PreviewRow[],
    private readonly idState: { next: number }
  ) {}

  select(_columns?: string): PreviewQuery {
    return this;
  }

  eq(column: string, value: unknown): PreviewQuery {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown): PreviewQuery {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  in(column: string, value: readonly unknown[]): PreviewQuery {
    this.filters.push({ column, op: "in", value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): PreviewQuery {
    this.orders.push({ column, ascending: options.ascending ?? true });
    return this;
  }

  limit(count: number): PreviewQuery {
    this.limitCount = count;
    return this;
  }

  insert(record: PreviewInsert): PreviewQuery {
    this.insertRecord = record;
    return this;
  }

  update(record: PreviewUpdate): PreviewQuery {
    this.updateRecord = record;
    return this;
  }

  async maybeSingle(): Promise<RemoteResponse<PreviewRow>> {
    const rows = this.filteredRows();
    return { data: rows[0] ?? null, error: null };
  }

  async single(): Promise<RemoteResponse<PreviewRow>> {
    if (this.insertRecord) {
      const id = `preview_${this.idState.next}`;
      const createdAt = `2026-05-20T00:00:0${this.idState.next}.000Z`;
      this.idState.next += 1;
      const row = rowFromInsert(this.insertRecord, id, createdAt);
      this.rows.push(row);
      return { data: row, error: null };
    }
    if (this.updateRecord) {
      const row = this.filteredRows()[0] ?? null;
      if (!row) {
        return { data: null, error: null };
      }
      Object.assign(row, definedPatch(this.updateRecord), { updated_at: new Date("2026-05-20T00:00:00.000Z").toISOString() });
      return { data: row, error: null };
    }
    return this.maybeSingle();
  }

  then<TResult1 = RemoteResponse<PreviewRow[]>, TResult2 = never>(
    onfulfilled?: ((value: RemoteResponse<PreviewRow[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.resolveRows().then(onfulfilled, onrejected);
  }

  private async resolveRows(): Promise<RemoteResponse<PreviewRow[]>> {
    const rows = this.filteredRows();
    if (this.updateRecord) {
      const patch = definedPatch(this.updateRecord);
      for (const row of rows) {
        Object.assign(row, patch, { updated_at: new Date("2026-05-20T00:00:00.000Z").toISOString() });
      }
    }
    return { data: rows, error: null };
  }

  private filteredRows(): PreviewRow[] {
    const filtered = this.rows.filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column as keyof PreviewRow];
        if (filter.op === "eq") {
          return value === filter.value;
        }
        if (filter.op === "neq") {
          return value !== filter.value;
        }
        return Array.isArray(filter.value) && filter.value.includes(value);
      })
    );
    const ordered = [...filtered].sort((left, right) => {
      for (const order of this.orders) {
        const leftValue = String(left[order.column as keyof PreviewRow]);
        const rightValue = String(right[order.column as keyof PreviewRow]);
        const compared = leftValue.localeCompare(rightValue);
        if (compared !== 0) {
          return order.ascending ? compared : -compared;
        }
      }
      return 0;
    });
    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }
}

function createPreviewClient() {
  const rows: PreviewRow[] = [];
  const idState = { next: 1 };
  const from = vi.fn((table: string) => {
    if (table !== "training_next_week_previews") {
      throw new Error(`Unexpected table ${table}`);
    }
    return new PreviewQuery(rows, idState);
  });
  return {
    client: { from } as unknown as CornerSupabaseClient,
    from,
    rows
  };
}

describe("trainingNextWeekPreviewRepository", () => {
  it("upserts validated payloads idempotently by user, block, week, input hash, and output hash", async () => {
    const { client, rows } = createPreviewClient();
    const repository = createTrainingNextWeekPreviewRepository(client);
    const preview = previewFixture();

    const first = await repository.upsertTrainingNextWeekPreview({
      userId: "user_1",
      trainingBlockId: "block_1",
      preview,
      engineVersion: "test-engine",
      inputHash: "input_1",
      outputHash: "preview_output_1"
    });
    const second = await repository.upsertTrainingNextWeekPreview({
      userId: "user_1",
      trainingBlockId: "block_1",
      preview,
      engineVersion: "test-engine",
      inputHash: "input_1",
      outputHash: "preview_output_1"
    });

    expect(first.id).toBe(second.id);
    expect(rows).toHaveLength(1);
    expect(first.preview.nextWeekDayPlanPreview.length).toBeGreaterThan(0);
    expect(rows[0]?.preview_payload).toMatchObject({
      materializedDecision: preview.materializedDecision,
      materializedVolumeStrategy: preview.materializedVolumeStrategy,
      targetHardDayCap: preview.targetHardDayCap
    });
  });

  it("lists and gets previews scoped by user_id and training_block_id", async () => {
    const { client } = createPreviewClient();
    const repository = createTrainingNextWeekPreviewRepository(client);
    const preview = previewFixture();

    await repository.upsertTrainingNextWeekPreview({ userId: "user_1", trainingBlockId: "block_1", preview, engineVersion: "test", inputHash: "input_1", outputHash: "out_1" });
    await repository.upsertTrainingNextWeekPreview({ userId: "user_2", trainingBlockId: "block_1", preview, engineVersion: "test", inputHash: "input_2", outputHash: "out_2" });
    await repository.upsertTrainingNextWeekPreview({ userId: "user_1", trainingBlockId: "block_2", preview, engineVersion: "test", inputHash: "input_3", outputHash: "out_3" });

    const list = await repository.listPreviewsForBlock("user_1", "block_1");
    const latest = await repository.getLatestPreviewForBlock("user_1", "block_1");

    expect(list).toHaveLength(1);
    expect(list[0]?.userId).toBe("user_1");
    expect(list[0]?.trainingBlockId).toBe("block_1");
    expect(latest?.id).toBe(list[0]?.id);
  });

  it("accepts, materializes, and supersedes preview lifecycle states explicitly", async () => {
    const { client } = createPreviewClient();
    const repository = createTrainingNextWeekPreviewRepository(client);
    const preview = previewFixture();

    const first = await repository.upsertTrainingNextWeekPreview({ userId: "user_1", trainingBlockId: "block_1", preview, engineVersion: "test", inputHash: "input_1", outputHash: "out_1" });
    const second = await repository.upsertTrainingNextWeekPreview({ userId: "user_1", trainingBlockId: "block_1", preview, engineVersion: "test", inputHash: "input_2", outputHash: "out_2" });
    const accepted = await repository.markPreviewAccepted("user_1", first.id);
    const materialized = await repository.markPreviewMaterialized("user_1", first.id);
    const superseded = await repository.supersedePreviewsForBlock("user_1", "block_1", first.id);
    const list = await repository.listPreviewsForBlock("user_1", "block_1");

    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).toBeTruthy();
    expect(materialized.status).toBe("materialized");
    expect(materialized.materializedAt).toBeTruthy();
    expect(superseded.ids).toEqual([second.id]);
    expect(list.find((item) => item.id === first.id)?.status).toBe("materialized");
    expect(list.find((item) => item.id === second.id)?.status).toBe("superseded");
  });

  it("blocks missing userId before any Supabase call", async () => {
    const from = vi.fn();
    const client = { from } as unknown as CornerSupabaseClient;
    const repository = createTrainingNextWeekPreviewRepository(client);
    await expect(
      repository.upsertTrainingNextWeekPreview({
        userId: "",
        trainingBlockId: "block_1",
        preview: previewFixture(),
        engineVersion: "test",
        inputHash: "input",
        outputHash: "output"
      })
    ).rejects.toBeInstanceOf(RepositoryError);
    expect(from).not.toHaveBeenCalled();
  });

  it("repository avoids explicit any", () => {
    expect(readFileSync("src/services/supabase/trainingNextWeekPreviewRepository.ts", "utf8")).not.toMatch(/\bany\b/);
  });
});
