export const LOCAL_E2E_MODE_ENV = "EXPO_PUBLIC_CORNERIQ_E2E_LOCAL";

type RuntimeEnv = Record<string, string | undefined>;

function readRuntimeEnv(): RuntimeEnv {
  const runtime = globalThis as { process?: { env?: RuntimeEnv } };
  return runtime.process?.env ?? {};
}

export function isLocalE2EMode(env: RuntimeEnv = readRuntimeEnv()): boolean {
  return env[LOCAL_E2E_MODE_ENV] === "1" && isNonProductionRuntime(env);
}

export function isNonProductionRuntime(env: RuntimeEnv = readRuntimeEnv()): boolean {
  const runtime = globalThis as { __DEV__?: boolean };
  if (runtime.__DEV__ === true) {
    return true;
  }
  if (env.NODE_ENV === "production" || env.EXPO_PUBLIC_CORNERIQ_PRODUCTION === "1") {
    return false;
  }
  return true;
}
