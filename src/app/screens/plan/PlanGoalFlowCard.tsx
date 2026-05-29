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

export interface PlanGoalFlowCardProps {
  asOfDate: ISODateString;
  busy: boolean;
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

export function PlanGoalFlowCard({
  asOfDate,
  busy,
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
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
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

  const saveBuild = async () => {
    await runWithMessage(async () => {
      await onSaveBuildGoal({
        primaryFocus,
        supportDaysPerWeek: parseSupportDays(supportDaysPerWeek)
      });
      onCancel();
    });
  };

  const saveFight = async () => {
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
        timezone: "America/Vancouver"
      });
      onCancel();
    });
  };

  const saveTournament = async () => {
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
        strategyMode
      });
      onCancel();
    });
  };

  const saveRecovery = async () => {
    await runWithMessage(async () => {
      const durationDays = parseOptionalPositiveInteger(recoveryDurationDays, "Recovery duration days");
      await onSaveRecoveryGoal({
        ...(durationDays === undefined ? {} : { durationDays }),
        focus: recoveryFocus
      });
      onCancel();
    });
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="plan-goal-flow-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Change goal</Text>
          <Text style={screenStyles.body}>Choose the boxing phase CornerIQ should plan around next.</Text>
        </View>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        {isMinor ? <Text style={screenStyles.subtle}>Minor athletes stay safety-first; acute weight-cut language stays blocked.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={mode === "build"} busy={busy} label="Build general boxing fitness" onPress={() => { setMode("build"); setAdvancedOpen(false); }} />
          <OptionButton active={mode === "fight"} busy={busy} label="Enter fight camp" onPress={() => { setMode("fight"); setAdvancedOpen(false); }} />
          <OptionButton active={mode === "tournament"} busy={busy} label="Enter tournament mode" onPress={() => { setMode("tournament"); setAdvancedOpen(false); }} />
          <OptionButton active={mode === "recovery"} busy={busy} label="Recovery / maintenance" onPress={() => { setMode("recovery"); setAdvancedOpen(false); }} />
        </View>

        {mode === "build" ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.fieldLabel}>Primary focus</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["balanced", "power", "conditioning", "strength", "mobility"] as const).map((option) => (
                <OptionButton active={primaryFocus === option} busy={busy} key={option} label={option[0]!.toUpperCase() + option.slice(1)} onPress={() => setPrimaryFocus(option)} />
              ))}
            </View>
            <TextInput keyboardType="number-pad" onChangeText={setSupportDaysPerWeek} placeholder="Support days per week" placeholderTextColor={colors.wrap} style={screenStyles.input} value={supportDaysPerWeek} />
            <Pressable accessibilityLabel="Save build goal" accessibilityRole="button" disabled={busy} onPress={saveBuild} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Generate plan</Text>
            </Pressable>
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
            <Pressable accessibilityLabel="Save fight camp goal" accessibilityRole="button" disabled={busy} onPress={saveFight} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Enter fight camp</Text>
            </Pressable>
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
            <Pressable accessibilityLabel="Save tournament goal" accessibilityRole="button" disabled={busy} onPress={saveTournament} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Enter tournament mode</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === "recovery" ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.body}>Recovery keeps support work conservative while you get back to normal training.</Text>
            <TextInput keyboardType="number-pad" onChangeText={setRecoveryDurationDays} placeholder="Duration days optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={recoveryDurationDays} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["general", "soreness", "sleep", "travel", "post_bout"] as const).map((option) => (
                <OptionButton active={recoveryFocus === option} busy={busy} key={option} label={option === "post_bout" ? "Post-bout" : option[0]!.toUpperCase() + option.slice(1)} onPress={() => setRecoveryFocus(option)} />
              ))}
            </View>
            <Pressable accessibilityLabel="Save recovery goal" accessibilityRole="button" disabled={busy} onPress={saveRecovery} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Start recovery</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>Keep current plan</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
