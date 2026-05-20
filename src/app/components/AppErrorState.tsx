import React from "react";
import { StartupState } from "./StartupState";

export interface AppErrorStateProps {
  cause?: string | undefined;
  message: string;
  onRetry: () => void;
}

export function AppErrorState({ cause, message, onRetry }: AppErrorStateProps) {
  return <StartupState title="CornerIQ needs a retry" message={cause ? `${message} ${cause}` : message} actionLabel="Retry" onAction={onRetry} />;
}
