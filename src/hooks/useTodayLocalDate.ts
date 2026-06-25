import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { ISODateString } from "../engine/core/types";

export interface TodayLocalDateAppStateLike {
  addEventListener?: ((type: "change", listener: (state: string) => void) => { remove?: (() => void) | undefined }) | undefined;
}

export interface UseTodayLocalDateInput {
  appState?: TodayLocalDateAppStateLike | undefined;
  enabled?: boolean | undefined;
}

export function todayLocalISODate(now = new Date()): ISODateString {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function millisecondsUntilNextLocalDate(now = new Date()): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1, nextMidnight.getTime() - now.getTime() + 1);
}

function timersAvailable(): boolean {
  return typeof globalThis.setTimeout === "function" && typeof globalThis.clearTimeout === "function";
}

function defaultAppState(): TodayLocalDateAppStateLike | undefined {
  try {
    return AppState as TodayLocalDateAppStateLike | undefined;
  } catch {
    return undefined;
  }
}

export function useTodayLocalDate(input: UseTodayLocalDateInput = {}): ISODateString {
  const enabled = input.enabled ?? true;
  const appState = input.appState ?? defaultAppState();
  const [date, setDate] = useState<ISODateString>(() => todayLocalISODate());

  const refreshDate = useCallback(() => {
    if (!enabled) {
      return;
    }
    const nextDate = todayLocalISODate();
    setDate((current) => (current === nextDate ? current : nextDate));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !timersAvailable()) {
      return undefined;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const scheduleNextRollover = () => {
      timeout = setTimeout(() => {
        if (cancelled) {
          return;
        }
        refreshDate();
        scheduleNextRollover();
      }, millisecondsUntilNextLocalDate());
    };

    refreshDate();
    scheduleNextRollover();

    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [enabled, refreshDate]);

  useEffect(() => {
    if (!enabled || !appState?.addEventListener) {
      return undefined;
    }
    const subscription = appState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshDate();
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [appState, enabled, refreshDate]);

  return date;
}
