import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../../../../design/theme";
import { createDefaultFightDraft, createDefaultTournamentDraft, type OnboardingDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";

function OptionButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

function phaseOf(draft: OnboardingDraft): OnboardingDraft["goal"]["phase"] {
  return draft.goal.phase;
}

export function GoalPhaseStep({ draft, updateDraft }: OnboardingStepProps) {
  const fallbackDate = draft.protectedSchedule[0]?.date ?? "2026-05-20";
  const defaultFight = draft.goal.phase === "fight_known" ? draft.goal.fight : createDefaultFightDraft(fallbackDate);
  const defaultTournament = draft.goal.phase === "tournament_known" ? draft.goal.tournament : createDefaultTournamentDraft(fallbackDate);
  const [boutDate, setBoutDate] = useState(defaultFight.boutDate);
  const [contractedWeightKg, setContractedWeightKg] = useState(`${defaultFight.contractedWeightKg}`);
  const [weighInType, setWeighInType] = useState(defaultFight.weighInType);
  const [tournamentStartDate, setTournamentStartDate] = useState(defaultTournament.tournamentStartDate);
  const [tournamentEndDate, setTournamentEndDate] = useState(defaultTournament.tournamentEndDate);

  const setBuild = () => updateDraft((current) => ({ ...current, goal: { phase: "build" } }));
  const setRecovery = () => updateDraft((current) => ({ ...current, goal: { phase: "maintenance_recovery" } }));
  const setFight = () => {
    const weight = Number(contractedWeightKg);
    updateDraft((current) => ({
      ...current,
      goal: {
        phase: "fight_known",
        fight: {
          ...createDefaultFightDraft(fallbackDate),
          amateurOrPro: current.boxing.amateurOrPro,
          boutDate,
          weighInType,
          targetClassLabel: `${Number.isFinite(weight) ? weight : current.bodyMass.currentBodyMassKg} kg`,
          targetLimitKg: Number.isFinite(weight) ? weight : current.bodyMass.currentBodyMassKg,
          contractedWeightKg: Number.isFinite(weight) ? weight : current.bodyMass.currentBodyMassKg
        }
      }
    }));
  };
  const setTournament = () =>
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

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Goal phase</Text>
      <Text style={screenStyles.subtle}>Fight setup can be tentative. Unknown weigh-in timing blocks cut decisions until confirmed.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <OptionButton active={phaseOf(draft) === "build"} label="Build phase" onPress={setBuild} />
        <OptionButton active={phaseOf(draft) === "maintenance_recovery"} label="Maintenance recovery" onPress={setRecovery} />
        <OptionButton active={phaseOf(draft) === "fight_known"} label="Fight known" onPress={setFight} />
        <OptionButton active={phaseOf(draft) === "tournament_known"} label="Tournament known" onPress={setTournament} />
      </View>
      <TextInput
        onChangeText={(value) => {
          setBoutDate(value);
          if (draft.goal.phase === "fight_known") {
            updateDraft((current) => (current.goal.phase === "fight_known" ? { ...current, goal: { phase: "fight_known", fight: { ...current.goal.fight, boutDate: value } } } : current));
          }
        }}
        placeholder="Bout date YYYY-MM-DD"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={boutDate}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["unknown", "same_day", "day_before", "multi_day_tournament"] as const).map((option) => (
          <OptionButton
            active={weighInType === option}
            key={option}
            label={option.replace(/_/g, " ")}
            onPress={() => {
              setWeighInType(option);
              if (draft.goal.phase === "fight_known") {
                updateDraft((current) => (current.goal.phase === "fight_known" ? { ...current, goal: { phase: "fight_known", fight: { ...current.goal.fight, weighInType: option } } } : current));
              }
            }}
          />
        ))}
      </View>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setContractedWeightKg(value);
          const parsed = Number(value);
          if (draft.goal.phase === "fight_known" && Number.isFinite(parsed) && parsed > 0) {
            updateDraft((current) => ({
              ...current,
              goal: {
                phase: "fight_known",
                fight: {
                  ...(current.goal.phase === "fight_known" ? current.goal.fight : createDefaultFightDraft(fallbackDate)),
                  targetClassLabel: `${parsed} kg`,
                  targetLimitKg: parsed,
                  contractedWeightKg: parsed
                }
              }
            }));
          }
        }}
        placeholder="Contracted weight kg"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={contractedWeightKg}
      />
      <TextInput
        onChangeText={(value) => {
          setTournamentStartDate(value);
          if (draft.goal.phase === "tournament_known") {
            updateDraft((current) =>
              current.goal.phase === "tournament_known" ? { ...current, goal: { phase: "tournament_known", tournament: { ...current.goal.tournament, tournamentStartDate: value, possibleBoutDates: [value] } } } : current
            );
          }
        }}
        placeholder="Tournament start YYYY-MM-DD"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={tournamentStartDate}
      />
      <TextInput
        onChangeText={(value) => {
          setTournamentEndDate(value);
          if (draft.goal.phase === "tournament_known") {
            updateDraft((current) => (current.goal.phase === "tournament_known" ? { ...current, goal: { phase: "tournament_known", tournament: { ...current.goal.tournament, tournamentEndDate: value } } } : current));
          }
        }}
        placeholder="Tournament end YYYY-MM-DD"
        placeholderTextColor={colors.wrap}
        style={screenStyles.input}
        value={tournamentEndDate}
      />
    </View>
  );
}
