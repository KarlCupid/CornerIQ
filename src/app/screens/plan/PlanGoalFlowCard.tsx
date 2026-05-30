import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalISODateTime,
  parseOptionalPositiveInteger,
  parseOptionalPositiveNumber,
  parseRequiredDateYYYYMMDD,
  parseRequiredInteger,
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
  type RecoveryGoalDraft,
  type TournamentSetupDraft
} from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";

type GoalMode = "build" | "fight" | "tournament" | "recovery";
type WizardStep = "goal" | "availability" | "details" | "review";
type GeneratedSupportDay = PlanViewModel["generatedSupportAvailability"]["selectedDays"][number];

export interface PlanGoalFlowCardProps {
  asOfDate: ISODateString;
  busy: boolean;
  initialAvailableDays: readonly GeneratedSupportDay[];
  isMinor: boolean;
  onCancel: () => void;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
}

const wizardSteps: readonly { key: WizardStep; label: string }[] = [
  { key: "goal", label: "Goal type" },
  { key: "availability", label: "Available days" },
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

const buildFocusOptions: readonly BuildGoalDraft["primaryFocus"][] = ["balanced", "power", "conditioning", "strength", "mobility"];
const recoveryFocusOptions: readonly NonNullable<RecoveryGoalDraft["focus"]>[] = ["general", "soreness", "sleep", "travel", "post_bout"];

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}>
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function parseSupportDays(value: string): number {
  const parsed = parseRequiredInteger(value, "Support days per week");
  if (parsed < 0 || parsed > 6) {
    throw new Error("Support days per week must be between 0 and 6.");
  }
  return parsed;
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

function daySummary(days: readonly GeneratedSupportDay[]): string {
  if (days.length === 0) {
    return "No available days selected";
  }
  return availableDayOptions.filter((option) => days.includes(option.value)).map((option) => option.label).join(", ");
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
  initialAvailableDays,
  isMinor,
  onCancel,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveRecoveryGoal,
  onSaveTournamentSetup
}: PlanGoalFlowCardProps) {
  const defaultFight = createDefaultFightDraft(asOfDate);
  const defaultTournament = createDefaultTournamentDraft(asOfDate);
  const [step, setStep] = React.useState<WizardStep>("goal");
  const [mode, setMode] = React.useState<GoalMode>("build");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [selectedAvailableDays, setSelectedAvailableDays] = React.useState<GeneratedSupportDay[]>(() => [...initialAvailableDays]);
  const [primaryFocus, setPrimaryFocus] = React.useState<BuildGoalDraft["primaryFocus"]>("balanced");
  const [supportDaysPerWeek, setSupportDaysPerWeek] = React.useState("3");

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
  const { message: formError, runWithMessage } = useFormMessage("Goal could not be saved.");

  const toggleAvailableDay = (day: GeneratedSupportDay) => {
    setStepError(null);
    setSelectedAvailableDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const chooseMode = (nextMode: GoalMode) => {
    setMode(nextMode);
    setAdvancedOpen(false);
    setStepError(null);
  };

  const requireAvailability = (): boolean => {
    if (selectedAvailableDays.length > 0) {
      return true;
    }
    setStepError("Select at least one available day before saving a plan.");
    setStep("availability");
    return false;
  };

  const goNext = () => {
    if (step === "availability" && !requireAvailability()) {
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

  const saveBuild = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      await onSaveBuildGoal({
        primaryFocus,
        supportDaysPerWeek: parseSupportDays(supportDaysPerWeek),
        generatedSupportAvailableDays: selectedAvailableDays
      });
      onCancel();
    });
  };

  const saveFight = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
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
        generatedSupportAvailableDays: selectedAvailableDays
      });
      onCancel();
    });
  };

  const saveTournament = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
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
        generatedSupportAvailableDays: selectedAvailableDays
      });
      onCancel();
    });
  };

  const saveRecovery = async () => {
    if (!requireAvailability()) {
      return;
    }
    await runWithMessage(async () => {
      const durationDays = parseOptionalPositiveInteger(recoveryDurationDays, "Recovery duration days");
      await onSaveRecoveryGoal({
        ...(durationDays === undefined ? {} : { durationDays }),
        focus: recoveryFocus,
        generatedSupportAvailableDays: selectedAvailableDays
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
    return [`Primary focus: ${titleCase(primaryFocus)}`, `Support days per week: ${supportDaysPerWeek}`];
  }, [amateurOrPro, boutDate, mode, numberOfPotentialBouts, possibleBoutDates, primaryFocus, recoveryDurationDays, recoveryFocus, status, strategyMode, supportDaysPerWeek, tournamentEndDate, tournamentStartDate, weighInType]);

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-goal-flow-card">
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
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.callout}>Step 1: Goal type</Text>
            <Text style={screenStyles.body}>Choose the boxing phase CornerIQ should plan around next.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {goalOptions.map((option) => <OptionButton active={mode === option.value} busy={busy} key={option.value} label={option.label} onPress={() => chooseMode(option.value)} />)}
            </View>
          </View>
        ) : null}

        {step === "availability" ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.callout}>Step 2: Available days</Text>
            <Text style={screenStyles.body}>Generated support will only be placed on selected available days.</Text>
            <Text style={screenStyles.subtle}>Fixed boxing sessions remain protected.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {availableDayOptions.map((option) => (
                <OptionButton active={selectedAvailableDays.includes(option.value)} busy={busy} key={option.value} label={option.label} onPress={() => toggleAvailableDay(option.value)} />
              ))}
            </View>
            <Text style={screenStyles.subtle}>Selected: {daySummary(selectedAvailableDays)}</Text>
          </View>
        ) : null}

        {step === "details" ? (
          <View style={{ gap: spacing.sm }}>
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
                <TextInput keyboardType="number-pad" onChangeText={setSupportDaysPerWeek} placeholder="Support days per week" placeholderTextColor={colors.wrap} style={screenStyles.input} value={supportDaysPerWeek} />
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
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.callout}>Step 4: Review</Text>
            <Text style={screenStyles.body}>Readiness, safety, and phase rules still gate the final plan.</Text>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Goal</Text>
              <Text style={screenStyles.body}>{goalLabel(mode)}</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={screenStyles.fieldLabel}>Generated-support availability</Text>
              <Text style={screenStyles.body}>{daySummary(selectedAvailableDays)}</Text>
              <Text style={screenStyles.subtle}>Fixed boxing sessions remain protected.</Text>
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
