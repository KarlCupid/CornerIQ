import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { CycleViewModel, ProfileViewModel, RecentLogsViewModel } from "../../engine/core/types";
import type { ISODateString } from "../../engine/core/types";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { DashboardCard, DashboardPill } from "../../design/components/PerformanceVisuals";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TopActionCard } from "../../design/components/TopActionCard";
import { glassStyles } from "../../design/glass";
import { colors, spacing } from "../../design/theme";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { screenStyles } from "./screenStyles";

type ProfileSection = "athlete" | "settings" | "data" | "safety";

const profileSections: readonly SectionTabItem<ProfileSection>[] = [
  { key: "athlete", label: "Athlete" },
  { key: "settings", label: "Settings" },
  { key: "data", label: "Data" },
  { key: "safety", label: "Safety" }
];

function ProfileStatusTile({
  label,
  tone = "blue",
  value
}: {
  label: string;
  tone?: "blue" | "green" | "orange" | "purple" | undefined;
  value: string;
}) {
  const toneColor =
    tone === "green"
      ? colors.readyGreen
      : tone === "orange"
        ? colors.amberCaution
        : tone === "purple"
          ? colors.powerPurple
          : colors.blueIQ;
  return (
    <View
      style={{
        ...glassStyles.tile,
        flexBasis: 150,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 76,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {label}
      </Text>
      <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: 16, fontWeight: "800", lineHeight: 21 }}>
        {value}
      </Text>
    </View>
  );
}

export interface ProfileScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  cycleTrackingStatus: string;
  equipmentAccess: readonly string[];
  cycleContext: CycleViewModel | null;
  onOpenPlan?: (() => void) | undefined;
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
  busy,
  cycleTrackingStatus,
  equipmentAccess,
  cycleContext,
  onOpenPlan,
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
  const [historyDetailOpen, setHistoryDetailOpen] = React.useState(false);
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
          <DashboardCard headerRight={<DashboardPill label="Manual-first" tone="blue" />} title="Athlete profile">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{viewModel.summary}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <ProfileStatusTile label="Wearable" tone={wearableStatus === "manual only" ? "green" : "blue"} value={wearableStatus} />
                <ProfileStatusTile label="Cycle tracking" tone={cycleTrackingStatus === "enabled" ? "purple" : "orange"} value={cycleTrackingStatus} />
                <ProfileStatusTile label="Units" value={preferredUnits} />
              </View>
            </View>
          </DashboardCard>
          <DashboardCard headerRight={<DashboardPill label="Private" tone="purple" />} title="Privacy">
            <View style={{ gap: spacing.sm }}>
              {viewModel.privacyNotes.map((note, index) => <Text key={`profile-privacy:${index}`} style={screenStyles.body}>{note}</Text>)}
              <Text style={screenStyles.subtle}>Cycle data is optional, private, and used only to adjust confidence and symptom-aware context.</Text>
            </View>
          </DashboardCard>
          <CycleContextCard cycleContext={cycleContext} minimal trackingStatus={cycleTrackingStatus} />
        </View>
      ) : null}
      {section === "settings" ? (
        <View style={{ gap: spacing.lg }} testID="profile-settings-section">
          <ProfileSettingsScreen
            busy={busy}
            cycleTrackingPreference={cycleTrackingStatus === "enabled" || cycleTrackingStatus === "disabled" ? cycleTrackingStatus : "undecided"}
            equipmentAccess={equipmentAccess}
            onOpenPlan={onOpenPlan}
            onUpdateSettings={onUpdateSettings}
            preferredUnits={preferredUnits}
            wearablePreference={wearablePreference}
          />
          <DashboardCard title="Session">
            <Text style={screenStyles.body}>Sign out of this device when you are done.</Text>
            <Pressable accessibilityLabel="Sign out" accessibilityRole="button" onPress={onSignOut} style={screenStyles.quietButton}>
              <Text style={screenStyles.quietButtonText}>Sign out</Text>
            </Pressable>
          </DashboardCard>
        </View>
      ) : null}
      {section === "data" ? (
        <View style={{ gap: spacing.lg }} testID="profile-data-section">
          <DashboardCard headerRight={<DashboardPill label="Preview first" tone="blue" />} title="Export">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Export preview groups user-owned app data before deletion. Delete requires the exact word DELETE.</Text>
              <Pressable accessibilityLabel="Preview export" accessibilityRole="button" accessibilityState={{ disabled: busy || userDataControls?.busy }} disabled={busy || userDataControls?.busy} onPress={() => void userDataControls?.previewExport()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Preview export</Text>
              </Pressable>
              {userDataControls?.previewRows.map((row, index) => <Text key={`profile-preview-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
              <Pressable accessibilityLabel="Generate portable export" accessibilityRole="button" accessibilityState={{ disabled: busy || userDataControls?.busy }} disabled={busy || userDataControls?.busy} onPress={() => void userDataControls?.generateExportBundle()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Generate portable JSON export</Text>
              </Pressable>
              {userDataControls?.portableExportRows.map((row, index) => <Text key={`profile-portable-export-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
              {userDataControls?.bundleText ? (
                <TextInput accessibilityLabel="Portable JSON export payload" editable={false} multiline style={[screenStyles.input, { minHeight: 120 }]} value={userDataControls.bundleText} />
              ) : null}
              {userDataControls?.message ? <Text style={screenStyles.subtle}>{userDataControls.message}</Text> : null}
            </View>
          </DashboardCard>
          <DashboardCard headerRight={<DashboardPill label="DELETE gated" tone="orange" />} title="Account and app data">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{userDataControls?.accountDeletionCopy ?? "Delete app data removes user-owned app rows only. Auth identity deletion requires a trusted server-side function."}</Text>
              <Text style={screenStyles.subtle}>Export first is recommended before any destructive data action.</Text>
            </View>
          </DashboardCard>
          <DisclosureCard title="Danger Zone" summary="Delete controls are hidden until opened. Export first is recommended.">
            <View style={{ gap: spacing.sm }} testID="profile-danger-zone">
              <Text style={screenStyles.sectionTitle}>Delete app data</Text>
              <Text style={screenStyles.body}>Deletes user-owned app rows only. It does not delete auth identity.</Text>
              <Text style={screenStyles.subtle}>Requires an export preview and the exact word DELETE.</Text>
              <TextInput accessibilityLabel="Delete confirmation" onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" style={screenStyles.input} value={deleteConfirmation} />
              <Pressable accessibilityLabel="Delete app data" accessibilityRole="button" accessibilityState={{ disabled: deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy }} disabled={deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy} onPress={() => void userDataControls?.deleteData()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Delete app data</Text>
              </Pressable>
              <Text style={screenStyles.subtle}>Auth identity deletion requires a trusted support path outside this client.</Text>
            </View>
          </DisclosureCard>
        </View>
      ) : null}
      {section === "safety" ? (
        <View style={{ gap: spacing.lg }} testID="profile-safety-section">
          <DashboardCard headerRight={<DashboardPill label="Traceability" tone="blue" />} title="Training history">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Current block week {viewModel.trainingAuditSummary.currentWeekIndex}</Text>
              <Text style={screenStyles.body}>Persisted week summaries: {viewModel.trainingAuditSummary.activeBlockHistoryCount}</Text>
              {viewModel.trainingAuditSummary.latestEventSummary ? (
                <Text style={screenStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text>
              ) : (
                <Text style={screenStyles.subtle}>No block timeline event has been persisted yet.</Text>
              )}
            </View>
          </DashboardCard>
          <Pressable accessibilityLabel={historyDetailOpen ? "Hide saved history detail" : "Show saved history detail"} accessibilityRole="button" accessibilityState={{ selected: historyDetailOpen }} onPress={() => setHistoryDetailOpen((value) => !value)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{historyDetailOpen ? "Hide saved history detail" : "Show saved history detail"}</Text>
          </Pressable>
          {historyDetailOpen ? (
            <DashboardCard title="Saved history detail">
              <View style={{ gap: spacing.sm }} testID="profile-safety-history-detail">
                <Text style={screenStyles.body}>What happened: recent profile and journey events are summarized below when available.</Text>
                <Text style={screenStyles.subtle}>Why it matters: saved history explains app state; it does not clear safety stops or expose private server controls.</Text>
                {recentLogs.profile.length > 0 ? recentLogs.profile.map((item, index) => <Text key={`profile-history-detail:${index}`} style={screenStyles.subtle}>{item}</Text>) : <Text style={screenStyles.subtle}>No profile or journey history detail is loaded yet.</Text>}
                <Text style={screenStyles.subtle}>Training block week {viewModel.trainingAuditSummary.currentWeekIndex}; persisted week summaries {viewModel.trainingAuditSummary.activeBlockHistoryCount}.</Text>
                {viewModel.trainingAuditSummary.latestEventSummary ? <Text style={screenStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text> : null}
              </View>
            </DashboardCard>
          ) : null}
          <DashboardCard headerRight={<DashboardPill label="Read-only" tone="orange" />} title="Fuel safety history">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Nutrition review history is available in Fuel &gt; Reviews when active or recently persisted.</Text>
              <Text style={screenStyles.subtle}>CornerIQ cannot clear safety stops in the app. Use medical or nutrition support outside the app when a safety stop is active. Athletes cannot clear nutrition safety stops themselves.</Text>
            </View>
          </DashboardCard>
          {recentLogs.profile.length > 0 ? (
            <DashboardCard title="Journey history">
              <View style={{ gap: spacing.sm }}>
                {recentLogs.profile.map((item, index) => <Text key={`profile-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)}
              </View>
            </DashboardCard>
          ) : (
            <EmptyState title="No safety history yet" message="Onboarding, logs, or engine-owned persistence events are missing from journey history. This matters for traceability, not safety clearance. Keep using manual logs; events appear after real saves." />
          )}
        </View>
      ) : null}
    </LuminousScreen>
  );
}
