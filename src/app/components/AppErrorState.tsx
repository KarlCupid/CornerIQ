import React from "react";
import { StartupState } from "./StartupState";
import { SUPPORT_OUTSIDE_APP_COPY, URGENT_SUPPORT_COPY } from "../supportCopy";

export interface AppErrorStateProps {
  cause?: string | undefined;
  message: string;
  onRetry: () => void;
  onSignOut?: (() => void) | undefined;
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

export function AppErrorState({ cause, message, onRetry, onSignOut }: AppErrorStateProps) {
  const detail = safeCause(cause);
  const supportCopy = `${SUPPORT_OUTSIDE_APP_COPY} ${URGENT_SUPPORT_COPY}`;
  const signOutProps = onSignOut ? { onSecondaryAction: onSignOut, secondaryActionLabel: "Sign out on this device" } : {};
  return (
    <StartupState
      title="CornerIQ needs a retry"
      message={detail ? `${message} ${detail} ${supportCopy}` : `${message} ${supportCopy}`}
      actionLabel="Retry"
      onAction={onRetry}
      {...signOutProps}
    />
  );
}
