import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { PaywallViewModel, SubscriptionPlanPeriod, SubscriptionPlanViewModel } from "../../engine/subscription/paywallEngine";
import { DashboardCard, DashboardPill } from "../../design/components/PerformanceVisuals";
import { LuminousScreen } from "../../design/components/LuminousScreen";
import { glassStyles } from "../../design/glass";
import { colors, radii, spacing } from "../../design/theme";
import { fontFamilies, typography } from "../../design/typography";
import type { SubscriptionHook } from "../../hooks/useSubscription";
import { accountDeleteConfirmationMatches, type UserDataControlsHook } from "../../hooks/useUserDataControls";
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

const disclosureIconById: Record<PaywallViewModel["purchaseDisclosures"][number]["id"], keyof typeof Ionicons.glyphMap> = {
  billing: "card-outline",
  renewal: "repeat-outline",
  trial: "calendar-clear-outline"
};

function DisclosureTiles({
  items
}: {
  items: PaywallViewModel["purchaseDisclosures"];
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {items.map((item) => (
        <View
          accessibilityLabel={`${item.label}: ${item.value}`}
          key={`paywall-disclosure:${item.id}`}
          style={{
            ...glassStyles.tile,
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.045)",
            borderColor: "rgba(232, 240, 255, 0.12)",
            flexBasis: 144,
            flexDirection: "row",
            flexGrow: 1,
            gap: spacing.sm,
            minHeight: 64,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(39, 206, 241, 0.1)",
              borderColor: "rgba(39, 206, 241, 0.25)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 34,
              justifyContent: "center",
              width: 34
            }}
          >
            <Ionicons color={colors.blueIQ} name={disclosureIconById[item.id]} size={17} />
          </View>
          <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.wrap, fontFamily: fontFamilies.bold, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>
              {item.label}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.canvas, fontFamily: fontFamilies.extraBold, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PaywallHero({
  compact,
  viewModel
}: {
  compact: boolean;
  viewModel: PaywallViewModel;
}) {
  const blocked = Boolean(viewModel.setupBlockedReason);
  const accent = blocked ? colors.amberCaution : colors.blueIQ;
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: "rgba(3, 10, 22, 0.95)",
        borderColor: blocked ? "rgba(255, 148, 72, 0.36)" : "rgba(39, 206, 241, 0.34)",
        boxShadow: blocked ? "0 24px 54px rgba(0, 0, 0, 0.44)" : "0 24px 54px rgba(0, 0, 0, 0.44), 0 0 34px rgba(39, 206, 241, 0.16)",
        gap: spacing.lg,
        overflow: "hidden",
        padding: compact ? spacing.lg : spacing.xl
      }}
    >
      <View pointerEvents="none" style={{ backgroundColor: accent, height: 3, left: 0, opacity: 0.84, position: "absolute", right: 0, top: 0 }} />
      <View style={{ alignItems: compact ? "flex-start" : "center", flexDirection: compact ? "column" : "row", gap: spacing.lg }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: blocked ? "rgba(255, 148, 72, 0.11)" : "rgba(39, 206, 241, 0.11)",
            borderColor: blocked ? "rgba(255, 148, 72, 0.36)" : "rgba(39, 206, 241, 0.34)",
            borderRadius: radii.pill,
            borderWidth: 1,
            height: 62,
            justifyContent: "center",
            width: 62
          }}
        >
          <Ionicons color={accent} name={blocked ? "construct-outline" : "shield-checkmark-outline"} size={30} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={{ color: accent, fontFamily: fontFamilies.black, fontSize: 12, fontWeight: "900", letterSpacing: 0, lineHeight: 16, textTransform: "uppercase" }}>
            {viewModel.statusLabel}
          </Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={{ color: colors.canvas, fontFamily: fontFamilies.black, fontSize: compact ? 38 : 44, fontWeight: "900", letterSpacing: 0, lineHeight: compact ? 43 : 50 }}>
            {viewModel.headline}
          </Text>
          <Text style={{ ...screenStyles.body, color: colors.wrap, maxWidth: 620 }}>
            {viewModel.summary}
          </Text>
        </View>
      </View>
      <DisclosureTiles items={viewModel.purchaseDisclosures} />
    </View>
  );
}

function PlanBadge({ label }: { label: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255, 216, 97, 0.13)",
        borderColor: "rgba(255, 216, 97, 0.36)",
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.gold, fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", letterSpacing: 0, lineHeight: 15 }}>
        {label}
      </Text>
    </View>
  );
}

function PlanCard({
  busy,
  compact,
  disabled,
  onPress,
  plan
}: {
  busy: boolean;
  compact: boolean;
  disabled: boolean;
  onPress: (period: SubscriptionPlanPeriod) => void;
  plan: SubscriptionPlanViewModel;
}) {
  const annual = plan.period === "annual";
  const accent = annual ? colors.gold : colors.blueIQ;
  const planLabel = annual ? "Annual" : "Monthly";
  return (
    <Pressable
      accessibilityLabel={`${planLabel} subscription ${plan.priceLabel}. ${plan.description}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(plan.period)}
      style={({ pressed }) => ({
        ...glassStyles.card,
        backgroundColor: pressed ? (annual ? "rgba(255, 216, 97, 0.18)" : "rgba(39, 206, 241, 0.15)") : annual ? "rgba(32, 23, 7, 0.88)" : "rgba(5, 17, 34, 0.78)",
        borderColor: annual ? "rgba(255, 216, 97, 0.58)" : "rgba(39, 206, 241, 0.26)",
        boxShadow: annual ? "0 20px 44px rgba(0, 0, 0, 0.38), 0 0 24px rgba(255, 216, 97, 0.18)" : "0 18px 38px rgba(0, 0, 0, 0.34)",
        flexBasis: compact ? "100%" : annual ? 292 : 250,
        flexGrow: 1,
        gap: spacing.md,
        minHeight: annual ? 224 : 204,
        opacity: disabled ? 0.55 : 1,
        overflow: "hidden",
        padding: spacing.lg
      })}
      testID={`paywall-plan-${plan.period}`}
    >
      <View pointerEvents="none" style={{ backgroundColor: accent, height: 3, left: 0, opacity: annual ? 0.86 : 0.42, position: "absolute", right: 0, top: 0 }} />
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text style={{ color: colors.canvas, flex: 1, fontFamily: fontFamilies.black, fontSize: 19, fontWeight: "900", lineHeight: 24 }}>
          {planLabel}
        </Text>
        {plan.badge ? <PlanBadge label={plan.badge} /> : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={{ color: accent, fontFamily: fontFamilies.black, fontSize: annual ? 34 : 30, fontWeight: "900", lineHeight: annual ? 40 : 36 }}>
          {plan.priceLabel}
        </Text>
        <Text style={{ ...screenStyles.body, color: colors.canvas }}>{plan.description}</Text>
        <Text style={{ ...screenStyles.subtle, color: colors.wrap }}>{plan.valueLabel}</Text>
      </View>
      <View
        style={{
          ...(annual ? glassStyles.primaryControl : glassStyles.control),
          alignItems: "center",
          backgroundColor: annual ? colors.canvas : "rgba(39, 206, 241, 0.09)",
          borderColor: annual ? "rgba(255, 255, 255, 0.58)" : "rgba(39, 206, 241, 0.32)",
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "center",
          minHeight: 48,
          opacity: busy ? 0.72 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        <Ionicons color={annual ? colors.cornerBlack : colors.blueIQ} name="lock-open-outline" size={18} />
        <Text style={annual ? screenStyles.buttonText : { ...screenStyles.quietButtonText, color: colors.blueIQ }}>{plan.ctaLabel}</Text>
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
  const { width } = useWindowDimensions();
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const accountDeleteReady = accountDeleteConfirmationMatches(accountDeleteConfirmation);
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const viewModel = subscription.viewModel;
  const compact = width < 560;
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
  const openTermsOfUse = React.useCallback(() => {
    if (releaseLinks.termsOfUseUrl) {
      void Linking.openURL(releaseLinks.termsOfUseUrl);
    }
  }, [releaseLinks.termsOfUseUrl]);

  return (
    <LuminousScreen accent="blue" bottomInset="none" testID="paywall-screen">
      <PaywallHero compact={compact} viewModel={viewModel} />

      <DashboardCard headerRight={<DashboardPill label={viewModel.statusLabel} tone={viewModel.setupBlockedReason ? "orange" : "blue"} />} testID="paywall-plans-card" title="Choose access" titleVariant="loud">
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
                compact={compact}
                disabled={planActionsDisabled}
                key={`paywall-plan:${plan.period}`}
                onPress={(period) => void subscription.purchasePlan(period)}
                plan={plan}
              />
            ))}
          </View>
          <View style={{ alignItems: compact ? "stretch" : "center", flexDirection: compact ? "column" : "row", gap: spacing.sm }}>
            <View style={{ flexBasis: compact ? undefined : 220, flexGrow: compact ? 0 : 0 }}>
              <PaywallActionButton disabled={subscription.busy || Boolean(viewModel.setupBlockedReason)} icon="refresh-outline" label={viewModel.restoreLabel} onPress={() => void subscription.restore()} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
              <Text style={screenStyles.subtle}>{viewModel.legalCopy}</Text>
              <Text style={screenStyles.subtle}>{viewModel.footerCopy}</Text>
            </View>
          </View>
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
              <PaywallActionButton disabled={!releaseLinks.termsOfUseUrl} icon="reader-outline" label="Terms of Use" onPress={openTermsOfUse} />
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
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={setAccountDeleteConfirmation}
              placeholder="Type DELETE ACCOUNT to enable"
              placeholderTextColor={colors.mutedText}
              style={screenStyles.input}
              value={accountDeleteConfirmation}
            />
            <PaywallActionButton
              disabled={!userDataControls || !accountDeleteReady || userDataControls.busy}
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
