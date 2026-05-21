import type { PerformanceState } from "../core/types";
import type { BetaRuntimeConfig } from "../../services/config/betaRuntimeConfig";

export type BetaHealthStatus = "ready" | "warning" | "blocked";

export interface BetaHealthCheck {
  key:
    | "public_supabase_config"
    | "auth_session"
    | "profile_complete"
    | "engine_state"
    | "safety_review_visibility"
    | "feedback_available"
    | "export_delete_available"
    | "cycle_privacy_visible"
    | "no_wearable_required";
  label: string;
  nextAction: string | null;
  status: BetaHealthStatus;
  summary: string;
}

export interface BetaHealthViewModel {
  betaTesterCopy: string;
  checks: readonly BetaHealthCheck[];
  nextSafeAction: string | null;
  overallStatus: BetaHealthStatus;
  supportCopy: string;
  title: string;
  warnings: readonly string[];
}

export interface BuildBetaHealthViewModelInput {
  exportDeleteAvailable: boolean;
  feedbackAvailable: boolean;
  isSignedIn: boolean;
  performanceState: PerformanceState | null;
  profileComplete: boolean;
  runtimeConfig: BetaRuntimeConfig;
}

function check(input: BetaHealthCheck): BetaHealthCheck {
  return input;
}

function statusRank(status: BetaHealthStatus): number {
  if (status === "blocked") {
    return 2;
  }
  if (status === "warning") {
    return 1;
  }
  return 0;
}

function overallStatus(checks: readonly BetaHealthCheck[]): BetaHealthStatus {
  return checks.reduce<BetaHealthStatus>((current, item) => (statusRank(item.status) > statusRank(current) ? item.status : current), "ready");
}

function cyclePrivacyVisible(state: PerformanceState | null): boolean {
  if (!state) {
    return false;
  }
  const profileNotes = state.viewModels.profile.privacyNotes.join(" ").toLowerCase();
  const cycleReminder = state.viewModels.cycle?.privacyReminder.toLowerCase() ?? "";
  return (profileNotes.includes("cycle") && profileNotes.includes("private")) || cycleReminder.includes("private");
}

function noWearableRequiredSummary(state: PerformanceState | null): string {
  if (!state) {
    return "Engine state has not confirmed manual logging yet.";
  }
  if (state.wearable.hasWearable) {
    return "Wearables may raise confidence when fresh, but manual logs still work.";
  }
  return "Manual-only mode is supported; no wearable is required.";
}

function runtimeConfigReady(config: BetaRuntimeConfig): boolean {
  return config.hasSupabaseUrl && config.hasAnonKey && config.isPublicAnonKeyOnly;
}

function runtimeConfigSummary(config: BetaRuntimeConfig): string {
  if (config.missingVariableNames.length > 0) {
    return `Missing ${config.missingVariableNames.join(", ")}. Runtime values are hidden.`;
  }
  if (!config.isPublicAnonKeyOnly) {
    return config.noServiceRoleInClientWarning ?? "Public Supabase runtime config is not beta-ready.";
  }
  return "Public Supabase URL and anon key names are present; values are hidden.";
}

function runtimeConfigNextAction(config: BetaRuntimeConfig): string | null {
  if (config.missingVariableNames.length > 0) {
    return `Set ${config.missingVariableNames.join(", ")} before beta release-candidate testing.`;
  }
  if (!config.isPublicAnonKeyOnly) {
    return "Replace runtime config with the public Supabase anon key only before beta testing.";
  }
  return null;
}

export function buildBetaHealthViewModel(input: BuildBetaHealthViewModelInput): BetaHealthViewModel {
  const engineReady = input.performanceState !== null;
  const safetyReviewVisible = engineReady;
  const cyclePrivacy = cyclePrivacyVisible(input.performanceState);
  const publicRuntimeReady = runtimeConfigReady(input.runtimeConfig);
  const checks: readonly BetaHealthCheck[] = [
    check({
      key: "public_supabase_config",
      label: "Public Supabase config",
      nextAction: runtimeConfigNextAction(input.runtimeConfig),
      status: publicRuntimeReady ? "ready" : "blocked",
      summary: runtimeConfigSummary(input.runtimeConfig)
    }),
    check({
      key: "auth_session",
      label: "Auth session",
      nextAction: input.isSignedIn && publicRuntimeReady ? null : "Sign in with the public Supabase client before beta testing.",
      status: input.isSignedIn && publicRuntimeReady ? "ready" : "blocked",
      summary: input.isSignedIn && publicRuntimeReady ? "Signed in with public client configuration." : "A signed-in beta session is required."
    }),
    check({
      key: "profile_complete",
      label: "Profile complete",
      nextAction: input.profileComplete ? null : "Finish boxer setup before using beta training or fuel decisions.",
      status: input.profileComplete ? "ready" : "warning",
      summary: input.profileComplete ? "Boxer profile is available for engine decisions." : "Boxer setup is incomplete."
    }),
    check({
      key: "engine_state",
      label: "Engine state ready",
      nextAction: engineReady ? null : "Retry loading the engine state before relying on Today, Fuel, Train, or Plan.",
      status: engineReady ? "ready" : "blocked",
      summary: engineReady ? "Engine view models are loaded." : "Engine view models are not loaded."
    }),
    check({
      key: "safety_review_visibility",
      label: "Safety review visibility",
      nextAction: safetyReviewVisible ? null : "Open Fuel after engine state loads to confirm safety review visibility.",
      status: safetyReviewVisible ? "ready" : "warning",
      summary: safetyReviewVisible ? "Fuel safety review status is visible when the engine requires it." : "Safety review visibility is not confirmed yet."
    }),
    check({
      key: "feedback_available",
      label: "Feedback available",
      nextAction: input.feedbackAvailable ? null : "Return after feedback persistence is available.",
      status: input.feedbackAvailable ? "ready" : "warning",
      summary: input.feedbackAvailable ? "Profile Audit can submit and show user-owned beta feedback." : "Feedback submission is not available in this session."
    }),
    check({
      key: "export_delete_available",
      label: "Export/delete available",
      nextAction: input.exportDeleteAvailable ? null : "Return after data controls are available.",
      status: input.exportDeleteAvailable ? "ready" : "warning",
      summary: input.exportDeleteAvailable ? "Profile Data has export preview and DELETE-gated deletion." : "Data controls are not available in this session."
    }),
    check({
      key: "cycle_privacy_visible",
      label: "Cycle privacy visible",
      nextAction: cyclePrivacy ? null : "Keep cycle tracking copy visible and optional before beta release.",
      status: cyclePrivacy ? "ready" : "warning",
      summary: cyclePrivacy ? "Cycle support is optional, private, and symptom-aware in visible copy." : "Cycle privacy copy is not confirmed in the current view model."
    }),
    check({
      key: "no_wearable_required",
      label: "No wearable required",
      nextAction: engineReady ? null : "Confirm manual logging once engine state loads.",
      status: engineReady ? "ready" : "warning",
      summary: noWearableRequiredSummary(input.performanceState)
    })
  ];
  const status = overallStatus(checks);
  const warnings = checks.filter((item) => item.status !== "ready").map((item) => `${item.label}: ${item.summary}`);
  const nextSafeAction = checks.find((item) => item.status !== "ready")?.nextAction ?? null;

  return {
    betaTesterCopy:
      status === "ready"
        ? "This beta session is ready for structured boxer testing."
        : "This beta session needs attention before it should be treated as ready.",
    checks,
    nextSafeAction,
    overallStatus: status,
    supportCopy: "Use Profile Audit feedback for bugs or confusing moments. This is not emergency support; urgent safety concerns need qualified help outside the app.",
    title: "Beta health preflight",
    warnings
  };
}
