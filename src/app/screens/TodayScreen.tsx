import React from "react";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { TodayViewModel } from "../../engine/core/types";
import { EngineCard } from "../../design/components/EngineCard";
import { colors, spacing } from "../../design/theme";
import { screenStyles } from "./screenStyles";

export interface TodayQuickLogActions {
  logBodyMass: (bodyMassKg: number) => Promise<void>;
  logReadiness: (energy1To5: number) => Promise<void>;
  logWater: (liters: number) => Promise<void>;
  logCycleSymptom: (symptom: string) => Promise<void>;
}

export interface TodayScreenProps {
  viewModel: TodayViewModel;
  quickLogs: TodayQuickLogActions;
  cycleQuickLogEnabled: boolean;
  cycleSymptomOptions: readonly string[];
  busy: boolean;
  message: string | null;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function TodayScreen({ viewModel, quickLogs, cycleQuickLogEnabled, cycleSymptomOptions, busy, message }: TodayScreenProps) {
  const [bodyMass, setBodyMass] = useState("");
  const [energy, setEnergy] = useState("");
  const [water, setWater] = useState("");
  const [symptom, setSymptom] = useState(cycleSymptomOptions[0] ?? "");

  const submitNumber = async (value: string, action: (parsed: number) => Promise<void>, clear: () => void) => {
    const parsed = parsePositiveNumber(value);
    if (parsed !== null) {
      await action(parsed);
      clear();
    }
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{viewModel.title}</Text>
      <EngineCard>
        <View style={screenStyles.row}>
          <Text style={screenStyles.callout}>{viewModel.primaryAction}</Text>
          <Text style={screenStyles.body}>{viewModel.whatChanged}</Text>
          <Text style={screenStyles.subtle}>Confidence: {viewModel.confidenceLabel}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Today</Text>
          <Text style={screenStyles.body}>Training: {viewModel.trainingPriority}</Text>
          <Text style={screenStyles.body}>Fuel: {viewModel.fuelPriority}</Text>
          <Text style={screenStyles.body}>Body mass: {viewModel.bodyMassStatus}</Text>
          {viewModel.cycleContext ? <Text style={screenStyles.body}>Cycle: {viewModel.cycleContext}</Text> : null}
          <Text style={screenStyles.body}>Readiness: {viewModel.readinessContext}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.sectionTitle}>Risk summary</Text>
          {viewModel.riskSummary.length > 0 ? viewModel.riskSummary.map((risk) => <Text key={risk} style={screenStyles.body}>{risk}</Text>) : <Text style={screenStyles.body}>No active safety flags.</Text>}
          <Text style={screenStyles.subtle}>{viewModel.why}</Text>
        </View>
      </EngineCard>
      <EngineCard>
        <View style={{ gap: spacing.md }}>
          <Text style={screenStyles.sectionTitle}>Quick logs</Text>
          {viewModel.quickLogs.map((item) => <Text key={item} style={screenStyles.subtle}>{item}</Text>)}
          {message ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>{message}</Text> : null}
          <TextInput keyboardType="decimal-pad" onChangeText={setBodyMass} placeholder="Body mass kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={bodyMass} />
          <Pressable disabled={busy} onPress={() => submitNumber(bodyMass, quickLogs.logBodyMass, () => setBodyMass(""))} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Log body mass</Text>
          </Pressable>
          <TextInput keyboardType="number-pad" onChangeText={setEnergy} placeholder="Energy 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={energy} />
          <Pressable disabled={busy} onPress={() => submitNumber(energy, quickLogs.logReadiness, () => setEnergy(""))} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Log readiness</Text>
          </Pressable>
          <TextInput keyboardType="decimal-pad" onChangeText={setWater} placeholder="Water liters" placeholderTextColor={colors.wrap} style={screenStyles.input} value={water} />
          <Pressable disabled={busy} onPress={() => submitNumber(water, quickLogs.logWater, () => setWater(""))} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Log water</Text>
          </Pressable>
          {cycleQuickLogEnabled ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {cycleSymptomOptions.map((option) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    key={option}
                    onPress={() => setSymptom(option)}
                    style={[screenStyles.quietButton, option === symptom ? { borderColor: colors.blueIQ } : null]}
                  >
                    <Text style={screenStyles.quietButtonText}>{option.replace(/_/g, " ")}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable disabled={busy || !symptom} onPress={() => quickLogs.logCycleSymptom(symptom)} style={screenStyles.quietButton}>
                <Text style={screenStyles.quietButtonText}>Log cycle symptom</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </EngineCard>
    </ScrollView>
  );
}
