import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text as NativeText, TextInput, View, type TextProps, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { EditorialSurfaceProvider } from "../../design/components/EngineCard";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { colors, spacing } from "../../design/theme";
import { fontFamilies } from "../../design/typography";
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
  cardLine: "rgba(205, 239, 247, 0.14)",
  controlFill: "rgba(224, 244, 252, 0.055)",
  controlFillPressed: "rgba(39, 206, 241, 0.13)",
  controlLine: "rgba(205, 239, 247, 0.18)",
  textBody: "#D7E7F4",
  textMuted: "#A9BDD0",
  textPrimary: "#F6FBFF",
  toneBlue: "#27CEF1",
  toneGold: "#78DFF3",
  toneGreen: "#6FE5F6",
  toneMuted: "#A9BDD0",
  toneOrange: "#86E7F7",
  tonePurple: "#27CEF1",
  toneRed: "#FF6B75"
} as const;

function flattenEditorialStyle(style: unknown): TextStyle {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenEditorialStyle));
  return style && typeof style === "object" ? style as TextStyle : {};
}

function Text({ style, ...props }: TextProps) {
  const weight = Number.parseInt(String(flattenEditorialStyle(style).fontWeight ?? "400"), 10);
  const fontFamily = weight >= 900 ? fontFamilies.black : weight >= 800 ? fontFamilies.extraBold : weight >= 700 ? fontFamilies.bold : weight >= 600 ? fontFamilies.semibold : weight >= 500 ? fontFamilies.medium : fontFamilies.regular;
  return <NativeText {...props} style={[style, { fontFamily }]} />;
}

function DashboardCard({ children, footer, headerRight, testID, title }: React.PropsWithChildren<{ density?: unknown; footer?: React.ReactNode; headerRight?: React.ReactNode; testID?: string | undefined; title: string; titleVariant?: unknown }>) {
  return (
    <View style={{ backgroundColor: "transparent", borderBottomColor: profilePalette.cardLine, borderBottomWidth: 1, gap: spacing.md, paddingVertical: spacing.lg }} testID={testID}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text style={{ color: profilePalette.toneBlue, flex: 1, fontSize: 12, fontWeight: "900", letterSpacing: 0.4, lineHeight: 16, textTransform: "uppercase" }}>{title}</Text>
        {headerRight}
      </View>
      {children}
      {footer}
    </View>
  );
}

function GroupedMetricTiles({ items, testID }: { items: readonly { icon?: keyof typeof Ionicons.glyphMap | undefined; label: string; meta?: string | undefined; tone?: ProfileVisualTone | undefined; value: string }[]; testID?: string | undefined }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID={testID}>
      {items.map((item) => {
        const color = profileColorForTone(item.tone ?? "muted");
        return (
          <View accessibilityLabel={`${item.label}: ${item.value}${item.meta ? `. ${item.meta}` : ""}`} key={`profile-metric:${item.label}`} style={{ borderColor: profilePalette.controlLine, borderRadius: 4, borderWidth: 1, flexBasis: 138, flexGrow: 1, gap: spacing.xs, minHeight: 96, padding: spacing.md }}>
            {item.icon ? <Ionicons color={color} name={item.icon} size={20} /> : null}
            <Text style={{ color: profilePalette.textMuted, fontSize: 11, fontWeight: "800", lineHeight: 15, textTransform: "uppercase" }}>{item.label}</Text>
            <Text style={{ color: profilePalette.textPrimary, fontSize: 17, fontWeight: "900", lineHeight: 21 }}>{item.value}</Text>
            {item.meta ? <Text style={{ color: profilePalette.textMuted, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{item.meta}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

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
        alignItems: "center",
        backgroundColor: variant === "primary"
          ? pressed ? profilePalette.actionFillPressed : profilePalette.actionFill
          : pressed ? profilePalette.controlFillPressed : profilePalette.controlFill,
        borderColor: variant === "primary" ? profilePalette.actionBorder : profileTint(tone, "33"),
        borderRadius: 5,
        borderWidth: 1,
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
          borderRadius: 4,
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
          alignItems: "center",
          backgroundColor: pressed ? profilePalette.controlFillPressed : profilePalette.controlFill,
          borderColor: open ? profileTint(defaultTone, "42") : profilePalette.controlLine,
          borderRadius: 5,
          borderWidth: 1,
          boxShadow: "none",
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

function ProfileAccountEssentials({
  busy,
  onOpenPrivacyPolicy,
  onOpenSupport,
  onOpenTermsOfUse,
  onSignOut,
  privacyPolicyUnavailable,
  supportUnavailable,
  termsOfUseUnavailable
}: {
  busy: boolean;
  onOpenPrivacyPolicy: () => void;
  onOpenSupport: () => void;
  onOpenTermsOfUse: () => void;
  onSignOut: () => Promise<void>;
  privacyPolicyUnavailable: boolean;
  supportUnavailable: boolean;
  termsOfUseUnavailable: boolean;
}) {
  return (
    <DashboardCard testID="profile-priority-actions-card" title="Account essentials">
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut support link" disabled={supportUnavailable} icon="help-circle-outline" label="Support" onPress={onOpenSupport} tone="muted" />
          </View>
          <View style={{ flex: 1 }}>
            <ProfileIconButton accessibilityLabel={privacyPolicyUnavailable ? "Shortcut privacy unavailable" : "Shortcut privacy link"} disabled={privacyPolicyUnavailable} icon="document-text-outline" label="Privacy" onPress={onOpenPrivacyPolicy} tone="muted" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut terms of use link" disabled={termsOfUseUnavailable} icon="reader-outline" label="Terms" onPress={onOpenTermsOfUse} tone="muted" />
          </View>
          <View style={{ flex: 1 }}>
            <ProfileIconButton accessibilityLabel="Shortcut account exit" disabled={busy} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} tone="muted" />
          </View>
        </View>
      </View>
    </DashboardCard>
  );
}

function ProfileSettingsModal({
  busy,
  cycleTrackingPreference,
  equipmentAccess,
  initialPage,
  onClose,
  onOpenPlan,
  onUpdateSettings,
  preferredUnits,
  visible
}: {
  busy: boolean;
  cycleTrackingPreference: "enabled" | "disabled" | "undecided";
  equipmentAccess: readonly string[];
  initialPage: "equipment" | "overview";
  onClose: () => void;
  onOpenPlan: () => void;
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "imperial" | "metric";
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ backgroundColor: colors.cornerBlack, flex: 1 }}>
        <View
          style={{
            alignItems: "center",
            borderBottomColor: profilePalette.cardLine,
            borderBottomWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            minHeight: 56,
            paddingHorizontal: spacing.lg,
            paddingTop: insets.top
          }}
        >
          <Text style={{ color: profilePalette.textPrimary, fontSize: 16, fontWeight: "900" }}>{initialPage === "equipment" ? "Equipment" : "Profile setup"}</Text>
          <Pressable accessibilityLabel="Close profile settings" accessibilityRole="button" disabled={busy} hitSlop={8} onPress={onClose} style={{ alignItems: "center", height: 44, justifyContent: "center", opacity: busy ? 0.5 : 1, width: 44 }}>
            <Ionicons color={profilePalette.textPrimary} name="close" size={24} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xxl), paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="profile-settings-modal"
        >
          <ProfileSettingsScreen
            busy={busy}
            cycleTrackingPreference={cycleTrackingPreference}
            equipmentAccess={equipmentAccess}
            initialPage={initialPage}
            onClose={onClose}
            onOpenPlan={onOpenPlan}
            onUpdateSettings={onUpdateSettings}
            preferredUnits={preferredUnits}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  const insets = useSafeAreaInsets();
  const [fallbackDeleteConfirmation, setFallbackDeleteConfirmation] = React.useState("");
  const deleteConfirmation = userDataControls?.deleteConfirmation ?? fallbackDeleteConfirmation;
  const setDeleteConfirmation = userDataControls?.setDeleteConfirmation ?? setFallbackDeleteConfirmation;
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const accountDeleteReady = accountDeleteConfirmationMatches(accountDeleteConfirmation);
  const appDataDeleteReady = appDataDeleteConfirmationMatches(deleteConfirmation);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = React.useState<"equipment" | "overview">("overview");
  const [profileDetailsOpen, setProfileDetailsOpen] = React.useState(true);
  const [setupDetailsOpen, setSetupDetailsOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [healthOpen, setHealthOpen] = React.useState(false);
  const [deleteControlsOpen, setDeleteControlsOpen] = React.useState(false);
  const [historyDetailOpen, setHistoryDetailOpen] = React.useState(false);
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
  const openSettings = React.useCallback(() => {
    setSettingsInitialPage("overview");
    setSettingsOpen(true);
  }, []);
  const openEquipment = React.useCallback(() => {
    setSettingsInitialPage("equipment");
    setSettingsOpen(true);
  }, []);
  const openPlan = React.useCallback(() => {
    if (onOpenPlan) {
      onOpenPlan();
    }
  }, [onOpenPlan]);

  const setupDetailsSummary = "Inputs, units, schedule, and quick updates.";
  const profileDetailsSummary = "Setup details, history, privacy, and account controls.";
  const privacySummary = releaseLinks.privacyPolicyUrlIsPlaceholder
    ? "Export and delete controls. Privacy policy URL is not configured."
    : "Export, privacy policy, terms, support, and delete controls.";
  const healthSummary = "Training history, cycle context, and support.";

  return (
    <>
    <StatusBar backgroundColor="transparent" style="dark" translucent />
    <LuminousScreen accent="blue" contentGap={0} immersiveHeader testID="profile-screen">
      <EditorialSurfaceProvider>
      <ScreenHeader {...tabHeroHeaders.profile} immersive topInset={insets.top} />

      <View testID="profile-hero-card">
        <DashboardCard
          headerRight={<ProfileStatusPill label={viewModel.athleteSetup.statusLabel} tone={viewModel.athleteSetup.statusTone} />}
          testID="profile-athlete-section"
          title="Athlete setup"
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: profilePalette.textPrimary, fontSize: 30, fontWeight: "900", lineHeight: 34 }}>{viewModel.athleteSetup.contextLabel}</Text>
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

      <ProfileAccountEssentials
        busy={busy || Boolean(userDataControls?.busy)}
        onOpenPrivacyPolicy={openPrivacyPolicy}
        onOpenSupport={openSupport}
        onOpenTermsOfUse={openTermsOfUse}
        onSignOut={onSignOut}
        privacyPolicyUnavailable={releaseLinks.privacyPolicyUrlIsPlaceholder}
        supportUnavailable={!releaseLinks.supportUrl}
        termsOfUseUnavailable={!releaseLinks.termsOfUseUrl}
      />

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
                  <ProfileIconButton disabled={busy} icon="barbell-outline" label="Update equipment" onPress={openEquipment} tone="muted" />
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
        defaultTone="muted"
        onToggle={() => setHealthOpen((value) => !value)}
        open={healthOpen}
        summary={healthSummary}
        testID="profile-safety-section"
        title="History & Support"
      >
        <DashboardCard title="Safety history">
          <View style={{ gap: spacing.md }}>
            {viewModel.healthSafetyItems.filter((item) => item.label !== "Health notes").map((item) => <HealthSafetyRow item={item} key={`profile-health-safety:${item.label}`} />)}
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
              <Text style={profileTextStyles.subtle}>History explains app state; support and review actions stay in their relevant training or fuel screens.</Text>
              {recentLogs.profile.length > 0 ? recentLogs.profile.map((item, index) => <Text key={`profile-history-detail:${index}`} style={profileTextStyles.subtle}>{item}</Text>) : <Text style={profileTextStyles.subtle}>No profile or journey history detail is loaded yet.</Text>}
              <Text style={profileTextStyles.subtle}>Training block week {viewModel.trainingAuditSummary.currentWeekIndex}; saved week summaries {viewModel.trainingAuditSummary.activeBlockHistoryCount}.</Text>
              {viewModel.trainingAuditSummary.latestEventSummary ? <Text style={profileTextStyles.subtle}>{viewModel.trainingAuditSummary.latestEventSummary}</Text> : null}
            </View>
          </DashboardCard>
        ) : null}
        <DashboardCard title="Fuel safety history">
          <View style={{ gap: spacing.sm }}>
            <Text style={profileTextStyles.body}>Nutrition review history appears in Fuel when active or recently saved.</Text>
            <Text style={profileTextStyles.subtle}>Nutrition review history and support guidance remain available in Fuel.</Text>
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
            <Text style={profileTextStyles.body}>Preview or generate a portable copy of your CornerIQ data.</Text>
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
          summary="Destructive actions require an exact typed confirmation."
          testID="profile-delete-controls"
          title="Delete controls"
        >
          <DashboardCard title="Delete account">
            <View style={{ gap: spacing.sm }}>
              <Text style={profileTextStyles.body}>Permanently deletes your sign-in identity and CornerIQ app data.</Text>
              <Text style={[profileTextStyles.subtle, { color: profilePalette.toneRed }]}>Deleting your CornerIQ account does not cancel an App Store subscription. Cancel it separately in Apple Subscriptions to stop future renewals.</Text>
              <Text style={profileTextStyles.subtle}>This is irreversible and signs you out. Type DELETE ACCOUNT exactly.</Text>
              <TextInput accessibilityLabel="Delete account confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setAccountDeleteConfirmation} placeholder="Type DELETE ACCOUNT to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={accountDeleteConfirmation} />
              {accountDeleteConfirmation.length > 0 ? <Text style={[profileTextStyles.subtle, { color: accountDeleteReady ? profilePalette.toneGreen : profilePalette.textMuted }]}>{accountDeleteReady ? "Confirmation matched. Delete account is ready." : "Enter DELETE ACCOUNT exactly."}</Text> : null}
              <ProfileIconButton
                disabled={!userDataControls || !accountDeleteReady || userDataControls.busy}
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
              <Text style={profileTextStyles.subtle}>Type DELETE exactly. Exporting first is recommended, but not required.</Text>
              <TextInput accessibilityLabel="Delete confirmation" autoCapitalize="characters" autoCorrect={false} onChangeText={setDeleteConfirmation} placeholder="Type DELETE to enable" placeholderTextColor={profilePalette.textMuted} style={[screenStyles.input, { color: profilePalette.textPrimary }]} value={deleteConfirmation} />
              {deleteConfirmation.length > 0 ? <Text style={[profileTextStyles.subtle, { color: appDataDeleteReady ? profilePalette.toneGreen : profilePalette.textMuted }]}>{appDataDeleteReady ? "Confirmation matched. Delete app data is ready." : "Enter DELETE exactly."}</Text> : null}
              <ProfileIconButton
                disabled={!userDataControls || !appDataDeleteReady || userDataControls.busy}
                icon="trash-outline"
                label="Delete app data only"
                onPress={() => void userDataControls?.deleteData()}
                tone="red"
              />
            </View>
          </DashboardCard>
        </ProfileDisclosureSection>
      </ProfileDisclosureSection>
      </ProfileDisclosureSection>
      </EditorialSurfaceProvider>
    </LuminousScreen>
    <ProfileSettingsModal
      busy={busy}
      cycleTrackingPreference={cycleTrackingStatus === "enabled" || cycleTrackingStatus === "disabled" ? cycleTrackingStatus : "undecided"}
      equipmentAccess={equipmentAccess}
      initialPage={settingsInitialPage}
      onClose={() => setSettingsOpen(false)}
      onOpenPlan={() => {
        setSettingsOpen(false);
        openPlan();
      }}
      onUpdateSettings={onUpdateSettings}
      preferredUnits={preferredUnits}
      visible={settingsOpen}
    />
    </>
  );
}
