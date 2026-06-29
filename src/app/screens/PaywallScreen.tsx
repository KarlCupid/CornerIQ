import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import type { SubscriptionPlanPeriod, SubscriptionPlanViewModel } from "../../engine/subscription/paywallEngine";
import { DashboardCard, DashboardPill } from "../../design/components/PerformanceVisuals";
import { LuminousScreen, ScreenHeader } from "../../design/components/LuminousScreen";
import { glassStyles } from "../../design/glass";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import type { SubscriptionHook } from "../../hooks/useSubscription";
import type { UserDataControlsHook } from "../../hooks/useUserDataControls";
import { getReleaseLinkConfig } from "../../services/config/runtimeConfig";
import { SUPPORT_OUTSIDE_APP_COPY } from "../supportCopy";
import { screenStyles } from "./screenStyles";

function PaywallActionButton({
  disabled = false,
  icon,
  label,
  onPress,
  variant = "quiet"
}: {
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: "primary" | "quiet" | undefined;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...(primary ? glassStyles.primaryControl : glassStyles.control),
        alignItems: "center",
        backgroundColor: primary ? (pressed ? colors.wrap : colors.canvas) : pressed ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.07)",
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 48,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Ionicons color={primary ? colors.cornerBlack : colors.canvas} name={icon} size={18} />
      <Text style={primary ? screenStyles.buttonText : screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

function PlanCard({
  busy,
  disabled,
  onPress,
  plan
}: {
  busy: boolean;
  disabled: boolean;
  onPress: (period: SubscriptionPlanPeriod) => void;
  plan: SubscriptionPlanViewModel;
}) {
  const annual = plan.period === "annual";
  return (
    <Pressable
      accessibilityLabel={`${plan.period} subscription ${plan.priceLabel}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(plan.period)}
      style={({ pressed }) => ({
        ...glassStyles.card,
        backgroundColor: pressed ? "rgba(39, 206, 241, 0.16)" : annual ? "rgba(255, 216, 97, 0.12)" : "rgba(255, 255, 255, 0.07)",
        borderColor: annual ? "rgba(255, 216, 97, 0.42)" : "rgba(255, 255, 255, 0.16)",
        flexBasis: 240,
        flexGrow: 1,
        gap: spacing.sm,
        minHeight: 172,
        opacity: disabled ? 0.55 : 1,
        padding: spacing.lg
      })}
      testID={`paywall-plan-${plan.period}`}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text style={{ color: colors.canvas, flex: 1, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>
          {annual ? "Yearly" : "Monthly"}
        </Text>
        {plan.badge ? <DashboardPill label={plan.badge} tone={annual ? "gold" : "blue"} /> : null}
      </View>
      <Text style={{ color: annual ? colors.gold : colors.blueIQ, fontSize: 28, fontWeight: "900", lineHeight: 34 }}>{plan.priceLabel}</Text>
      <Text style={screenStyles.body}>{plan.description}</Text>
      <Text style={screenStyles.subtle}>{plan.valueLabel}</Text>
      <View
        style={{
          ...(annual ? glassStyles.primaryControl : glassStyles.control),
          alignItems: "center",
          backgroundColor: annual ? colors.canvas : "rgba(255, 255, 255, 0.07)",
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "center",
          minHeight: 48,
          opacity: busy ? 0.72 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        <Ionicons color={annual ? colors.cornerBlack : colors.canvas} name="lock-open-outline" size={18} />
        <Text style={annual ? screenStyles.buttonText : screenStyles.quietButtonText}>{plan.ctaLabel}</Text>
      </View>
    </Pressable>
  );
}

export interface PaywallScreenProps {
  onSignOut: () => Promise<void>;
  subscription: SubscriptionHook;
  userDataControls?: UserDataControlsHook | undefined;
}

export function PaywallScreen({ onSignOut, subscription, userDataControls }: PaywallScreenProps) {
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const viewModel = subscription.viewModel;
  const actionsDisabled = subscription.busy || subscription.loading || Boolean(viewModel.setupBlockedReason);
  const planActionsDisabled = actionsDisabled || !subscription.purchaseAvailable;

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

  return (
    <LuminousScreen accent="blue" bottomInset="none" testID="paywall-screen">
      <ScreenHeader
        accent="blue"
        eyebrow={viewModel.statusLabel}
        subtitle={viewModel.summary}
        title={viewModel.headline}
      />

      <DashboardCard headerRight={<DashboardPill label={viewModel.statusLabel} tone={viewModel.setupBlockedReason ? "orange" : "blue"} />} testID="paywall-plans-card" title="Choose access">
        <View style={{ gap: spacing.md }}>
          {viewModel.setupBlockedReason ? (
            <Text style={{ ...screenStyles.callout, color: colors.amberCaution }}>{viewModel.setupBlockedReason}</Text>
          ) : null}
          {subscription.error ? <Text style={{ ...screenStyles.callout, color: colors.amberCaution }}>{subscription.error}</Text> : null}
          {subscription.purchaseUnavailableReason ? <Text style={{ ...screenStyles.callout, color: colors.amberCaution }}>{subscription.purchaseUnavailableReason}</Text> : null}
          {subscription.message ? <Text style={screenStyles.successText}>{subscription.message}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {viewModel.plans.map((plan) => (
              <PlanCard
                busy={subscription.busy}
                disabled={planActionsDisabled}
                key={`paywall-plan:${plan.period}`}
                onPress={(period) => void subscription.purchasePlan(period)}
                plan={plan}
              />
            ))}
          </View>
          <PaywallActionButton disabled={subscription.busy || Boolean(viewModel.setupBlockedReason)} icon="refresh-outline" label={viewModel.restoreLabel} onPress={() => void subscription.restore()} />
          <Text style={screenStyles.subtle}>{viewModel.legalCopy}</Text>
          <Text style={screenStyles.subtle}>{viewModel.footerCopy}</Text>
        </View>
      </DashboardCard>

      <DashboardCard title="What stays safe">
        <View style={{ gap: spacing.sm }}>
          {viewModel.supportBullets.map((bullet) => (
            <View key={`paywall-bullet:${bullet}`} style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm }}>
              <Ionicons color={colors.readyGreen} name="checkmark-circle-outline" size={18} />
              <Text style={{ ...screenStyles.body, flex: 1 }}>{bullet}</Text>
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard title="Account access">
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.body}>{viewModel.accountAccessCopy}</Text>
          <Text style={screenStyles.subtle}>{SUPPORT_OUTSIDE_APP_COPY}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <View style={{ flexBasis: 180, flexGrow: 1 }}>
              <PaywallActionButton disabled={releaseLinks.privacyPolicyUrlIsPlaceholder} icon="document-text-outline" label="Privacy Policy" onPress={openPrivacyPolicy} />
            </View>
            <View style={{ flexBasis: 180, flexGrow: 1 }}>
              <PaywallActionButton disabled={!releaseLinks.supportUrl} icon="help-circle-outline" label="Support" onPress={openSupport} />
            </View>
            <View style={{ flexBasis: 180, flexGrow: 1 }}>
              <PaywallActionButton disabled={subscription.busy || Boolean(userDataControls?.busy)} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} />
            </View>
          </View>
        </View>
      </DashboardCard>

      <DashboardCard title="Data controls">
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.body}>Export first before destructive account actions.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <View style={{ flexBasis: 220, flexGrow: 1 }}>
              <PaywallActionButton disabled={!userDataControls || userDataControls.busy} icon="eye-outline" label="Preview export" onPress={() => void userDataControls?.previewExport()} />
            </View>
            <View style={{ flexBasis: 220, flexGrow: 1 }}>
              <PaywallActionButton disabled={!userDataControls || userDataControls.busy} icon="download-outline" label="Generate export" onPress={() => void userDataControls?.generateExportBundle()} />
            </View>
          </View>
          {userDataControls?.previewRows.map((row, index) => <Text key={`paywall-preview-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
          {userDataControls?.portableExportRows.map((row, index) => <Text key={`paywall-export-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
          {userDataControls?.bundleText ? (
            <TextInput accessibilityLabel="Portable JSON export payload" editable={false} multiline style={[screenStyles.input, { minHeight: 120 }]} value={userDataControls.bundleText} />
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Delete account</Text>
            <Text style={screenStyles.subtle}>Deletes app data and the sign-in identity through the server-side account deletion function. Requires DELETE ACCOUNT.</Text>
            <TextInput
              accessibilityLabel="Delete account confirmation"
              onChangeText={setAccountDeleteConfirmation}
              placeholder="Type DELETE ACCOUNT to enable"
              placeholderTextColor={colors.mutedText}
              style={screenStyles.input}
              value={accountDeleteConfirmation}
            />
            <PaywallActionButton
              disabled={!userDataControls || accountDeleteConfirmation !== "DELETE ACCOUNT" || userDataControls.busy}
              icon="person-remove-outline"
              label="Delete account"
              onPress={() => void userDataControls?.deleteAccount()}
            />
          </View>
          {userDataControls?.message ? <Text style={screenStyles.subtle}>{userDataControls.message}</Text> : null}
          {userDataControls?.accountDeletionResultRows.map((row, index) => <Text key={`paywall-delete-result:${index}`} style={screenStyles.subtle}>{row}</Text>)}
        </View>
      </DashboardCard>
    </LuminousScreen>
  );
}
