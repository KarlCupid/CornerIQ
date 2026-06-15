import React from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import type { CycleViewModel, ProfileViewModel, RecentLogsViewModel } from "../../engine/core/types";
import type { ISODateString } from "../../engine/core/types";
import { DisclosureCard } from "../../design/components/DisclosureCard";
import { EmptyState } from "../../design/components/EmptyState";
import { CompactStatusStrip } from "../../design/components/FastTask";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { DashboardCard } from "../../design/components/PerformanceVisuals";
import { SectionTabs, type SectionTabItem } from "../../design/components/SectionTabs";
import { TopActionCard } from "../../design/components/TopActionCard";
import { spacing } from "../../design/theme";
import { buildProfileReferencePanelViewModel } from "../../engine/presentation/referencePanelViewModel";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import { getReleaseLinkConfig } from "../../services/config/runtimeConfig";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { SUPPORT_OUTSIDE_APP_COPY, URGENT_SUPPORT_COPY } from "../supportCopy";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileCommandCenter, ProfileDataConstellation, ProfileIntelligenceLayers, ProfilePrivacyMatrix, ProfileSafetyLedger, ProfileSystemNote } from "./profile/ProfileCommandCenter";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { ProfileReferencePanel } from "./reference/TabReferencePanels";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";

type ProfileSection = "athlete" | "settings" | "data" | "safety";

const profileSections: readonly SectionTabItem<ProfileSection>[] = [
  { key: "athlete", label: "Athlete" },
  { key: "settings", label: "Settings" },
  { key: "data", label: "Data" },
  { key: "safety", label: "Safety" }
];

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
  asOfDate,
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
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const [section, setSection] = React.useState<ProfileSection>("athlete");
  const [historyDetailOpen, setHistoryDetailOpen] = React.useState(false);
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const referencePanel = buildProfileReferencePanelViewModel(viewModel);
  const openPrivacyPolicy = React.useCallback(() => {
    void Linking.openURL(releaseLinks.privacyPolicyUrl);
  }, [releaseLinks.privacyPolicyUrl]);
  return (
    <LuminousScreen accent="neutral" backgroundImage={tabScreenBackgrounds.profile} testID="profile-screen">
      <ScreenHeader {...tabHeroHeaders.profile} />
      <ProfileReferencePanel
        model={referencePanel}
        onOpenAthlete={() => setSection("athlete")}
        onOpenSettings={() => setSection("settings")}
      />
      <ProfileCommandCenter asOfDate={asOfDate} viewModel={viewModel} />
      <TopActionCard
        accent="neutral"
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
          <ProfileDataConstellation signals={viewModel.dataConstellation} />
          <ProfileIntelligenceLayers layers={viewModel.intelligenceLayers} />
          <DashboardCard title="Athlete profile">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{viewModel.summary}</Text>
              <CompactStatusStrip
                items={[
                  {
                    accent: wearableStatus === "manual only" ? "green" : "blue",
                    label: "Wearable",
                    meta: "Input mode",
                    value: wearableStatus
                  },
                  {
                    accent: cycleTrackingStatus === "enabled" ? "purple" : "orange",
                    label: "Cycle",
                    meta: "Private",
                    value: cycleTrackingStatus
                  },
                  {
                    accent: "blue",
                    label: "Units",
                    meta: "Display",
                    value: preferredUnits
                  }
                ]}
                variant="quiet"
              />
            </View>
          </DashboardCard>
          <ProfilePrivacyMatrix items={viewModel.privacyMatrix} />
          <DashboardCard title="Privacy notes">
            <View style={{ gap: spacing.sm }}>
              {viewModel.privacyNotes.map((note, index) => <Text key={`profile-privacy:${index}`} style={screenStyles.body}>{note}</Text>)}
              <Text style={screenStyles.subtle}>Cycle data is optional, private, and used only to adjust confidence and symptom-aware context.</Text>
            </View>
          </DashboardCard>
          <CycleContextCard cycleContext={cycleContext} minimal trackingStatus={cycleTrackingStatus} />
          <ProfileSystemNote />
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
          <DashboardCard title="Export">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Preview your app data before export or delete. Delete requires DELETE.</Text>
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
          <DashboardCard title="Privacy Policy">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Explains what CornerIQ stores, how training, fuel, body, cycle, safety, and account data are used, and how export/delete works.</Text>
              <Pressable accessibilityLabel="Open Privacy Policy" accessibilityRole="link" onPress={openPrivacyPolicy} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Open Privacy Policy</Text>
              </Pressable>
            </View>
          </DashboardCard>
          <DashboardCard title="Account and app data">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{userDataControls?.accountDeletionCopy ?? "Delete app data removes user-owned app rows only. Delete account requires a signed-in server-side account deletion function."}</Text>
              <Text style={screenStyles.subtle}>Export first before any destructive action.</Text>
            </View>
          </DashboardCard>
          <DashboardCard title="Support path">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{SUPPORT_OUTSIDE_APP_COPY}</Text>
              <Text style={screenStyles.subtle}>{URGENT_SUPPORT_COPY}</Text>
            </View>
          </DashboardCard>
          <DisclosureCard title="Danger Zone" summary="Delete controls stay hidden. Export first.">
            <View style={{ gap: spacing.sm }} testID="profile-danger-zone">
              <Text style={screenStyles.sectionTitle}>Delete app data</Text>
              <Text style={screenStyles.body}>Deletes user-owned app rows only. It does not delete auth identity.</Text>
              <Text style={screenStyles.subtle}>Requires an export preview and the exact word DELETE.</Text>
              <TextInput accessibilityLabel="Delete confirmation" onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" style={screenStyles.input} value={deleteConfirmation} />
              <Pressable accessibilityLabel="Delete app data" accessibilityRole="button" accessibilityState={{ disabled: deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy }} disabled={deleteConfirmation !== "DELETE" || !userDataControls?.preview || busy || userDataControls?.busy} onPress={() => void userDataControls?.deleteData()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Delete app data</Text>
              </Pressable>
              <Text style={screenStyles.sectionTitle}>Delete account</Text>
              <Text style={screenStyles.body}>Deletes app data and the sign-in identity for this account through the server-side account deletion function.</Text>
              <Text style={screenStyles.subtle}>This is irreversible and signs you out. Export first. Requires DELETE ACCOUNT.</Text>
              <TextInput accessibilityLabel="Delete account confirmation" onChangeText={setAccountDeleteConfirmation} placeholder="Type DELETE ACCOUNT to enable" style={screenStyles.input} value={accountDeleteConfirmation} />
              <Pressable accessibilityLabel="Delete account" accessibilityRole="button" accessibilityState={{ disabled: accountDeleteConfirmation !== "DELETE ACCOUNT" || busy || userDataControls?.busy }} disabled={accountDeleteConfirmation !== "DELETE ACCOUNT" || busy || userDataControls?.busy} onPress={() => void userDataControls?.deleteAccount()} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Delete account</Text>
              </Pressable>
              {userDataControls?.accountDeletionResultRows.map((row, index) => <Text key={`profile-account-deletion-result:${index}`} style={screenStyles.subtle}>{row}</Text>)}
            </View>
          </DisclosureCard>
        </View>
      ) : null}
      {section === "safety" ? (
        <View style={{ gap: spacing.lg }} testID="profile-safety-section">
          <ProfileSafetyLedger items={viewModel.safetyLedger} />
          <DashboardCard title="Training history">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Current block week {viewModel.trainingAuditSummary.currentWeekIndex}</Text>
              <Text style={screenStyles.body}>Saved week summaries: {viewModel.trainingAuditSummary.activeBlockHistoryCount}</Text>
              {viewModel.trainingAuditSummary.latestEventSummary ? (
                <Text style={screenStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text>
              ) : (
                <Text style={screenStyles.subtle}>No block timeline event has been saved yet.</Text>
              )}
            </View>
          </DashboardCard>
          <Pressable accessibilityLabel={historyDetailOpen ? "Hide saved history detail" : "Show saved history detail"} accessibilityRole="button" accessibilityState={{ selected: historyDetailOpen }} onPress={() => setHistoryDetailOpen((value) => !value)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{historyDetailOpen ? "Hide saved history detail" : "Show saved history detail"}</Text>
          </Pressable>
          {historyDetailOpen ? (
            <DashboardCard title="Saved history detail">
              <View style={{ gap: spacing.sm }} testID="profile-safety-history-detail">
                <Text style={screenStyles.body}>Recent profile and journey events appear here when available.</Text>
                <Text style={screenStyles.subtle}>History explains app state; it never clears safety stops.</Text>
                {recentLogs.profile.length > 0 ? recentLogs.profile.map((item, index) => <Text key={`profile-history-detail:${index}`} style={screenStyles.subtle}>{item}</Text>) : <Text style={screenStyles.subtle}>No profile or journey history detail is loaded yet.</Text>}
                <Text style={screenStyles.subtle}>Training block week {viewModel.trainingAuditSummary.currentWeekIndex}; saved week summaries {viewModel.trainingAuditSummary.activeBlockHistoryCount}.</Text>
                {viewModel.trainingAuditSummary.latestEventSummary ? <Text style={screenStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text> : null}
              </View>
            </DashboardCard>
          ) : null}
          <DashboardCard title="Fuel safety history">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>Nutrition review history appears in Fuel when active or recently saved.</Text>
              <Text style={screenStyles.subtle}>Safety stops require medical or nutrition support outside the app.</Text>
            </View>
          </DashboardCard>
          <DashboardCard title="Support path">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.body}>{SUPPORT_OUTSIDE_APP_COPY}</Text>
              <Text style={screenStyles.subtle}>{URGENT_SUPPORT_COPY}</Text>
            </View>
          </DashboardCard>
          {recentLogs.profile.length > 0 ? (
            <DashboardCard title="Journey history">
              <View style={{ gap: spacing.sm }}>
                {recentLogs.profile.map((item, index) => <Text key={`profile-recent-log:${index}`} style={screenStyles.body}>{item}</Text>)}
              </View>
            </DashboardCard>
          ) : (
            <EmptyState title="No safety history yet" message="Events appear after real saves. Manual logs still work." />
          )}
        </View>
      ) : null}
    </LuminousScreen>
  );
}
