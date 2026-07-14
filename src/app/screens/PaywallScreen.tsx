import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
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
  loading = false,
  onPress,
  variant = "quiet"
}: {
  disabled?: boolean | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean | undefined;
  onPress: () => void;
  variant?: "primary" | "quiet" | undefined;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...(primary ? glassStyles.primaryControl : glassStyles.control),
        alignItems: "center",
        backgroundColor: primary ? (pressed ? colors.wrap : colors.canvas) : pressed ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.065)",
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: primary ? 56 : 48,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: primary ? spacing.xl : spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      {loading ? <ActivityIndicator color={colors.cornerBlack} size="small" /> : <Ionicons color={primary ? colors.cornerBlack : colors.canvas} name={icon} size={19} />}
      <Text style={primary ? screenStyles.buttonText : screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

const disclosureIconById: Record<PaywallViewModel["purchaseDisclosures"][number]["id"], keyof typeof Ionicons.glyphMap> = {
  billing: "card-outline",
  renewal: "repeat-outline",
  trial: "calendar-clear-outline"
};

function TrustStrip({ items }: { items: PaywallViewModel["purchaseDisclosures"] }) {
  return (
    <View accessibilityRole="summary" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {items.map((item) => (
        <View
          accessibilityLabel={`${item.label}: ${item.value}`}
          key={`paywall-disclosure:${item.id}`}
          style={{
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.055)",
            borderColor: "rgba(232, 240, 255, 0.12)",
            borderRadius: radii.pill,
            borderWidth: 1,
            flexDirection: "row",
            gap: 6,
            minHeight: 36,
            paddingHorizontal: spacing.md,
            paddingVertical: 6
          }}
        >
          <Ionicons color={colors.blueIQ} name={disclosureIconById[item.id]} size={15} />
          <Text style={{ color: colors.wrap, fontFamily: fontFamilies.semibold, fontSize: 12, fontWeight: "600", lineHeight: 16 }}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const heroBenefits: ReadonlyArray<{ copy: string; icon: keyof typeof Ionicons.glyphMap; title: string }> = [
  { copy: "Training built around boxing days and camp demands.", icon: "fitness-outline", title: "Boxing-first planning" },
  { copy: "Fuel and body-mass context without weight-cut pressure.", icon: "nutrition-outline", title: "Fuel with context" },
  { copy: "Missing data stays unknown and safety stays visible.", icon: "shield-checkmark-outline", title: "Safety-aware guidance" }
];

function PaywallHero({ compact, viewModel }: { compact: boolean; viewModel: PaywallViewModel }) {
  const blocked = Boolean(viewModel.setupBlockedReason);
  const accent = blocked ? colors.amberCaution : colors.blueIQ;
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: "rgba(3, 9, 20, 0.96)",
        borderColor: blocked ? "rgba(255, 148, 72, 0.38)" : "rgba(39, 206, 241, 0.3)",
        boxShadow: `0 24px 54px rgba(0, 0, 0, 0.45), 0 0 34px ${blocked ? "rgba(255, 148, 72, 0.1)" : "rgba(39, 206, 241, 0.14)"}`,
        gap: spacing.xl,
        overflow: "hidden",
        padding: compact ? spacing.lg : spacing.xl
      }}
    >
      <View pointerEvents="none" style={{ backgroundColor: accent, height: 3, left: 0, opacity: 0.9, position: "absolute", right: 0, top: 0 }} />
      <View style={{ gap: spacing.md }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View style={{ alignItems: "center", backgroundColor: "rgba(39, 206, 241, 0.1)", borderColor: "rgba(39, 206, 241, 0.28)", borderRadius: radii.pill, borderWidth: 1, height: 42, justifyContent: "center", width: 42 }}>
              <Ionicons color={accent} name={blocked ? "construct-outline" : "flash-outline"} size={21} />
            </View>
            <View>
              <Text style={{ color: accent, fontFamily: fontFamilies.black, fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>CornerIQ Pro</Text>
              <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: "500", lineHeight: 16 }}>{viewModel.statusLabel}</Text>
            </View>
          </View>
          <Ionicons color="rgba(217, 228, 244, 0.22)" name="shield-checkmark" size={44} />
        </View>
        <View style={{ gap: spacing.sm, maxWidth: 680 }}>
          <Text style={{ color: colors.canvas, fontFamily: fontFamilies.black, fontSize: compact ? 37 : 46, fontWeight: "900", letterSpacing: -0.5, lineHeight: compact ? 41 : 50 }}>
            {viewModel.headline}
          </Text>
          <Text style={{ ...screenStyles.body, color: colors.wrap, maxWidth: 620 }}>{viewModel.summary}</Text>
        </View>
      </View>
      <View style={{ flexDirection: compact ? "column" : "row", gap: spacing.sm }}>
        {heroBenefits.map((benefit) => (
          <View key={benefit.title} style={{ alignItems: "flex-start", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 0 }}>
            <Ionicons color={colors.readyGreen} name={benefit.icon} size={20} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.canvas, fontFamily: fontFamilies.bold, fontSize: 14, fontWeight: "700", lineHeight: 18 }}>{benefit.title}</Text>
              <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.regular, fontSize: 12, fontWeight: "400", lineHeight: 17 }}>{benefit.copy}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlanOption({
  disabled,
  onSelect,
  plan,
  selected
}: {
  disabled: boolean;
  onSelect: (period: SubscriptionPlanPeriod) => void;
  plan: SubscriptionPlanViewModel;
  selected: boolean;
}) {
  const annual = plan.period === "annual";
  const accent = annual ? colors.gold : colors.blueIQ;
  const planLabel = annual ? "Annual" : "Monthly";
  return (
    <Pressable
      accessibilityLabel={`${planLabel} plan, ${plan.priceLabel}. ${plan.valueLabel}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(plan.period)}
      style={({ pressed }) => ({
        backgroundColor: selected ? (annual ? "rgba(255, 216, 97, 0.105)" : "rgba(39, 206, 241, 0.1)") : pressed ? "rgba(255, 255, 255, 0.075)" : "rgba(255, 255, 255, 0.035)",
        borderColor: selected ? accent : "rgba(232, 240, 255, 0.14)",
        borderRadius: radii.control,
        borderWidth: selected ? 2 : 1,
        gap: spacing.md,
        minHeight: 144,
        opacity: disabled ? 0.5 : 1,
        padding: spacing.lg
      })}
      testID={`paywall-plan-${plan.period}`}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Text style={{ color: colors.canvas, fontFamily: fontFamilies.black, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>{planLabel}</Text>
            {plan.badge ? (
              <View style={{ backgroundColor: "rgba(255, 216, 97, 0.14)", borderColor: "rgba(255, 216, 97, 0.34)", borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
                <Text style={{ color: colors.gold, fontFamily: fontFamilies.black, fontSize: 10, fontWeight: "900", lineHeight: 14, textTransform: "uppercase" }}>{plan.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.regular, fontSize: 13, fontWeight: "400", lineHeight: 18 }}>{plan.description}</Text>
        </View>
        <View style={{ alignItems: "center", borderColor: selected ? accent : colors.lineStrong, borderRadius: radii.pill, borderWidth: 2, height: 26, justifyContent: "center", width: 26 }}>
          {selected ? <Ionicons color={accent} name="checkmark" size={17} /> : null}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text style={{ color: accent, flexShrink: 1, fontFamily: fontFamilies.black, fontSize: 30, fontWeight: "900", lineHeight: 35 }}>{plan.priceLabel}</Text>
        <Text style={{ color: colors.wrap, fontFamily: fontFamilies.semibold, fontSize: 13, fontWeight: "600", lineHeight: 18 }}>{plan.valueLabel}</Text>
      </View>
    </Pressable>
  );
}

function InlineLink({ disabled = false, label, onPress }: { disabled?: boolean | undefined; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ justifyContent: "center", minHeight: 44, opacity: disabled ? 0.45 : pressed ? 0.68 : 1, paddingHorizontal: spacing.sm })}>
      <Text style={{ color: colors.wrap, fontFamily: fontFamilies.bold, fontSize: 13, fontWeight: "700", lineHeight: 18, textDecorationLine: "underline" }}>{label}</Text>
    </Pressable>
  );
}

function PricingStateMessage({ message, tone = "warning" }: { message: string; tone?: "success" | "warning" | undefined }) {
  const success = tone === "success";
  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: "flex-start", backgroundColor: success ? "rgba(56, 226, 138, 0.08)" : "rgba(255, 148, 72, 0.08)", borderColor: success ? "rgba(56, 226, 138, 0.28)" : "rgba(255, 148, 72, 0.28)", borderRadius: radii.control, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }}>
      <Ionicons color={success ? colors.readyGreen : colors.amberCaution} name={success ? "checkmark-circle-outline" : "alert-circle-outline"} size={20} />
      <Text style={{ color: success ? colors.readyGreen : colors.wrap, flex: 1, fontFamily: fontFamilies.semibold, fontSize: 14, fontWeight: "600", lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

function AccountDataDisclosure({
  accountDeleteConfirmation,
  accountDeleteReady,
  expanded,
  onOpenSupport,
  onSignOut,
  onToggle,
  setAccountDeleteConfirmation,
  subscriptionBusy,
  supportUnavailable,
  userDataControls,
  viewModel
}: {
  accountDeleteConfirmation: string;
  accountDeleteReady: boolean;
  expanded: boolean;
  onOpenSupport: () => void;
  onSignOut: () => Promise<void>;
  onToggle: () => void;
  setAccountDeleteConfirmation: (value: string) => void;
  subscriptionBusy: boolean;
  supportUnavailable: boolean;
  userDataControls?: UserDataControlsHook | undefined;
  viewModel: PaywallViewModel;
}) {
  return (
    <DashboardCard title="Account & data options">
      <View style={{ gap: spacing.md }}>
        <Pressable
          accessibilityLabel={expanded ? "Hide account and data options" : "Show account and data options"}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? "rgba(255, 255, 255, 0.09)" : "rgba(255, 255, 255, 0.05)", borderColor: colors.line, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm })}
        >
          <Ionicons color={colors.blueIQ} name="person-circle-outline" size={22} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.canvas, fontFamily: fontFamilies.bold, fontSize: 15, fontWeight: "700", lineHeight: 20 }}>Manage without subscribing</Text>
            <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.regular, fontSize: 12, fontWeight: "400", lineHeight: 17 }}>Support, sign out, export, and account deletion remain available.</Text>
          </View>
          <Ionicons color={colors.wrap} name={expanded ? "chevron-up" : "chevron-down"} size={20} />
        </Pressable>

        {expanded ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Account access</Text>
              <Text style={screenStyles.body}>{viewModel.accountAccessCopy}</Text>
              <Text style={screenStyles.subtle}>{SUPPORT_OUTSIDE_APP_COPY}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <View style={{ flexBasis: 180, flexGrow: 1 }}>
                  <PaywallActionButton disabled={supportUnavailable} icon="help-circle-outline" label="Support" onPress={onOpenSupport} />
                </View>
                <View style={{ flexBasis: 180, flexGrow: 1 }}>
                  <PaywallActionButton disabled={subscriptionBusy || Boolean(userDataControls?.busy)} icon="log-out-outline" label="Sign out" onPress={() => void onSignOut()} />
                </View>
              </View>
            </View>

            {userDataControls ? (
              <View style={{ borderTopColor: colors.line, borderTopWidth: 1, gap: spacing.md, paddingTop: spacing.lg }}>
                <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Export and delete</Text>
                <Text style={screenStyles.subtle}>Preview or export your data before a destructive account action.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <View style={{ flexBasis: 200, flexGrow: 1 }}>
                    <PaywallActionButton disabled={userDataControls.busy} icon="eye-outline" label="Preview export" onPress={() => void userDataControls.previewExport()} />
                  </View>
                  <View style={{ flexBasis: 200, flexGrow: 1 }}>
                    <PaywallActionButton disabled={userDataControls.busy} icon="download-outline" label="Generate export" onPress={() => void userDataControls.generateExportBundle()} />
                  </View>
                </View>
                {userDataControls.previewRows.map((row, index) => <Text key={`paywall-preview-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
                {userDataControls.portableExportRows.map((row, index) => <Text key={`paywall-export-row:${index}`} style={screenStyles.subtle}>{row}</Text>)}
                {userDataControls.bundleText ? <TextInput accessibilityLabel="Portable JSON export payload" editable={false} multiline style={[screenStyles.input, { minHeight: 120 }]} value={userDataControls.bundleText} /> : null}
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Delete account</Text>
                  <Text style={screenStyles.subtle}>Permanently deletes app data and the sign-in identity. Type DELETE ACCOUNT to continue.</Text>
                  <TextInput
                    accessibilityLabel="Delete account confirmation"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onChangeText={setAccountDeleteConfirmation}
                    placeholder="Type DELETE ACCOUNT"
                    placeholderTextColor={colors.mutedText}
                    style={screenStyles.input}
                    value={accountDeleteConfirmation}
                  />
                  <PaywallActionButton disabled={!accountDeleteReady || userDataControls.busy} icon="person-remove-outline" label="Delete account" onPress={() => void userDataControls.deleteAccount()} />
                </View>
                {userDataControls.message ? <Text style={screenStyles.subtle}>{userDataControls.message}</Text> : null}
                {userDataControls.accountDeletionResultRows.map((row, index) => <Text key={`paywall-delete-result:${index}`} style={screenStyles.subtle}>{row}</Text>)}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </DashboardCard>
  );
}

export interface PaywallScreenProps {
  onSignOut: () => Promise<void>;
  subscription: SubscriptionHook;
  userDataControls?: UserDataControlsHook | undefined;
}

export function PaywallScreen({ onSignOut, subscription, userDataControls }: PaywallScreenProps) {
  const { width } = useWindowDimensions();
  const [selectedPeriod, setSelectedPeriod] = React.useState<SubscriptionPlanPeriod>("annual");
  const [accountOptionsExpanded, setAccountOptionsExpanded] = React.useState(false);
  const [fallbackAccountDeleteConfirmation, setFallbackAccountDeleteConfirmation] = React.useState("");
  const accountDeleteConfirmation = userDataControls?.accountDeleteConfirmation ?? fallbackAccountDeleteConfirmation;
  const setAccountDeleteConfirmation = userDataControls?.setAccountDeleteConfirmation ?? setFallbackAccountDeleteConfirmation;
  const accountDeleteReady = accountDeleteConfirmationMatches(accountDeleteConfirmation);
  const releaseLinks = React.useMemo(() => getReleaseLinkConfig(), []);
  const viewModel = subscription.viewModel;
  const compact = width < 620;
  const orderedPlans = React.useMemo(
    () => [...viewModel.plans].sort((left, right) => (left.period === right.period ? 0 : left.period === "annual" ? -1 : 1)),
    [viewModel.plans]
  );
  const selectedPlan = orderedPlans.find((plan) => plan.period === selectedPeriod) ?? orderedPlans[0];
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

      <DashboardCard headerRight={<DashboardPill label={viewModel.statusLabel} tone={viewModel.setupBlockedReason ? "orange" : "blue"} />} testID="paywall-plans-card" title="Choose your plan" titleVariant="loud">
        <View style={{ gap: spacing.lg }}>
          {viewModel.setupBlockedReason ? <PricingStateMessage message={viewModel.setupBlockedReason} /> : null}
          {subscription.error ? <PricingStateMessage message={subscription.error} /> : null}
          {subscription.message ? <PricingStateMessage message={subscription.message} tone="success" /> : null}

          {subscription.loading ? (
            <View accessibilityLabel="Loading App Store prices" accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: spacing.md, minHeight: 164, justifyContent: "center", padding: spacing.xl }}>
              <ActivityIndicator color={colors.blueIQ} size="large" />
              <View style={{ alignItems: "center", gap: spacing.xs }}>
                <Text style={{ color: colors.canvas, fontFamily: fontFamilies.bold, fontSize: 17, fontWeight: "700", lineHeight: 22 }}>Loading App Store prices</Text>
                <Text style={{ ...screenStyles.subtle, textAlign: "center" }}>Your storefront determines the currency and final amount.</Text>
              </View>
            </View>
          ) : subscription.purchaseAvailable ? (
            <View accessibilityRole="radiogroup" style={{ flexDirection: compact ? "column" : "row", gap: spacing.md }}>
              {orderedPlans.map((plan) => (
                <View key={`paywall-plan:${plan.period}`} style={{ flex: 1, minWidth: compact ? 0 : 280 }}>
                  <PlanOption disabled={planActionsDisabled} onSelect={setSelectedPeriod} plan={plan} selected={plan.period === selectedPlan?.period} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <PricingStateMessage message={subscription.purchaseUnavailableReason ?? "App Store prices are unavailable right now."} />
              <PaywallActionButton disabled={subscription.busy || Boolean(viewModel.setupBlockedReason)} icon="refresh-outline" label="Retry App Store prices" onPress={() => void subscription.refresh()} />
            </View>
          )}

          {selectedPlan && subscription.purchaseAvailable && !subscription.loading ? (
            <View style={{ gap: spacing.sm }}>
              <PaywallActionButton
                disabled={planActionsDisabled}
                icon="arrow-forward-circle-outline"
                label={subscription.busy ? "Opening App Store..." : selectedPlan.ctaLabel}
                loading={subscription.busy}
                onPress={() => void subscription.purchasePlan(selectedPlan.period)}
                variant="primary"
              />
              <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: "500", lineHeight: 17, textAlign: "center" }}>Secure checkout through Apple. The App Store confirms the final localized price.</Text>
            </View>
          ) : null}

          <TrustStrip items={viewModel.purchaseDisclosures} />

          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <Text style={{ ...screenStyles.subtle, maxWidth: 760, textAlign: "center" }}>{viewModel.legalCopy}</Text>
            <Text style={{ ...screenStyles.subtle, maxWidth: 760, textAlign: "center" }}>{viewModel.footerCopy}</Text>
            <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
              <InlineLink disabled={subscription.busy || Boolean(viewModel.setupBlockedReason)} label={viewModel.restoreLabel} onPress={() => void subscription.restore()} />
              <InlineLink disabled={releaseLinks.privacyPolicyUrlIsPlaceholder} label="Privacy Policy" onPress={openPrivacyPolicy} />
              <InlineLink disabled={!releaseLinks.termsOfUseUrl} label="Terms of Use" onPress={openTermsOfUse} />
            </View>
          </View>
        </View>
      </DashboardCard>

      <DashboardCard title="Included with Pro">
        <View style={{ gap: spacing.sm }}>
          {viewModel.supportBullets.map((bullet) => (
            <View key={`paywall-bullet:${bullet}`} style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm }}>
              <View style={{ alignItems: "center", backgroundColor: "rgba(56, 226, 138, 0.09)", borderRadius: radii.pill, height: 28, justifyContent: "center", width: 28 }}>
                <Ionicons color={colors.readyGreen} name="checkmark" size={18} />
              </View>
              <Text style={{ ...screenStyles.body, flex: 1 }}>{bullet}</Text>
            </View>
          ))}
        </View>
      </DashboardCard>

      <AccountDataDisclosure
        accountDeleteConfirmation={accountDeleteConfirmation}
        accountDeleteReady={accountDeleteReady}
        expanded={accountOptionsExpanded}
        onOpenSupport={openSupport}
        onSignOut={onSignOut}
        onToggle={() => setAccountOptionsExpanded((current) => !current)}
        setAccountDeleteConfirmation={setAccountDeleteConfirmation}
        subscriptionBusy={subscription.busy}
        supportUnavailable={!releaseLinks.supportUrl}
        userDataControls={userDataControls}
        viewModel={viewModel}
      />
    </LuminousScreen>
  );
}
