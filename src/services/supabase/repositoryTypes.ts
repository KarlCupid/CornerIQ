import type { ZodType } from "zod";
import type { Json, Database } from "./database.types";

export type TableName = keyof Database["public"]["Tables"];
export type TableRow<TTable extends TableName> = Database["public"]["Tables"][TTable]["Row"];
export type TableInsert<TTable extends TableName> = Database["public"]["Tables"][TTable]["Insert"];
export type TableUpdate<TTable extends TableName> = Database["public"]["Tables"][TTable]["Update"];

export interface RepositoryWriteResult {
  id: string;
}

export type RepositoryErrorKind = "missing_user_id" | "remote_error" | "malformed_payload" | "missing_required_data";

export class RepositoryError extends Error {
  readonly kind: RepositoryErrorKind;
  readonly context: string;

  constructor(kind: RepositoryErrorKind, context: string, message: string) {
    super(`${context}: ${message}`);
    this.name = "RepositoryError";
    this.kind = kind;
    this.context = context;
  }
}

type RemoteError = {
  message: string;
  code?: string;
  details?: string;
};

type RemoteResponse<TData> = {
  data: TData | null;
  error: RemoteError | null;
};

export function assertUserId(userId: string | undefined, context: string): string {
  if (!userId) {
    throw new RepositoryError("missing_user_id", context, "userId is required before any Supabase call");
  }
  return userId;
}

export function readDataOrThrow<TData>(response: RemoteResponse<TData>, context: string): TData {
  if (response.error) {
    throw new RepositoryError("remote_error", context, response.error.message);
  }
  if (response.data === null) {
    throw new RepositoryError("missing_required_data", context, "Supabase returned no data");
  }
  return response.data;
}

export function readMaybeDataOrThrow<TData>(response: RemoteResponse<TData>, context: string): TData | null {
  if (response.error) {
    throw new RepositoryError("remote_error", context, response.error.message);
  }
  return response.data;
}

export function parseWithSchema<TValue>(schema: ZodType<TValue>, value: unknown, context: string): TValue {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new RepositoryError("malformed_payload", context, parsed.error.message);
  }
  return parsed.data;
}

export function numericValue(value: number | string, context: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new RepositoryError("malformed_payload", context, "expected a finite numeric value");
  }
  return parsed;
}

export function payloadObject(value: Json, context: string): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new RepositoryError("malformed_payload", context, "expected a JSON object payload");
}

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
