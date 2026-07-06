import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../../engine/core/types";
import { PremiumButton, PremiumCard } from "../../../design/components/PremiumPrimitives";
import { colors, radii, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalISODateTime,
  parseOptionalNonNegativeInteger,
  parseOptionalPositiveInteger,
  parseOptionalPositiveNumber,
  parseRequiredDateYYYYMMDD,
  parseRequiredNonNegativeNumber,
  parseRequiredPositiveInteger,
  parseRequiredPositiveNumber,
  parseRequiredTimeHHMM,
  validateCommaSeparatedDates,
  validateNonEmptyText
} from "../../forms/validation";
import {
  createDefaultFightDraft,
  createDefaultTournamentDraft,
  type BuildGoalDraft,
  type FightSetupDraft,
  type PlanLifecycleAction,
  type PlanProtectedScheduleMode,
  type ProtectedWorkoutDraft,
  type RecurringProtectedWorkoutAnchorDraft,
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";
import { planPalette } from "./planPalette";

type GoalMode = "build" | "fight" | "tournament" | "recovery";
type WizardStep = "goal" | "schedule" | "details" | "review";
type AnchorMode = "weekly" | "one_off";
type GeneratedSupportDay = PlanViewModel["generatedSupportAvailability"]["selectedDays"][number];
type FixedSession = PlanViewModel["fixedSchedule"][number];
type WeeklyAnchor = PlanViewModel["weeklyAnchors"][number];
type OptionDetail<TValue extends string> = { description: string; label: string; value: TValue };

export interface PlanGoalFlowCardProps {
  asOfDate: ISODateString;
  bodyMassContext?: PlanViewModel["bodyMassContext"] | undefined;
  busy: boolean;
  currentModeLabel: PlanViewModel["modeLabel"];
  existingFixedSchedule: readonly FixedSession[];
  existingWeeklyAnchors: readonly WeeklyAnchor[];
  framed?: boolean | undefined;
  initialAvailableDays: readonly GeneratedSupportDay[];
  isMinor: boolean;
  onCancel: () => void;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession?: ((workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>) | undefined;
  onSaveRecurringProtectedAnchor?: ((anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>) | undefined;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  showCloseButton?: boolean | undefined;
}

const wizardSteps: readonly { key: WizardStep; label: string }[] = [
  { key: "goal", label: "Goal type" },
  { key: "schedule", label: "Schedule" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" }
];

const goalOptions: readonly OptionDetail<GoalMode>[] = [
  { label: "Build phase", value: "build", description: "No fight date. Build strength, conditioning, power, skill, or mobility around boxing." },
  { label: "Fight camp", value: "fight", description: "Use when there is a real bout date, even if details are still tentative." },
  { label: "Tournament", value: "tournament", description: "Use for repeated weigh-ins, possible same-day bouts, and multi-day recovery needs." },
  { label: "Recovery / maintenance", value: "recovery", description: "Use after a bout, during travel, or when training should stay conservative." }
];

const availableDayOptions: readonly { label: string; value: GeneratedSupportDay }[] = [
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
  { label: "Sun", value: "sunday" }
];

const weekdayOptions: readonly { label: string; value: RecurringProtectedWorkoutAnchorDraft["weekday"] }[] = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" }
];

type BuildSubFocus = NonNullable<BuildGoalDraft["subFocus"]>;

const buildFocusOptions: readonly OptionDetail<BuildGoalDraft["primaryFocus"]>[] = [
  { label: "Balanced", value: "balanced", description: "A mix of strength, conditioning, skill, and recovery when nothing needs priority." },
  { label: "Strength", value: "strength", description: "Choose a clear strength target like upper body, lower body, full body, or posture." },
  { label: "Conditioning", value: "conditioning", description: "Build aerobic base, repeatable rounds, intervals, or boxing-specific engine work." },
  { label: "Power", value: "power", description: "Improve rotational power, first-step speed, short bursts, or reaction timing." },
  { label: "Boxing skill", value: "boxing_skill", description: "Target jab work, footwork, entries, exits, counters, pressure, or bag skill." },
  { label: "Mobility / recovery", value: "mobility", description: "Use when hips, shoulders, trunk posture, soreness, travel, or recovery need priority." }
];
const strengthSubFocusOptions: readonly BuildSubFocus[] = ["full_body_strength", "lower_body_strength", "posterior_chain_strength", "upper_body_trunk_strength", "unilateral_control", "stance_posture_strength", "strength_maintenance"];
const powerSubFocusOptions: readonly BuildSubFocus[] = ["rotational_power", "first_step_explosiveness", "alactic_speed", "reaction_timing", "power_maintenance"];
const conditioningSubFocusOptions: readonly BuildSubFocus[] = ["aerobic_base", "repeatable_rounds", "tempo", "intervals", "sprint_alactic_conditioning", "boxing_specific_conditioning", "recovery_conditioning"];
const boxingSkillSubFocusOptions: readonly BuildSubFocus[] = ["jab_system", "entries_exits", "defense_after_punching", "footwork_ringcraft", "counter_timing", "pressure_control", "outside_movement", "bag_skill", "shadowboxing_mechanics"];
const mobilitySubFocusOptions: readonly BuildSubFocus[] = ["hips_ankles", "shoulders_thoracic", "trunk_guard_posture", "general_recovery", "post_bout", "travel", "soreness_management"];
const subFocusDetails: Record<BuildSubFocus, Omit<OptionDetail<BuildSubFocus>, "value">> = {
  full_body_strength: { label: "Full body strength", description: "General strength support across legs, trunk, and upper body." },
  lower_body_strength: { label: "Lower body strength", description: "Leg strength for stance, pressure, balance, and drive." },
  posterior_chain_strength: { label: "Hips + posterior chain", description: "Glutes, hamstrings, and back-side strength for stance and punching base." },
  upper_body_trunk_strength: { label: "Upper body strength", description: "Upper body and trunk strength for guard, clinch posture, and punch support." },
  unilateral_control: { label: "Single-leg control", description: "One-side-at-a-time control for balance, pivots, and ring movement." },
  stance_posture_strength: { label: "Stance posture strength", description: "Strength that helps hold boxing stance and guard shape." },
  strength_maintenance: { label: "Maintain strength", description: "Keep strength topped up without adding much fatigue." },
  rotational_power: { label: "Rotational power", description: "Hip-to-shoulder power for harder punching mechanics." },
  first_step_explosiveness: { label: "First-step speed", description: "Explosive starts for entries, exits, and angle changes." },
  alactic_speed: { label: "Short burst power", description: "Very short high-quality bursts with full recovery." },
  reaction_timing: { label: "Reaction timing", description: "Fast response work without turning it into extra contact." },
  power_maintenance: { label: "Maintain power", description: "Keep explosiveness sharp with low volume." },
  aerobic_base: { label: "Aerobic base", description: "Easy engine work for recovery between sessions and rounds." },
  repeatable_rounds: { label: "Repeatable rounds", description: "Conditioning for sustaining output round after round." },
  tempo: { label: "Tempo conditioning", description: "Controlled moderate work that is harder than easy base, below all-out intervals." },
  intervals: { label: "Interval conditioning", description: "Structured hard/easy work when readiness and schedule can support it." },
  sprint_alactic_conditioning: { label: "Sprint bursts", description: "Short sprint-style efforts without grinding fatigue." },
  boxing_specific_conditioning: { label: "Boxing conditioning", description: "Conditioning shaped around boxing rhythm, stance, and footwork." },
  recovery_conditioning: { label: "Easy recovery conditioning", description: "Very light movement to support recovery and circulation." },
  jab_system: { label: "Jab system", description: "Build jab rhythm, positioning, and follow-up options." },
  entries_exits: { label: "Entries and exits", description: "Get in, score, and get out with cleaner footwork." },
  defense_after_punching: { label: "Defense after punching", description: "Finish combinations with guard, angle, or exit habits." },
  footwork_ringcraft: { label: "Footwork / ring craft", description: "Positioning, pivots, cutting space, and staying balanced." },
  counter_timing: { label: "Counter timing", description: "Timing windows and reactions without contact drills." },
  pressure_control: { label: "Pressure control", description: "Step in behind shape, balance, and controlled pressure." },
  outside_movement: { label: "Outside movement", description: "Range control, lateral movement, and long-distance boxing." },
  bag_skill: { label: "Bag skill", description: "Bag work themes without treating the bag as generic conditioning." },
  shadowboxing_mechanics: { label: "Shadowboxing mechanics", description: "Clean stance, guard, rhythm, and non-contact technique." },
  hips_ankles: { label: "Hips and ankles", description: "Mobility for stance depth, pivots, and footwork comfort." },
  shoulders_thoracic: { label: "Shoulders and upper back", description: "Shoulder and upper-back range for guard, punching, and posture." },
  trunk_guard_posture: { label: "Trunk / guard posture", description: "Trunk mobility and positioning that supports guard shape." },
  general_recovery: { label: "General recovery", description: "Simple reset work when fatigue or stress is the main issue." },
  post_bout: { label: "Post-bout reset", description: "Low-pressure movement after competition." },
  travel: { label: "Travel reset", description: "Mobility and light work around flights, drives, or hotel constraints." },
  soreness_management: { label: "Soreness management", description: "Gentle movement when soreness needs priority." }
};
const trainingDoseOptions: readonly OptionDetail<NonNullable<BuildGoalDraft["trainingDose"]>>[] = [
  { label: "Minimal", value: "minimal", description: "Lowest app workload. Useful for short notice, heavy boxing weeks, or low readiness." },
  { label: "Standard", value: "standard", description: "Default support dose for most weeks with a normal boxing schedule." },
  { label: "Serious", value: "serious", description: "More app support when recovery, food, and schedule are consistent." },
  { label: "High", value: "high", description: "Most demanding option. The engine still caps work around safety and boxing." }
];
const recoveryFocusOptions: readonly OptionDetail<NonNullable<RecoveryGoalDraft["focus"]>>[] = [
  { label: "General recovery", value: "general", description: "Default reset when no single recovery issue stands out." },
  { label: "Soreness", value: "soreness", description: "Prioritize low-pressure movement and soreness management." },
  { label: "Sleep", value: "sleep", description: "Keep training conservative when sleep is the main limiter." },
  { label: "Travel", value: "travel", description: "Plan around travel fatigue, limited equipment, and disrupted routines." },
  { label: "Post-bout", value: "post_bout", description: "Use after competition before normal training resumes." }
];
const anchorTypeOptions: readonly { label: string; value: ProtectedWorkoutDraft["type"] }[] = [
  { label: "Boxing class", value: "boxing_class" },
  { label: "Technical session", value: "technical_session" },
  { label: "Pads / mitts", value: "pads_mitts" },
  { label: "Bag work", value: "bag_work" },
  { label: "Footwork", value: "footwork_session" },
  { label: "Coach/team sparring", value: "sparring" },
  { label: "Roadwork", value: "roadwork" },
  { label: "Assigned strength", value: "coach_assigned_strength" },
  { label: "Recovery day", value: "recovery_day" },
  { label: "Travel", value: "travel" },
  { label: "Competition", value: "competition" }
];
const anchorIntensityOptions: readonly { label: string; value: ProtectedWorkoutDraft["intensity"] }[] = [
  { label: "Easy", value: "easy" },
  { label: "Moderate", value: "moderate" },
  { label: "Hard", value: "hard" },
  { label: "Max", value: "max" }
];

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: active ? "rgba(56, 226, 138, 0.14)" : pressed ? "rgba(230, 247, 234, 0.095)" : "rgba(230, 247, 234, 0.055)",
        borderColor: active ? "rgba(56, 226, 138, 0.5)" : "rgba(210, 244, 221, 0.16)",
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        boxShadow: active ? "0 10px 26px rgba(56, 226, 138, 0.14)" : "0 8px 22px rgba(0, 0, 0, 0.16)",
        flexGrow: 1,
        justifyContent: "center",
        maxWidth: 360,
        minHeight: 44,
        opacity: busy ? 0.58 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Text style={{ color: active ? planPalette.textPrimary : planPalette.textBody, fontFamily: fontFamilies.bold, fontSize: 14, fontWeight: "700", lineHeight: 18, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function DescribedOptionButton({
  active,
  busy,
  description,
  label,
  onPress
}: {
  active: boolean;
  busy: boolean;
  description: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "flex-start",
        backgroundColor: active ? "rgba(56, 226, 138, 0.14)" : pressed ? "rgba(230, 247, 234, 0.095)" : "rgba(230, 247, 234, 0.055)",
        borderColor: active ? "rgba(56, 226, 138, 0.5)" : "rgba(210, 244, 221, 0.16)",
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        boxShadow: active ? "0 10px 26px rgba(56, 226, 138, 0.14)" : "0 8px 22px rgba(0, 0, 0, 0.16)",
        flexBasis: 158,
        flexGrow: 1,
        gap: 3,
        justifyContent: "center",
        minHeight: 72,
        minWidth: 138,
        opacity: busy ? 0.58 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Text style={{ color: active ? planPalette.textPrimary : planPalette.textBody, fontFamily: fontFamilies.bold, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>
        {label}
      </Text>
      <Text style={{ color: planPalette.textMuted, fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
        {description}
      </Text>
    </Pressable>
  );
}

function WizardProgress({
  currentStep
}: {
  currentStep: WizardStep;
}) {
  const currentIndex = stepIndex(currentStep);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {wizardSteps.map((item, index) => {
        const active = item.key === currentStep;
        const complete = index < currentIndex;
        return (
          <View
            accessibilityLabel={`${item.label} ${complete ? "complete" : active ? "current" : "upcoming"}`}
            key={item.key}
            style={{
              alignItems: "center",
              backgroundColor: active ? "rgba(56, 226, 138, 0.14)" : complete ? "rgba(56, 226, 138, 0.085)" : "rgba(230, 247, 234, 0.045)",
              borderColor: active || complete ? "rgba(56, 226, 138, 0.36)" : "rgba(210, 244, 221, 0.12)",
              borderCurve: "continuous",
              borderRadius: radii.pill,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.xs,
              minHeight: 34,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs
            }}
          >
            <Text style={{ color: active || complete ? planPalette.actionFill : planPalette.textMuted, fontFamily: fontFamilies.black, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
              {index + 1}
            </Text>
            <Text style={{ color: active ? planPalette.textPrimary : planPalette.textMuted, fontFamily: fontFamilies.bold, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function WizardNotice({
  body,
  testID,
  title,
  tone = "muted"
}: {
  body?: string | undefined;
  testID?: string | undefined;
  title: string;
  tone?: "green" | "muted" | "red" | "orange" | undefined;
}) {
  const color = tone === "green" ? planPalette.actionFill : tone === "red" ? colors.redCorner : tone === "orange" ? colors.amberCaution : planPalette.textMuted;
  return (
    <View
      accessibilityRole={tone === "red" || tone === "orange" ? "alert" : undefined}
      style={{
        backgroundColor: tone === "red" ? "rgba(255, 82, 101, 0.09)" : tone === "orange" ? "rgba(255, 148, 72, 0.09)" : "rgba(230, 247, 234, 0.055)",
        borderColor: `${color}44`,
        borderCurve: "continuous",
        borderRadius: radii.tile,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md
      }}
      testID={testID}
    >
      <Text style={{ color, fontFamily: fontFamilies.bold, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>{title}</Text>
      {body ? <Text style={{ ...screenStyles.subtle, color: planPalette.textBody }}>{body}</Text> : null}
    </View>
  );
}

function WizardField({
  helper,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value
}: {
  helper?: string | undefined;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={{ flexBasis: 150, flexGrow: 1, gap: spacing.xs, minWidth: 132 }}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={value}
      />
      {helper ? <Text style={screenStyles.subtle}>{helper}</Text> : null}
    </View>
  );
}

function WizardFactField({
  helper,
  label,
  value
}: {
  helper?: string | undefined;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexBasis: 150, flexGrow: 1, gap: spacing.xs, minWidth: 132 }}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <View
        accessibilityLabel={`${label}: ${value}`}
        style={{
          backgroundColor: "rgba(230, 247, 234, 0.035)",
          borderColor: "rgba(210, 244, 221, 0.14)",
          borderCurve: "continuous",
          borderRadius: radii.tile,
          borderWidth: 1,
          justifyContent: "center",
          minHeight: 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        <Text selectable style={{ color: planPalette.textPrimary, fontFamily: fontFamilies.medium, fontSize: 16, fontWeight: "600", lineHeight: 22 }}>
          {value}
        </Text>
      </View>
      {helper ? <Text style={screenStyles.subtle}>{helper}</Text> : null}
    </View>
  );
}

function WizardFieldGroup({
  children,
  helper,
  title
}: React.PropsWithChildren<{
  helper?: string | undefined;
  title: string;
}>) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.fieldLabel}>{title}</Text>
        {helper ? <Text style={screenStyles.subtle}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function parseHourList(value: string): number[] {
  const hours = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => parseRequiredNonNegativeNumber(item, `Rehydration window #${index + 1}`));
  if (hours.length === 0) {
    throw new Error("Rehydration windows are required: enter at least one hour value.");
  }
  return hours;
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function goalLabel(mode: GoalMode): string {
  return goalOptions.find((option) => option.value === mode)?.label ?? "Build phase";
}

function primaryFocusLabel(value: BuildGoalDraft["primaryFocus"]): string {
  return buildFocusOptions.find((option) => option.value === value)?.label ?? titleCase(value);
}

function subFocusLabel(value: BuildSubFocus): string {
  return subFocusDetails[value]?.label ?? titleCase(value);
}

function subFocusDescription(value: BuildSubFocus): string {
  return subFocusDetails[value]?.description ?? "Focused app support around this boxing need.";
}

function trainingDoseLabel(value: NonNullable<BuildGoalDraft["trainingDose"]>): string {
  return trainingDoseOptions.find((option) => option.value === value)?.label ?? titleCase(value);
}

function recoveryFocusLabel(value: NonNullable<RecoveryGoalDraft["focus"]>): string {
  return recoveryFocusOptions.find((option) => option.value === value)?.label ?? titleCase(value);
}

function defaultPlanAction(_currentModeLabel: PlanViewModel["modeLabel"], _nextMode: GoalMode): PlanLifecycleAction {
  return "start_new_plan";
}

function defaultTrainingDose(selectedDayCount: number): NonNullable<BuildGoalDraft["trainingDose"]> {
  return selectedDayCount >= 5 ? "serious" : selectedDayCount >= 3 ? "standard" : "minimal";
}

function supportDayKey(days: readonly GeneratedSupportDay[]): string {
  return [...days].sort().join("|");
}

function subFocusOptionsFor(primaryFocus: BuildGoalDraft["primaryFocus"]): readonly BuildSubFocus[] {
  switch (primaryFocus) {
    case "power":
      return powerSubFocusOptions;
    case "conditioning":
      return conditioningSubFocusOptions;
    case "strength":
      return strengthSubFocusOptions;
    case "boxing_skill":
      return boxingSkillSubFocusOptions;
    case "mobility":
      return mobilitySubFocusOptions;
    case "balanced":
      return ["full_body_strength", "aerobic_base", "rotational_power", "jab_system", "general_recovery"];
  }
}

function defaultSubFocusForBuildFocus(primaryFocus: BuildGoalDraft["primaryFocus"]): BuildSubFocus {
  return subFocusOptionsFor(primaryFocus)[0] ?? "full_body_strength";
}

function daySummary(days: readonly GeneratedSupportDay[]): string {
  if (days.length === 0) {
    return "No available days selected";
  }
  return availableDayOptions.filter((option) => days.includes(option.value)).map((option) => option.label).join(", ");
}

function anchorTypeLabel(type: ProtectedWorkoutDraft["type"]): string {
  return anchorTypeOptions.find((option) => option.value === type)?.label ?? titleCase(type);
}

function weekdayLabel(weekday: RecurringProtectedWorkoutAnchorDraft["weekday"]): string {
  return weekdayOptions.find((option) => option.value === weekday)?.label ?? titleCase(weekday);
}

function timeLabel(time: string | undefined): string | null {
  if (!time) {
    return null;
  }
  const [hourText, minute = "00"] = time.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) {
    return time;
  }
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function weeklyAnchorSummary(anchor: RecurringProtectedWorkoutAnchorDraft): string {
  return [
    `Every ${weekdayLabel(anchor.weekday)}`,
    anchorTypeLabel(anchor.type),
    timeLabel(anchor.localStartTime),
    `${anchor.durationMinutes} min`,
    titleCase(anchor.intensity),
    anchor.rounds ? `${anchor.rounds} rounds` : null
  ].filter(Boolean).join(" · ");
}

function datedAnchorSummary(anchor: ProtectedWorkoutDraft): string {
  return [anchor.date, anchorTypeLabel(anchor.type), timeLabel(anchor.startTime), `${anchor.durationMinutes} min`, titleCase(anchor.intensity), anchor.rounds ? `${anchor.rounds} rounds` : null].filter(Boolean).join(" · ");
}

function shouldDefaultOneOff(type: ProtectedWorkoutDraft["type"]): boolean {
  return type === "competition" || type === "travel";
}

function stepIndex(step: WizardStep): number {
  return wizardSteps.findIndex((item) => item.key === step);
}

function finalAccessibilityLabel(mode: GoalMode): string {
  if (mode === "fight") {
    return "Save fight camp goal";
  }
  if (mode === "tournament") {
    return "Save tournament goal";
  }
  if (mode === "recovery") {
    return "Save recovery goal";
  }
  return "Save build goal";
}

function optionalDisplayNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function fightOfficialTargetLabel(contractedWeightKg: string, allowanceKg: string): string {
  const contracted = optionalDisplayNumber(contractedWeightKg);
  const allowance = optionalDisplayNumber(allowanceKg) ?? 0;
  if (contracted === null || contracted <= 0 || allowance < 0) {
    return "Enter a target";
  }
  return `${(contracted + allowance).toFixed(1)} kg`;
}

function fightTargetHelper(contractedWeightKg: string, allowanceKg: string): string {
  const target = fightOfficialTargetLabel(contractedWeightKg, allowanceKg);
  return target === "Enter a target" ? "Used as the official weigh-in target after allowance." : `Official target after allowance: ${target}.`;
}

function defaultBodyMassContext(): PlanViewModel["bodyMassContext"] {
  return {
    currentWeightLabel: "Not logged",
    statusLabel: "Current weight unknown",
    helperCopy: "CornerIQ does not assume missing body-weight data is safe. Manual logging remains optional.",
    autoFilledFromTodayLog: false
  };
}

export function PlanGoalFlowCard({
  asOfDate,
  bodyMassContext,
  busy,
  currentModeLabel,
  existingFixedSchedule,
  existingWeeklyAnchors,
  framed = true,
  initialAvailableDays,
  isMinor,
  onCancel,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveRecoveryGoal,
  onSaveTournamentSetup,
  showCloseButton = false
}: PlanGoalFlowCardProps) {
  const defaultFight = createDefaultFightDraft(asOfDate);
  const defaultTournament = createDefaultTournamentDraft(asOfDate);
  const effectiveBodyMassContext = bodyMassContext ?? defaultBodyMassContext();
  const [step, setStep] = React.useState<WizardStep>("goal");
  const [mode, setMode] = React.useState<GoalMode>("build");
  const [planAction, setPlanAction] = React.useState<PlanLifecycleAction>(() => defaultPlanAction(currentModeLabel, "build"));
  const [protectedScheduleMode, setProtectedScheduleMode] = React.useState<PlanProtectedScheduleMode>("replace_for_plan");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [selectedAvailableDays, setSelectedAvailableDays] = React.useState<GeneratedSupportDay[]>(() => [...initialAvailableDays]);
  const [primaryFocus, setPrimaryFocus] = React.useState<BuildGoalDraft["primaryFocus"]>("balanced");
  const [subFocus, setSubFocus] = React.useState<BuildSubFocus>(() => defaultSubFocusForBuildFocus("balanced"));
  const [trainingDose, setTrainingDose] = React.useState<NonNullable<BuildGoalDraft["trainingDose"]>>(() => defaultTrainingDose(initialAvailableDays.length));
  const availabilityEditedRef = React.useRef(false);
  const trainingDoseEditedRef = React.useRef(false);
  const initialAvailableDaysKey = supportDayKey(initialAvailableDays);
  const lastInitialAvailableDaysKeyRef = React.useRef(initialAvailableDaysKey);

  const [status, setStatus] = React.useState<FightSetupDraft["status"]>(defaultFight.status);
  const [amateurOrPro, setAmateurOrPro] = React.useState<FightSetupDraft["amateurOrPro"]>(defaultFight.amateurOrPro);
  const [boutDate, setBoutDate] = React.useState(defaultFight.boutDate);
  const [weighInType, setWeighInType] = React.useState<FightSetupDraft["weighInType"]>(defaultFight.weighInType);
  const [rounds, setRounds] = React.useState(`${defaultFight.rounds}`);
  const [roundMinutes, setRoundMinutes] = React.useState(`${defaultFight.roundMinutes}`);
  const [targetClassLabel, setTargetClassLabel] = React.useState(defaultFight.targetClassLabel);
  const [contractedWeightKg, setContractedWeightKg] = React.useState(`${defaultFight.contractedWeightKg}`);
  const [allowanceKg, setAllowanceKg] = React.useState(`${defaultFight.allowanceKg}`);
  const [weighInDateTime, setWeighInDateTime] = React.useState("");
  const [hydrationTestingRequired, setHydrationTestingRequired] = React.useState(false);
  const [postWeighInWeightCapKg, setPostWeighInWeightCapKg] = React.useState("");

  const [tournamentStartDate, setTournamentStartDate] = React.useState(defaultTournament.tournamentStartDate);
  const [tournamentEndDate, setTournamentEndDate] = React.useState(defaultTournament.tournamentEndDate);
  const [possibleBoutDates, setPossibleBoutDates] = React.useState(defaultTournament.possibleBoutDates.join(","));
  const [dailyWeighIns, setDailyWeighIns] = React.useState(defaultTournament.dailyWeighIns);
  const [weighInTimeEachDay, setWeighInTimeEachDay] = React.useState(defaultTournament.weighInTimeEachDay);
  const [numberOfPotentialBouts, setNumberOfPotentialBouts] = React.useState(`${defaultTournament.numberOfPotentialBouts}`);
  const [strategyMode, setStrategyMode] = React.useState<TournamentSetupDraft["strategyMode"]>("stay_near_weight");
  const [sameDayBoutLikely, setSameDayBoutLikely] = React.useState(defaultTournament.sameDayBoutLikely);
  const [rehydrationWindowHoursByDay, setRehydrationWindowHoursByDay] = React.useState(defaultTournament.rehydrationWindowHoursByDay.join(","));

  const [recoveryDurationDays, setRecoveryDurationDays] = React.useState("");
  const [recoveryFocus, setRecoveryFocus] = React.useState<NonNullable<RecoveryGoalDraft["focus"]>>("general");
  const [anchorEditorOpen, setAnchorEditorOpen] = React.useState(false);
  const [anchorMode, setAnchorMode] = React.useState<AnchorMode>("weekly");
  const [anchorType, setAnchorType] = React.useState<ProtectedWorkoutDraft["type"]>("technical_session");
  const [anchorWeekday, setAnchorWeekday] = React.useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>("monday");
  const [anchorDate, setAnchorDate] = React.useState(asOfDate);
  const [anchorStartTime, setAnchorStartTime] = React.useState("");
  const [anchorDurationMinutes, setAnchorDurationMinutes] = React.useState("60");
  const [anchorIntensity, setAnchorIntensity] = React.useState<ProtectedWorkoutDraft["intensity"]>("moderate");
  const [anchorRounds, setAnchorRounds] = React.useState("");
  const [anchorNote, setAnchorNote] = React.useState("");
  const [pendingWeeklyAnchors, setPendingWeeklyAnchors] = React.useState<RecurringProtectedWorkoutAnchorDraft[]>([]);
  const [pendingDatedAnchors, setPendingDatedAnchors] = React.useState<ProtectedWorkoutDraft[]>([]);
  const [submittingPlanAction, setSubmittingPlanAction] = React.useState<PlanLifecycleAction | null>(null);
  const { message: formError, runWithMessage } = useFormMessage("Goal could not be saved.");
  const controlsBusy = busy || submittingPlanAction !== null;
  const submittingCopy =
    submittingPlanAction === null
      ? null
      : submittingPlanAction === "amend_current_plan"
        ? {
            title: "Updating your plan...",
            body: "Rebuilding this week from your updated goal, support days, and fixed boxing schedule."
          }
        : {
            title: "Generating your new plan...",
            body: "Rebuilding this week from your new goal, support days, and fixed boxing schedule."
          };

  React.useEffect(() => {
    if (lastInitialAvailableDaysKeyRef.current === initialAvailableDaysKey) {
      return;
    }
    lastInitialAvailableDaysKeyRef.current = initialAvailableDaysKey;
    if (!availabilityEditedRef.current) {
      setSelectedAvailableDays([...initialAvailableDays]);
    }
    if (!trainingDoseEditedRef.current) {
      setTrainingDose(defaultTrainingDose(initialAvailableDays.length));
    }
  }, [initialAvailableDays, initialAvailableDaysKey]);

  const toggleAvailableDay = (day: GeneratedSupportDay) => {
    setStepError(null);
    availabilityEditedRef.current = true;
    setSelectedAvailableDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const selectTrainingDose = (dose: NonNullable<BuildGoalDraft["trainingDose"]>) => {
    trainingDoseEditedRef.current = true;
    setTrainingDose(dose);
  };

  const chooseMode = (nextMode: GoalMode) => {
    setMode(nextMode);
    setPlanAction(defaultPlanAction(currentModeLabel, nextMode));
    setAdvancedOpen(false);
    setStepError(null);
  };

  const requireAvailability = (): boolean => {
    if (selectedAvailableDays.length > 0) {
      return true;
    }
    setStepError("Select at least one available day before saving a plan.");
    setStep("schedule");
    return false;
  };

  const goNext = () => {
    if (step === "schedule" && !requireAvailability()) {
      return;
    }
    const next = wizardSteps[Math.min(stepIndex(step) + 1, wizardSteps.length - 1)]?.key ?? "review";
    setStepError(null);
    setStep(next);
  };

  const goBack = () => {
    const previous = wizardSteps[Math.max(stepIndex(step) - 1, 0)]?.key ?? "goal";
    setStepError(null);
    setStep(previous);
  };

  const resetAnchorEditor = () => {
    setAnchorMode("weekly");
    setAnchorType("technical_session");
    setAnchorWeekday("monday");
    setAnchorDate(asOfDate);
    setAnchorStartTime("");
    setAnchorDurationMinutes("60");
    setAnchorIntensity("moderate");
    setAnchorRounds("");
    setAnchorNote("");
  };

  const selectAnchorType = (type: ProtectedWorkoutDraft["type"]) => {
    setAnchorType(type);
    if (shouldDefaultOneOff(type)) {
      setAnchorMode("one_off");
    }
  };

  const addPendingAnchor = () => {
    try {
      const parsedStart = anchorStartTime.trim() ? parseRequiredTimeHHMM(anchorStartTime, "Session start time") : undefined;
      const parsedRounds = parseOptionalNonNegativeInteger(anchorRounds, "Session rounds");
      const trimmedNote = anchorNote.trim();
      if (anchorMode === "weekly") {
        const draft: RecurringProtectedWorkoutAnchorDraft = {
          type: anchorType,
          weekday: anchorWeekday,
          ...(parsedStart ? { localStartTime: parsedStart } : {}),
          durationMinutes: parseRequiredPositiveInteger(anchorDurationMinutes, "Session duration minutes"),
          intensity: anchorIntensity,
          ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
          ...(trimmedNote ? { note: trimmedNote } : {}),
          activeFrom: asOfDate
        };
        setPendingWeeklyAnchors((current) => [...current, draft]);
      } else {
        const draft: ProtectedWorkoutDraft = {
          type: anchorType,
          date: parseRequiredDateYYYYMMDD(anchorDate, "Session date"),
          ...(parsedStart ? { startTime: parsedStart, localStartTime: parsedStart } : {}),
          durationMinutes: parseRequiredPositiveInteger(anchorDurationMinutes, "Session duration minutes"),
          intensity: anchorIntensity,
          ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
          ...(trimmedNote ? { note: trimmedNote } : {})
        };
        setPendingDatedAnchors((current) => [...current, draft]);
      }
      setStepError(null);
      setAnchorEditorOpen(false);
      resetAnchorEditor();
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Fixed boxing session could not be added.");
    }
  };

  const removePendingWeeklyAnchor = (index: number) => {
    setPendingWeeklyAnchors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const removePendingDatedAnchor = (index: number) => {
    setPendingDatedAnchors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectProtectedScheduleMode = (mode: PlanProtectedScheduleMode) => {
    setProtectedScheduleMode(mode);
    if (mode === "clear_for_plan") {
      setPendingWeeklyAnchors([]);
      setPendingDatedAnchors([]);
      setAnchorEditorOpen(false);
    }
  };

  const selectPrimaryFocus = (focus: BuildGoalDraft["primaryFocus"]) => {
    setPrimaryFocus(focus);
    setSubFocus(defaultSubFocusForBuildFocus(focus));
  };

  const pendingProtectedScheduleDraft = () => ({
    ...(protectedScheduleMode === "clear_for_plan" || pendingDatedAnchors.length === 0 ? {} : { pendingProtectedSessions: pendingDatedAnchors }),
    ...(protectedScheduleMode === "clear_for_plan" || pendingWeeklyAnchors.length === 0 ? {} : { pendingRecurringProtectedAnchors: pendingWeeklyAnchors })
  });

  const saveWithPlanRegeneration = async (savePlan: () => Promise<void>) => {
    const action = planAction;
    await runWithMessage(async () => {
      setSubmittingPlanAction(action);
      try {
        await savePlan();
        setSubmittingPlanAction(null);
        onCancel();
      } catch (error) {
        setSubmittingPlanAction(null);
        throw error;
      }
    });
  };

  const saveBuild = async () => {
    if (!requireAvailability()) {
      return;
    }
    await saveWithPlanRegeneration(async () => {
      await onSaveBuildGoal({
        primaryFocus,
        subFocus,
        trainingDose,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planStartDate: asOfDate,
        planAction,
        protectedScheduleMode: planAction === "start_new_plan" ? protectedScheduleMode : undefined,
        ...pendingProtectedScheduleDraft()
      });
    });
  };

  const saveFight = async () => {
    if (!requireAvailability()) {
      return;
    }
    await saveWithPlanRegeneration(async () => {
      const cap = parseOptionalPositiveNumber(postWeighInWeightCapKg, "Post-weigh-in cap");
      const contractedKg = parseRequiredPositiveNumber(contractedWeightKg, "Contracted weight", { example: "64" });
      const parsedWeighInDateTime = parseOptionalISODateTime(weighInDateTime, "Weigh-in datetime");
      await onSaveFightSetup({
        status,
        amateurOrPro,
        boutDate: parseRequiredDateYYYYMMDD(boutDate, "Bout date"),
        ...(parsedWeighInDateTime ? { weighInDateTime: parsedWeighInDateTime } : {}),
        weighInType,
        rounds: parseRequiredPositiveInteger(rounds, "Rounds"),
        roundMinutes: parseRequiredPositiveNumber(roundMinutes, "Round minutes"),
        restSeconds: defaultFight.restSeconds,
        targetClassLabel: validateNonEmptyText(targetClassLabel, "Target class label"),
        targetLimitKg: contractedKg,
        contractedWeightKg: contractedKg,
        allowanceKg: parseRequiredNonNegativeNumber(allowanceKg, "Allowance"),
        hydrationTestingRequired,
        ...(cap === undefined ? {} : { postWeighInWeightCapKg: cap }),
        timezone: "America/Vancouver",
        trainingDose,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planStartDate: asOfDate,
        planAction,
        protectedScheduleMode: planAction === "start_new_plan" ? protectedScheduleMode : undefined,
        ...pendingProtectedScheduleDraft()
      });
    });
  };

  const saveTournament = async () => {
    if (!requireAvailability()) {
      return;
    }
    await saveWithPlanRegeneration(async () => {
      await onSaveTournamentSetup({
        tournamentStartDate: parseRequiredDateYYYYMMDD(tournamentStartDate, "Tournament start date"),
        tournamentEndDate: parseRequiredDateYYYYMMDD(tournamentEndDate, "Tournament end date"),
        possibleBoutDates: validateCommaSeparatedDates(possibleBoutDates, "Possible bout days"),
        dailyWeighIns,
        weighInTimeEachDay: parseRequiredTimeHHMM(weighInTimeEachDay, "Weigh-in time"),
        sameDayBoutLikely,
        numberOfPotentialBouts: parseRequiredPositiveInteger(numberOfPotentialBouts, "Possible bouts"),
        rehydrationWindowHoursByDay: parseHourList(rehydrationWindowHoursByDay),
        strategyMode,
        trainingDose,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planStartDate: asOfDate,
        planAction,
        protectedScheduleMode: planAction === "start_new_plan" ? protectedScheduleMode : undefined,
        ...pendingProtectedScheduleDraft()
      });
    });
  };

  const saveRecovery = async () => {
    if (!requireAvailability()) {
      return;
    }
    await saveWithPlanRegeneration(async () => {
      const durationDays = parseOptionalPositiveInteger(recoveryDurationDays, "Recovery duration days");
      await onSaveRecoveryGoal({
        ...(durationDays === undefined ? {} : { durationDays }),
        focus: recoveryFocus,
        trainingDose,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planStartDate: asOfDate,
        planAction,
        protectedScheduleMode: planAction === "start_new_plan" ? protectedScheduleMode : undefined,
        ...pendingProtectedScheduleDraft()
      });
    });
  };

  const saveCurrentGoal = () => {
    if (mode === "fight") {
      return saveFight();
    }
    if (mode === "tournament") {
      return saveTournament();
    }
    if (mode === "recovery") {
      return saveRecovery();
    }
    return saveBuild();
  };

  const reviewRows = React.useMemo(() => {
    if (mode === "fight") {
      return [
        `Status: ${titleCase(status)}`,
        `Ruleset: ${titleCase(amateurOrPro)}`,
        `Current weight: ${effectiveBodyMassContext.currentWeightLabel}`,
        `Bout date: ${boutDate}`,
        `Official target: ${fightOfficialTargetLabel(contractedWeightKg, allowanceKg)}`,
        `Weigh-in timing: ${titleCase(weighInType)}`,
        `Training dose: ${trainingDoseLabel(trainingDose)}`
      ];
    }
    if (mode === "tournament") {
      return [
        `Current weight: ${effectiveBodyMassContext.currentWeightLabel}`,
        `Dates: ${tournamentStartDate} to ${tournamentEndDate}`,
        `Possible bout days: ${possibleBoutDates}`,
        `Daily weigh-ins: ${dailyWeighIns ? "Yes" : "No"}`,
        `Possible bouts: ${numberOfPotentialBouts}`,
        `Strategy: ${titleCase(strategyMode)}`,
        `Training dose: ${trainingDoseLabel(trainingDose)}`
      ];
    }
    if (mode === "recovery") {
      return [
        `Duration: ${recoveryDurationDays.trim() ? `${recoveryDurationDays.trim()} days` : "Engine default"}`,
        `Focus: ${recoveryFocusLabel(recoveryFocus)}`,
        `Training dose: ${trainingDoseLabel(trainingDose)}`
      ];
    }
    return [`Primary focus: ${primaryFocusLabel(primaryFocus)}`, `Specific target: ${subFocusLabel(subFocus)}`, `Training dose: ${trainingDoseLabel(trainingDose)}`];
  }, [allowanceKg, amateurOrPro, boutDate, contractedWeightKg, dailyWeighIns, effectiveBodyMassContext.currentWeightLabel, mode, numberOfPotentialBouts, possibleBoutDates, primaryFocus, recoveryDurationDays, recoveryFocus, status, strategyMode, subFocus, tournamentEndDate, tournamentStartDate, trainingDose, weighInType]);

  const content = (
    <View accessibilityLabel="Plan generation wizard" style={{ gap: spacing.md }} testID="plan-generation-wizard">
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ alignItems: "center", flexDirection: "row", flex: 1, gap: spacing.md, minWidth: 0 }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(56, 226, 138, 0.12)",
              borderColor: "rgba(56, 226, 138, 0.34)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 46,
              justifyContent: "center",
              width: 46
            }}
          >
            <Ionicons color={planPalette.actionFill} name="sparkles-outline" size={22} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text style={{ color: planPalette.actionFill, fontFamily: fontFamilies.black, fontSize: 11, fontWeight: "900", lineHeight: 15, textTransform: "uppercase" }}>
              Plan wizard
            </Text>
            <Text style={{ color: planPalette.textPrimary, fontFamily: fontFamilies.extraBold, fontSize: 24, fontWeight: "800", lineHeight: 30 }}>
              Generate new plan
            </Text>
            <Text style={{ ...screenStyles.subtle, color: planPalette.textBody }}>A guided setup keeps the plan goal, availability, and details clear before saving.</Text>
          </View>
        </View>
        {showCloseButton ? (
          <PremiumButton disabled={controlsBusy} icon="close-outline" label="Close" onPress={onCancel} tone="green" variant="quiet" />
        ) : null}
      </View>
        <WizardProgress currentStep={step} />
        {formError ? <WizardNotice title={formError} tone="red" /> : null}
        {stepError ? <WizardNotice title={stepError} tone="red" /> : null}
        {submittingCopy ? (
          <WizardNotice body={submittingCopy.body} testID="plan-wizard-generating-state" title={submittingCopy.title} tone="green" />
        ) : null}
        {isMinor ? <WizardNotice title="Minor athletes stay safety-first; acute weight-class shortcuts stay blocked." tone="orange" /> : null}

        {step === "goal" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-goal-step">
            <Text style={screenStyles.callout}>Step 1: Goal type</Text>
            <Text style={screenStyles.body}>Choose the boxing phase CornerIQ should plan around next.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {goalOptions.map((option) => (
                <DescribedOptionButton active={mode === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => chooseMode(option.value)} />
              ))}
            </View>
          </View>
        ) : null}

        {step === "schedule" ? (
          <View style={{ gap: spacing.md }} testID="plan-wizard-schedule-step">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.callout}>Step 2: Schedule</Text>
              <Text style={screenStyles.fieldLabel}>Support workout days</Text>
              <Text style={screenStyles.body}>Support workouts will only be placed on selected available days.</Text>
              <Text style={screenStyles.subtle}>At least one support workout day is required. Boxing sessions you add are separate and do not automatically make a day available.</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {availableDayOptions.map((option) => (
                <OptionButton active={selectedAvailableDays.includes(option.value)} busy={controlsBusy} key={option.value} label={option.label} onPress={() => toggleAvailableDay(option.value)} />
              ))}
            </View>
            <Text style={screenStyles.subtle}>Selected: {daySummary(selectedAvailableDays)}</Text>
            <View style={{ gap: spacing.sm }} testID="plan-wizard-protected-schedule-mode">
              <Text style={screenStyles.fieldLabel}>Fixed schedule for this plan</Text>
              <Text style={screenStyles.body}>Choose what happens to existing boxing sessions when this starts as a new plan.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <OptionButton active={protectedScheduleMode === "keep_existing"} busy={controlsBusy} label="Keep existing fixed schedule" onPress={() => selectProtectedScheduleMode("keep_existing")} />
                <OptionButton active={protectedScheduleMode === "replace_for_plan"} busy={controlsBusy} label="Replace fixed schedule for this plan" onPress={() => selectProtectedScheduleMode("replace_for_plan")} />
                <OptionButton active={protectedScheduleMode === "clear_for_plan"} busy={controlsBusy} label="Clear fixed schedule" onPress={() => selectProtectedScheduleMode("clear_for_plan")} />
              </View>
              <Text style={screenStyles.subtle}>
                {protectedScheduleMode === "keep_existing"
                  ? `Existing boxing sessions will stay: ${existingWeeklyAnchors.length} weekly, ${existingFixedSchedule.length} dated.`
                  : protectedScheduleMode === "replace_for_plan"
                    ? "Existing boxing sessions will be cleared first; only sessions added in this wizard will remain for the new plan."
                    : "Existing weekly boxing sessions and future dated sessions will be cleared for the new plan."}
              </Text>
            </View>
            <View style={{ gap: spacing.sm }} testID="plan-wizard-anchor-editor">
              <Text style={screenStyles.fieldLabel}>Weekly boxing session</Text>
              <Text style={screenStyles.body}>{protectedScheduleMode === "clear_for_plan" ? "No boxing sessions will be saved from this wizard." : "CornerIQ will plan around this every week."}</Text>
              {pendingWeeklyAnchors.length > 0 ? pendingWeeklyAnchors.map((anchor, index) => (
                <View key={`pending-weekly-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={screenStyles.body}>{weeklyAnchorSummary(anchor)}</Text>
                  <PremiumButton disabled={controlsBusy} icon="trash-outline" label="Remove draft weekly session" onPress={() => removePendingWeeklyAnchor(index)} tone="green" variant="quiet" />
                </View>
              )) : null}
              {pendingDatedAnchors.length > 0 ? pendingDatedAnchors.map((anchor, index) => (
                <View key={`pending-dated-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={screenStyles.body}>{datedAnchorSummary(anchor)}</Text>
                  <PremiumButton disabled={controlsBusy} icon="trash-outline" label="Remove draft one-off session" onPress={() => removePendingDatedAnchor(index)} tone="green" variant="quiet" />
                </View>
              )) : null}
              {pendingWeeklyAnchors.length === 0 && pendingDatedAnchors.length === 0 ? <Text style={screenStyles.subtle}>No new boxing sessions added in this wizard yet.</Text> : null}
              {protectedScheduleMode !== "clear_for_plan" ? (
                <PremiumButton disabled={controlsBusy} icon={anchorEditorOpen ? "chevron-up-outline" : "add-outline"} label={anchorEditorOpen ? "Hide session fields" : "Add weekly session"} onPress={() => setAnchorEditorOpen((value) => !value)} tone="green" variant="quiet" />
              ) : null}
              {anchorEditorOpen && protectedScheduleMode !== "clear_for_plan" ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.fieldLabel}>Weekly recurring or one-off date?</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={anchorMode === "weekly"} busy={controlsBusy} label="Weekly recurring" onPress={() => setAnchorMode("weekly")} />
                    <OptionButton active={anchorMode === "one_off"} busy={controlsBusy} label="One-off date" onPress={() => setAnchorMode("one_off")} />
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    {anchorTypeOptions.map((option) => <OptionButton active={anchorType === option.value} busy={controlsBusy} key={option.value} label={option.label} onPress={() => selectAnchorType(option.value)} />)}
                  </View>
                  {anchorMode === "weekly" ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={screenStyles.fieldLabel}>Which day does this usually happen?</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                        {weekdayOptions.map((option) => <OptionButton active={anchorWeekday === option.value} busy={controlsBusy} key={option.value} label={option.label} onPress={() => setAnchorWeekday(option.value)} />)}
                      </View>
                    </View>
                  ) : (
                    <TextInput onChangeText={setAnchorDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorDate} />
                  )}
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorStartTime} placeholder="Time optional HH:MM" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorStartTime} />
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorDurationMinutes} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    {anchorIntensityOptions.map((option) => <OptionButton active={anchorIntensity === option.value} busy={controlsBusy} key={option.value} label={option.label} onPress={() => setAnchorIntensity(option.value)} />)}
                  </View>
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorRounds} />
                  <TextInput onChangeText={setAnchorNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorNote} />
                  <PremiumButton disabled={controlsBusy} icon="add-circle-outline" label="Add session to review" onPress={addPendingAnchor} tone="green" />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === "details" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-details-step">
            <Text style={screenStyles.callout}>Step 3: Goal-specific details</Text>
            <Text style={screenStyles.body}>{goalLabel(mode)}</Text>
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.fieldLabel}>Support workout dose</Text>
              <Text style={screenStyles.subtle}>How much app-generated support should CornerIQ try to place around boxing. Safety and readiness can still reduce it.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {trainingDoseOptions.map((option) => (
                  <DescribedOptionButton active={trainingDose === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => selectTrainingDose(option.value)} />
                ))}
              </View>
            </View>
            {mode === "build" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.fieldLabel}>Main workout goal</Text>
                <Text style={screenStyles.subtle}>Pick the clearest thing your app workouts should improve. Boxing sessions you add still stay first.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {buildFocusOptions.map((option) => (
                    <DescribedOptionButton active={primaryFocus === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => selectPrimaryFocus(option.value)} />
                  ))}
                </View>
                <Text style={screenStyles.fieldLabel}>Specific target</Text>
                <Text style={screenStyles.subtle}>Choose the most objective target you recognize. Balanced defaults to a safe mix if you are unsure.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {subFocusOptionsFor(primaryFocus).map((option) => (
                    <DescribedOptionButton active={subFocus === option} busy={controlsBusy} description={subFocusDescription(option)} key={option} label={subFocusLabel(option)} onPress={() => setSubFocus(option)} />
                  ))}
                </View>
              </View>
            ) : null}

            {mode === "fight" ? (
              <View style={{ gap: spacing.sm }}>
                <WizardFieldGroup title="Fight status" helper="Tentative details are allowed; confirmed details give the engine more confidence.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={status === "tentative"} busy={controlsBusy} label="Tentative" onPress={() => setStatus("tentative")} />
                    <OptionButton active={status === "confirmed"} busy={controlsBusy} label="Confirmed" onPress={() => setStatus("confirmed")} />
                    <OptionButton active={status === "short_notice"} busy={controlsBusy} label="Short notice" onPress={() => setStatus("short_notice")} />
                  </View>
                </WizardFieldGroup>
                <WizardFieldGroup title="Ruleset" helper="Amateur, pro, and weigh-in timing change how conservative fight-week support stays.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={amateurOrPro === "amateur"} busy={controlsBusy} label="Amateur" onPress={() => setAmateurOrPro("amateur")} />
                    <OptionButton active={amateurOrPro === "pro"} busy={controlsBusy} label="Pro" onPress={() => setAmateurOrPro("pro")} />
                  </View>
                </WizardFieldGroup>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <WizardFactField helper={`${effectiveBodyMassContext.statusLabel}. ${effectiveBodyMassContext.helperCopy}`} label="Current weight" value={effectiveBodyMassContext.currentWeightLabel} />
                  <WizardField helper="Use the scheduled fight date, even if the bout is tentative." label="Fight date" onChangeText={setBoutDate} placeholder="YYYY-MM-DD" value={boutDate} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <WizardField helper={fightTargetHelper(contractedWeightKg, allowanceKg)} keyboardType="decimal-pad" label="Weigh-in target (kg)" onChangeText={setContractedWeightKg} placeholder="Contracted weight kg" value={contractedWeightKg} />
                  <WizardField helper="Use 0 unless the bout sheet lists an allowance." keyboardType="decimal-pad" label="Allowance (kg)" onChangeText={setAllowanceKg} placeholder="Allowance kg" value={allowanceKg} />
                </View>
                <WizardField helper="Examples: 67 kg, open class, 147 lb catchweight." label="Class / contract label" onChangeText={setTargetClassLabel} placeholder="Target class label" value={targetClassLabel} />
                <WizardFieldGroup title="Weigh-in timing" helper="Unknown timing keeps weight-class action blocked until confirmed.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={weighInType === "same_day"} busy={controlsBusy} label="Same day" onPress={() => setWeighInType("same_day")} />
                    <OptionButton active={weighInType === "day_before"} busy={controlsBusy} label="Day before" onPress={() => setWeighInType("day_before")} />
                    <OptionButton active={weighInType === "unknown"} busy={controlsBusy} label="Unknown" onPress={() => setWeighInType("unknown")} />
                  </View>
                </WizardFieldGroup>
                {weighInType === "unknown" ? <WizardNotice title="Weight-class action is blocked until weigh-in timing is confirmed." tone="orange" /> : null}
                <WizardFieldGroup title="Bout format" helper="Defaults are fine for most amateur entries; update if the bout sheet differs.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <WizardField keyboardType="number-pad" label="Rounds" onChangeText={setRounds} placeholder="Rounds" value={rounds} />
                    <WizardField keyboardType="decimal-pad" label="Round minutes" onChangeText={setRoundMinutes} placeholder="Round minutes" value={roundMinutes} />
                  </View>
                </WizardFieldGroup>
                <PremiumButton disabled={controlsBusy} icon={advancedOpen ? "chevron-up-outline" : "options-outline"} label={advancedOpen ? "Hide optional details" : "Optional official details"} onPress={() => setAdvancedOpen((value) => !value)} tone="green" variant="quiet" />
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <WizardField helper="Optional exact timestamp from the bout sheet, for example 2026-07-01T08:00:00.000Z." label="Exact weigh-in date/time" onChangeText={setWeighInDateTime} placeholder="Weigh-in datetime optional ISO" value={weighInDateTime} />
                    <WizardField helper="Only use this if the promotion lists a post-weigh-in cap." keyboardType="decimal-pad" label="Post-weigh-in cap (kg)" onChangeText={setPostWeighInWeightCapKg} placeholder="Post-weigh-in cap kg optional" value={postWeighInWeightCapKg} />
                    <OptionButton active={hydrationTestingRequired} busy={controlsBusy} label="Hydration testing required" onPress={() => setHydrationTestingRequired((value) => !value)} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "tournament" ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <WizardFactField helper={`${effectiveBodyMassContext.statusLabel}. Tournament support defaults to staying near weight unless real review says otherwise.`} label="Current weight" value={effectiveBodyMassContext.currentWeightLabel} />
                  <WizardFactField helper="Tournament setup records dates and daily weigh-ins. Official target weight still comes from fight or weight-class context." label="Target weight source" value="Use fight / weight-class setup" />
                </View>
                <WizardFieldGroup title="Tournament dates" helper="Use the full tournament window so repeated weigh-ins and recovery days stay visible.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <WizardField label="Start date" onChangeText={setTournamentStartDate} placeholder="Start date YYYY-MM-DD" value={tournamentStartDate} />
                    <WizardField label="End date" onChangeText={setTournamentEndDate} placeholder="End date YYYY-MM-DD" value={tournamentEndDate} />
                  </View>
                </WizardFieldGroup>
                <WizardField helper="Comma-separated dates are okay while the draw is uncertain." label="Possible bout dates" onChangeText={setPossibleBoutDates} placeholder="Possible bout days, comma-separated" value={possibleBoutDates} />
                <WizardFieldGroup title="Weigh-ins" helper="Daily or same-day weigh-ins keep the plan conservative by default.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={dailyWeighIns} busy={controlsBusy} label="Daily weigh-ins" onPress={() => setDailyWeighIns((value) => !value)} />
                    <OptionButton active={sameDayBoutLikely} busy={controlsBusy} label="Same-day bout likely" onPress={() => setSameDayBoutLikely((value) => !value)} />
                  </View>
                  <WizardField helper="Local time, HH:MM." label="Daily weigh-in time" onChangeText={setWeighInTimeEachDay} placeholder="Weigh-in time" value={weighInTimeEachDay} />
                </WizardFieldGroup>
                <WizardField keyboardType="number-pad" helper="Include the maximum realistic number of bouts, not just the first bout." label="Possible bouts" onChangeText={setNumberOfPotentialBouts} placeholder="Number of possible bouts" value={numberOfPotentialBouts} />
                <WizardFieldGroup title="Tournament strategy" helper="Stay near weight is the safest default for repeated weigh-ins.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={strategyMode === "stay_near_weight"} busy={controlsBusy} label="Stay near weight" onPress={() => setStrategyMode("stay_near_weight")} />
                    <OptionButton active={strategyMode === "mild_daily_cut"} busy={controlsBusy} label="Mild daily cut" onPress={() => setStrategyMode("mild_daily_cut")} />
                    <OptionButton active={strategyMode === "no_cut_recommended"} busy={controlsBusy} label="No cut recommended" onPress={() => setStrategyMode("no_cut_recommended")} />
                  </View>
                </WizardFieldGroup>
                <PremiumButton disabled={controlsBusy} icon={advancedOpen ? "chevron-up-outline" : "options-outline"} label={advancedOpen ? "Hide optional timing" : "Optional timing details"} onPress={() => setAdvancedOpen((value) => !value)} tone="green" variant="quiet" />
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <WizardField helper="Hours available after each weigh-in before a possible bout, comma-separated if it varies by day." label="Rehydration windows (hours)" onChangeText={setRehydrationWindowHoursByDay} placeholder="Rehydration windows hours" value={rehydrationWindowHoursByDay} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "recovery" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.body}>Recovery keeps support workouts conservative while you get back to normal training.</Text>
                <WizardField keyboardType="number-pad" helper="Leave blank for the engine default." label="Recovery duration days" onChangeText={setRecoveryDurationDays} placeholder="Duration days optional" value={recoveryDurationDays} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {recoveryFocusOptions.map((option) => (
                    <DescribedOptionButton active={recoveryFocus === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => setRecoveryFocus(option.value)} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === "review" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-review-step">
            <Text style={screenStyles.callout}>Step 4: Review</Text>
            <Text style={screenStyles.body}>Readiness, safety, and phase rules still gate the final plan.</Text>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Plan action</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <OptionButton active={planAction === "start_new_plan"} busy={controlsBusy} label="Start new plan" onPress={() => setPlanAction("start_new_plan")} />
                <OptionButton active={planAction === "amend_current_plan"} busy={controlsBusy} label="Amend current plan" onPress={() => setPlanAction("amend_current_plan")} />
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Goal</Text>
              <Text style={screenStyles.body}>{goalLabel(mode)}</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Support workout availability</Text>
              <Text style={screenStyles.body}>{daySummary(selectedAvailableDays)}</Text>
              <Text style={screenStyles.subtle}>
                {protectedScheduleMode === "keep_existing"
                  ? "Existing weekly and one-off boxing sessions stay on the plan because you chose to keep them."
                  : protectedScheduleMode === "replace_for_plan"
                    ? "Existing boxing sessions will be replaced by sessions added in this wizard."
                    : "Existing weekly sessions and future one-off sessions will be cleared."}
              </Text>
              <Text style={screenStyles.subtle}>Support workouts use only the selected availability above.</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Fixed schedule mode</Text>
              <Text style={screenStyles.body}>{protectedScheduleMode === "keep_existing" ? "Keep existing fixed schedule" : protectedScheduleMode === "replace_for_plan" ? "Replace fixed schedule for this plan" : "Clear fixed schedule"}</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>New weekly sessions to save</Text>
              {pendingWeeklyAnchors.length > 0 ? pendingWeeklyAnchors.map((anchor, index) => <Text key={`review-weekly-anchor:${index}`} style={screenStyles.body}>{weeklyAnchorSummary(anchor)}</Text>) : <Text style={screenStyles.subtle}>No new weekly sessions in this wizard.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>New one-off sessions to save</Text>
              {pendingDatedAnchors.length > 0 ? pendingDatedAnchors.map((anchor, index) => <Text key={`review-dated-anchor:${index}`} style={screenStyles.body}>{datedAnchorSummary(anchor)}</Text>) : <Text style={screenStyles.subtle}>No new one-off sessions in this wizard.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Existing weekly sessions</Text>
              {existingWeeklyAnchors.length > 0 ? existingWeeklyAnchors.slice(0, 6).map((anchor) => (
                <Text key={`existing-weekly-anchor:${anchor.id}`} style={screenStyles.body}>{anchor.label}</Text>
              )) : <Text style={screenStyles.subtle}>No existing weekly sessions are already on the plan.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Upcoming dated sessions</Text>
              {existingFixedSchedule.length > 0 ? existingFixedSchedule.slice(0, 6).map((anchor) => (
                <Text key={`existing-anchor:${anchor.id}`} style={screenStyles.body}>{datedAnchorSummary({ type: anchor.type, date: anchor.date, ...(anchor.startTime ? { startTime: anchor.startTime } : {}), durationMinutes: anchor.durationMinutes, intensity: anchor.intensity, ...(anchor.rounds === null ? {} : { rounds: anchor.rounds }), ...(anchor.note ? { note: anchor.note } : {}) })}</Text>
              )) : <Text style={screenStyles.subtle}>No upcoming dated sessions are already on the plan.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Key details</Text>
              {reviewRows.map((row) => <Text key={`review:${row}`} style={screenStyles.body}>{row}</Text>)}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {step !== "goal" ? (
            <View style={{ flexBasis: 120, flexGrow: 1 }}>
              <PremiumButton disabled={controlsBusy} icon="chevron-back-outline" label="Back" onPress={goBack} tone="green" variant="quiet" />
            </View>
          ) : null}
          <View style={{ flexBasis: 150, flexGrow: 1 }}>
            <PremiumButton
              accessibilityLabel={step === "review" ? finalAccessibilityLabel(mode) : "Next plan wizard step"}
              disabled={controlsBusy}
              icon={step === "review" ? "sparkles-outline" : "arrow-forward-outline"}
              label={submittingPlanAction === "start_new_plan" ? "Generating plan..." : submittingPlanAction === "amend_current_plan" ? "Updating plan..." : step === "review" ? "Generate plan" : step === "details" ? "Review plan" : "Next"}
              onPress={step === "review" ? () => void saveCurrentGoal() : goNext}
              tone="green"
            />
          </View>
        </View>
        <PremiumButton disabled={controlsBusy} icon="return-up-back-outline" label="Keep current plan" onPress={onCancel} tone="green" variant="quiet" />
    </View>
  );

  return framed ? <PremiumCard accent="green" density="spacious" testID="plan-generation-frame">{content}</PremiumCard> : content;
}

