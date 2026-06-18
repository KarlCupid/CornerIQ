import { describe, expect, it, vi } from "vitest";

interface ResetModule {
  PRODUCTION_OVERRIDE: string;
  RESET_CONFIRMATION: string;
  USER_OWNED_TABLES: readonly string[];
  resolveResetOptions: (env: Record<string, string | undefined>, argv: readonly string[]) => unknown;
  runCornerIqDevReset: (input: {
    client: unknown;
    logger: { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
    options: {
      confirm: string;
      deleteAuthUsers: boolean;
      dryRun: boolean;
      projectRef?: string | undefined;
      productionOverride: boolean;
      supabaseUrl?: string | undefined;
    };
  }) => Promise<{ deletedAuthUserIds: readonly string[]; totalPreviewRows: number }>;
}

async function loadResetModule(): Promise<ResetModule> {
  return import("../../../scripts/dev-reset-supabase.mjs") as unknown as Promise<ResetModule>;
}

function createResetClient(input: { authUsers?: readonly { id: string; email?: string }[]; count?: number } = {}) {
  const calls: string[] = [];
  const authUsers = [...(input.authUsers ?? [])];
  const count = input.count ?? 2;
  const client = {
    from: (table: string) => ({
      select: () => ({
        not: async () => {
          calls.push(`count:${table}`);
          return { count, data: null, error: null };
        }
      }),
      delete: () => ({
        not: async () => {
          calls.push(`delete:${table}`);
          return { count, data: null, error: null };
        }
      })
    }),
    auth: {
      admin: {
        listUsers: vi.fn(async () => ({
          data: {
            users: authUsers,
            total: authUsers.length
          },
          error: null
        })),
        deleteUser: vi.fn(async (userId: string) => {
          calls.push(`auth:${userId}`);
          return { data: {}, error: null };
        })
      }
    }
  };

  return { calls, client };
}

describe("dev Supabase reset script", () => {
  it("requires explicit confirmation and refuses production without the extra override", async () => {
    const reset = await loadResetModule();

    expect(() => reset.resolveResetOptions({}, [])).toThrow(/confirmation/i);
    expect(() =>
      reset.resolveResetOptions(
        {
          CONFIRM_CORNERIQ_RESET: reset.RESET_CONFIRMATION,
          NODE_ENV: "production",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
          SUPABASE_URL: "http://127.0.0.1:54321"
        },
        []
      )
    ).toThrow(/production/i);
  });

  it("refuses public Supabase URL fallback and hosted resets without a matching project override", async () => {
    const reset = await loadResetModule();
    const baseEnv = {
      CONFIRM_CORNERIQ_RESET: reset.RESET_CONFIRMATION,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key"
    };

    expect(() =>
      reset.resolveResetOptions(
        {
          ...baseEnv,
          EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321"
        },
        []
      )
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() =>
      reset.resolveResetOptions(
        {
          ...baseEnv,
          SUPABASE_URL: "https://corneriq-prod.supabase.co"
        },
        []
      )
    ).toThrow(/hosted\/non-local/i);
    expect(() =>
      reset.resolveResetOptions(
        {
          ...baseEnv,
          CORNERIQ_PRODUCTION_RESET_OVERRIDE: reset.PRODUCTION_OVERRIDE,
          SUPABASE_PROJECT_REF: "wrong-ref",
          SUPABASE_URL: "https://corneriq-prod.supabase.co"
        },
        []
      )
    ).toThrow(/matching the Supabase URL host/i);

    expect(
      reset.resolveResetOptions(
        {
          ...baseEnv,
          CORNERIQ_PRODUCTION_RESET_OVERRIDE: reset.PRODUCTION_OVERRIDE,
          SUPABASE_PROJECT_REF: "corneriq-prod",
          SUPABASE_URL: "https://corneriq-prod.supabase.co"
        },
        []
      )
    ).toMatchObject({
      productionOverride: true,
      projectRef: "corneriq-prod",
      supabaseUrl: "https://corneriq-prod.supabase.co"
    });
  });

  it("previews app-owned rows without deleting in dry-run mode", async () => {
    const reset = await loadResetModule();
    const { calls, client } = createResetClient({ count: 3 });
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const result = await reset.runCornerIqDevReset({
      client,
      logger,
      options: {
        confirm: reset.RESET_CONFIRMATION,
        deleteAuthUsers: false,
        dryRun: true,
        productionOverride: false,
        supabaseUrl: "http://127.0.0.1:54321"
      }
    });

    expect(result.deletedAuthUserIds).toEqual([]);
    expect(result.totalPreviewRows).toBe(reset.USER_OWNED_TABLES.length * 3);
    expect(calls.every((call) => call.startsWith("count:"))).toBe(true);
  });

  it("deletes app-owned rows before optional auth users", async () => {
    const reset = await loadResetModule();
    const { calls, client } = createResetClient({ authUsers: [{ id: "auth_user_1", email: "boxer@example.test" }] });
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const result = await reset.runCornerIqDevReset({
      client,
      logger,
      options: {
        confirm: reset.RESET_CONFIRMATION,
        deleteAuthUsers: true,
        dryRun: false,
        productionOverride: false,
        supabaseUrl: "http://127.0.0.1:54321"
      }
    });

    const firstDeleteIndex = calls.findIndex((call) => call.startsWith("delete:"));
    const authDeleteIndex = calls.findIndex((call) => call === "auth:auth_user_1");
    expect(firstDeleteIndex).toBeGreaterThanOrEqual(0);
    expect(authDeleteIndex).toBeGreaterThan(firstDeleteIndex);
    expect(calls.slice(0, authDeleteIndex).some((call) => call === "delete:users_public")).toBe(true);
    expect(result.deletedAuthUserIds).toEqual(["auth_user_1"]);
  });
});
