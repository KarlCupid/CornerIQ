import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import type {
  CycleViewModel,
  ISODateString,
  ProfileAppInputViewModel,
  ProfileHealthSafetyItemViewModel,
  ProfileSetupFactViewModel,
  ProfileViewModel,
  ProfileVisualTone,
  RecentLogsViewModel
} from "../../engine/core/types";
import { EmptyState } from "../../design/components/EmptyState";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { DashboardCard } from "../../design/components/PerformanceVisuals";
import { glassStyles } from "../../design/glass";
import { useLuminousScreenTheme } from "../../design/luminousTheme";
import { radii, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import { getReleaseLinkConfig } from "../../services/config/runtimeConfig";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { SUPPORT_OUTSIDE_APP_COPY, URGENT_SUPPORT_COPY } from "../supportCopy";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders, tabScreenBackgrounds } from "./tabHeroConfig";

const profilePalette = {
  actionBorder: "rgba(198, 213, 231, 0.42)",
  actionFill: "rgba(112, 132, 158, 0.32)",
  actionFillPressed: "rgba(128, 150, 178, 0.42)",
  cardLine: "rgba(205, 217, 233, 0.14)",
  controlFill: "rgba(230, 239, 251, 0.06)",
  controlFillPressed: "rgba(230, 239, 251, 0.1)",
  controlLine: "rgba(205, 217, 233, 0.18)",
  textBody: "#D7E1EE",
  textMuted: "#A8B5C8",
  textPrimary: "#F5F8FC",
  toneBlue: "#8DB8CA",
  toneGold: "#C9B879",
  toneGreen: "#8CB89D",
  toneMuted: "#A8B5C8",
  toneOrange: "#CB9871",
  tonePurple: "#A99ACB",
  toneRed: "#D57986"
} as const;

const profileTextStyles = {
  body: { ...screenStyles.body, color: profilePalette.textBody },
  callout: { ...screenStyles.callout, color: profilePalette.textPrimary, fontWeight: "700" as const },
  sectionTitle: { ...screenStyles.sectionTitle, color: profilePalette.textPrimary, fontWeight: "800" as const },
  subtle: { ...screenStyles.subtle, color: profilePalette.textMuted }
} as const;

function profileColorForTone(tone: ProfileVisualTone): string {
  switch (tone) {
    case "blue":
      return profilePalette.toneBlue;
    case "gold":
      return profilePalette.toneGold;
    case "green":
      return profilePalette.toneGreen;
    case "orange":
      return profilePalette.toneOrange;
    case "purple":
      return profilePalette.tonePurple;
    case "red":
      return profilePalette.toneRed;
    case "muted":
    default:
      return profilePalette.toneMuted;
  }
}

function profileTint(tone: ProfileVisualTone, alpha: string): string {
  return `${profileColorForTone(tone)}${alpha}`;
}

function ProfileStatusPill({ label, tone = "muted" }: { label: string; tone?: ProfileVisualTone | undefined }) {
  const toneColor = profileColorForTone(tone);
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center",
        maxWidth: 180,
        minHeight: 24
      }}
    >
      <View
        style={{
          backgroundColor: toneColor,
          borderRadius: 4,
          height: 8,
          opacity: 0.9,
          width: 8
        }}
      />
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 12, fontWeight: "800", letterSpacing: 0, lineHeight: 16 }}>
        {label}
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

function iconForTone(tone: ProfileVisualTone): keyof typeof Ionicons.glyphMap {
  if (tone === "green") {
    return "checkmark-circle-outline";
  }
  if (tone === "orange") {
    return "alert-circle-outline";
  }
  if (tone === "red") {
    return "medical-outline";
  }
  return "ellipse-outline";
}

function ProfileIconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  label,
  onPress,
  tone = "muted",
  variant = "quiet"
}: {
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: ProfileVisualTone | undefined;
  variant?: "primary" | "quiet" | undefined;
}) {
  const theme = useLuminousScreenTheme();
  const iconColor = variant === "primary" ? profilePalette.textPrimary : profileColorForTone(tone);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...glassStyles.control,
        alignItems: "center",
        backgroundColor: variant === "primary"
          ? pressed ? profilePalette.actionFillPressed : profilePalette.actionFill
          : pressed ? profilePalette.controlFillPressed : profilePalette.controlFill,
        borderColor: variant === "primary" ? profilePalette.actionBorder : profileTint(tone, "33"),
        boxShadow: variant === "primary" ? `0 10px 22px ${profileTint(tone, "1F")}` : `0 6px 16px ${theme.strongGlow}`,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 44,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Ionicons color={iconColor} name={icon} size={17} />
      <Text style={{ color: variant === "primary" ? profilePalette.textPrimary : profilePalette.textBody, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SetupFactTile({ item }: { item: ProfileSetupFactViewModel }) {
  const color = profileColorForTone(item.tone);
  return (
    <View
      accessibilityLabel={`${item.label}: ${item.value}`}
      style={{
        ...glassStyles.tile,
        backgroundColor: profileTint(item.tone, "14"),
        borderColor: profileTint(item.tone, "38"),
        flexBasis: 142,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 76,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
        {item.label.toUpperCase()}
      </Text>
      <Text numberOfLines={2} style={{ color: profilePalette.textPrimary, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>
        {item.value}
      </Text>
    </View>
  );
}

function AppInputRow({ item }: { item: ProfileAppInputViewModel }) {
  const color = profileColorForTone(item.tone);
  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: profileTint(item.tone, "14"),
          borderColor: profileTint(item.tone, "38"),
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 30,
          justifyContent: "center",
          width: 30
        }}
      >
        <Ionicons color={color} name={iconForTone(item.tone)} size={16} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={{ color: profilePalette.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{item.label}</Text>
        <Text style={profileTextStyles.subtle}>{item.detail}</Text>
      </View>
    </View>
  );
}

function HealthSafetyRow({ item }: { item: ProfileHealthSafetyItemViewModel }) {
  const color = profileColorForTone(item.tone);
  return (
    <View
      style={{
        borderBottomColor: profilePalette.cardLine,
        borderBottomWidth: 1,
        gap: spacing.xs,
        paddingBottom: spacing.sm
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16, minWidth: 86 }}>{item.label}</Text>
        <Text numberOfLines={1} style={{ color: profilePalette.textPrimary, flex: 1, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
          {item.value}
        </Text>
      </View>
      <Text style={profileTextStyles.subtle}>{item.detail}</Text>
    </View>
  );
}

function ProfileDisclosureSection({
  accessibilityName,
  children,
  defaultTone = "muted",
  onToggle,
  open,
  summary,
  testID,
  title
}: React.PropsWithChildren<{
  accessibilityName?: string | undefined;
  defaultTone?: ProfileVisualTone | undefined;
  onToggle: () => void;
  open: boolean;
  summary: string;
  testID: string;
  title: string;
}>) {
  const theme = useLuminousScreenTheme();
  const action = open ? "Hide" : "Show";
  const actionLabel = `${action} ${title}`;
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityLabel={`${action} ${accessibilityName ?? title} section`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => ({
          ...glassStyles.control,
          alignItems: "center",
          backgroundColor: pressed ? profilePalette.controlFillPressed : profilePalette.controlFill,
          borderColor: open ? profileTint(defaultTone, "42") : profilePalette.controlLine,
          boxShadow: `0 8px 20px ${theme.strongGlow}`,
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "space-between",
          minHeight: 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        })}
      >
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ color: profilePalette.textPrimary, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>{actionLabel}</Text>
          <Text numberOfLines={2} style={profileTextStyles.subtle}>{summary}</Text>
        </View>
        <Ionicons color={profileColorForTone(defaultTone)} name={open ? "chevron-up" : "chevron-down"} size={18} />
      </Pressable>
      {open ? <View style={{ gap: spacing.lg }} testID={testID}>{children}</View> : null}
    </View>
  );
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
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [setupDetailsOpen, setSetupDetailsOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [healthOpen, setHealthOpen] = React.useState(viewModel.healthWarning.active);
  const [deleteControlsOpen, setDeleteControlsOpen] = React.useState(false);
  const [historyDetailOpen, setHistoryDetailOpen] = React.useState(false);
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const openPrivacyPolicy = React.useCallback(() => {
    if (releaseLinks.privacyPolicyUrl) {
      void Linking.openURL(releaseLinks.privacyPolicyUrl);
    }
  }, [releaseLinks.privacyPolicyUrl]);
  React.useEffect(() => {
    if (viewModel.healthWarning.active) {
      setHealthOpen(true);
    }
  }, [viewModel.healthWarning.active]);

  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const openPlan = React.useCallback(() => {
    if (onOpenPlan) {
      onOpenPlan();
    }
  }, [onOpenPlan]);

  const setupDetailsSummary = "Inputs, units, wearable preference, and quick maintenance.";
  const privacySummary = releaseLinks.privacyPolicyUrlIsPlaceholder
    ? "Export and delete controls. Privacy policy URL is not configured."
    : "Export, privacy policy, and delete controls.";
  const healthSummary = viewModel.healthWarning.active
    ? "Health warning active. Review before pushing training or weight."
    : "Health notes, support path, and saved safety history.";

  return (
    <LuminousScreen accent="neutral" backgroundImage={tabScreenBackgrounds.profile} testID="profile-screen">
      <ScreenHeader {...tabHeroHeaders.profile} />

      {viewModel.healthWarning.active ? (
        <DashboardCard headerRight={<ProfileStatusPill label={viewModel.healthWarning.statusLabel} tone="red" />} testID="profile-health-warning-card" title="Health warning">
          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typography.cardTitle, color: profilePalette.textPrimary }}>{viewModel.healthWarning.title}</Text>
            <Text style={profileTextStyles.body}>{viewModel.healthWarning.summary}</Text>
            <Text style={profileTextStyles.subtle}>{viewModel.healthWarning.detail}</Text>
            <ProfileIconButton icon="medical-outline" label="Review health notes" onPress={() => setHealthOpen(true)} tone="red" variant="primary" />
          </View>
        </DashboardCard>
      ) : null}

      <DashboardCard
        headerRight={<ProfileStatusPill label={viewModel.athleteSetup.statusLabel} tone={viewModel.athleteSetup.statusTone} />}
        testID="profile-athlete-section"
        title="Athlete Setup"
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: profilePalette.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 26 }}>{viewModel.athleteSetup.contextLabel}</Text>
            {viewModel.athleteSetup.summaryLines.map((line) => (
              <Text key={`profile-setup-line:${line}`} style={profileTextStyles.body}>{line}</Text>
            ))}
          </View>
          <Text style={profileTextStyles.subtle}>As of {asOfDate}</Text>
          <Text style={profileTextStyles.body}>{viewModel.athleteSetup.explanation}</Text>
          <ProfileIconButton icon="create-outline" label={viewModel.athleteSetup.primaryActionLabel} onPress={openSettings} tone={viewModel.athleteSetup.statusTone} variant="primary" />
        </View>
      </DashboardCard>

      <ProfileDisclosureSection
        defaultTone="muted"
        onToggle={() => setSetupDetailsOpen((value) => !value)}
        open={setupDetailsOpen}
        summary={setupDetailsSummary}
        testID="profile-setup-details-section"
        title="Setup details"
        accessibilityName="Setup details"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID="profile-key-setup-row">
          {viewModel.keySetup.map((item) => <SetupFactTile item={item} key={`profile-key-setup:${item.label}`} />)}
        </View>
        <DashboardCard testID="profile-app-inputs-card" title="App inputs">
          <View style={{ gap: spacing.md }}>
            {viewModel.appInputs.map((item) => <AppInputRow item={item} key={`profile-app-input:${item.label}`} />)}
          </View>
        </DashboardCard>
        <DashboardCard testID="profile-quick-updates-card" title="Quick updates">
          <View style={{ gap: spacing.md }}>
            <Text style={profileTextStyles.subtle}>Wearable: {wearableStatus}. Cycle support: {cycleTrackingStatus}.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <View style={{ flexBasis: 220, flexGrow: 1 }}>
                <ProfileIconButton disabled={!onOpenPlan || busy} icon="flag-outline" label="Change goal or schedule" onPress={openPlan} tone="blue" />
              </View>
              <View style={{ flexBasis: 220, flexGrow: 1 }}>
                <ProfileIconButton disabled={!onOpenPlan || busy} icon="calendar-outline" label="Edit boxing schedule" onPress={openPlan} tone="green" />
              </View>
              <View style={{ flexBasis: 220, flexGrow: 1 }}>
                <ProfileIconButton disabled={busy} icon="barbell-outline" label="Update equipment" onPress={openSettings} tone="muted" />
              </View>
              <View style={{ flexBasis: 220, flexGrow: 1 }}>
                <ProfileIconButton disabled={busy} icon="watch-outline" label="Units & wearable" onPress={openSettings} tone="muted" />
              </View>
              <View style={{ flexBasis: 220, flexGrow: 1 }}>
                <ProfileIconButton disabled={busy} icon="sync-outline" label="Cycle support" onPress={openSettings} tone="muted" />
              </View>
            </View>
          </View>
        </DashboardCard>
      </ProfileDisclosureSection>

      {settingsOpen ? (
        <View style={{ gap: spacing.md }} testID="profile-settings-section">
          <ProfileIconButton accessibilityLabel="Hide Settings section" icon="chevron-up" label="Hide setup settings" onPress={() => setSettingsOpen(false)} tone="muted" />
          <ProfileSettingsScreen
            busy={busy}
            cycleTrackingPreference={cycleTrackingStatus === "enabled" || cycleTrackingStatus === "disabled" ? cycleTrackingStatus : "undecided"}
            equipmentAccess={equipmentAccess}
            onOpenPlan={onOpenPlan}
            onUpdateSettings={onUpdateSettings}
            preferredUnits={preferredUnits}
            wearablePreference={wearablePreference}
          />
        </View>
      ) : null}

      <ProfileDisclosureSection
        defaultTone={viewModel.healthWarning.active ? "red" : "muted"}
        onToggle={() => setHealthOpen((value) => !value)}
        open={healthOpen}
        summary={healthSummary}
        testID="profile-safety-section"
        title="Health & Safety"
        accessibilityName="Safety"
      >
        {viewModel.healthWarning.active ? (
          <DashboardCard headerRight={<ProfileStatusPill label="Review needed" tone="red" />} title="Health warning">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>{viewModel.healthWarning.summary}</Text>
              <Text style={profileTextStyles.subtle}>{viewModel.healthWarning.detail}</Text>
            </View>
          </DashboardCard>
        ) : null}
        <DashboardCard title="Safety history">
          <View style={{ gap: spacing.md }}>
            {viewModel.healthSafetyItems.map((item) => <HealthSafetyRow item={item} key={`profile-health-safety:${item.label}`} />)}
          </View>
        </DashboardCard>
        <CycleContextCard cycleContext={cycleContext} minimal trackingStatus={cycleTrackingStatus} />
        <DashboardCard title="Training history">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Current block week {viewModel.trainingAuditSummary.currentWeekIndex}</Text>
            <Text style={profileTextStyles.body}>Saved week summaries: {viewModel.trainingAuditSummary.activeBlockHistoryCount}</Text>
            {viewModel.trainingAuditSummary.latestEventSummary ? (
              <Text style={profileTextStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text>
            ) : (
              <Text style={profileTextStyles.subtle}>No block timeline event has been saved yet.</Text>
            )}
          </View>
        </DashboardCard>
        <ProfileIconButton icon={historyDetailOpen ? "chevron-up" : "chevron-down"} label={historyDetailOpen ? "Hide saved history detail" : "Show saved history detail"} onPress={() => setHistoryDetailOpen((value) => !value)} tone="muted" />
        {historyDetailOpen ? (
          <DashboardCard title="Saved history detail">
            <View style={{ gap: spacing.sm }} testID="profile-safety-history-detail">
              <Text style={profileTextStyles.body}>Recent profile and journey events appear here when available.</Text>
              <Text style={profileTextStyles.subtle}>History explains app state; app controls do not clear health warnings.</Text>
              {recentLogs.profile.length > 0 ? recentLogs.profile.map((item, index) => <Text key={`profile-history-detail:${index}`} style={profileTextStyles.subtle}>{item}</Text>) : <Text style={profileTextStyles.subtle}>No profile or journey history detail is loaded yet.</Text>}
              <Text style={profileTextStyles.subtle}>Training block week {viewModel.trainingAuditSummary.currentWeekIndex}; saved week summaries {viewModel.trainingAuditSummary.activeBlockHistoryCount}.</Text>
              {viewModel.trainingAuditSummary.latestEventSummary ? <Text style={profileTextStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text> : null}
            </View>
          </DashboardCard>
        ) : null}
        <DashboardCard title="Fuel safety history">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Nutrition review history appears in Fuel when active or recently saved.</Text>
            <Text style={profileTextStyles.subtle}>Health warnings need medical or nutrition support outside the app.</Text>
          </View>
        </DashboardCard>
        <DashboardCard title="Support path">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>{SUPPORT_OUTSIDE_APP_COPY}</Text>
            <Text style={profileTextStyles.subtle}>{URGENT_SUPPORT_COPY}</Text>
          </View>
        </DashboardCard>
        {recentLogs.profile.length > 0 ? (
          <DashboardCard title="Journey history">
            <View style={{ gap: spacing.sm }}>
              {recentLogs.profile.map((item, index) => <Text key={`profile-recent-log:${index}`} style={profileTextStyles.body}>{item}</Text>)}
            </View>
          </DashboardCard>
        ) : (
          <EmptyState title="No health history yet" message="Events appear after real saves. Manual logs still work." />
        )}
      </ProfileDisclosureSection>

      <ProfileDisclosureSection
        defaultTone="muted"
        onToggle={() => setPrivacyOpen((value) => !value)}
        open={privacyOpen}
        summary={privacySummary}
        testID="profile-data-section"
        title="Privacy & Data"
        accessibilityName="Data"
      >
        <DashboardCard title="Privacy Policy">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Explains what CornerIQ stores, how training, fuel, body, cycle, safety, and account data are used, and how export/delete works.</Text>
            {releaseLinks.privacyPolicyUrlIsPlaceholder ? <Text style={profileTextStyles.subtle}>Privacy policy link is unavailable until a real public URL is configured.</Text> : null}
            <ProfileIconButton disabled={releaseLinks.privacyPolicyUrlIsPlaceholder} icon="document-text-outline" label={releaseLinks.privacyPolicyUrlIsPlaceholder ? "Privacy policy unavailable" : "Open Privacy Policy"} onPress={openPrivacyPolicy} tone="muted" />
          </View>
        </DashboardCard>
        <DashboardCard title="Data controls">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Preview your app data before export or delete. Delete requires DELETE.</Text>
            <ProfileIconButton disabled={!userDataControls || busy || userDataControls.busy} icon="eye-outline" label="Preview export" onPress={() => void userDataControls?.previewExport()} tone="muted" />
            {userDataControls?.previewRows.map((row, index) => <Text key={`profile-preview-row:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
            <ProfileIconButton disabled={!userDataControls || busy || userDataControls.busy} icon="download-outline" label="Generate portable JSON export" onPress={() => void userDataControls?.generateExportBundle()} tone="muted" />
            {userDataControls?.portableExportRows.map((row, index) => <Text key={`profile-portable-export-row:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
            {userDataControls?.bundleText ? (
              <TextInput accessibilityLabel="Portable JSON export payload" editable={false} multiline style={[screenStyles.input, { minHeight: 120 }]} value={userDataControls.bundleText} />
            ) : null}
            {userDataControls?.message ? <Text style={profileTextStyles.subtle}>{userDataControls.message}</Text> : null}
          </View>
        </DashboardCard>
        <DashboardCard title="Account and app data">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>{userDataControls?.accountDeletionCopy ?? "Delete app data removes user-owned app rows only. Delete account requires a signed-in server-side account deletion function."}</Text>
            <Text style={profileTextStyles.subtle}>Export first before any destructive action.</Text>
          </View>
        </DashboardCard>
        <ProfileDisclosureSection
          defaultTone="red"
          onToggle={() => setDeleteControlsOpen((value) => !value)}
          open={deleteControlsOpen}
          summary="Delete controls stay hidden. Export first."
          testID="profile-delete-controls"
          title="Delete controls"
        >
          <DashboardCard title="Delete app data">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Deletes user-owned app rows only. It does not delete auth identity.</Text>
              <Text style={profileTextStyles.subtle}>Requires an export preview and the exact word DELETE.</Text>
              <TextInput accessibilityLabel="Delete confirmation" onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={deleteConfirmation} />
              <ProfileIconButton
                disabled={!userDataControls || deleteConfirmation !== "DELETE" || !userDataControls.preview || busy || userDataControls.busy}
                icon="trash-outline"
                label="Delete app data"
                onPress={() => void userDataControls?.deleteData()}
                tone="red"
              />
            </View>
          </DashboardCard>
          <DashboardCard title="Delete account">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Deletes app data and the sign-in identity for this account through the server-side account deletion function.</Text>
              <Text style={profileTextStyles.subtle}>This is irreversible and signs you out. Export first. Requires DELETE ACCOUNT.</Text>
              <TextInput accessibilityLabel="Delete account confirmation" onChangeText={setAccountDeleteConfirmation} placeholder="Type DELETE ACCOUNT to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={accountDeleteConfirmation} />
              <ProfileIconButton
                disabled={!userDataControls || accountDeleteConfirmation !== "DELETE ACCOUNT" || busy || userDataControls.busy}
                icon="person-remove-outline"
                label="Delete account"
                onPress={() => void userDataControls?.deleteAccount()}
                tone="red"
              />
              {userDataControls?.accountDeletionResultRows.map((row, index) => <Text key={`profile-account-deletion-result:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
            </View>
          </DashboardCard>
        </ProfileDisclosureSection>
      </ProfileDisclosureSection>

      <View testID="profile-account-section">
        <DashboardCard title="Account">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Sign out of this device when you are done.</Text>
            <ProfileIconButton disabled={busy || Boolean(userDataControls?.busy)} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} tone="muted" />
          </View>
        </DashboardCard>
      </View>
    </LuminousScreen>
  );
}
