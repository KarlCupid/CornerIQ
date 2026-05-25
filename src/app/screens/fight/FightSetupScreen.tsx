import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalISODateTime,
  parseOptionalPositiveNumber,
  parseRequiredDateYYYYMMDD,
  parseRequiredNonNegativeNumber,
  parseRequiredPositiveInteger,
  parseRequiredPositiveNumber,
  parseRequiredTimeHHMM,
  validateCommaSeparatedDates,
  validateNonEmptyText
} from "../../forms/validation";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import {
  createDefaultFightDraft,
  createDefaultTournamentDraft,
  type FightSetupDraft,
  type TournamentSetupDraft
} from "../../../services/supabase/onboardingService";
import type { ISODateString } from "../../../engine/core/types";
import { screenStyles } from "../screenStyles";

export interface FightSetupScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  hasActiveFightOrTournament: boolean;
  isMinor: boolean;
  onSaveFight: (draft: FightSetupDraft) => Promise<void>;
  onSaveTournament: (draft: TournamentSetupDraft) => Promise<void>;
}

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

export function FightSetupScreen({ asOfDate, busy, hasActiveFightOrTournament, isMinor, onSaveFight, onSaveTournament }: FightSetupScreenProps) {
  const defaultFight = createDefaultFightDraft(asOfDate);
  const defaultTournament = createDefaultTournamentDraft(asOfDate);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"fight" | "tournament">("fight");
  const [status, setStatus] = useState<FightSetupDraft["status"]>(defaultFight.status);
  const [amateurOrPro, setAmateurOrPro] = useState<FightSetupDraft["amateurOrPro"]>(defaultFight.amateurOrPro);
  const [boutDate, setBoutDate] = useState(defaultFight.boutDate);
  const [weighInDateTime, setWeighInDateTime] = useState("");
  const [weighInType, setWeighInType] = useState<FightSetupDraft["weighInType"]>(defaultFight.weighInType);
  const [rounds, setRounds] = useState(`${defaultFight.rounds}`);
  const [roundMinutes, setRoundMinutes] = useState(`${defaultFight.roundMinutes}`);
  const [restSeconds, setRestSeconds] = useState(`${defaultFight.restSeconds}`);
  const [targetClassLabel, setTargetClassLabel] = useState(defaultFight.targetClassLabel);
  const [contractedWeightKg, setContractedWeightKg] = useState(`${defaultFight.contractedWeightKg}`);
  const [allowanceKg, setAllowanceKg] = useState(`${defaultFight.allowanceKg}`);
  const [hydrationTestingRequired, setHydrationTestingRequired] = useState(false);
  const [postWeighInWeightCapKg, setPostWeighInWeightCapKg] = useState("");

  const [tournamentStartDate, setTournamentStartDate] = useState(defaultTournament.tournamentStartDate);
  const [tournamentEndDate, setTournamentEndDate] = useState(defaultTournament.tournamentEndDate);
  const [possibleBoutDates, setPossibleBoutDates] = useState(defaultTournament.possibleBoutDates.join(","));
  const [dailyWeighIns, setDailyWeighIns] = useState(defaultTournament.dailyWeighIns);
  const [weighInTimeEachDay, setWeighInTimeEachDay] = useState(defaultTournament.weighInTimeEachDay);
  const [sameDayBoutLikely, setSameDayBoutLikely] = useState(defaultTournament.sameDayBoutLikely);
  const [numberOfPotentialBouts, setNumberOfPotentialBouts] = useState(`${defaultTournament.numberOfPotentialBouts}`);
  const [rehydrationWindowHoursByDay, setRehydrationWindowHoursByDay] = useState(defaultTournament.rehydrationWindowHoursByDay.join(","));
  const [strategyMode, setStrategyMode] = useState<TournamentSetupDraft["strategyMode"]>("stay_near_weight");
  const { message: formError, runWithMessage } = useFormMessage("Setup could not be saved.");

  const parseHourList = (value: string): number[] => {
    const hours = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => parseRequiredNonNegativeNumber(item, `Rehydration window #${index + 1}`));
    if (hours.length === 0) {
      throw new Error("Rehydration windows are required: enter at least one hour value.");
    }
    return hours;
  };

  const saveFight = async () => {
    await runWithMessage(async () => {
      const cap = parseOptionalPositiveNumber(postWeighInWeightCapKg, "Post-weigh-in cap");
      const contractedKg = parseRequiredPositiveNumber(contractedWeightKg, "Contracted weight", { example: "64" });
      const parsedWeighInDateTime = parseOptionalISODateTime(weighInDateTime, "Weigh-in datetime");
      await onSaveFight({
        status,
        amateurOrPro,
        boutDate: parseRequiredDateYYYYMMDD(boutDate, "Bout date"),
        ...(parsedWeighInDateTime ? { weighInDateTime: parsedWeighInDateTime } : {}),
        weighInType,
        rounds: parseRequiredPositiveInteger(rounds, "Rounds"),
        roundMinutes: parseRequiredPositiveNumber(roundMinutes, "Round minutes"),
        restSeconds: parseRequiredPositiveInteger(restSeconds, "Rest seconds"),
        targetClassLabel: validateNonEmptyText(targetClassLabel, "Target class label"),
        targetLimitKg: contractedKg,
        contractedWeightKg: contractedKg,
        allowanceKg: parseRequiredNonNegativeNumber(allowanceKg, "Allowance"),
        hydrationTestingRequired,
        ...(cap === undefined ? {} : { postWeighInWeightCapKg: cap }),
        timezone: "America/Vancouver"
      });
    });
  };

  const saveTournament = async () => {
    await runWithMessage(async () => {
      await onSaveTournament({
        tournamentStartDate: parseRequiredDateYYYYMMDD(tournamentStartDate, "Tournament start date"),
        tournamentEndDate: parseRequiredDateYYYYMMDD(tournamentEndDate, "Tournament end date"),
        possibleBoutDates: validateCommaSeparatedDates(possibleBoutDates, "Possible bout dates"),
        dailyWeighIns,
        weighInTimeEachDay: parseRequiredTimeHHMM(weighInTimeEachDay, "Weigh-in time"),
        sameDayBoutLikely,
        numberOfPotentialBouts: parseRequiredPositiveInteger(numberOfPotentialBouts, "Possible bouts"),
        rehydrationWindowHoursByDay: parseHourList(rehydrationWindowHoursByDay),
        strategyMode
      });
    });
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{hasActiveFightOrTournament ? "Fight or tournament setup" : "Add fight or tournament"}</Text>
        <Text style={screenStyles.body}>Add this only if you have a real fight date or tournament window.</Text>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        {open && weighInType === "unknown" && mode === "fight" ? <Text style={screenStyles.callout}>This cut is blocked until weigh-in timing is confirmed.</Text> : null}
        {isMinor ? <Text style={screenStyles.subtle}>Minor athletes stay safety-first; CornerIQ will not offer acute cut protocol wording.</Text> : null}
        {open && hydrationTestingRequired && mode === "fight" ? <Text style={screenStyles.subtle}>Hydration testing will appear as a review caution in the engine.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={open && mode === "fight"} busy={busy} label="Add fight" onPress={() => { setMode("fight"); setOpen(true); }} />
          <OptionButton active={open && mode === "tournament"} busy={busy} label="Add tournament" onPress={() => { setMode("tournament"); setOpen(true); }} />
        </View>
        {open ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setOpen(false)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>Hide setup</Text>
          </Pressable>
        ) : null}
        {open && mode === "fight" ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["tentative", "confirmed", "short_notice"] as const).map((option) => <OptionButton active={status === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setStatus(option)} />)}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["amateur", "pro"] as const).map((option) => <OptionButton active={amateurOrPro === option} busy={busy} key={option} label={option} onPress={() => setAmateurOrPro(option)} />)}
            </View>
            <TextInput onChangeText={setBoutDate} placeholder="Bout date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={boutDate} />
            <TextInput onChangeText={setWeighInDateTime} placeholder="Weigh-in datetime optional ISO" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weighInDateTime} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["unknown", "same_day", "day_before", "multi_day_tournament"] as const).map((option) => <OptionButton active={weighInType === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setWeighInType(option)} />)}
            </View>
            <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
            <TextInput keyboardType="decimal-pad" onChangeText={setRoundMinutes} placeholder="Round minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={roundMinutes} />
            <TextInput keyboardType="number-pad" onChangeText={setRestSeconds} placeholder="Rest seconds" placeholderTextColor={colors.wrap} style={screenStyles.input} value={restSeconds} />
            <TextInput onChangeText={setTargetClassLabel} placeholder="Target class label" placeholderTextColor={colors.wrap} style={screenStyles.input} value={targetClassLabel} />
            <TextInput keyboardType="decimal-pad" onChangeText={setContractedWeightKg} placeholder="Contracted weight kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={contractedWeightKg} />
            <TextInput keyboardType="decimal-pad" onChangeText={setAllowanceKg} placeholder="Allowance kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={allowanceKg} />
            <TextInput keyboardType="decimal-pad" onChangeText={setPostWeighInWeightCapKg} placeholder="Post-weigh-in cap kg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={postWeighInWeightCapKg} />
            <OptionButton active={hydrationTestingRequired} busy={busy} label="Hydration testing required" onPress={() => setHydrationTestingRequired((value) => !value)} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={saveFight} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Save fight</Text>
            </Pressable>
          </View>
        ) : open ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput onChangeText={setTournamentStartDate} placeholder="Start date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={tournamentStartDate} />
            <TextInput onChangeText={setTournamentEndDate} placeholder="End date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={tournamentEndDate} />
            <TextInput onChangeText={setPossibleBoutDates} placeholder="Possible bout dates, comma-separated" placeholderTextColor={colors.wrap} style={screenStyles.input} value={possibleBoutDates} />
            <OptionButton active={dailyWeighIns} busy={busy} label="Daily weigh-ins" onPress={() => setDailyWeighIns((value) => !value)} />
            <TextInput onChangeText={setWeighInTimeEachDay} placeholder="Weigh-in time" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weighInTimeEachDay} />
            <OptionButton active={sameDayBoutLikely} busy={busy} label="Same-day bout likely" onPress={() => setSameDayBoutLikely((value) => !value)} />
            <TextInput keyboardType="number-pad" onChangeText={setNumberOfPotentialBouts} placeholder="Possible bouts" placeholderTextColor={colors.wrap} style={screenStyles.input} value={numberOfPotentialBouts} />
            <TextInput onChangeText={setRehydrationWindowHoursByDay} placeholder="Rehydration windows hours" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rehydrationWindowHoursByDay} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["stay_near_weight", "mild_daily_cut", "no_cut_recommended"] as const).map((option) => <OptionButton active={strategyMode === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setStrategyMode(option)} />)}
            </View>
            <Pressable accessibilityRole="button" disabled={busy} onPress={saveTournament} style={screenStyles.button}>
              <Text style={screenStyles.buttonText}>Save tournament</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </EngineCard>
  );
}
