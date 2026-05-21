import React from "react";
import { StartupState } from "./StartupState";

export interface NeedsProfileStateProps {
  busy: boolean;
  onCreateDemoProfile: () => void;
}

export function NeedsProfileState({ busy, onCreateDemoProfile }: NeedsProfileStateProps) {
  return (
    <StartupState
      title="Create demo boxer profile"
      message="No athlete profile exists for this account yet. This creates a safe starter boxer profile with manual readiness, water, body mass, and one protected technical session."
      actionLabel={busy ? "Working..." : "Create demo boxer profile"}
      onAction={onCreateDemoProfile}
    />
  );
}
