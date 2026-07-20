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
import { GroupedMetricTiles } from "../../design/components/PremiumPrimitives";
import { glassStyles } from "../../design/glass";
import { useLuminousScreenTheme } from "../../design/luminousTheme";
import { colors, radii, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import { accountDeleteConfirmationMatches, appDataDeleteConfirmationMatches, type UserDataControlsHook } from "../../hooks/useUserDataControls";
import { getReleaseLinkConfig } from "../../services/config/runtimeConfig";
import type { ProfileSettingsDraft } from "../../services/supabase/onboardingService";
import { SUPPORT_OUTSIDE_APP_COPY, URGENT_SUPPORT_COPY } from "../supportCopy";
import { CycleContextCard } from "./cycle/CycleContextCard";
import { ProfileSettingsScreen } from "./profile/ProfileSettingsScreen";
import { screenStyles } from "./screenStyles";
import { tabHeroHeaders } from "./tabHeroConfig";

const profilePalette = {
  actionBorder: "rgba(39, 206, 241, 0.58)",
  actionFill: "#27CEF1",
  actionFillPressed: "#20B9D9",
  cardLine: "rgba(216, 228, 230, 0.14)",
  controlFill: "rgba(216, 228, 230, 0.055)",
  controlFillPressed: "rgba(216, 228, 230, 0.095)",
  controlLine: "rgba(216, 228, 230, 0.16)",
  textBody: "#D8E4E6",
  textMuted: "#9FAFB4",
  textPrimary: "#F2EBE0",
  toneBlue: "#27CEF1",
  toneGold: "#FFD861",
  toneGreen: "#38E28A",
  toneMuted: "#9FAFB4",
  toneOrange: "#FF9448",
  tonePurple: "#9657F5",
  toneRed: "#FF5265"
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

function ProfileStatusPill({ label, tone: _tone = "muted" }: { label: string; tone?: ProfileVisualTone | undefined }) {
  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      numberOfLines={2}
      style={{
        alignSelf: "flex-start",
        color: colors.wrap,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0,
        lineHeight: 16,
        maxWidth: 180,
        minHeight: 16,
        textAlign: "right"
      }}
    >
      {label}
    </Text>
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
  wearablePreference?: "manual_only" | "wearable_connected" | "undecided" | undefined;
  wearableStatus?: string | undefined;
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
  const iconColor = variant === "primary" ? colors.cornerBlack : profileColorForTone(tone);
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
        boxShadow: "none",
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 44,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Ionicons color={iconColor} name={icon} size={17} style={{ flexShrink: 0 }} />
      <Text style={{ color: variant === "primary" ? colors.cornerBlack : profilePalette.textBody, flexShrink: 1, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function snapshotFactFromSetup(items: readonly ProfileSetupFactViewModel[], label: string, fallback: string): ProfileSetupFactViewModel {
  return items.find((item) => item.label.toLowerCase() === label.toLowerCase()) ?? { label, value: fallback, tone: "muted" };
}

function ProfileSetupSnapshot({
  cycleTrackingStatus,
  viewModel
}: {
  cycleTrackingStatus: string;
  viewModel: ProfileViewModel;
}) {
  const equipment = snapshotFactFromSetup(viewModel.keySetup, "Equipment", "Needs details");
  const schedule = snapshotFactFromSetup(viewModel.keySetup, "Schedule", "Needs details");
  const units = snapshotFactFromSetup(viewModel.keySetup, "Units", "Metric");
  const cycleTone: ProfileVisualTone = cycleTrackingStatus === "enabled" ? "green" : cycleTrackingStatus === "undecided" ? "orange" : "muted";
  return (
    <DashboardCard testID="profile-setup-snapshot" title="Setup snapshot">
      <GroupedMetricTiles
        items={[
          { icon: "barbell-outline", label: equipment.label, tone: equipment.tone, value: equipment.value },
          { icon: "calendar-outline", label: schedule.label, tone: schedule.tone, value: schedule.value },
          { icon: "resize-outline", label: units.label, tone: units.tone, value: units.value },
          { icon: "sync-outline", label: "Cycle support", tone: cycleTone, value: cycleTrackingStatus }
        ]}
      />
    </DashboardCard>
  );
}

function SchedulePresentationRow({ item }: { item: ProfileViewModel["schedulePresentation"][number] }) {
  const color = profileColorForTone(item.tone);
  return (
    <View style={{ borderBottomColor: profilePalette.cardLine, borderBottomWidth: 1, gap: spacing.xs, paddingBottom: spacing.sm }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16, minWidth: 118 }}>{item.label}</Text>
        <Text numberOfLines={1} style={{ color: profilePalette.textPrimary, flex: 1, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
          {item.value}
        </Text>
      </View>
      <Text style={profileTextStyles.subtle}>{item.detail}</Text>
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
  toggleTestID,
  title
}: React.PropsWithChildren<{
  accessibilityName?: string | undefined;
  defaultTone?: ProfileVisualTone | undefined;
  onToggle: () => void;
  open: boolean;
  summary: string;
  testID: string;
  toggleTestID?: string | undefined;
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
        testID={toggleTestID}
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

function ProfilePriorityActions({
  accountDeleteConfirmation,
  busy,
  deleteConfirmation,
  onOpenPlan,
  onOpenPrivacyPolicy,
  onOpenSettings,
  onOpenSupport,
  onOpenTermsOfUse,
  onSignOut,
  planUnavailable,
  privacyPolicyUnavailable,
  setAccountDeleteConfirmation,
  setDeleteConfirmation,
  supportUnavailable,
  termsOfUseUnavailable,
  userDataControls
}: {
  accountDeleteConfirmation: string;
  busy: boolean;
  deleteConfirmation: string;
  onOpenPlan: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onOpenTermsOfUse: () => void;
  onSignOut: () => Promise<void>;
  planUnavailable: boolean;
  privacyPolicyUnavailable: boolean;
  setAccountDeleteConfirmation: (value: string) => void;
  setDeleteConfirmation: (value: string) => void;
  supportUnavailable: boolean;
  termsOfUseUnavailable: boolean;
  userDataControls?: UserDataControlsHook | undefined;
}) {
  const dataBusy = Boolean(userDataControls?.busy);
  const accountDeleteReady = accountDeleteConfirmationMatches(accountDeleteConfirmation);
  const appDataDeleteReady = appDataDeleteConfirmationMatches(deleteConfirmation);
  const exportPreviewReady = Boolean(userDataControls?.preview);
  return (
    <DashboardCard testID="profile-priority-actions-card" title="Account essentials">
      <View style={{ gap: spacing.md }}>
        <Text style={profileTextStyles.body}>Privacy, terms, support, export, sign out, and clear account actions.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ flexBasis: 156, flexGrow: 1 }}>
            <ProfileIconButton disabled={busy} icon="create-outline" label="Edit setup" onPress={onOpenSettings} tone="muted" />
          </View>
          <View style={{ flexBasis: 180, flexGrow: 1 }}>
            <ProfileIconButton disabled={busy || planUnavailable} icon="flag-outline" label="Change goal or schedule" onPress={onOpenPlan} tone="blue" />
          </View>
          <View style={{ flexBasis: 180, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel={privacyPolicyUnavailable ? "Shortcut privacy unavailable" : "Shortcut privacy link"} disabled={privacyPolicyUnavailable} icon="document-text-outline" label={privacyPolicyUnavailable ? "Privacy policy unavailable" : "Open Privacy Policy"} onPress={onOpenPrivacyPolicy} tone="muted" />
          </View>
          <View style={{ flexBasis: 150, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut support link" disabled={supportUnavailable} icon="help-circle-outline" label="Open Support" onPress={onOpenSupport} tone="blue" />
          </View>
          <View style={{ flexBasis: 180, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut terms of use link" disabled={termsOfUseUnavailable} icon="reader-outline" label="Open Terms of Use" onPress={onOpenTermsOfUse} tone="muted" />
          </View>
          <View style={{ flexBasis: 160, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut data preview" disabled={!userDataControls || busy || dataBusy} icon="eye-outline" label="Preview export" onPress={() => void userDataControls?.previewExport()} tone="muted" />
          </View>
          <View style={{ flexBasis: 220, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut JSON bundle" disabled={!userDataControls || busy || dataBusy} icon="download-outline" label="Generate portable JSON export" onPress={() => void userDataControls?.generateExportBundle()} tone="muted" />
          </View>
          <View style={{ flexBasis: 150, flexGrow: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut account exit" disabled={busy || dataBusy} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} tone="muted" />
          </View>
        </View>
        {userDataControls?.previewRows.map((row, index) => <Text key={`profile-priority-preview-row:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
        {userDataControls?.portableExportRows.map((row, index) => <Text key={`profile-priority-portable-export-row:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
        {userDataControls?.bundleText ? (
          <TextInput accessibilityLabel="Portable JSON export payload" editable={false} multiline style={[screenStyles.input, { minHeight: 110 }]} value={userDataControls.bundleText} />
        ) : null}
        {userDataControls?.message ? <Text style={profileTextStyles.subtle}>{userDataControls.message}</Text> : null}
        <View style={{ backgroundColor: profilePalette.cardLine, height: 1 }} />
        <View style={{ gap: spacing.sm }}>
          <Text style={profileTextStyles.sectionTitle}>Delete account</Text>
          <Text style={profileTextStyles.body}>To permanently remove your CornerIQ account: preview/export your data, type DELETE ACCOUNT, then tap Delete account.</Text>
          <Text style={profileTextStyles.subtle}>{userDataControls?.accountDeletionCopy ?? "Delete account removes app data and the sign-in identity when the server-side account deletion function is available."}</Text>
          <TextInput accessibilityLabel="Shortcut identity removal confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setAccountDeleteConfirmation} placeholder="Type DELETE ACCOUNT to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={accountDeleteConfirmation} />
          <ProfileIconButton
            accessibilityLabel="Shortcut identity removal"
            disabled={!userDataControls || !accountDeleteReady || busy || dataBusy}
            icon="person-remove-outline"
            label="Delete account"
            onPress={() => void userDataControls?.deleteAccount()}
            tone="red"
          />
          {userDataControls?.accountDeletionResultRows.map((row, index) => <Text key={`profile-priority-account-deletion-result:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
          <View style={{ backgroundColor: profilePalette.cardLine, height: 1 }} />
          <Text style={profileTextStyles.sectionTitle}>Delete app data only</Text>
          <Text style={profileTextStyles.subtle}>This keeps your login but removes user-owned app rows. It requires an export preview and DELETE.</Text>
          {!exportPreviewReady ? <Text style={profileTextStyles.subtle}>Preview export first to enable app-data deletion.</Text> : null}
          <TextInput accessibilityLabel="Shortcut data removal confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={deleteConfirmation} />
          <ProfileIconButton
            accessibilityLabel="Shortcut app data removal"
            disabled={!userDataControls || !appDataDeleteReady || !exportPreviewReady || busy || dataBusy}
            icon="trash-outline"
            label="Delete app data only"
            onPress={() => void userDataControls?.deleteData()}
            tone="red"
          />
        </View>
      </View>
    </DashboardCard>
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
  viewModel
}: ProfileScreenProps) {
  const [fallbackDeleteConfirmation, setFallbackDeleteConfirmation] = React.useState("");
  const deleteConfirmation = userDataControls?.deleteConfirmation ?? fallbackDeleteConfirmation;
  const setDeleteConfirmation = userDataControls?.setDeleteConfirmation ?? setFallbackDeleteConfirmation;
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const accountDeleteReady = accountDeleteConfirmationMatches(accountDeleteConfirmation);
  const appDataDeleteReady = appDataDeleteConfirmationMatches(deleteConfirmation);
  const exportPreviewReady = Boolean(userDataControls?.preview);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = React.useState(true);
  const [setupDetailsOpen, setSetupDetailsOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [healthOpen, setHealthOpen] = React.useState(false);
  const [deleteControlsOpen, setDeleteControlsOpen] = React.useState(true);
  const [historyDetailOpen, setHistoryDetailOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(true);
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const openPrivacyPolicy = React.useCallback(() => {
    if (releaseLinks.privacyPolicyUrl) {
      void Linking.openURL(releaseLinks.privacyPolicyUrl);
    }
  }, [releaseLinks.privacyPolicyUrl]);
  const openSupport = React.useCallback(() => {
    if (releaseLinks.supportUrl) {
      void Linking.openURL(releaseLinks.supportUrl);
    }
  }, [releaseLinks.supportUrl]);
  const openTermsOfUse = React.useCallback(() => {
    if (releaseLinks.termsOfUseUrl) {
      void Linking.openURL(releaseLinks.termsOfUseUrl);
    }
  }, [releaseLinks.termsOfUseUrl]);
  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const openPlan = React.useCallback(() => {
    if (onOpenPlan) {
      onOpenPlan();
    }
  }, [onOpenPlan]);

  const setupDetailsSummary = "Inputs, units, schedule, and quick updates.";
  const profileDetailsSummary = "Setup details, health notes, privacy controls, and account actions.";
  const privacySummary = releaseLinks.privacyPolicyUrlIsPlaceholder
    ? "Export and delete controls. Privacy policy URL is not configured."
    : "Export, privacy policy, terms, support, and delete controls.";
  const healthSummary = viewModel.healthWarning.active
    ? "Active health warning is shown above. Open for saved health and support details."
    : "Health notes, support path, and saved safety history.";

  return (
    <LuminousScreen accent="blue" testID="profile-screen">
      <ScreenHeader {...tabHeroHeaders.profile} />

      <View testID="profile-hero-card">
        <DashboardCard
          headerRight={<ProfileStatusPill label={viewModel.athleteSetup.statusLabel} tone={viewModel.athleteSetup.statusTone} />}
          testID="profile-athlete-section"
          title="Athlete setup"
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: profilePalette.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 26 }}>{viewModel.athleteSetup.contextLabel}</Text>
              {viewModel.athleteSetup.summaryLines.slice(0, 2).map((line) => (
                <Text key={`profile-setup-line:${line}`} style={profileTextStyles.body}>{line}</Text>
              ))}
            </View>
            <Text style={profileTextStyles.subtle}>As of {asOfDate}</Text>
            <Text style={profileTextStyles.body}>{viewModel.athleteSetup.explanation}</Text>
            <ProfileIconButton icon="create-outline" label="Edit setup" onPress={openSettings} tone={viewModel.athleteSetup.statusTone} variant="primary" />
          </View>
        </DashboardCard>
      </View>

      <ProfileSetupSnapshot cycleTrackingStatus={cycleTrackingStatus} viewModel={viewModel} />

      {viewModel.healthWarning.active ? (
        <DashboardCard headerRight={<ProfileStatusPill label={viewModel.healthWarning.statusLabel} tone="red" />} testID="profile-health-warning-card" title="Health warning">
          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typography.cardTitle, color: profilePalette.textPrimary }}>{viewModel.healthWarning.title}</Text>
            <Text style={profileTextStyles.body}>{viewModel.healthWarning.summary}</Text>
            <Text style={profileTextStyles.subtle}>{viewModel.healthWarning.detail}</Text>
            <ProfileIconButton icon="medical-outline" label="Review health notes" onPress={() => {
              setProfileDetailsOpen(true);
              setHealthOpen(true);
            }} tone="red" variant="primary" />
          </View>
        </DashboardCard>
      ) : null}

      <ProfilePriorityActions
        accountDeleteConfirmation={accountDeleteConfirmation}
        busy={busy}
        deleteConfirmation={deleteConfirmation}
        onOpenPlan={openPlan}
        onOpenPrivacyPolicy={openPrivacyPolicy}
        onOpenSettings={openSettings}
        onOpenSupport={openSupport}
        onOpenTermsOfUse={openTermsOfUse}
        onSignOut={onSignOut}
        planUnavailable={!onOpenPlan}
        privacyPolicyUnavailable={releaseLinks.privacyPolicyUrlIsPlaceholder}
        setAccountDeleteConfirmation={setAccountDeleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        supportUnavailable={!releaseLinks.supportUrl}
        termsOfUseUnavailable={!releaseLinks.termsOfUseUrl}
        userDataControls={userDataControls}
      />

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
          />
        </View>
      ) : null}

      <ProfileDisclosureSection
        defaultTone="muted"
        onToggle={() => setProfileDetailsOpen((value) => !value)}
        open={profileDetailsOpen}
        summary={profileDetailsSummary}
        testID="profile-details-section"
        title="Profile details"
        toggleTestID="profile-details-toggle"
      >
        <ProfileDisclosureSection
          defaultTone="muted"
          onToggle={() => setSetupDetailsOpen((value) => !value)}
          open={setupDetailsOpen}
          summary={setupDetailsSummary}
          testID="profile-setup-details-section"
          title="Setup details"
          accessibilityName="Setup details"
        >
          <View testID="profile-key-setup-row">
            <GroupedMetricTiles
              items={viewModel.keySetup.map((item) => ({
                icon: item.label.toLowerCase().includes("schedule") ? "calendar-outline" : item.label.toLowerCase().includes("equipment") ? "barbell-outline" : "person-outline",
                label: item.label,
                tone: item.tone,
                value: item.value
              }))}
            />
          </View>
          <DashboardCard testID="profile-schedule-breakdown-card" title="Schedule">
            <View style={{ gap: spacing.md }}>
              {viewModel.schedulePresentation.map((item) => <SchedulePresentationRow item={item} key={`profile-schedule:${item.label}`} />)}
            </View>
          </DashboardCard>
          <DashboardCard testID="profile-app-inputs-card" title="App inputs">
            <View style={{ gap: spacing.md }}>
              {viewModel.appInputs.map((item) => <AppInputRow item={item} key={`profile-app-input:${item.label}`} />)}
            </View>
          </DashboardCard>
          <DashboardCard testID="profile-quick-updates-card" title="Quick updates">
            <View style={{ gap: spacing.md }}>
              <Text style={profileTextStyles.subtle}>Cycle support: {cycleTrackingStatus}.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <View style={{ flexBasis: 220, flexGrow: 1 }}>
                  <ProfileIconButton disabled={!onOpenPlan || busy} icon="flag-outline" label="Change goal or schedule" onPress={openPlan} tone="blue" />
                </View>
                <View style={{ flexBasis: 220, flexGrow: 1 }}>
                  <ProfileIconButton disabled={!onOpenPlan || busy} icon="calendar-outline" label="Edit existing training" onPress={openPlan} tone="green" />
                </View>
                <View style={{ flexBasis: 220, flexGrow: 1 }}>
                  <ProfileIconButton disabled={busy} icon="barbell-outline" label="Update equipment" onPress={openSettings} tone="muted" />
                </View>
                <View style={{ flexBasis: 220, flexGrow: 1 }}>
                  <ProfileIconButton disabled={busy} icon="resize-outline" label="Units" onPress={openSettings} tone="muted" />
                </View>
                <View style={{ flexBasis: 220, flexGrow: 1 }}>
                  <ProfileIconButton disabled={busy} icon="sync-outline" label="Cycle support" onPress={openSettings} tone="muted" />
                </View>
              </View>
            </View>
          </DashboardCard>
        </ProfileDisclosureSection>

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
          <DashboardCard headerRight={<ProfileStatusPill label="Health note" tone="red" />} title="Health warning">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Active health warning is shown above.</Text>
              <Text style={profileTextStyles.subtle}>Open this section for saved safety history and support details.</Text>
            </View>
          </DashboardCard>
        ) : null}
        <DashboardCard title="Safety history">
          <View style={{ gap: spacing.md }}>
            {viewModel.healthSafetyItems.map((item) => (
              <HealthSafetyRow
                item={viewModel.healthWarning.active && item.label === "Health notes" ? { ...item, detail: "Active health warning is shown above." } : item}
                key={`profile-health-safety:${item.label}`}
              />
            ))}
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
        <DashboardCard title="Support">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Account help, account deletion steps, privacy questions, and urgent safety guidance are available on the public CornerIQ Support page.</Text>
            <ProfileIconButton disabled={!releaseLinks.supportUrl} icon="help-circle-outline" label="Open Support" onPress={openSupport} tone="blue" />
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
            <Text style={profileTextStyles.subtle}>Delete account is the full removal path. Delete app data only keeps the sign-in identity.</Text>
          </View>
        </DashboardCard>
        <ProfileDisclosureSection
          defaultTone="red"
          onToggle={() => setDeleteControlsOpen((value) => !value)}
          open={deleteControlsOpen}
          summary="Export first; destructive actions require exact confirmation."
          testID="profile-delete-controls"
          title="Delete controls"
        >
          <DashboardCard title="Delete account">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Full account removal: preview/export your data, type DELETE ACCOUNT, then delete the sign-in identity and app data.</Text>
              <Text style={profileTextStyles.subtle}>This is irreversible and signs you out. Export first. Requires DELETE ACCOUNT.</Text>
              <TextInput accessibilityLabel="Delete account confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setAccountDeleteConfirmation} placeholder="Type DELETE ACCOUNT to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={accountDeleteConfirmation} />
              <ProfileIconButton
                disabled={!userDataControls || !accountDeleteReady || busy || userDataControls.busy}
                icon="person-remove-outline"
                label="Delete account"
                onPress={() => void userDataControls?.deleteAccount()}
                tone="red"
              />
              {userDataControls?.accountDeletionResultRows.map((row, index) => <Text key={`profile-account-deletion-result:${index}`} style={profileTextStyles.subtle}>{row}</Text>)}
            </View>
          </DashboardCard>
          <DashboardCard title="Delete app data only">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Deletes user-owned app rows only. It does not delete auth identity.</Text>
              <Text style={profileTextStyles.subtle}>Requires an export preview and the word DELETE.</Text>
              {!exportPreviewReady ? <Text style={profileTextStyles.subtle}>Preview export first to enable app-data deletion.</Text> : null}
              <TextInput accessibilityLabel="Delete confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={deleteConfirmation} />
              <ProfileIconButton
                disabled={!userDataControls || !appDataDeleteReady || !exportPreviewReady || busy || userDataControls.busy}
                icon="trash-outline"
                label="Delete app data only"
                onPress={() => void userDataControls?.deleteData()}
                tone="red"
              />
            </View>
          </DashboardCard>
        </ProfileDisclosureSection>
      </ProfileDisclosureSection>

        <ProfileDisclosureSection
          defaultTone="muted"
          onToggle={() => setAccountOpen((value) => !value)}
          open={accountOpen}
          summary="Sign out and account session actions."
          testID="profile-account-section"
          title="Account"
        >
        <DashboardCard title="Account">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Sign out of this device when you are done.</Text>
            <ProfileIconButton disabled={busy || Boolean(userDataControls?.busy)} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} tone="muted" />
          </View>
        </DashboardCard>
        </ProfileDisclosureSection>
      </ProfileDisclosureSection>
    </LuminousScreen>
  );
}
