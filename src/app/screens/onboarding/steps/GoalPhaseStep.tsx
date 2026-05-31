import React, { useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { createDefaultFightDraft, createDefaultTournamentDraft, type OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

function phaseOf(draft: OnboardingDraft): OnboardingDraft["goal"]["phase"] {
  return draft.goal.phase;
}

function positiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function contractedWeightError(value: string): string | null {
  return positiveNumber(value) === null ? "Contracted weight is required." : null;
}

export function GoalPhaseStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const fallbackDate = draft.protectedSchedule[0]?.date ?? draft.recurringProtectedSchedule?.[0]?.activeFrom ?? "2026-05-20";
  const defaultFight = draft.goal.phase === "fight_known" ? draft.goal.fight : createDefaultFightDraft(fallbackDate);
  const defaultTournament = draft.goal.phase === "tournament_known" ? draft.goal.tournament : createDefaultTournamentDraft(fallbackDate);
  const [boutDate, setBoutDate] = useState(defaultFight.boutDate);
  const [contractedWeightKg, setContractedWeightKg] = useState(`${defaultFight.contractedWeightKg}`);
  const [weighInType, setWeighInType] = useState(defaultFight.weighInType);
  const [tournamentStartDate, setTournamentStartDate] = useState(defaultTournament.tournamentStartDate);
  const [tournamentEndDate, setTournamentEndDate] = useState(defaultTournament.tournamentEndDate);

  const setBuild = () => {
    updateDraft((current) => ({ ...current, goal: { phase: "build" } }));
    setStepError(null);
  };
  const setRecovery = () => {
    updateDraft((current) => ({ ...current, goal: { phase: "maintenance_recovery" } }));
    setStepError(null);
  };
  const setFight = () => {
    const weight = positiveNumber(contractedWeightKg);
    if (weight === null) {
      setStepError("Contracted weight is required.");
      return;
    }
    updateDraft((current) => ({
      ...current,
      goal: {
        phase: "fight_known",
        fight: {
          ...createDefaultFightDraft(fallbackDate),
          amateurOrPro: current.boxing.amateurOrPro,
          boutDate,
          weighInType,
          targetClassLabel: contractedWeightKg.trim() ? `${contractedWeightKg.trim()} kg` : "",
          targetLimitKg: weight,
          contractedWeightKg: weight
        }
      }
    }));
    setStepError(null);
  };
  const setTournament = () => {
    updateDraft((current) => ({
      ...current,
      goal: {
        phase: "tournament_known",
        tournament: {
          ...createDefaultTournamentDraft(fallbackDate),
          tournamentStartDate,
          tournamentEndDate,
          possibleBoutDates: [tournamentStartDate],
          strategyMode: "stay_near_weight"
        }
      }
    }));
    setStepError(null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Goal phase</Text>
      <Text style={screenStyles.subtle}>Choose the planning context for Today and Plan. Finishing setup creates your boxer profile, saves today's body-mass log, and protects any weekly anchors you entered.</Text>
      <FieldGroup helper="Pick the closest current situation. You can keep fight details tentative." label="Current goal">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ChipButton active={phaseOf(draft) === "build"} label="Build phase" onPress={setBuild} />
          <ChipButton active={phaseOf(draft) === "maintenance_recovery"} label="Maintenance/recovery" onPress={setRecovery} />
          <ChipButton active={phaseOf(draft) === "fight_known"} label="Fight known" onPress={setFight} />
          <ChipButton active={phaseOf(draft) === "tournament_known"} label="Tournament known" onPress={setTournament} />
        </View>
      </FieldGroup>
      <Text style={screenStyles.subtle}>Build phase: build boxing-specific capacity around protected work.</Text>
      <Text style={screenStyles.subtle}>Maintenance/recovery: keep consistency and safety ahead of performance pressure.</Text>
      <Text style={screenStyles.subtle}>Fight known: add bout date, weigh-in timing, and contracted weight so the engine can avoid unsafe assumptions.</Text>
      <Text style={screenStyles.subtle}>Tournament known: add tournament dates so daily weigh-in and bout-day context stay explicit.</Text>
      {draft.goal.phase === "fight_known" ? (
        <View style={{ gap: spacing.md }}>
          <LabeledTextInput
            example="2026-06-20"
            helper="The scheduled or tentative bout date in YYYY-MM-DD format."
            label="Bout date"
            onChangeText={(value) => {
              setBoutDate(value);
              updateDraft((current) => (current.goal.phase === "fight_known" ? { ...current, goal: { phase: "fight_known", fight: { ...current.goal.fight, boutDate: value } } } : current));
              setStepError(contractedWeightError(contractedWeightKg));
            }}
            placeholder="Bout date YYYY-MM-DD"
            value={boutDate}
          />
          <FieldGroup helper="Choose unknown if you do not know yet. Unknown timing blocks weight-cut decisions until confirmed." label="Weigh-in timing">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["unknown", "same_day", "day_before", "multi_day_tournament"] as const).map((option) => (
                <ChipButton
                  active={weighInType === option}
                  key={option}
                  label={option.replace(/_/g, " ")}
                  onPress={() => {
                    setWeighInType(option);
                    updateDraft((current) => (current.goal.phase === "fight_known" ? { ...current, goal: { phase: "fight_known", fight: { ...current.goal.fight, weighInType: option } } } : current));
                    setStepError(contractedWeightError(contractedWeightKg));
                  }}
                />
              ))}
            </View>
          </FieldGroup>
          <LabeledTextInput
            example="67"
            helper="The contracted class or agreed limit in kg. This is context, not pressure to chase a number."
            keyboardType="decimal-pad"
            label="Contracted weight (kg)"
            onChangeText={(value) => {
              setContractedWeightKg(value);
              const parsed = positiveNumber(value);
              if (parsed === null) {
                setStepError("Contracted weight is required.");
                return;
              }
              updateDraft((current) => ({
                ...current,
                goal: {
                  phase: "fight_known",
                  fight: {
                    ...(current.goal.phase === "fight_known" ? current.goal.fight : createDefaultFightDraft(fallbackDate)),
                    targetClassLabel: value.trim() ? `${value.trim()} kg` : "",
                    targetLimitKg: parsed,
                    contractedWeightKg: parsed
                  }
                }
              }));
              setStepError(null);
            }}
            placeholder="Contracted weight kg"
            value={contractedWeightKg}
          />
        </View>
      ) : null}
      {draft.goal.phase === "tournament_known" ? (
        <View style={{ gap: spacing.md }}>
          <LabeledTextInput
            example="2026-07-10"
            helper="First tournament day in YYYY-MM-DD format."
            label="Tournament start date"
            onChangeText={(value) => {
              setTournamentStartDate(value);
              updateDraft((current) =>
                current.goal.phase === "tournament_known" ? { ...current, goal: { phase: "tournament_known", tournament: { ...current.goal.tournament, tournamentStartDate: value, possibleBoutDates: [value] } } } : current
              );
              setStepError(null);
            }}
            placeholder="Tournament start YYYY-MM-DD"
            value={tournamentStartDate}
          />
          <LabeledTextInput
            example="2026-07-12"
            helper="Last tournament day in YYYY-MM-DD format."
            label="Tournament end date"
            onChangeText={(value) => {
              setTournamentEndDate(value);
              updateDraft((current) => (current.goal.phase === "tournament_known" ? { ...current, goal: { phase: "tournament_known", tournament: { ...current.goal.tournament, tournamentEndDate: value } } } : current));
              setStepError(null);
            }}
            placeholder="Tournament end YYYY-MM-DD"
            value={tournamentEndDate}
          />
        </View>
      ) : null}
    </View>
  );
}
