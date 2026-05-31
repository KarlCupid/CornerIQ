import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
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
  type ProtectedWorkoutDraft,
  type RecurringProtectedWorkoutAnchorDraft,
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";

type GoalMode = "build" | "fight" | "tournament" | "recovery";
type WizardStep = "goal" | "schedule" | "details" | "review";
type AnchorMode = "weekly" | "one_off";
type GeneratedSupportDay = PlanViewModel["generatedSupportAvailability"]["selectedDays"][number];
type FixedSession = PlanViewModel["fixedSchedule"][number];
type WeeklyAnchor = PlanViewModel["weeklyAnchors"][number];

export interface PlanGoalFlowCardProps {
  asOfDate: ISODateString;
  busy: boolean;
  currentModeLabel: PlanViewModel["modeLabel"];
  existingFixedSchedule: readonly FixedSession[];
  existingWeeklyAnchors: readonly WeeklyAnchor[];
  initialAvailableDays: readonly GeneratedSupportDay[];
  isMinor: boolean;
  onCancel: () => void;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveProtectedSession?: ((workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>) | undefined;
  onSaveRecurringProtectedAnchor?: ((anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>) | undefined;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
}

const wizardSteps: readonly { key: WizardStep; label: string }[] = [
  { key: "goal", label: "Goal type" },
  { key: "schedule", label: "Schedule" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" }
];

const goalOptions: readonly { label: string; value: GoalMode }[] = [
  { label: "Build general boxing fitness", value: "build" },
  { label: "Enter fight camp", value: "fight" },
  { label: "Enter tournament mode", value: "tournament" },
  { label: "Recovery / maintenance", value: "recovery" }
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

const buildFocusOptions: readonly BuildGoalDraft["primaryFocus"][] = ["balanced", "power", "conditioning", "strength", "mobility"];
const recoveryFocusOptions: readonly NonNullable<RecoveryGoalDraft["focus"]>[] = ["general", "soreness", "sleep", "travel", "post_bout"];
const anchorTypeOptions: readonly { label: string; value: ProtectedWorkoutDraft["type"] }[] = [
  { label: "Boxing class", value: "boxing_class" },
  { label: "Technical session", value: "technical_session" },
  { label: "Pads / mitts", value: "pads_mitts" },
  { label: "Bag work", value: "bag_work" },
  { label: "Footwork", value: "footwork_session" },
  { label: "Sparring", value: "sparring" },
  { label: "Roadwork", value: "roadwork" },
  { label: "Coach strength", value: "coach_assigned_strength" },
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
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}>
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
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
  return goalOptions.find((option) => option.value === mode)?.label ?? "Build general boxing fitness";
}

function currentModeToGoalMode(modeLabel: PlanViewModel["modeLabel"]): GoalMode {
  if (modeLabel === "Fight camp") {
    return "fight";
  }
  if (modeLabel === "Tournament mode") {
    return "tournament";
  }
  if (modeLabel === "Recovery") {
    return "recovery";
  }
  return "build";
}

function defaultPlanAction(currentModeLabel: PlanViewModel["modeLabel"], nextMode: GoalMode): PlanLifecycleAction {
  return currentModeToGoalMode(currentModeLabel) === nextMode ? "amend_current_plan" : "start_new_plan";
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

export function PlanGoalFlowCard({
  asOfDate,
  busy,
  currentModeLabel,
  existingFixedSchedule,
  existingWeeklyAnchors,
  initialAvailableDays,
  isMinor,
  onCancel,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveProtectedSession,
  onSaveRecurringProtectedAnchor,
  onSaveRecoveryGoal,
  onSaveTournamentSetup
}: PlanGoalFlowCardProps) {
  const defaultFight = createDefaultFightDraft(asOfDate);
  const defaultTournament = createDefaultTournamentDraft(asOfDate);
  const [step, setStep] = React.useState<WizardStep>("goal");
  const [mode, setMode] = React.useState<GoalMode>("build");
  const [planAction, setPlanAction] = React.useState<PlanLifecycleAction>(() => defaultPlanAction(currentModeLabel, "build"));
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [selectedAvailableDays, setSelectedAvailableDays] = React.useState<GeneratedSupportDay[]>(() => [...initialAvailableDays]);
  const [primaryFocus, setPrimaryFocus] = React.useState<BuildGoalDraft["primaryFocus"]>("balanced");

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
  const { message: formError, runWithMessage } = useFormMessage("Goal could not be saved.");

  const toggleAvailableDay = (day: GeneratedSupportDay) => {
    setStepError(null);
    setSelectedAvailableDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
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
      const parsedStart = anchorStartTime.trim() ? parseRequiredTimeHHMM(anchorStartTime, "Anchor start time") : undefined;
      const parsedRounds = parseOptionalNonNegativeInteger(anchorRounds, "Anchor rounds");
      const trimmedNote = anchorNote.trim();
      if (anchorMode === "weekly") {
        const draft: RecurringProtectedWorkoutAnchorDraft = {
          type: anchorType,
          weekday: anchorWeekday,
          ...(parsedStart ? { localStartTime: parsedStart } : {}),
          durationMinutes: parseRequiredPositiveInteger(anchorDurationMinutes, "Anchor duration minutes"),
          intensity: anchorIntensity,
          ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
          ...(trimmedNote ? { note: trimmedNote } : {}),
          activeFrom: asOfDate
        };
        setPendingWeeklyAnchors((current) => [...current, draft]);
      } else {
        const draft: ProtectedWorkoutDraft = {
          type: anchorType,
          date: parseRequiredDateYYYYMMDD(anchorDate, "Anchor date"),
          ...(parsedStart ? { startTime: parsedStart, localStartTime: parsedStart } : {}),
          durationMinutes: parseRequiredPositiveInteger(anchorDurationMinutes, "Anchor duration minutes"),
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
      setStepError(error instanceof Error ? error.message : "Fixed anchor could not be added.");
    }
  };

  const removePendingWeeklyAnchor = (index: number) => {
    setPendingWeeklyAnchors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const removePendingDatedAnchor = (index: number) => {
    setPendingDatedAnchors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const persistPendingAnchors = async () => {
    if (pendingWeeklyAnchors.length > 0) {
      if (!onSaveRecurringProtectedAnchor) {
        throw new Error("Weekly anchor save is unavailable.");
      }
      for (const anchor of pendingWeeklyAnchors) {
        await onSaveRecurringProtectedAnchor(null, anchor);
      }
    }
    if (pendingDatedAnchors.length > 0) {
      if (!onSaveProtectedSession) {
        throw new Error("One-off protected session save is unavailable.");
      }
      for (const anchor of pendingDatedAnchors) {
        await onSaveProtectedSession(null, anchor);
      }
    }
  };

  const saveBuild = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      await persistPendingAnchors();
      await onSaveBuildGoal({
        primaryFocus,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planAction
      });
      onCancel();
    });
  };

  const saveFight = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      await persistPendingAnchors();
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
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planAction
      });
      onCancel();
    });
  };

  const saveTournament = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      await persistPendingAnchors();
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
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planAction
      });
      onCancel();
    });
  };

  const saveRecovery = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      await persistPendingAnchors();
      const durationDays = parseOptionalPositiveInteger(recoveryDurationDays, "Recovery duration days");
      await onSaveRecoveryGoal({
        ...(durationDays === undefined ? {} : { durationDays }),
        focus: recoveryFocus,
        generatedSupportAvailableDays: selectedAvailableDays,
        scheduleAvailability: selectedAvailableDays,
        planAction
      });
      onCancel();
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
        `Bout date: ${boutDate}`,
        `Weigh-in timing: ${titleCase(weighInType)}`
      ];
    }
    if (mode === "tournament") {
      return [
        `Dates: ${tournamentStartDate} to ${tournamentEndDate}`,
        `Possible bout days: ${possibleBoutDates}`,
        `Possible bouts: ${numberOfPotentialBouts}`,
        `Strategy: ${titleCase(strategyMode)}`
      ];
    }
    if (mode === "recovery") {
      return [
        `Duration: ${recoveryDurationDays.trim() ? `${recoveryDurationDays.trim()} days` : "Engine default"}`,
        `Focus: ${titleCase(recoveryFocus)}`
      ];
    }
    return [`Primary focus: ${titleCase(primaryFocus)}`, "Support volume: CornerIQ decides from availability, anchors, readiness, and safety."];
  }, [amateurOrPro, boutDate, mode, numberOfPotentialBouts, possibleBoutDates, primaryFocus, recoveryDurationDays, recoveryFocus, status, strategyMode, tournamentEndDate, tournamentStartDate, weighInType]);

  return (
    <EngineCard>
      <View accessibilityLabel="Plan generation wizard" style={{ gap: spacing.md }} testID="plan-generation-wizard">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Generate new plan</Text>
          <Text style={screenStyles.body}>A guided setup keeps the plan goal, availability, and details clear before saving.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          {wizardSteps.map((item, index) => {
            const active = item.key === step;
            const complete = index < stepIndex(step);
            return (
              <View
                key={item.key}
                style={[
                  screenStyles.chip,
                  {
                    minHeight: 34,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs
                  },
                  active || complete ? screenStyles.chipSelected : null
                ]}
              >
                <Text style={[screenStyles.chipText, active || complete ? screenStyles.chipTextSelected : null]}>{index + 1}. {item.label}</Text>
              </View>
            );
          })}
        </View>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        {stepError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{stepError}</Text> : null}
        {isMinor ? <Text style={screenStyles.subtle}>Minor athletes stay safety-first; acute weight-class shortcuts stay blocked.</Text> : null}

        {step === "goal" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-goal-step">
            <Text style={screenStyles.callout}>Step 1: Goal type</Text>
            <Text style={screenStyles.body}>Choose the boxing phase CornerIQ should plan around next.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {goalOptions.map((option) => <OptionButton active={mode === option.value} busy={busy} key={option.value} label={option.label} onPress={() => chooseMode(option.value)} />)}
            </View>
          </View>
        ) : null}

        {step === "schedule" ? (
          <View style={{ gap: spacing.md }} testID="plan-wizard-schedule-step">
            <View style={{ gap: spacing.sm }}>
              <Text style={screenStyles.callout}>Step 2: Schedule</Text>
              <Text style={screenStyles.fieldLabel}>Generated support days</Text>
              <Text style={screenStyles.body}>Generated support will only be placed on selected available days.</Text>
              <Text style={screenStyles.subtle}>At least one generated-support day is required. Weekly anchors are separate and do not automatically make a day available.</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {availableDayOptions.map((option) => (
                <OptionButton active={selectedAvailableDays.includes(option.value)} busy={busy} key={option.value} label={option.label} onPress={() => toggleAvailableDay(option.value)} />
              ))}
            </View>
            <Text style={screenStyles.subtle}>Selected: {daySummary(selectedAvailableDays)}</Text>
            <View style={{ gap: spacing.sm }} testID="plan-wizard-anchor-editor">
              <Text style={screenStyles.fieldLabel}>Weekly protected activity</Text>
              <Text style={screenStyles.body}>CornerIQ will plan around this every week.</Text>
              {pendingWeeklyAnchors.length > 0 ? pendingWeeklyAnchors.map((anchor, index) => (
                <View key={`pending-weekly-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={screenStyles.body}>{weeklyAnchorSummary(anchor)}</Text>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => removePendingWeeklyAnchor(index)} style={screenStyles.quietButton}>
                    <Text style={screenStyles.quietButtonText}>Remove draft weekly anchor</Text>
                  </Pressable>
                </View>
              )) : null}
              {pendingDatedAnchors.length > 0 ? pendingDatedAnchors.map((anchor, index) => (
                <View key={`pending-dated-anchor:${index}`} style={{ gap: spacing.xs }}>
                  <Text style={screenStyles.body}>{datedAnchorSummary(anchor)}</Text>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => removePendingDatedAnchor(index)} style={screenStyles.quietButton}>
                    <Text style={screenStyles.quietButtonText}>Remove draft one-off anchor</Text>
                  </Pressable>
                </View>
              )) : null}
              {pendingWeeklyAnchors.length === 0 && pendingDatedAnchors.length === 0 ? <Text style={screenStyles.subtle}>No new weekly anchors added in this wizard yet.</Text> : null}
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: anchorEditorOpen }} disabled={busy} onPress={() => setAnchorEditorOpen((value) => !value)} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>{anchorEditorOpen ? "Hide anchor fields" : "Add weekly anchor"}</Text>
              </Pressable>
              {anchorEditorOpen ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={screenStyles.fieldLabel}>Weekly recurring or one-off date?</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <OptionButton active={anchorMode === "weekly"} busy={busy} label="Weekly recurring" onPress={() => setAnchorMode("weekly")} />
                    <OptionButton active={anchorMode === "one_off"} busy={busy} label="One-off date" onPress={() => setAnchorMode("one_off")} />
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    {anchorTypeOptions.map((option) => <OptionButton active={anchorType === option.value} busy={busy} key={option.value} label={option.label} onPress={() => selectAnchorType(option.value)} />)}
                  </View>
                  {anchorMode === "weekly" ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={screenStyles.fieldLabel}>Which day does this usually happen?</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                        {weekdayOptions.map((option) => <OptionButton active={anchorWeekday === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setAnchorWeekday(option.value)} />)}
                      </View>
                    </View>
                  ) : (
                    <TextInput onChangeText={setAnchorDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorDate} />
                  )}
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorStartTime} placeholder="Time optional HH:MM" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorStartTime} />
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorDurationMinutes} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    {anchorIntensityOptions.map((option) => <OptionButton active={anchorIntensity === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setAnchorIntensity(option.value)} />)}
                  </View>
                  <TextInput keyboardType="number-pad" onChangeText={setAnchorRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorRounds} />
                  <TextInput onChangeText={setAnchorNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={anchorNote} />
                  <Pressable accessibilityRole="button" disabled={busy} onPress={addPendingAnchor} style={screenStyles.button}>
                    <Text style={screenStyles.buttonText}>Add anchor to review</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === "details" ? (
          <View style={{ gap: spacing.sm }} testID="plan-wizard-details-step">
            <Text style={screenStyles.callout}>Step 3: Goal-specific details</Text>
            <Text style={screenStyles.body}>{goalLabel(mode)}</Text>
            {mode === "build" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.fieldLabel}>Primary focus</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {buildFocusOptions.map((option) => (
                    <OptionButton active={primaryFocus === option} busy={busy} key={option} label={titleCase(option)} onPress={() => setPrimaryFocus(option)} />
                  ))}
                </View>
                <Text style={screenStyles.subtle}>CornerIQ decides support volume from selected availability, weekly anchors, readiness, safety gates, and phase.</Text>
              </View>
            ) : null}

            {mode === "fight" ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <OptionButton active={status === "tentative"} busy={busy} label="Tentative" onPress={() => setStatus("tentative")} />
                  <OptionButton active={status === "confirmed"} busy={busy} label="Confirmed" onPress={() => setStatus("confirmed")} />
                  <OptionButton active={status === "short_notice"} busy={busy} label="Short notice" onPress={() => setStatus("short_notice")} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <OptionButton active={amateurOrPro === "amateur"} busy={busy} label="Amateur" onPress={() => setAmateurOrPro("amateur")} />
                  <OptionButton active={amateurOrPro === "pro"} busy={busy} label="Pro" onPress={() => setAmateurOrPro("pro")} />
                </View>
                <TextInput onChangeText={setBoutDate} placeholder="Bout date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={boutDate} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <OptionButton active={weighInType === "same_day"} busy={busy} label="Same day" onPress={() => setWeighInType("same_day")} />
                  <OptionButton active={weighInType === "day_before"} busy={busy} label="Day before" onPress={() => setWeighInType("day_before")} />
                  <OptionButton active={weighInType === "unknown"} busy={busy} label="Unknown" onPress={() => setWeighInType("unknown")} />
                </View>
                {weighInType === "unknown" ? <Text style={screenStyles.callout}>Weight-class action is blocked until weigh-in timing is confirmed.</Text> : null}
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: advancedOpen }} disabled={busy} onPress={() => setAdvancedOpen((value) => !value)} style={screenStyles.quietButton}>
                  <Text style={screenStyles.quietButtonText}>{advancedOpen ? "Hide advanced fields" : "Advanced fields"}</Text>
                </Pressable>
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
                    <TextInput keyboardType="decimal-pad" onChangeText={setRoundMinutes} placeholder="Round minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={roundMinutes} />
                    <TextInput onChangeText={setTargetClassLabel} placeholder="Target class label" placeholderTextColor={colors.wrap} style={screenStyles.input} value={targetClassLabel} />
                    <TextInput keyboardType="decimal-pad" onChangeText={setContractedWeightKg} placeholder="Contracted weight kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={contractedWeightKg} />
                    <TextInput keyboardType="decimal-pad" onChangeText={setAllowanceKg} placeholder="Allowance kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={allowanceKg} />
                    <TextInput onChangeText={setWeighInDateTime} placeholder="Weigh-in datetime optional ISO" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weighInDateTime} />
                    <TextInput keyboardType="decimal-pad" onChangeText={setPostWeighInWeightCapKg} placeholder="Post-weigh-in cap kg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={postWeighInWeightCapKg} />
                    <OptionButton active={hydrationTestingRequired} busy={busy} label="Hydration testing required" onPress={() => setHydrationTestingRequired((value) => !value)} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "tournament" ? (
              <View style={{ gap: spacing.sm }}>
                <TextInput onChangeText={setTournamentStartDate} placeholder="Start date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={tournamentStartDate} />
                <TextInput onChangeText={setTournamentEndDate} placeholder="End date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={tournamentEndDate} />
                <TextInput onChangeText={setPossibleBoutDates} placeholder="Possible bout days, comma-separated" placeholderTextColor={colors.wrap} style={screenStyles.input} value={possibleBoutDates} />
                <OptionButton active={dailyWeighIns} busy={busy} label="Daily weigh-ins" onPress={() => setDailyWeighIns((value) => !value)} />
                <TextInput onChangeText={setWeighInTimeEachDay} placeholder="Weigh-in time" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weighInTimeEachDay} />
                <TextInput keyboardType="number-pad" onChangeText={setNumberOfPotentialBouts} placeholder="Number of possible bouts" placeholderTextColor={colors.wrap} style={screenStyles.input} value={numberOfPotentialBouts} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <OptionButton active={strategyMode === "stay_near_weight"} busy={busy} label="Stay near weight" onPress={() => setStrategyMode("stay_near_weight")} />
                  <OptionButton active={strategyMode === "mild_daily_cut"} busy={busy} label="Mild daily cut" onPress={() => setStrategyMode("mild_daily_cut")} />
                  <OptionButton active={strategyMode === "no_cut_recommended"} busy={busy} label="No cut recommended" onPress={() => setStrategyMode("no_cut_recommended")} />
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: advancedOpen }} disabled={busy} onPress={() => setAdvancedOpen((value) => !value)} style={screenStyles.quietButton}>
                  <Text style={screenStyles.quietButtonText}>{advancedOpen ? "Hide advanced fields" : "Advanced fields"}</Text>
                </Pressable>
                {advancedOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <OptionButton active={sameDayBoutLikely} busy={busy} label="Same-day bout likely" onPress={() => setSameDayBoutLikely((value) => !value)} />
                    <TextInput onChangeText={setRehydrationWindowHoursByDay} placeholder="Rehydration windows hours" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rehydrationWindowHoursByDay} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "recovery" ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={screenStyles.body}>Recovery keeps support work conservative while you get back to normal training.</Text>
                <TextInput keyboardType="number-pad" onChangeText={setRecoveryDurationDays} placeholder="Duration days optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={recoveryDurationDays} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {recoveryFocusOptions.map((option) => (
                    <OptionButton active={recoveryFocus === option} busy={busy} key={option} label={option === "post_bout" ? "Post-bout" : titleCase(option)} onPress={() => setRecoveryFocus(option)} />
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
                <OptionButton active={planAction === "start_new_plan"} busy={busy} label="Start new plan" onPress={() => setPlanAction("start_new_plan")} />
                <OptionButton active={planAction === "amend_current_plan"} busy={busy} label="Amend current plan" onPress={() => setPlanAction("amend_current_plan")} />
              </View>
              <Text style={screenStyles.subtle}>
                {planAction === "start_new_plan" ? "Starts week 1 and supersedes the prior active block without deleting history." : "Keeps the current week index and records the current plan as amended."}
              </Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Goal</Text>
              <Text style={screenStyles.body}>{goalLabel(mode)}</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Generated-support availability</Text>
              <Text style={screenStyles.body}>{daySummary(selectedAvailableDays)}</Text>
              <Text style={screenStyles.subtle}>Weekly anchors and one-off sessions remain protected.</Text>
              <Text style={screenStyles.subtle}>Generated support uses only the selected availability above.</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>New weekly anchors to save</Text>
              {pendingWeeklyAnchors.length > 0 ? pendingWeeklyAnchors.map((anchor, index) => <Text key={`review-weekly-anchor:${index}`} style={screenStyles.body}>{weeklyAnchorSummary(anchor)}</Text>) : <Text style={screenStyles.subtle}>No new weekly anchors in this wizard.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>New one-off sessions to save</Text>
              {pendingDatedAnchors.length > 0 ? pendingDatedAnchors.map((anchor, index) => <Text key={`review-dated-anchor:${index}`} style={screenStyles.body}>{datedAnchorSummary(anchor)}</Text>) : <Text style={screenStyles.subtle}>No new one-off sessions in this wizard.</Text>}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Existing weekly anchors</Text>
              {existingWeeklyAnchors.length > 0 ? existingWeeklyAnchors.slice(0, 6).map((anchor) => (
                <Text key={`existing-weekly-anchor:${anchor.id}`} style={screenStyles.body}>{anchor.label}</Text>
              )) : <Text style={screenStyles.subtle}>No existing weekly anchors are already on the plan.</Text>}
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
            <Pressable accessibilityRole="button" disabled={busy} onPress={goBack} style={[screenStyles.quietButton, { flexBasis: 120, flexGrow: 1 }]}>
              <Text style={screenStyles.quietButtonText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={step === "review" ? finalAccessibilityLabel(mode) : "Next plan wizard step"}
            accessibilityRole="button"
            disabled={busy}
            onPress={step === "review" ? () => void saveCurrentGoal() : goNext}
            style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}
          >
            <Text style={screenStyles.buttonText}>{step === "review" ? "Generate plan" : step === "details" ? "Review plan" : "Next"}</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>Keep current plan</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
