import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { CycleViewModel, ProfileViewModel, RecentLogsViewModel } from "../../engine/core/types";
import type { ISODateString } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TopActionCard } from "../../design/components/TopActionCard";
import { spacing } from "../../design/theme";
import type { BetaHealthViewModel } from "../../engine/presentation/betaHealthViewModel";
import type { BetaFeedbackHook } from "../../hooks/useBetaFeedback";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { BetaFeedbackPanel } from "../components/BetaFeedbackPanel";
import { BetaHealthPanel } from "../components/BetaHealthPanel";
import { BetaTesterNoticePanel } from "../components/BetaTesterNoticePanel";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { screenStyles } from "./screenStyles";

type ProfileSection = "athlete" | "settings" | "data" | "audit";

const profileSections: readonly SectionTabItem<ProfileSection>[] = [
  { key: "athlete", label: "Athlete" },
  { key: "settings", label: "Settings" },
  { key: "data", label: "Data" },
  { key: "audit", label: "Audit" }
];

export interface ProfileScreenProps {
  asOfDate: ISODateString;
  betaFeedback?: BetaFeedbackHook | undefined;
  betaHealth: BetaHealthViewModel;
  busy: boolean;
  cycleTrackingStatus: string;
  equipmentAccess: readonly string[];
  cycleContext: CycleViewModel | null;
  onSignOut: () => Promise<void>;
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "metric" | "imperial";
  recentLogs: RecentLogsViewModel;
  userDataControls?: UserDataControlsHook | undefined;
  viewModel: ProfileViewModel;
  wearablePreference: "manual_only" | "wearable_connected" | "undecided";
  wearableStatus: string;
}

export function ProfileScreen({
  asOfDate,
  betaFeedback,
  betaHealth,
  busy,
  cycleTrackingStatus,
  equipmentAccess,
  cycleContext,
  onSignOut,
  onUpdateSettings,
  preferredUnits,
  recentLogs,
  userDataControls,
  viewModel,
  wearablePreference,
  wearableStatus
}: ProfileScreenProps) {
  const [fallbackDeleteConfirmation, setFallbackDeleteConfirmation] = React.useState("");
  const deleteConfirmation = userDataControls?.deleteConfirmation ?? fallbackDeleteConfirmation;
  const setDeleteConfirmation = userDataControls?.setDeleteConfirmation ?? setFallbackDeleteConfirmation;
  const [section, setSection] = React.useState<ProfileSection>("athlete");
  return (
    <LuminousScreen testID="profile-screen">
      <ScreenHeader eyebrow="Private" title={viewModel.title} />
      <TopActionCard
        accent="blue"
        optional={viewModel.topAction.optional}
        primaryAction={viewModel.topAction.primaryAction}
        purpose={viewModel.topAction.purpose}
        testID="profile-top-action-card"
        title={viewModel.topAction.title}
        why={viewModel.topAction.why}
      />
      <SectionTabs items={profileSections} value={section} onChange={setSection} />
      {section === "athlete" ? (
        <View style={{ gap: spacing.lg }} testID="profile-athlete-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Athlete</Text>
              <Text style={screenStyles.body}>{viewModel.summary}</Text>
              <Text style={screenStyles.body}>Wearable: {wearableStatus}</Text>
              <Text style={screenStyles.body}>Cycle tracking: {cycleTrackingStatus}</Text>
            </View>
          </EngineCard>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Privacy</Text>
              {viewModel.privacyNotes.map((note, index) => <Text key={`profile-privacy:${index}`} style={screenStyles.body}>{note}</Text>)}
              <Text style={screenStyles.subtle}>Cycle data is optional, private, and used only to adjust confidence and symptom-aware context.</Text>
            </View>
          </EngineCard>
          <CycleContextCard cycleContext={cycleContext} minimal trackingStatus={cycleTrackingStatus} />
        </View>
      ) : null}
      {section === "settings" ? (
        <View style={{ gap: spacing.lg }} testID="profile-settings-section">
          <ProfileSettingsScreen
            asOfDate={asOfDate}
            busy={busy}
            cycleTrackingPreference={cycleTrackingStatus === "enabled" || cycleTrackingStatus === "disabled" ? cycleTrackingStatus : "undecided"}
            equipmentAccess={equipmentAccess}
            onUpdateSettings={onUpdateSettings}
            preferredUnits={preferredUnits}
            wearablePreference={wearablePreference}
          />
          <Pressable accessibilityLabel="Sign out" accessibilityRole="button" onPress={onSignOut} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Sign out</Text>
          </Pressable>
        </View>
      ) : null}
      {section === "data" ? (
        <View style={{ gap: spacing.lg }} testID="profile-data-section">
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Data controls</Text>
              <Text style={screenStyles.body}>Export preview groups user-owned app data before deletion. Delete requires the exact word DELETE.</Text>
              <Text style={screenStyles.subtle}>This does not delete your Supabase auth account.</Text>
              <Pressable accessibilityLabel="Preview export" accessibilityRole="button" accessibilityState={{ disabled: busy || userDataControls?.busy }} disabled={busy || userDataControls?.busy} onPress={() => void userDataControls?.previewExport()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Preview export</Text>
              </Pressable>
              {userDataControls?.previewRows.map((row, index) => <Text key={`profile-preview-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
              {userDataControls?.message ? <Text style={screenStyles.subtle}>{userDataControls.message}</Text> : null}
              <TextInput accessibilityLabel="Delete confirmation" onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" style={screenStyles.input} value={deleteConfirmation} />
              <Pressable accessibilityLabel="Delete app data" accessibilityRole="button" accessibilityState={{ disabled: deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy }} disabled={deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy} onPress={() => void userDataControls?.deleteData()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Delete app data</Text>
              </Pressable>
              <Text style={screenStyles.subtle}>Account deletion requires a server-side function later; this only removes user-owned app data.</Text>
            </View>
          </EngineCard>
        </View>
      ) : null}
      {section === "audit" ? (
        <View style={{ gap: spacing.lg }} testID="profile-audit-section">
          <BetaTesterNoticePanel />
          <BetaHealthPanel viewModel={betaHealth} />
          <BetaFeedbackPanel
            busy={busy || betaFeedback?.busy}
            defaultScreen="profile"
            onRefreshReports={betaFeedback?.loadRecentFeedbackReports}
            onSubmit={betaFeedback?.submitFeedback}
            recentReports={betaFeedback?.recentReports}
            statusMessage={betaFeedback?.message}
          />
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Training audit</Text>
              <Text style={screenStyles.body}>Current block week {viewModel.trainingAuditSummary.currentWeekIndex}</Text>
              <Text style={screenStyles.body}>Persisted week summaries: {viewModel.trainingAuditSummary.activeBlockHistoryCount}</Text>
              {viewModel.trainingAuditSummary.latestEventSummary ? (
                <Text style={screenStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text>
              ) : (
                <Text style={screenStyles.subtle}>No block timeline event has been persisted yet.</Text>
              )}
            </View>
          </EngineCard>
          <EngineCard>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.sectionTitle}>Fuel review audit</Text>
              <Text style={screenStyles.body}>Nutrition review history is available in Fuel &gt; Reviews when active or recently persisted.</Text>
              <Text style={screenStyles.subtle}>Reviewer-clear workflow is not exposed in the client. Athletes cannot self-clear nutrition hard stops.</Text>
            </View>
          </EngineCard>
          {recentLogs.profile.length > 0 ? (
            <EngineCard>
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.sectionTitle}>Journey history</Text>
                {recentLogs.profile.map((item, index) => <Text key={`profile-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)}
              </View>
            </EngineCard>
          ) : (
            <EmptyState title="No audit events yet" message="Onboarding, logs, or engine-owned persistence events are missing from the journey history. This matters for traceability, not safety clearance. Keep using manual logs; events appear after real saves." />
          )}
        </View>
      ) : null}
    </LuminousScreen>
  );
}
