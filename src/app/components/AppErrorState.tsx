import React from "react";
import { StartupState } from "./StartupState";

export interface AppErrorStateProps {
  cause?: string | undefined;
  message: string;
  onRetry: () => void;
}

function safeCause(cause: string | undefined): string | null {
  if (!cause) {
    return null;
  }
  if (cause.includes("\n") || cause.includes(" at ") || cause.includes("Stack")) {
    return "Details are available in the development logs.";
  }
  return `Detail: ${cause}`;
}

export function AppErrorState({ cause, message, onRetry }: AppErrorStateProps) {
  const detail = safeCause(cause);
  return <StartupState title="CornerIQ needs a retry" message={detail ? `${message} ${detail}` : message} actionLabel="Retry" onAction={onRetry} />;
}
