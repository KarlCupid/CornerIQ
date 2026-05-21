import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_SCREENS,
  BETA_FEEDBACK_SEVERITIES,
  type BetaFeedbackCategory,
  type BetaFeedbackReport,
  type BetaFeedbackScreen,
  type BetaFeedbackSeverity,
  type BetaFeedbackStatus
} from "../../services/supabase/betaFeedbackRepository";
import type { BetaFeedbackFormInput } from "../../hooks/useBetaFeedback";
import type { SubmitBetaFeedbackResult } from "../../services/feedback/submitBetaFeedback";
import { EngineCard } from "../../design/components/EngineCard";
import { StatusBadge, type StatusBadgeTone } from "../../design/components/StatusBadge";
import { colors, radii, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

const SCREEN_LABELS: Record<BetaFeedbackScreen, string> = {
  auth: "Auth",
  fuel: "Fuel",
  onboarding: "Onboarding",
  plan: "Plan",
  profile: "Profile",
  today: "Today",
  train: "Train",
  unknown: "Unknown"
};

const CATEGORY_LABELS: Record<BetaFeedbackCategory, string> = {
  bug: "Bug",
  confusing: "Confusing",
  copy_issue: "Copy issue",
  cycle_feedback: "Cycle feedback",
  fuel_feedback: "Fuel feedback",
  missing_feature: "Missing feature",
  other: "Other",
  safety_concern: "Safety concern",
  weight_class_feedback: "Weight-class feedback",
  workout_feedback: "Workout feedback"
};

const SEVERITY_LABELS: Record<BetaFeedbackSeverity, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium"
};

const STATUS_LABELS: Record<BetaFeedbackStatus, string> = {
  dismissed: "Dismissed",
  received: "Received",
  resolved: "Resolved",
  reviewed: "Reviewed"
};

const STATUS_TONES: Record<BetaFeedbackStatus, StatusBadgeTone> = {
  dismissed: "neutral",
  received: "info",
  resolved: "success",
  reviewed: "caution"
};

function formatReportDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function truncateReportMessage(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
}

function SelectorButton({
  label,
  onPress,
  selected
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${selected ? "Selected" : "Choose"} ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.blueIQ : colors.panelRaised,
        borderColor: selected ? colors.blueIQ : colors.line,
        borderRadius: radii.control,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text style={{ color: selected ? colors.cornerBlack : colors.canvas, fontSize: 13, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function SelectorRow<TValue extends string>({
  labels,
  onChange,
  title,
  value,
  values
}: {
  labels: Record<TValue, string>;
  onChange: (value: TValue) => void;
  title: string;
  value: TValue;
  values: readonly TValue[];
}) {
  return (
    <View accessibilityLabel={title} style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "700" }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {values.map((item) => (
          <SelectorButton key={item} label={labels[item]} selected={item === value} onPress={() => onChange(item)} />
        ))}
      </View>
    </View>
  );
}

function FeedbackReportRow({ report }: { report: BetaFeedbackReport }) {
  return (
    <View style={{ borderColor: colors.line, borderRadius: radii.card, borderWidth: 1, gap: spacing.xs, padding: spacing.md }}>
      <StatusBadge label={STATUS_LABELS[report.status]} tone={STATUS_TONES[report.status]} />
      <Text style={{ color: colors.canvas, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>
        {formatReportDate(report.createdAt)} - {SCREEN_LABELS[report.screen]} - {CATEGORY_LABELS[report.category]} - {SEVERITY_LABELS[report.severity]}
      </Text>
      <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{truncateReportMessage(report.message)}</Text>
    </View>
  );
}

export function BetaFeedbackPanel({
  busy = false,
  defaultScreen = "profile",
  onRefreshReports,
  onSubmit,
  recentReports,
  statusMessage
}: {
  busy?: boolean | undefined;
  defaultScreen?: BetaFeedbackScreen | undefined;
  onRefreshReports?: (() => Promise<void>) | undefined;
  onSubmit?: ((input: BetaFeedbackFormInput) => Promise<SubmitBetaFeedbackResult>) | undefined;
  recentReports?: readonly BetaFeedbackReport[] | undefined;
  statusMessage?: string | null | undefined;
}) {
  const [screen, setScreen] = React.useState<BetaFeedbackScreen>(defaultScreen);
  const [category, setCategory] = React.useState<BetaFeedbackCategory>("confusing");
  const [severity, setSeverity] = React.useState<BetaFeedbackSeverity>("medium");
  const [message, setMessage] = React.useState("");
  const [localStatus, setLocalStatus] = React.useState<string | null>(null);
  const disabled = busy || !onSubmit;
  const visibleStatus = localStatus ?? statusMessage ?? null;
  const reports = recentReports ?? [];
  const shouldShowRecentReports = recentReports !== undefined;

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!onSubmit) {
      setLocalStatus("Feedback is available after sign-in.");
      return;
    }
    if (trimmed.length === 0) {
      setLocalStatus("Add a short note before sending feedback.");
      return;
    }
    const result = await onSubmit({
      screen,
      category,
      severity,
      message: trimmed,
      feedbackPayload: { source: "profile_audit_feedback_panel" },
      viewModelStatusLabels: [category, severity]
    });
    setLocalStatus(result.message);
    if (result.status === "submitted") {
      setMessage("");
    }
  }

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Beta feedback</Text>
          <Text style={{ ...typography.body, color: colors.wrap }}>Tell us what was confusing, useful, too dense, or broken during boxer beta testing.</Text>
          <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>Do not include emergency details or secrets.</Text>
          <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>This feedback is not medical or coaching review.</Text>
        </View>
        <SelectorRow labels={SCREEN_LABELS} onChange={setScreen} title="Screen" value={screen} values={BETA_FEEDBACK_SCREENS} />
        <SelectorRow labels={CATEGORY_LABELS} onChange={setCategory} title="Category" value={category} values={BETA_FEEDBACK_CATEGORIES} />
        <SelectorRow labels={SEVERITY_LABELS} onChange={setSeverity} title="Severity" value={severity} values={BETA_FEEDBACK_SEVERITIES} />
        {category === "safety_concern" ? (
          <Text accessibilityRole="alert" style={{ ...typography.body, color: colors.amberCaution }}>
            If this is urgent, stop and seek qualified support.
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel="Beta feedback message"
          accessibilityHint="Describe a bug, confusing moment, or beta testing note without secrets or emergency details."
          editable={!disabled}
          multiline
          onChangeText={setMessage}
          placeholder="What should we know?"
          placeholderTextColor={colors.wrap}
          style={{
            borderColor: colors.line,
            borderRadius: radii.control,
            borderWidth: 1,
            color: colors.canvas,
            minHeight: 96,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            textAlignVertical: "top"
          }}
          value={message}
        />
        <Pressable
          accessibilityLabel="Send beta feedback"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => void handleSubmit()}
          style={{
            alignItems: "center",
            backgroundColor: disabled ? colors.panelRaised : colors.blueIQ,
            borderRadius: radii.control,
            justifyContent: "center",
            minHeight: 48,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm
          }}
        >
          <Text style={{ color: disabled ? colors.wrap : colors.cornerBlack, fontSize: 15, fontWeight: "800" }}>Send feedback</Text>
        </Pressable>
        {visibleStatus ? <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>{visibleStatus}</Text> : null}
        {shouldShowRecentReports ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Recent feedback</Text>
              <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>Reports are saved to your account. Status is read-only in the app.</Text>
            </View>
            {onRefreshReports ? (
              <Pressable
                accessibilityLabel="Refresh feedback history"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void onRefreshReports()}
                style={{
                  alignItems: "center",
                  borderColor: colors.line,
                  borderRadius: radii.control,
                  borderWidth: 1,
                  justifyContent: "center",
                  minHeight: 44,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm
                }}
              >
                <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "700" }}>Refresh history</Text>
              </Pressable>
            ) : null}
            {reports.length > 0 ? reports.map((report) => <FeedbackReportRow key={report.id} report={report} />) : (
              <Text style={{ color: colors.wrap, fontSize: 13, lineHeight: 19 }}>No feedback reports yet.</Text>
            )}
          </View>
        ) : null}
      </View>
    </EngineCard>
  );
}
