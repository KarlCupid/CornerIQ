export interface DeviceKeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
}

const memoryStorageState = new Map<string, string>();

let storagePromise: Promise<DeviceKeyValueStorage | null> | null = null;
let storageOverride: DeviceKeyValueStorage | null | undefined;

interface BrowserKeyValueStorage {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

function runtimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env ?? {};
}

function memoryFallbackAllowed(): boolean {
  const env = runtimeEnv();
  if (env.NODE_ENV === "production" || env.EXPO_PUBLIC_CORNERIQ_PRODUCTION === "1") {
    return false;
  }
  return env.NODE_ENV === "test" || env.VITEST === "true" || env.EXPO_PUBLIC_CORNERIQ_E2E_LOCAL === "1" || env.EXPO_OS === "web";
}

function isDeviceStorage(value: unknown): value is DeviceKeyValueStorage {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DeviceKeyValueStorage>;
  return typeof candidate.getItem === "function" && typeof candidate.setItem === "function" && typeof candidate.removeItem === "function";
}

export function createMemoryDeviceStorage(): DeviceKeyValueStorage {
  return {
    async getItem(key) {
      return memoryStorageState.get(key) ?? null;
    },
    async removeItem(key) {
      memoryStorageState.delete(key);
    },
    async setItem(key, value) {
      memoryStorageState.set(key, value);
    }
  };
}

export function setDeviceStorageOverrideForTests(storage: DeviceKeyValueStorage | null | undefined): void {
  storageOverride = storage;
  storagePromise = null;
}

function resolveBrowserStorage(): DeviceKeyValueStorage | null {
  try {
    if (!("window" in globalThis)) {
      return null;
    }
    const storage = (globalThis as { localStorage?: BrowserKeyValueStorage }).localStorage;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
      return null;
    }
    return {
      async getItem(key) {
        return storage.getItem(key);
      },
      async removeItem(key) {
        storage.removeItem(key);
      },
      async setItem(key, value) {
        storage.setItem(key, value);
      }
    };
  } catch {
    return null;
  }
}

export async function resolveDeviceStorage(): Promise<DeviceKeyValueStorage | null> {
  if (storageOverride !== undefined) {
    return storageOverride;
  }
  if (!storagePromise) {
    storagePromise = (async () => {
      try {
        const imported: unknown = await import("@react-native-async-storage/async-storage");
        const storage = imported && typeof imported === "object" && "default" in imported ? (imported as { default?: unknown }).default : imported;
        if (isDeviceStorage(storage)) {
          return storage;
        }
      } catch {
        // Native AsyncStorage is unavailable in Node/static shells.
      }
      const browserStorage = resolveBrowserStorage();
      if (browserStorage) {
        return browserStorage;
      }
      return memoryFallbackAllowed() ? createMemoryDeviceStorage() : null;
    })();
  }
  return storagePromise;
}
