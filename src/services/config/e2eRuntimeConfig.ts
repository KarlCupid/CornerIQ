export const LOCAL_E2E_MODE_ENV = "EXPO_PUBLIC_CORNERIQ_E2E_LOCAL";

type RuntimeEnv = Record<string, string | undefined>;

function readRuntimeEnv(): RuntimeEnv {
  const runtime = globalThis as { process?: { env?: RuntimeEnv } };
  return runtime.process?.env ?? {};
}

export function isLocalE2EMode(env: RuntimeEnv = readRuntimeEnv()): boolean {
  return env[LOCAL_E2E_MODE_ENV] === "1";
}
