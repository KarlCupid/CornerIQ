import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString } from "../../../engine/core/types";
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

const wizardSteps: readonly { id: WizardStep; label: string }[] = [
  { id: "goal", label: "Goal" },
  { id: "availability", label: "Days" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" }
];

const modeCopy: Record<GoalMode, { description: string; label: string; saveLabel: string }> = {
  build: {
    label: "Build general boxing fitness",
    description: "Create a support plan around regular boxing without a dated fight target.",
    saveLabel: "Generate plan"
  },
  fight: {
    label: "Enter fight camp",
    description: "Shape support work around a known bout date, weigh-in timing, and camp constraints.",
    saveLabel: "Enter fight camp"
  },
  tournament: {
    label: "Enter tournament mode",
    description: "Keep support conservative across possible bout days and repeated weigh-ins.",
    saveLabel: "Enter tournament mode"
  },
  recovery: {
    label: "Recovery / maintenance",
    description: "Reduce optional work while the athlete returns to normal training rhythm.",
    saveLabel: "Start recovery"
  }
};

const availabilityOptions = [
  { label: "Mon", longLabel: "Monday", value: "monday" },
  { label: "Tue", longLabel: "Tuesday", value: "tuesday" },
  { label: "Wed", longLabel: "Wednesday", value: "wednesday" },
  { label: "Thu", longLabel: "Thursday", value: "thursday" },
  { label: "Fri", longLabel: "Friday", value: "friday" },
  { label: "Sat", longLabel: "Saturday", value: "saturday" },
  { label: "Sun", longLabel: "Sunday", value: "sunday" }
] as const;

type AvailabilityDay = (typeof availabilityOptions)[number]["value"];

export interface PlanGoalFlowCardProps {
  asOfDate: ISODateString;
  busy: boolean;
  initialScheduleAvailability: readonly string[];
  isMinor: boolean;
  onCancel: () => void;
  onSaveBuildGoal: (draft: BuildGoalDraft) => Promise<void>;
  onSaveFightSetup: (draft: FightSetupDraft) => Promise<void>;
  onSaveRecoveryGoal: (draft: RecoveryGoalDraft) => Promise<void>;
  onSaveTournamentSetup: (draft: TournamentSetupDraft) => Promise<void>;
}

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}>
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function StepPill({ active, complete, index, label }: { active: boolean; complete: boolean; index: number; label: string }) {
  const selected = active || complete;
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: selected ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
        borderColor: active ? colors.readyGreen : "rgba(255, 255, 255, 0.12)",
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs
      }}
    >
      <Text style={[screenStyles.subtle, active ? { color: colors.readyGreen, fontWeight: "700" } : null]}>{index + 1}</Text>
      <Text style={[screenStyles.subtle, active ? { color: colors.readyGreen, fontWeight: "700" } : null]}>{label}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.fieldLabel}>{label}</Text>
      <Text style={screenStyles.body}>{value}</Text>
    </View>
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

function normalizeAvailability(values: readonly string[]): AvailabilityDay[] {
  const selected = availabilityOptions.filter((option) => values.includes(option.value)).map((option) => option.value);
  return selected.length > 0 ? selected : ["monday", "wednesday", "saturday"];
}

function toggleAvailability(current: readonly AvailabilityDay[], value: AvailabilityDay): AvailabilityDay[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function availabilityLabels(values: readonly AvailabilityDay[]): string {
  const labels = availabilityOptions.filter((option) => values.includes(option.value)).map((option) => option.longLabel);
  if (labels.length === 0) {
    return "No available days selected";
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function withScheduleAvailability<T extends object>(draft: T, scheduleAvailability: readonly AvailabilityDay[]): T {
  return { ...draft, scheduleAvailability: [...scheduleAvailability] } as T;
}

export function PlanGoalFlowCard({
  asOfDate,
  busy,
  initialScheduleAvailability,
  isMinor,
  onCancel,
  onSaveBuildGoal,
  onSaveFightSetup,
  onSaveRecoveryGoal,
  onSaveTournamentSetup
}: PlanGoalFlowCardProps) {
  const defaultFight = createDefaultFightDraft(asOfDate);
  const defaultTournament = createDefaultTournamentDraft(asOfDate);
  const [mode, setMode] = React.useState<GoalMode>("build");
  const [step, setStep] = React.useState<WizardStep>("goal");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [availableDays, setAvailableDays] = React.useState<AvailabilityDay[]>(() => normalizeAvailability(initialScheduleAvailability));
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
  const stepIndex = wizardSteps.findIndex((item) => item.id === step);
  const selectedDaySummary = availabilityLabels(availableDays);
  const selectedSupportDays = Math.min(parseSupportDays(supportDaysPerWeek), availableDays.length);
  const availabilityError = availableDays.length === 0 ? "Pick at least one available day so the engine has a real placement constraint." : null;

  React.useEffect(() => {
    setAvailableDays(normalizeAvailability(initialScheduleAvailability));
  }, [initialScheduleAvailability]);

  const chooseMode = (nextMode: GoalMode) => {
    setMode(nextMode);
    setAdvancedOpen(false);
  };

  const goBack = () => {
    const previous = wizardSteps[Math.max(stepIndex - 1, 0)]?.id ?? "goal";
    setStep(previous);
  };

  const goNext = () => {
    if (step === "availability" && availabilityError) {
      return;
    }
    const next = wizardSteps[Math.min(stepIndex + 1, wizardSteps.length - 1)]?.id ?? "review";
    setStep(next);
  };

  const requireAvailableDays = (): readonly AvailabilityDay[] => {
    if (availableDays.length === 0) {
      throw new Error("Pick at least one available day so CornerIQ knows where generated support work can go.");
    }
    return availableDays;
  };

  const saveBuild = async () => {
    await runWithMessage(async () => {
      const scheduleAvailability = requireAvailableDays();
      await onSaveBuildGoal(
        withScheduleAvailability(
          {
            primaryFocus,
            supportDaysPerWeek: Math.min(parseSupportDays(supportDaysPerWeek), scheduleAvailability.length)
          },
          scheduleAvailability
        )
      );
      onCancel();
    });
  };

  const saveFight = async () => {
    await runWithMessage(async () => {
      const scheduleAvailability = requireAvailableDays();
      const cap = parseOptionalPositiveNumber(postWeighInWeightCapKg, "Post-weigh-in cap");
      const contractedKg = parseRequiredPositiveNumber(contractedWeightKg, "Contracted weight", { example: "64" });
      const parsedWeighInDateTime = parseOptionalISODateTime(weighInDateTime, "Weigh-in datetime");
      await onSaveFightSetup(
        withScheduleAvailability(
          {
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
            timezone: "America/Vancouver"
          },
          scheduleAvailability
        )
      );
      onCancel();
    });
  };

  const saveTournament = async () => {
    await runWithMessage(async () => {
      const scheduleAvailability = requireAvailableDays();
      await onSaveTournamentSetup(
        withScheduleAvailability(
          {
            tournamentStartDate: parseRequiredDateYYYYMMDD(tournamentStartDate, "Tournament start date"),
            tournamentEndDate: parseRequiredDateYYYYMMDD(tournamentEndDate, "Tournament end date"),
            possibleBoutDates: validateCommaSeparatedDates(possibleBoutDates, "Possible bout days"),
            dailyWeighIns,
            weighInTimeEachDay: parseRequiredTimeHHMM(weighInTimeEachDay, "Weigh-in time"),
            sameDayBoutLikely,
            numberOfPotentialBouts: parseRequiredPositiveInteger(numberOfPotentialBouts, "Possible bouts"),
            rehydrationWindowHoursByDay: parseHourList(rehydrationWindowHoursByDay),
            strategyMode
          },
          scheduleAvailability
        )
      );
      onCancel();
    });
  };

  const saveRecovery = async () => {
    await runWithMessage(async () => {
      const scheduleAvailability = requireAvailableDays();
      const durationDays = parseOptionalPositiveInteger(recoveryDurationDays, "Recovery duration days");
      await onSaveRecoveryGoal(
        withScheduleAvailability(
          {
            ...(durationDays === undefined ? {} : { durationDays }),
            focus: recoveryFocus
          },
          scheduleAvailability
        )
      );
      onCancel();
    });
  };

  const saveCurrentMode = async () => {
    if (mode === "build") {
      await saveBuild();
      return;
    }
    if (mode === "fight") {
      await saveFight();
      return;
    }
    if (mode === "tournament") {
      await saveTournament();
      return;
    }
    await saveRecovery();
  };

  const renderGoalStep = () => (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>What should CornerIQ build?</Text>
      <Text style={screenStyles.body}>Start with the phase. The next steps collect placement days and only the details this phase needs.</Text>
      <View style={{ gap: spacing.sm }}>
        {(["build", "fight", "tournament", "recovery"] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, selected: mode === option }}
            disabled={busy}
            key={option}
            onPress={() => chooseMode(option)}
            style={[screenStyles.chip, mode === option ? screenStyles.chipSelected : null, { alignItems: "flex-start", gap: spacing.xs }]}
          >
            <Text style={[screenStyles.chipText, mode === option ? screenStyles.chipTextSelected : null]}>{modeCopy[option].label}</Text>
            <Text style={screenStyles.subtle}>{modeCopy[option].description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAvailabilityStep = () => (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>Select available days</Text>
      <Text style={screenStyles.body}>Generated support sessions will only be placed on these days. Fixed boxing stays protected wherever it already lives.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {availabilityOptions.map((option) => (
          <OptionButton
            active={availableDays.includes(option.value)}
            busy={busy}
            key={option.value}
            label={option.label}
            onPress={() => setAvailableDays((current) => toggleAvailability(current, option.value))}
          />
        ))}
      </View>
      <Text style={availabilityError ? [screenStyles.subtle, { color: colors.redCorner }] : screenStyles.subtle}>
        {availabilityError ?? `${selectedDaySummary} selected for generated support placement.`}
      </Text>
    </View>
  );

  const renderBuildDetails = () => (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.fieldLabel}>Primary focus</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["balanced", "power", "conditioning", "strength", "mobility"] as const).map((option) => (
          <OptionButton active={primaryFocus === option} busy={busy} key={option} label={option[0]!.toUpperCase() + option.slice(1)} onPress={() => setPrimaryFocus(option)} />
        ))}
      </View>
      <TextInput keyboardType="number-pad" onChangeText={setSupportDaysPerWeek} placeholder="Support days per week" placeholderTextColor={colors.wrap} style={screenStyles.input} value={supportDaysPerWeek} />
      <Text style={screenStyles.subtle}>The wizard will cap this at your selected available days: {selectedSupportDays} support day{selectedSupportDays === 1 ? "" : "s"} available.</Text>
    </View>
  );

  const renderFightDetails = () => (
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
      {weighInType === "unknown" ? <Text style={screenStyles.callout}>This cut is blocked until weigh-in timing is confirmed.</Text> : null}
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
  );

  const renderTournamentDetails = () => (
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
  );

  const renderRecoveryDetails = () => (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.body}>Recovery keeps support work conservative while you get back to normal training.</Text>
      <TextInput keyboardType="number-pad" onChangeText={setRecoveryDurationDays} placeholder="Duration days optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={recoveryDurationDays} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["general", "soreness", "sleep", "travel", "post_bout"] as const).map((option) => (
          <OptionButton active={recoveryFocus === option} busy={busy} key={option} label={option === "post_bout" ? "Post-bout" : option[0]!.toUpperCase() + option.slice(1)} onPress={() => setRecoveryFocus(option)} />
        ))}
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={{ gap: spacing.sm }}>
      <Text style={screenStyles.sectionTitle}>{modeCopy[mode].label}</Text>
      <Text style={screenStyles.body}>Add the few details the engine needs before review.</Text>
      {mode === "build" ? renderBuildDetails() : null}
      {mode === "fight" ? renderFightDetails() : null}
      {mode === "tournament" ? renderTournamentDetails() : null}
      {mode === "recovery" ? renderRecoveryDetails() : null}
    </View>
  );

  const renderReviewStep = () => (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.sectionTitle}>Review new plan</Text>
        <Text style={screenStyles.body}>CornerIQ will save the goal and update the training days the engine can use for generated support.</Text>
      </View>
      <SummaryRow label="Goal" value={modeCopy[mode].label} />
      <SummaryRow label="Available generated-support days" value={selectedDaySummary} />
      {mode === "build" ? <SummaryRow label="Build focus" value={`${primaryFocus} focus, up to ${selectedSupportDays} support day${selectedSupportDays === 1 ? "" : "s"} per week.`} /> : null}
      {mode === "fight" ? <SummaryRow label="Fight setup" value={`${status.replaceAll("_", " ")} ${amateurOrPro} bout on ${boutDate}. Weigh-in: ${weighInType.replaceAll("_", " ")}.`} /> : null}
      {mode === "tournament" ? <SummaryRow label="Tournament setup" value={`${tournamentStartDate} to ${tournamentEndDate}. Strategy: ${strategyMode.replaceAll("_", " ")}.`} /> : null}
      {mode === "recovery" ? <SummaryRow label="Recovery setup" value={`${recoveryFocus.replaceAll("_", " ")} focus${recoveryDurationDays.trim() ? ` for ${recoveryDurationDays.trim()} day(s)` : ""}.`} /> : null}
      <Text style={screenStyles.subtle}>Protected boxing sessions remain the anchor. Generated support is constrained to selected days and still gated by readiness, safety, and phase rules.</Text>
      {availabilityError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{availabilityError}</Text> : null}
    </View>
  );

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-goal-flow-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Generate new plan</Text>
          <Text style={screenStyles.body}>Walk through the plan inputs in order so the engine gets goal, availability, and safety context together.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {wizardSteps.map((item, index) => <StepPill active={step === item.id} complete={index < stepIndex} index={index} key={item.id} label={item.label} />)}
        </View>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        {isMinor ? <Text style={screenStyles.subtle}>Minor athletes stay safety-first; acute weight-cut language stays blocked.</Text> : null}

        {step === "goal" ? renderGoalStep() : null}
        {step === "availability" ? renderAvailabilityStep() : null}
        {step === "details" ? renderDetailsStep() : null}
        {step === "review" ? renderReviewStep() : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {stepIndex > 0 ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={goBack} style={[screenStyles.quietButton, { flexBasis: 140, flexGrow: 1 }]}>
              <Text style={screenStyles.quietButtonText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || Boolean(step === "availability" && availabilityError) || Boolean(step === "review" && availabilityError) }}
            disabled={busy || Boolean(step === "availability" && availabilityError) || Boolean(step === "review" && availabilityError)}
            onPress={() => {
              if (step === "review") {
                void saveCurrentMode();
                return;
              }
              goNext();
            }}
            style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}
          >
            <Text style={screenStyles.buttonText}>{step === "review" ? modeCopy[mode].saveLabel : "Continue"}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>Keep current plan</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
