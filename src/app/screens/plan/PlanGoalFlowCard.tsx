import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ExistingTrainingComponent, ISODateString, PlanViewModel } from "../../../engine/core/types";
import { colors, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalISODateTime,
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
  existingTrainingDraftTitle,
  workoutTypeForExistingTraining,
  type BuildGoalDraft,
  type FightSetupDraft,
  type PlanLifecycleAction,
  type PlanProtectedScheduleMode,
  type ProtectedWorkoutDraft,
  type RecurringProtectedWorkoutAnchorDraft,
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../../../services/supabase/onboardingService";
import {
  existingBoxingOptions,
  existingConditioningOptions,
  existingStrengthOptions,
  existingTrainingComponentOptions,
  existingTrainingEffortOptions,
  intensityForExistingTrainingEffort
} from "../../forms/existingTrainingFields";

type GoalMode = "build" | "fight" | "tournament" | "recovery";
type GoalChoice = "build" | "fight";
type FightFormat = "single_fight" | "tournament";
type WizardView = "confirmation" | "guided";
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
  initialSetup: PlanViewModel["planWizardSetup"];
  isMinor: boolean;
  onCancel: () => void;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession?: ((workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>) | undefined;
  onSaveRecurringProtectedAnchor?: ((anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>) | undefined;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
  onStepChange?: (() => void) | undefined;
  showCloseButton?: boolean | undefined;
}

const wizardSteps: readonly { key: WizardStep; label: string }[] = [
  { key: "goal", label: "Goal type" },
  { key: "schedule", label: "Schedule" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" }
];

const goalOptions: readonly OptionDetail<GoalChoice>[] = [
  { label: "Build phase", value: "build", description: "No fight date. Build strength, conditioning, power, skill, or mobility around boxing." },
  { label: "Fight camp", value: "fight", description: "Prepare for a single fight or a tournament with known or tentative dates." }
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
const wizardPalette = {
  canvas: "#F7F3EC",
  surface: "#FFFCF7",
  ink: "#061318",
  body: "#526168",
  muted: "#6F7C81",
  line: "rgba(6, 19, 24, 0.13)",
  cyan: "#27CEF1",
  cyanWash: "rgba(39, 206, 241, 0.09)",
  warning: "#9A6100",
  warningWash: "#FFF0CF",
  danger: "#B4233B",
  dangerWash: "#FFF0F2"
} as const;

const wizardStyles = {
  shell: { backgroundColor: wizardPalette.canvas, padding: spacing.lg },
  guidedShell: { backgroundColor: wizardPalette.canvas, gap: spacing.lg, padding: spacing.lg },
  eyebrow: { color: wizardPalette.cyan, fontFamily: fontFamilies.black, fontSize: 11, letterSpacing: 0.35, lineHeight: 15, textTransform: "uppercase" },
  displayTitle: { color: wizardPalette.ink, fontFamily: fontFamilies.black, fontSize: 30, letterSpacing: -0.6, lineHeight: 32 },
  body: { color: wizardPalette.ink, fontFamily: fontFamilies.medium, fontSize: 14, lineHeight: 19 },
  subtle: { color: wizardPalette.body, fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18 },
  fieldLabel: { color: wizardPalette.ink, fontFamily: fontFamilies.bold, fontSize: 12, lineHeight: 16 },
  callout: { color: wizardPalette.cyan, fontFamily: fontFamilies.black, fontSize: 11, letterSpacing: 0.25, lineHeight: 15, textTransform: "uppercase" },
  input: { backgroundColor: wizardPalette.surface, borderColor: wizardPalette.line, borderRadius: 5, borderWidth: 1, color: wizardPalette.ink, fontFamily: fontFamilies.medium, fontSize: 15, minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  section: { borderTopColor: wizardPalette.line, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md },
  row: { alignItems: "center", borderBottomColor: wizardPalette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48, paddingVertical: spacing.sm },
  rowLabel: { color: wizardPalette.muted, fontFamily: fontFamilies.semibold, fontSize: 12, lineHeight: 16 },
  rowValue: { color: wizardPalette.ink, flex: 1, fontFamily: fontFamilies.bold, fontSize: 14, lineHeight: 19, textAlign: "right" }
} as const;

function OptionButton({ accessibilityLabel, active, busy, label, onPress }: { accessibilityLabel?: string | undefined; active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: active ? wizardPalette.cyan : pressed ? wizardPalette.cyanWash : wizardPalette.surface,
        borderColor: active ? wizardPalette.cyan : wizardPalette.line,
        borderRadius: 5,
        borderWidth: 1,
        flexGrow: 1,
        justifyContent: "center",
        maxWidth: 360,
        minHeight: 44,
        opacity: busy ? 0.58 : 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs
      })}
    >
      <Text style={{ color: wizardPalette.ink, fontFamily: fontFamilies.bold, fontSize: 13, lineHeight: 17, textAlign: "center" }}>{label}</Text>
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
        alignItems: "center",
        backgroundColor: active ? wizardPalette.cyanWash : pressed ? "rgba(39, 206, 241, 0.05)" : "transparent",
        borderColor: active ? wizardPalette.cyan : wizardPalette.line,
        borderRadius: 5,
        borderWidth: 1,
        flexBasis: "100%",
        flexDirection: "row",
        flexGrow: 1,
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 64,
        opacity: busy ? 0.58 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <Ionicons color={active ? wizardPalette.cyan : wizardPalette.muted} name={active ? "radio-button-on" : "radio-button-off"} size={20} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: wizardPalette.ink, fontFamily: fontFamilies.bold, fontSize: 14, lineHeight: 18 }}>{label}</Text>
        <Text style={{ color: wizardPalette.body, fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 16 }}>{description}</Text>
      </View>
    </Pressable>
  );
}

function WizardProgress({
  currentStep
}: {
  currentStep: WizardStep;
}) {
  const currentIndex = stepIndex(currentStep);
  const current = wizardSteps[currentIndex] ?? wizardSteps[0];
  return (
    <View accessibilityLabel={`${current?.label ?? "Wizard"}, step ${currentIndex + 1} of ${wizardSteps.length}`} style={{ gap: spacing.xs }}>
      <Text style={wizardStyles.eyebrow}>{currentIndex + 1} OF {wizardSteps.length} · {current?.label}</Text>
      <View style={{ backgroundColor: wizardPalette.line, height: 2, overflow: "hidden" }}>
        <View style={{ backgroundColor: wizardPalette.cyan, height: 2, width: `${((currentIndex + 1) / wizardSteps.length) * 100}%` }} />
      </View>
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
  const color = tone === "red" ? wizardPalette.danger : tone === "orange" ? wizardPalette.warning : wizardPalette.cyan;
  return (
    <View
      accessibilityRole={tone === "red" || tone === "orange" ? "alert" : undefined}
      style={{
        backgroundColor: tone === "red" ? wizardPalette.dangerWash : tone === "orange" ? wizardPalette.warningWash : wizardPalette.cyanWash,
        borderColor: color,
        borderRadius: 5,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md
      }}
      testID={testID}
    >
      <Text style={{ color, fontFamily: fontFamilies.bold, fontSize: 13, lineHeight: 18 }}>{title}</Text>
      {body ? <Text style={wizardStyles.subtle}>{body}</Text> : null}
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
      <Text style={wizardStyles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={wizardPalette.muted}
        style={wizardStyles.input}
        value={value}
      />
      {helper ? <Text style={wizardStyles.subtle}>{helper}</Text> : null}
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
      <Text style={wizardStyles.fieldLabel}>{label}</Text>
      <View
        accessibilityLabel={`${label}: ${value}`}
        style={{
          backgroundColor: wizardPalette.surface,
          borderColor: wizardPalette.line,
          borderRadius: 5,
          borderWidth: 1,
          justifyContent: "center",
          minHeight: 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        <Text selectable style={{ color: wizardPalette.ink, fontFamily: fontFamilies.medium, fontSize: 15, lineHeight: 21 }}>
          {value}
        </Text>
      </View>
      {helper ? <Text style={wizardStyles.subtle}>{helper}</Text> : null}
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
        <Text style={wizardStyles.fieldLabel}>{title}</Text>
        {helper ? <Text style={wizardStyles.subtle}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function WizardButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  onPress,
  variant = "primary"
}: {
  accessibilityLabel?: string | undefined;
  disabled?: boolean | undefined;
  icon?: keyof typeof Ionicons.glyphMap | undefined;
  label: string;
  onPress: () => Promise<void> | void;
  variant?: "primary" | "quiet" | undefined;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: primary ? wizardPalette.cyan : "transparent",
        borderColor: primary ? wizardPalette.cyan : "transparent",
        borderRadius: 5,
        borderWidth: primary ? 1 : 0,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: primary ? 52 : 44,
        opacity: disabled ? 0.42 : pressed ? 0.68 : 1,
        paddingHorizontal: spacing.md
      })}
    >
      {icon ? <Ionicons color={primary ? wizardPalette.ink : wizardPalette.cyan} name={icon} size={18} /> : null}
      <Text style={{ color: primary ? wizardPalette.ink : wizardPalette.cyan, fontFamily: fontFamilies.black, fontSize: primary ? 16 : 14, lineHeight: 20 }}>{label}</Text>
    </Pressable>
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
  if (mode === "tournament") {
    return "Fight camp · Tournament";
  }
  if (mode === "fight") {
    return "Fight camp · Single fight";
  }
  if (mode === "recovery") {
    return "Recovery";
  }
  return "Build phase";
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

function weekdayLabel(weekday: RecurringProtectedWorkoutAnchorDraft["weekday"]): string {
  return weekdayOptions.find((option) => option.value === weekday)?.label ?? titleCase(weekday);
}

function weeklyAnchorSummary(anchor: RecurringProtectedWorkoutAnchorDraft): string {
  return [
    `Every ${weekdayLabel(anchor.weekday)}`,
    existingTrainingDraftTitle(anchor),
    `${anchor.durationMinutes} min`,
    titleCase(anchor.intensity)
  ].filter(Boolean).join(" · ");
}

function datedAnchorSummary(anchor: ProtectedWorkoutDraft): string {
  return [anchor.date, existingTrainingDraftTitle(anchor), `${anchor.durationMinutes} min`, titleCase(anchor.intensity)].filter(Boolean).join(" · ");
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

function boxingScheduleSummary(existingWeeklyAnchors: readonly WeeklyAnchor[], existingFixedSchedule: readonly FixedSession[]): string {
  const weeklyDays = [...new Set(existingWeeklyAnchors.map((anchor) => weekdayLabel(anchor.weekday)))];
  if (weeklyDays.length > 0) {
    const weekly = weeklyDays.slice(0, 3).join(" · ");
    return weeklyDays.length > 3 ? `${weekly} +${weeklyDays.length - 3}` : weekly;
  }
  if (existingFixedSchedule.length > 0) {
    return `${existingFixedSchedule.length} upcoming ${existingFixedSchedule.length === 1 ? "session" : "sessions"}`;
  }
  return "No fixed sessions";
}

function ConfirmationRow({
  icon,
  label,
  onEdit,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onEdit?: (() => void) | undefined;
  value: string;
}) {
  const row = (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 66, paddingVertical: spacing.sm }}>
      <View style={{ alignItems: "center", backgroundColor: "rgba(39, 206, 241, 0.09)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 }}>
        <Ionicons color={colors.blueIQ} name={icon} size={22} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: "#526168", fontFamily: fontFamilies.semibold, fontSize: 13, lineHeight: 17 }}>{label}</Text>
        <Text numberOfLines={2} style={{ color: colors.cornerBlack, fontFamily: fontFamilies.bold, fontSize: 17, lineHeight: 22 }}>{value}</Text>
      </View>
      {onEdit ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 2 }}>
          <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.bold, fontSize: 14 }}>Edit</Text>
          <Ionicons color={colors.blueIQ} name="chevron-forward" size={17} />
        </View>
      ) : (
        <Text style={{ color: "#6F7C81", fontFamily: fontFamilies.semibold, fontSize: 12 }}>From profile</Text>
      )}
    </View>
  );

  if (!onEdit) {
    return <View style={{ borderBottomColor: "rgba(6, 19, 24, 0.12)", borderBottomWidth: 1 }}>{row}</View>;
  }
  return (
    <Pressable
      accessibilityLabel={`Edit ${label}`}
      accessibilityRole="button"
      onPress={onEdit}
      style={({ pressed }) => ({ backgroundColor: pressed ? "rgba(39, 206, 241, 0.06)" : "transparent", borderBottomColor: "rgba(6, 19, 24, 0.12)", borderBottomWidth: 1 })}
    >
      {row}
    </Pressable>
  );
}

function ReviewSummaryRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={wizardStyles.row}>
      <Ionicons color={wizardPalette.cyan} name={icon} size={18} />
      <Text style={wizardStyles.rowLabel}>{label}</Text>
      <Text numberOfLines={2} style={wizardStyles.rowValue}>{value}</Text>
    </View>
  );
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
  initialSetup,
  isMinor,
  onCancel,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveRecoveryGoal,
  onSaveTournamentSetup,
  onStepChange,
  showCloseButton = false
}: PlanGoalFlowCardProps) {
  const fallbackFight = createDefaultFightDraft(asOfDate);
  const fallbackTournament = createDefaultTournamentDraft(asOfDate);
  const defaultFight: FightSetupDraft = (() => {
    if (!initialSetup.fight) {
      return fallbackFight;
    }
    const { postWeighInWeightCapKg, weighInDateTime, ...knownFight } = initialSetup.fight;
    return {
      ...fallbackFight,
      ...knownFight,
      targetLimitKg: knownFight.contractedWeightKg,
      ...(weighInDateTime ? { weighInDateTime: weighInDateTime as FightSetupDraft["weighInDateTime"] } : {}),
      ...(postWeighInWeightCapKg === null ? {} : { postWeighInWeightCapKg })
    };
  })();
  const defaultTournament: TournamentSetupDraft = initialSetup.tournament
    ? { ...fallbackTournament, ...initialSetup.tournament, possibleBoutDates: [...initialSetup.tournament.possibleBoutDates], rehydrationWindowHoursByDay: [...initialSetup.tournament.rehydrationWindowHoursByDay] }
    : fallbackTournament;
  const effectiveBodyMassContext = bodyMassContext ?? defaultBodyMassContext();
  const initialMode: GoalMode = initialSetup.goalMode;
  const [wizardView, setWizardView] = React.useState<WizardView>("confirmation");
  const [step, setStep] = React.useState<WizardStep>("goal");
  const [mode, setMode] = React.useState<GoalMode>(initialMode);
  const [fightFormat, setFightFormat] = React.useState<FightFormat>(initialMode === "tournament" ? "tournament" : "single_fight");
  const [planAction, setPlanAction] = React.useState<PlanLifecycleAction>(() => defaultPlanAction(currentModeLabel, initialMode));
  const [protectedScheduleMode, setProtectedScheduleMode] = React.useState<PlanProtectedScheduleMode>("keep_existing");
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
  const [weighInDateTime, setWeighInDateTime] = React.useState(defaultFight.weighInDateTime ?? "");
  const [hydrationTestingRequired, setHydrationTestingRequired] = React.useState(defaultFight.hydrationTestingRequired);
  const [postWeighInWeightCapKg, setPostWeighInWeightCapKg] = React.useState(defaultFight.postWeighInWeightCapKg ? `${defaultFight.postWeighInWeightCapKg}` : "");

  const [tournamentStartDate, setTournamentStartDate] = React.useState(defaultTournament.tournamentStartDate);
  const [tournamentEndDate, setTournamentEndDate] = React.useState(defaultTournament.tournamentEndDate);
  const [possibleBoutDates, setPossibleBoutDates] = React.useState(defaultTournament.possibleBoutDates.join(","));
  const [dailyWeighIns, setDailyWeighIns] = React.useState(defaultTournament.dailyWeighIns);
  const [weighInTimeEachDay, setWeighInTimeEachDay] = React.useState(defaultTournament.weighInTimeEachDay);
  const [numberOfPotentialBouts, setNumberOfPotentialBouts] = React.useState(`${defaultTournament.numberOfPotentialBouts}`);
  const [strategyMode, setStrategyMode] = React.useState<TournamentSetupDraft["strategyMode"]>(defaultTournament.strategyMode);
  const [sameDayBoutLikely, setSameDayBoutLikely] = React.useState(defaultTournament.sameDayBoutLikely);
  const [rehydrationWindowHoursByDay, setRehydrationWindowHoursByDay] = React.useState(defaultTournament.rehydrationWindowHoursByDay.join(","));

  const [recoveryDurationDays, setRecoveryDurationDays] = React.useState("");
  const [recoveryFocus, setRecoveryFocus] = React.useState<NonNullable<RecoveryGoalDraft["focus"]>>("general");
  const [anchorEditorOpen, setAnchorEditorOpen] = React.useState(false);
  const [anchorMode, setAnchorMode] = React.useState<AnchorMode>("weekly");
  const [anchorComponents, setAnchorComponents] = React.useState<ExistingTrainingComponent[]>(["boxing"]);
  const [anchorPrimaryComponent, setAnchorPrimaryComponent] = React.useState<ExistingTrainingComponent | null>(null);
  const [anchorBoxingFormat, setAnchorBoxingFormat] = React.useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["boxingFormat"]>>("technical_work");
  const [anchorStrengthArea, setAnchorStrengthArea] = React.useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["strengthArea"]>>("full_body");
  const [anchorConditioningFormat, setAnchorConditioningFormat] = React.useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["conditioningFormat"]>>("steady_cardio");
  const [anchorWeekday, setAnchorWeekday] = React.useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>("monday");
  const [anchorDate, setAnchorDate] = React.useState(asOfDate);
  const [anchorDurationMinutes, setAnchorDurationMinutes] = React.useState("60");
  const [anchorEffort, setAnchorEffort] = React.useState(6);
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
    availabilityEditedRef.current = true;
    setSelectedAvailableDays((current) => {
      const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
      setStepError(next.length === 0 ? "Choose at least one available day." : null);
      if (!trainingDoseEditedRef.current) {
        setTrainingDose(defaultTrainingDose(next.length));
      }
      return next;
    });
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

  const chooseGoal = (choice: GoalChoice) => {
    chooseMode(choice === "fight" && fightFormat === "tournament" ? "tournament" : choice);
  };

  const chooseFightFormat = (format: FightFormat) => {
    setFightFormat(format);
    chooseMode(format === "tournament" ? "tournament" : "fight");
  };

  const openGuidedStep = (nextStep: WizardStep, openScheduleEditor = false) => {
    onStepChange?.();
    setStep(nextStep);
    setAnchorEditorOpen(openScheduleEditor);
    setWizardView("guided");
    setStepError(null);
  };

  const requireAvailability = (): boolean => {
    if (selectedAvailableDays.length > 0) {
      return true;
    }
    setStepError("Choose at least one available day.");
    setStep("schedule");
    setWizardView("guided");
    return false;
  };

  const goNext = () => {
    if (step === "schedule" && !requireAvailability()) {
      return;
    }
    const next = wizardSteps[Math.min(stepIndex(step) + 1, wizardSteps.length - 1)]?.key ?? "review";
    onStepChange?.();
    setStepError(null);
    setStep(next);
  };

  const goBack = () => {
    const previous = wizardSteps[Math.max(stepIndex(step) - 1, 0)]?.key ?? "goal";
    onStepChange?.();
    setStepError(null);
    setStep(previous);
  };

  const resetAnchorEditor = () => {
    setAnchorMode("weekly");
    setAnchorComponents(["boxing"]);
    setAnchorPrimaryComponent(null);
    setAnchorBoxingFormat("technical_work");
    setAnchorStrengthArea("full_body");
    setAnchorConditioningFormat("steady_cardio");
    setAnchorWeekday("monday");
    setAnchorDate(asOfDate);
    setAnchorDurationMinutes("60");
    setAnchorEffort(6);
  };

  const toggleAnchorComponent = (component: ExistingTrainingComponent) => {
    setAnchorComponents((current) => {
      const next = current.includes(component) ? current.filter((item) => item !== component) : [...current, component];
      if (next.length === 0) return current;
      if (anchorPrimaryComponent && !next.includes(anchorPrimaryComponent)) setAnchorPrimaryComponent(null);
      return next;
    });
  };

  const addPendingAnchor = () => {
    try {
      const type = workoutTypeForExistingTraining(anchorComponents, anchorBoxingFormat);
      const details = {
        components: [...anchorComponents],
        primaryComponent: anchorComponents.length > 1 ? anchorPrimaryComponent : anchorComponents[0] ?? null,
        ...(anchorComponents.includes("boxing") ? { boxingFormat: anchorBoxingFormat } : {}),
        ...(anchorComponents.includes("strength") ? { strengthArea: anchorStrengthArea } : {}),
        ...(anchorComponents.includes("conditioning") ? { conditioningFormat: anchorConditioningFormat } : {})
      };
      const durationMinutes = parseRequiredPositiveInteger(anchorDurationMinutes, "Workout duration minutes");
      const intensity = intensityForExistingTrainingEffort(anchorEffort);
      if (anchorMode === "weekly") {
        const draft: RecurringProtectedWorkoutAnchorDraft = {
          type,
          weekday: anchorWeekday,
          durationMinutes,
          intensity,
          ...details,
          activeFrom: asOfDate
        };
        setPendingWeeklyAnchors((current) => [...current, draft]);
      } else {
        const draft: ProtectedWorkoutDraft = {
          type,
          date: parseRequiredDateYYYYMMDD(anchorDate, "Session date"),
          durationMinutes,
          intensity,
          ...details
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

  const updateRehydrationWindow = (index: number, value: string) => {
    setRehydrationWindowHoursByDay((current) => {
      const windows = current.split(",").map((item) => item.trim());
      windows[index] = value;
      return windows.join(",");
    });
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

  const availabilitySummary = selectedAvailableDays.length > 0
    ? `${selectedAvailableDays.length} ${selectedAvailableDays.length === 1 ? "day" : "days"} each week`
    : "Needs setup";
  const scheduleSummary = boxingScheduleSummary(existingWeeklyAnchors, existingFixedSchedule);
  const guidedTitle = step === "goal"
    ? "What are we training toward?"
    : step === "schedule"
      ? anchorEditorOpen
        ? anchorMode === "weekly" ? "Add a weekly session" : "Add a one-off session"
        : "Let's set up your weekly schedule."
      : step === "details"
        ? mode === "build" ? "Shape the work" : mode === "tournament" ? "Set the tournament" : "Set the fight details"
        : "Ready to build";
  const guidedHelper = step === "goal"
    ? "Choose the direction CornerIQ should plan around."
    : step === "schedule"
      ? anchorEditorOpen ? "Add the details CornerIQ should protect in your schedule." : "Review your support days and current boxing schedule."
      : step === "details"
        ? mode === "build" ? "Choose your support dose and main workout goal." : mode === "tournament" ? "Add the timing and strategy details that shape this tournament." : "Add the confirmed information for this fight."
        : "Review your plan details before we generate it.";
  const confirmationContent = (
    <View accessibilityLabel="Plan generation wizard" style={{ padding: spacing.lg }} testID="plan-generation-wizard">
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.black, fontSize: 12, letterSpacing: 0.4, lineHeight: 16 }}>CREATE A NEW PLAN</Text>
          <Text style={{ color: colors.cornerBlack, fontFamily: fontFamilies.black, fontSize: 34, lineHeight: 38 }}>Is this still right?</Text>
          <Text style={{ color: "#526168", fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 22 }}>We used your onboarding answers and current engine setup.</Text>
        </View>
        {showCloseButton ? (
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            disabled={controlsBusy}
            hitSlop={8}
            onPress={onCancel}
            style={({ pressed }) => ({ alignItems: "center", height: 44, justifyContent: "center", opacity: pressed ? 0.6 : controlsBusy ? 0.4 : 1, width: 44 })}
          >
            <Ionicons color={colors.cornerBlack} name="close" size={30} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ borderTopColor: "rgba(6, 19, 24, 0.12)", borderTopWidth: 1, marginTop: spacing.lg }} testID="plan-wizard-confirmation">
        <ConfirmationRow icon="flag-outline" label="Goal" onEdit={() => openGuidedStep("goal")} value={goalLabel(mode)} />
        <ConfirmationRow icon="calendar-outline" label="Training days" onEdit={() => openGuidedStep("schedule")} value={availabilitySummary} />
        <ConfirmationRow icon="repeat-outline" label="Boxing sessions" onEdit={() => openGuidedStep("schedule", true)} value={scheduleSummary} />
        <ConfirmationRow icon="barbell-outline" label="Equipment" value={initialSetup.equipmentLabel} />
        <ConfirmationRow icon="ribbon-outline" label="Experience" value={initialSetup.experienceLabel} />
      </View>

      {formError ? <Text accessibilityRole="alert" style={{ color: wizardPalette.danger, fontFamily: fontFamilies.bold, fontSize: 14, marginTop: spacing.md }}>{formError}</Text> : null}
      {stepError ? <Text accessibilityRole="alert" style={{ color: wizardPalette.danger, fontFamily: fontFamilies.bold, fontSize: 14, marginTop: spacing.md }}>{stepError}</Text> : null}
      {isMinor ? <Text style={{ color: "#526168", fontFamily: fontFamilies.medium, fontSize: 13, lineHeight: 18, marginTop: spacing.md }}>Safety limits remain active for minor athletes.</Text> : null}
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md }}>
        {submittingCopy ? <Ionicons color={colors.blueIQ} name="sync-outline" size={20} /> : <Ionicons color={colors.blueIQ} name="checkmark-circle-outline" size={22} />}
        <Text style={{ color: "#526168", fontFamily: fontFamilies.medium, fontSize: 14 }}>{submittingCopy?.title ?? "Everything needed is ready"}</Text>
      </View>
      <Pressable
        accessibilityLabel={finalAccessibilityLabel(mode)}
        accessibilityRole="button"
        accessibilityState={{ disabled: controlsBusy }}
        disabled={controlsBusy}
        onPress={() => void saveCurrentGoal()}
        style={({ pressed }) => ({ alignItems: "center", backgroundColor: wizardPalette.cyan, borderRadius: 5, justifyContent: "center", marginTop: spacing.md, minHeight: 54, opacity: controlsBusy ? 0.55 : pressed ? 0.72 : 1, paddingHorizontal: spacing.lg })}
      >
        <Text style={{ color: colors.cornerBlack, fontFamily: fontFamilies.black, fontSize: 17, lineHeight: 22 }}>{submittingPlanAction ? "Building your plan..." : "Build my plan"}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Review step by step"
        accessibilityRole="button"
        disabled={controlsBusy}
        onPress={() => openGuidedStep("goal")}
        style={({ pressed }) => ({ alignItems: "center", justifyContent: "center", minHeight: 48, opacity: pressed ? 0.6 : controlsBusy ? 0.4 : 1 })}
      >
        <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.bold, fontSize: 15 }}>Review step by step</Text>
      </Pressable>
    </View>
  );

  const content = wizardView === "confirmation" ? confirmationContent : submittingCopy ? (
    <View accessibilityLabel="Plan generation in progress" style={[wizardStyles.guidedShell, { minHeight: 430 }]} testID="plan-wizard-generating-state">
      <Text style={wizardStyles.eyebrow}>4 OF 4 · REVIEW</Text>
      <Text style={wizardStyles.displayTitle}>{submittingPlanAction === "amend_current_plan" ? "Updating your plan" : "Building your plan"}</Text>
      <Text style={wizardStyles.subtle}>
        {submittingPlanAction === "amend_current_plan"
          ? "Keeping your confirmed schedule while recalculating the work around it."
          : "Matching your goal, schedule and recovery needs."}
      </Text>
      <View style={{ backgroundColor: wizardPalette.line, height: 4, marginTop: spacing.xl, overflow: "hidden" }}>
        <View style={{ backgroundColor: wizardPalette.cyan, height: 4, width: "65%" }} />
      </View>
      <Text style={[wizardStyles.subtle, { textAlign: "right" }]}>65%</Text>
      <View style={{ marginTop: spacing.lg, opacity: 0.34 }}>
        <ReviewSummaryRow icon="refresh-outline" label="Action" value={submittingPlanAction === "amend_current_plan" ? "Amend current plan" : "Start new plan"} />
        <ReviewSummaryRow icon="flag-outline" label="Goal" value={goalLabel(mode)} />
        <ReviewSummaryRow icon="barbell-outline" label="Support" value={`${selectedAvailableDays.length} days / ${trainingDoseLabel(trainingDose)}`} />
        <ReviewSummaryRow icon="calendar-outline" label="Schedule" value={protectedScheduleMode === "keep_existing" ? "Keep" : protectedScheduleMode === "replace_for_plan" ? "Replace" : "Clear"} />
      </View>
    </View>
  ) : (
    <View accessibilityLabel="Plan generation wizard" style={wizardStyles.guidedShell} testID="plan-generation-wizard">
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={wizardStyles.eyebrow}>CREATE A NEW PLAN</Text>
          {showCloseButton ? (
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={controlsBusy}
              hitSlop={8}
              onPress={onCancel}
              style={({ pressed }) => ({ alignItems: "center", height: 44, justifyContent: "center", opacity: controlsBusy ? 0.4 : pressed ? 0.6 : 1, width: 44 })}
            >
              <Ionicons color={wizardPalette.ink} name="close" size={26} />
            </Pressable>
          ) : null}
        </View>
        <WizardProgress currentStep={step} />
        <Text style={wizardStyles.displayTitle}>{guidedTitle}</Text>
        <Text style={wizardStyles.subtle}>{guidedHelper}</Text>
      </View>
        {formError ? <WizardNotice title={formError} tone="red" /> : null}
        {stepError ? <WizardNotice title={stepError} tone="red" /> : null}
        {isMinor && step === "details" && (mode === "fight" || mode === "tournament") ? <WizardNotice title="Minor athletes stay safety-first. Acute weight-class shortcuts stay blocked." tone="orange" /> : null}

        {step === "goal" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-goal-step">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {goalOptions.map((option) => (
                <DescribedOptionButton active={option.value === "build" ? mode === "build" : mode === "fight" || mode === "tournament"} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => chooseGoal(option.value)} />
              ))}
            </View>
            {mode === "fight" || mode === "tournament" ? (
              <View style={{ borderLeftColor: wizardPalette.cyan, borderLeftWidth: 2, gap: spacing.sm, marginLeft: spacing.md, paddingLeft: spacing.md }} testID="plan-wizard-fight-format">
                <Text style={wizardStyles.fieldLabel}>Fight camp type</Text>
                <Text style={wizardStyles.subtle}>Tournament and single fight are types of fight camp, not separate plan goals.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <OptionButton active={fightFormat === "single_fight"} busy={controlsBusy} label="Single fight" onPress={() => chooseFightFormat("single_fight")} />
                  <OptionButton active={fightFormat === "tournament"} busy={controlsBusy} label="Tournament" onPress={() => chooseFightFormat("tournament")} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === "schedule" ? (
          <View style={{ gap: spacing.md }} testID="plan-wizard-schedule-step">
            <View style={{ gap: spacing.sm }}>
              <Text style={wizardStyles.fieldLabel}>Support workout days</Text>
              <Text style={wizardStyles.body}>Support workouts will only be placed on selected available days.</Text>
              <Text style={wizardStyles.subtle}>Boxing sessions stay separate and do not automatically make a day available.</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {availableDayOptions.map((option) => (
                <OptionButton active={selectedAvailableDays.includes(option.value)} busy={controlsBusy} key={option.value} label={option.label} onPress={() => toggleAvailableDay(option.value)} />
              ))}
            </View>
            <Text style={wizardStyles.subtle}>Selected: {daySummary(selectedAvailableDays)}</Text>
            <View style={{ gap: spacing.sm }} testID="plan-wizard-protected-schedule-mode">
              <Text style={wizardStyles.fieldLabel}>Fixed schedule</Text>
              <Text style={wizardStyles.body}>Choose what happens to the boxing sessions already on your plan.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <OptionButton accessibilityLabel="Keep existing fixed schedule" active={protectedScheduleMode === "keep_existing"} busy={controlsBusy} label="Keep" onPress={() => selectProtectedScheduleMode("keep_existing")} />
                <OptionButton accessibilityLabel="Replace fixed schedule for this plan" active={protectedScheduleMode === "replace_for_plan"} busy={controlsBusy} label="Replace" onPress={() => selectProtectedScheduleMode("replace_for_plan")} />
                <OptionButton accessibilityLabel="Clear fixed schedule" active={protectedScheduleMode === "clear_for_plan"} busy={controlsBusy} label="Clear" onPress={() => selectProtectedScheduleMode("clear_for_plan")} />
              </View>
              <Text style={wizardStyles.subtle}>
                {protectedScheduleMode === "keep_existing"
                  ? `Existing boxing sessions will stay: ${existingWeeklyAnchors.length} weekly, ${existingFixedSchedule.length} dated.`
                  : protectedScheduleMode === "replace_for_plan"
                    ? "Existing boxing sessions will be cleared first; only sessions added in this wizard will remain for the new plan."
                    : "Existing weekly boxing sessions and future dated sessions will be cleared for the new plan."}
              </Text>
            </View>
            <View style={{ gap: spacing.sm }} testID="plan-wizard-anchor-editor">
              <Text style={wizardStyles.fieldLabel}>Existing workouts</Text>
              <Text style={wizardStyles.body}>{protectedScheduleMode === "clear_for_plan" ? "No existing workouts will be saved from this wizard." : "Add recurring or one-off workouts already set by you, your coach, or your gym."}</Text>
              {pendingWeeklyAnchors.length > 0 ? pendingWeeklyAnchors.map((anchor, index) => (
                <View key={`pending-weekly-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={wizardStyles.body}>{weeklyAnchorSummary(anchor)}</Text>
                  <WizardButton disabled={controlsBusy} icon="trash-outline" label="Remove draft weekly session" onPress={() => removePendingWeeklyAnchor(index)} variant="quiet" />
                </View>
              )) : null}
              {pendingDatedAnchors.length > 0 ? pendingDatedAnchors.map((anchor, index) => (
                <View key={`pending-dated-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={wizardStyles.body}>{datedAnchorSummary(anchor)}</Text>
                  <WizardButton disabled={controlsBusy} icon="trash-outline" label="Remove draft one-off session" onPress={() => removePendingDatedAnchor(index)} variant="quiet" />
                </View>
              )) : null}
              {pendingWeeklyAnchors.length === 0 && pendingDatedAnchors.length === 0 ? <Text style={wizardStyles.subtle}>No new existing workouts added yet.</Text> : null}
              {protectedScheduleMode !== "clear_for_plan" ? (
                <WizardButton disabled={controlsBusy} icon={anchorEditorOpen ? "chevron-up-outline" : "add-circle-outline"} label={anchorEditorOpen ? "Hide session fields" : "Add weekly session"} onPress={() => setAnchorEditorOpen((value) => !value)} variant="quiet" />
              ) : null}
              {anchorEditorOpen && protectedScheduleMode !== "clear_for_plan" ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={wizardStyles.fieldLabel}>Workout frequency</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton accessibilityLabel="Weekly recurring" active={anchorMode === "weekly"} busy={controlsBusy} label="Weekly" onPress={() => setAnchorMode("weekly")} />
                    <OptionButton accessibilityLabel="One-off date" active={anchorMode === "one_off"} busy={controlsBusy} label="One-off" onPress={() => setAnchorMode("one_off")} />
                  </View>
                  <WizardFieldGroup title="Workout includes" helper="Choose every part included in this workout.">
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                      {existingTrainingComponentOptions.map((option) => <OptionButton active={anchorComponents.includes(option.value)} busy={controlsBusy} key={option.value} label={option.label} onPress={() => toggleAnchorComponent(option.value)} />)}
                    </View>
                  </WizardFieldGroup>
                  {anchorComponents.length > 1 ? (
                    <WizardFieldGroup title="Main part" helper="Choose the part that takes the most work, or leave it balanced.">
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                        <OptionButton active={anchorPrimaryComponent === null} busy={controlsBusy} label="No single main part" onPress={() => setAnchorPrimaryComponent(null)} />
                        {anchorComponents.map((component) => <OptionButton active={anchorPrimaryComponent === component} busy={controlsBusy} key={component} label={existingTrainingComponentOptions.find((option) => option.value === component)?.label ?? component} onPress={() => setAnchorPrimaryComponent(component)} />)}
                      </View>
                    </WizardFieldGroup>
                  ) : null}
                  {anchorComponents.includes("boxing") ? (
                    <WizardFieldGroup title="Boxing work">
                      <View style={{ gap: spacing.xs }}>
                        {existingBoxingOptions.map((option) => <DescribedOptionButton active={anchorBoxingFormat === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => setAnchorBoxingFormat(option.value)} />)}
                      </View>
                    </WizardFieldGroup>
                  ) : null}
                  {anchorComponents.includes("strength") ? (
                    <WizardFieldGroup title="Strength area" helper="What area does the strength work mainly train?">
                      <View style={{ gap: spacing.xs }}>
                        {existingStrengthOptions.map((option) => <DescribedOptionButton active={anchorStrengthArea === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => setAnchorStrengthArea(option.value)} />)}
                      </View>
                    </WizardFieldGroup>
                  ) : null}
                  {anchorComponents.includes("conditioning") ? (
                    <WizardFieldGroup title="Conditioning format">
                      <View style={{ gap: spacing.xs }}>
                        {existingConditioningOptions.map((option) => <DescribedOptionButton active={anchorConditioningFormat === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => setAnchorConditioningFormat(option.value)} />)}
                      </View>
                    </WizardFieldGroup>
                  ) : null}
                  {anchorMode === "weekly" ? (
                    <WizardFieldGroup title="Day">
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                        {weekdayOptions.map((option) => <OptionButton active={anchorWeekday === option.value} busy={controlsBusy} key={option.value} label={option.label.slice(0, 3)} onPress={() => setAnchorWeekday(option.value)} />)}
                      </View>
                    </WizardFieldGroup>
                  ) : (
                    <WizardField label="Date" onChangeText={setAnchorDate} placeholder="YYYY-MM-DD" value={anchorDate} />
                  )}
                  <WizardField keyboardType="number-pad" label="Total duration (minutes)" onChangeText={setAnchorDurationMinutes} placeholder="60" value={anchorDurationMinutes} />
                  <WizardFieldGroup title="Expected effort" helper="1 is very easy. 10 is an all-out effort.">
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                      {existingTrainingEffortOptions.map((value) => <OptionButton active={anchorEffort === value} busy={controlsBusy} key={value} label={String(value)} onPress={() => setAnchorEffort(value)} />)}
                    </View>
                  </WizardFieldGroup>
                  <WizardButton disabled={controlsBusy} icon="add-circle-outline" label="Add workout to review" onPress={addPendingAnchor} />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === "details" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-details-step">
            <View style={{ gap: spacing.sm }}>
              <Text style={wizardStyles.fieldLabel}>Support workout dose</Text>
              <Text style={wizardStyles.subtle}>How much app-generated support should sit around boxing. Safety and readiness can still reduce it.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {trainingDoseOptions.map((option) => (
                  <OptionButton active={trainingDose === option.value} busy={controlsBusy} key={option.value} label={option.label} onPress={() => selectTrainingDose(option.value)} />
                ))}
              </View>
              <Text style={wizardStyles.subtle}>{trainingDoseOptions.find((option) => option.value === trainingDose)?.description}</Text>
            </View>
            {mode === "build" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={wizardStyles.fieldLabel}>Main workout goal</Text>
                <Text style={wizardStyles.subtle}>Choose the clearest thing your app workouts should improve.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {buildFocusOptions.map((option) => (
                    <DescribedOptionButton active={primaryFocus === option.value} busy={controlsBusy} description={option.description} key={option.value} label={option.label} onPress={() => selectPrimaryFocus(option.value)} />
                  ))}
                </View>
                {primaryFocus !== "balanced" ? <Text style={wizardStyles.fieldLabel}>Specific target</Text> : null}
                {primaryFocus !== "balanced" ? <Text style={wizardStyles.subtle}>Choose the specific result this phase should support.</Text> : null}
                {primaryFocus !== "balanced" ? (
                  <View style={{ gap: spacing.xs }}>
                    {subFocusOptionsFor(primaryFocus).map((option) => (
                      <DescribedOptionButton active={subFocus === option} busy={controlsBusy} description={subFocusDescription(option)} key={option} label={subFocusLabel(option)} onPress={() => setSubFocus(option)} />
                    ))}
                  </View>
                ) : null}
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
                {weighInType === "unknown" ? <WizardNotice title="Confirm weigh-in timing before using any weight strategy." tone="orange" /> : null}
                <WizardFieldGroup title="Bout format" helper="Defaults are fine for most amateur entries; update if the bout sheet differs.">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <WizardField keyboardType="number-pad" label="Rounds" onChangeText={setRounds} placeholder="Rounds" value={rounds} />
                    <WizardField keyboardType="decimal-pad" label="Round minutes" onChangeText={setRoundMinutes} placeholder="Round minutes" value={roundMinutes} />
                  </View>
                </WizardFieldGroup>
                <WizardButton disabled={controlsBusy} icon={advancedOpen ? "chevron-up-outline" : "add-circle-outline"} label={advancedOpen ? "Hide official details" : "Add official details"} onPress={() => setAdvancedOpen((value) => !value)} variant="quiet" />
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <WizardField helper="Optional exact timestamp from the bout sheet, for example 2026-07-01T08:00:00.000Z." label="Exact weigh-in date/time" onChangeText={setWeighInDateTime} placeholder="Weigh-in datetime optional ISO" value={weighInDateTime} />
                    <WizardField helper="Only use this if the promotion lists a post-weigh-in cap." keyboardType="decimal-pad" label="Post-weigh-in cap (kg)" onChangeText={setPostWeighInWeightCapKg} placeholder="Post-weigh-in cap kg optional" value={postWeighInWeightCapKg} />
                    <WizardFieldGroup title="Hydration testing required">
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        <OptionButton active={hydrationTestingRequired} busy={controlsBusy} label="Yes" onPress={() => setHydrationTestingRequired(true)} />
                        <OptionButton active={!hydrationTestingRequired} busy={controlsBusy} label="No" onPress={() => setHydrationTestingRequired(false)} />
                      </View>
                    </WizardFieldGroup>
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
                  <View style={{ gap: spacing.sm }}>
                    <Text style={wizardStyles.fieldLabel}>Daily weigh-ins</Text>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <OptionButton active={dailyWeighIns} busy={controlsBusy} label="Yes" onPress={() => setDailyWeighIns(true)} />
                      <OptionButton active={!dailyWeighIns} busy={controlsBusy} label="No" onPress={() => setDailyWeighIns(false)} />
                    </View>
                    <Text style={wizardStyles.fieldLabel}>Same-day bout likely</Text>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <OptionButton active={sameDayBoutLikely} busy={controlsBusy} label="Yes" onPress={() => setSameDayBoutLikely(true)} />
                      <OptionButton active={!sameDayBoutLikely} busy={controlsBusy} label="No" onPress={() => setSameDayBoutLikely(false)} />
                    </View>
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
                <WizardButton disabled={controlsBusy} icon={advancedOpen ? "chevron-up-outline" : "add-circle-outline"} label={advancedOpen ? "Hide timing details" : "Add timing details"} onPress={() => setAdvancedOpen((value) => !value)} variant="quiet" />
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={wizardStyles.fieldLabel}>Rehydration window hours</Text>
                    <Text style={wizardStyles.subtle}>Hours available after each weigh-in before a possible bout.</Text>
                    {possibleBoutDates.split(",").map((date, index) => (
                      <View key={`rehydration-window:${date.trim()}:${index}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                        <Text style={[wizardStyles.body, { flex: 1 }]}>{date.trim() || `Bout day ${index + 1}`}</Text>
                        <TextInput
                          accessibilityLabel={`Rehydration window for ${date.trim() || `bout day ${index + 1}`}`}
                          keyboardType="decimal-pad"
                          onChangeText={(value) => updateRehydrationWindow(index, value)}
                          placeholder="Hours"
                          placeholderTextColor={wizardPalette.muted}
                          style={[wizardStyles.input, { width: 96 }]}
                          value={rehydrationWindowHoursByDay.split(",")[index]?.trim() ?? ""}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "recovery" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={wizardStyles.body}>Recovery keeps support workouts conservative while you get back to normal training.</Text>
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
          <View style={{ gap: spacing.md }} testID="plan-wizard-review-step">
            <View style={{ gap: spacing.xs }}>
              <Text style={wizardStyles.fieldLabel}>Plan action</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <OptionButton active={planAction === "start_new_plan"} busy={controlsBusy} label="Start new plan" onPress={() => setPlanAction("start_new_plan")} />
                <OptionButton active={planAction === "amend_current_plan"} busy={controlsBusy} label="Amend current plan" onPress={() => setPlanAction("amend_current_plan")} />
              </View>
            </View>
            {planAction === "amend_current_plan" ? <WizardNotice title="Your current plan stays active until this update is ready." /> : null}
            <View style={{ borderTopColor: wizardPalette.line, borderTopWidth: 1 }}>
              <ReviewSummaryRow icon="refresh-outline" label="Action" value={planAction === "start_new_plan" ? "Start new plan" : "Amend current plan"} />
              <ReviewSummaryRow icon="flag-outline" label="Goal" value={goalLabel(mode)} />
              <ReviewSummaryRow icon="barbell-outline" label="Support" value={`${selectedAvailableDays.length} days / ${trainingDoseLabel(trainingDose)}`} />
              <ReviewSummaryRow icon="calendar-outline" label="Fixed schedule" value={protectedScheduleMode === "keep_existing" ? "Keep" : protectedScheduleMode === "replace_for_plan" ? "Replace" : "Clear"} />
              <ReviewSummaryRow icon="add-circle-outline" label="Added sessions" value={`${pendingWeeklyAnchors.length} weekly · ${pendingDatedAnchors.length} one-off`} />
              {reviewRows.map((row) => {
                const [label, ...valueParts] = row.split(": ");
                return <ReviewSummaryRow icon="checkmark-circle-outline" key={`review:${row}`} label={label ?? "Detail"} value={valueParts.join(": ") || row} />;
              })}
            </View>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
              <Ionicons color={wizardPalette.cyan} name="checkmark-circle-outline" size={20} />
              <Text style={wizardStyles.subtle}>Everything looks good</Text>
            </View>
          </View>
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <WizardButton
            accessibilityLabel={step === "review" ? finalAccessibilityLabel(mode) : "Next plan wizard step"}
            disabled={controlsBusy || (step === "schedule" && selectedAvailableDays.length === 0)}
            icon={step === "review" ? "sparkles-outline" : "arrow-forward-outline"}
            label={submittingPlanAction === "start_new_plan" ? "Building your plan..." : submittingPlanAction === "amend_current_plan" ? "Updating your plan..." : step === "review" ? planAction === "amend_current_plan" ? "Update plan" : "Generate plan" : step === "details" ? "Review plan" : "Continue"}
            onPress={step === "review" ? () => void saveCurrentGoal() : goNext}
          />
          {step !== "goal" ? (
            <WizardButton disabled={controlsBusy} label="Back" onPress={goBack} variant="quiet" />
          ) : (
            <WizardButton disabled={controlsBusy} label="Back to summary" onPress={() => setWizardView("confirmation")} variant="quiet" />
          )}
        </View>
    </View>
  );

  return framed ? <View style={wizardStyles.shell} testID="plan-generation-frame">{content}</View> : content;
}

