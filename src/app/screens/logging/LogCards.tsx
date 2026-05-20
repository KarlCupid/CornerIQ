import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalNonNegativeNumber,
  parseOptionalPositiveInteger,
  parseRequiredNonNegativeNumber,
  parseRequiredPositiveInteger,
  parseRequiredPositiveNumber,
  validateOneToFive
} from "../../forms/validation";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import type { QuickLogActions } from "../../../hooks/useQuickLogs";
import type { CycleSymptom } from "../../../engine/core/types";
import { screenStyles } from "../screenStyles";

interface LogCardProps {
  busy: boolean;
}

interface QuickLogCardProps extends LogCardProps {
  actions: QuickLogActions;
}

function ToggleButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

export function BodyMassLogCard({ actions, busy }: QuickLogCardProps) {
  const [bodyMassKg, setBodyMassKg] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Body mass log failed.");
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Body mass</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <TextInput keyboardType="decimal-pad" onChangeText={setBodyMassKg} placeholder="kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={bodyMassKg} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              await actions.logBodyMass({ bodyMassKg: parseRequiredPositiveNumber(bodyMassKg, "Body mass", { example: "66.4" }) });
              setBodyMassKg("");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>Log body mass</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function ReadinessCheckInCard({ actions, busy }: QuickLogCardProps) {
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [energy, setEnergy] = useState("");
  const [soreness, setSoreness] = useState("");
  const [stress, setStress] = useState("");
  const [mood, setMood] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [illness, setIllness] = useState(false);
  const [dizziness, setDizziness] = useState(false);
  const [fainting, setFainting] = useState(false);
  const { message: error, runWithMessage } = useFormMessage("Readiness log failed.");

  const clear = () => {
    setSleepHours("");
    setSleepQuality("");
    setEnergy("");
    setSoreness("");
    setStress("");
    setMood("");
    setPainNotes("");
    setIllness(false);
    setDizziness(false);
    setFainting(false);
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Readiness</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <TextInput keyboardType="decimal-pad" onChangeText={setSleepHours} placeholder="Sleep hours" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sleepHours} />
        <TextInput keyboardType="number-pad" onChangeText={setSleepQuality} placeholder="Sleep quality 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sleepQuality} />
        <TextInput keyboardType="number-pad" onChangeText={setEnergy} placeholder="Energy 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={energy} />
        <TextInput keyboardType="number-pad" onChangeText={setSoreness} placeholder="Soreness 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={soreness} />
        <TextInput keyboardType="number-pad" onChangeText={setStress} placeholder="Stress 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={stress} />
        <TextInput keyboardType="number-pad" onChangeText={setMood} placeholder="Mood 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={mood} />
        <TextInput onChangeText={setPainNotes} placeholder="Pain notes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={painNotes} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={illness} busy={busy} label="Illness" onPress={() => setIllness((value) => !value)} />
          <ToggleButton active={dizziness} busy={busy} label="Dizziness" onPress={() => setDizziness((value) => !value)} />
          <ToggleButton active={fainting} busy={busy} label="Fainting" onPress={() => setFainting((value) => !value)} />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              await actions.logReadiness({
                sleepHours: parseRequiredNonNegativeNumber(sleepHours, "Sleep hours", { example: "7.5" }),
                sleepQuality1To5: validateOneToFive(sleepQuality, "Sleep quality"),
                energy1To5: validateOneToFive(energy, "Energy"),
                soreness1To5: validateOneToFive(soreness, "Soreness"),
                stress1To5: validateOneToFive(stress, "Stress"),
                mood1To5: validateOneToFive(mood, "Mood"),
                painNotes: painNotes.trim() ? [painNotes.trim()] : [],
                illnessSymptoms: illness ? ["illness"] : [],
                dizziness,
                fainting
              });
              clear();
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>Log readiness</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function HydrationLogCard({ actions, busy }: QuickLogCardProps) {
  const [liters, setLiters] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Hydration log failed.");
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Hydration</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <TextInput keyboardType="decimal-pad" onChangeText={setLiters} placeholder="Water liters" placeholderTextColor={colors.wrap} style={screenStyles.input} value={liters} />
        <TextInput keyboardType="number-pad" onChangeText={setSodiumMg} placeholder="Sodium mg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sodiumMg} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              const sodium = parseOptionalNonNegativeNumber(sodiumMg, "Sodium");
              const payload = { liters: parseRequiredNonNegativeNumber(liters, "Water liters", { example: "2.5" }) };
              await actions.logHydration(sodium === undefined ? payload : { ...payload, sodiumMg: sodium });
              setLiters("");
              setSodiumMg("");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>Log hydration</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function CycleLogCard({ actions, busy, cycleSymptomOptions }: QuickLogCardProps & { cycleSymptomOptions: readonly CycleSymptom[] }) {
  const [flowLevel, setFlowLevel] = useState<"none" | "spotting" | "light" | "moderate" | "heavy" | "very_heavy" | "unknown">("unknown");
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [bleedStart, setBleedStart] = useState(false);
  const [bleedEnd, setBleedEnd] = useState(false);
  const [hormonalContraception, setHormonalContraception] = useState<"none" | "combined_pill" | "progestin_only_pill" | "hormonal_iud" | "copper_iud" | "implant" | "injection" | "patch" | "ring" | "unknown">("unknown");
  const { message: error, runWithMessage } = useFormMessage("Cycle log failed.");

  const toggleSymptom = (symptom: CycleSymptom) => {
    setSymptoms((current) => (current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]));
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Cycle</Text>
        <Text style={screenStyles.subtle}>Optional and private. This is for symptoms and training context, not fertility tracking.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["unknown", "none", "light", "moderate", "heavy", "very_heavy"] as const).map((level) => (
            <ToggleButton active={flowLevel === level} busy={busy} key={level} label={level.replace(/_/g, " ")} onPress={() => setFlowLevel(level)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {cycleSymptomOptions.slice(0, 8).map((symptom) => (
            <ToggleButton active={symptoms.includes(symptom)} busy={busy} key={symptom} label={symptom.replace(/_/g, " ")} onPress={() => toggleSymptom(symptom)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={bleedStart} busy={busy} label="Bleed start" onPress={() => setBleedStart((value) => !value)} />
          <ToggleButton active={bleedEnd} busy={busy} label="Bleed end" onPress={() => setBleedEnd((value) => !value)} />
          <ToggleButton active={hormonalContraception !== "unknown"} busy={busy} label="Hormonal contraception" onPress={() => setHormonalContraception((value) => (value === "unknown" ? "combined_pill" : "unknown"))} />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              await actions.logCycle({
                flowLevel,
                symptoms,
                bleedStart,
                bleedEnd,
                hormonalContraception
              });
              setSymptoms([]);
              setBleedStart(false);
              setBleedEnd(false);
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>Log cycle</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function FoodQuickLogCard({ actions, busy }: QuickLogCardProps) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Food log failed.");
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Food quick log</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <TextInput keyboardType="number-pad" onChangeText={setCalories} placeholder="Calories" placeholderTextColor={colors.wrap} style={screenStyles.input} value={calories} />
        <TextInput keyboardType="decimal-pad" onChangeText={setProtein} placeholder="Protein g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={protein} />
        <TextInput keyboardType="decimal-pad" onChangeText={setCarbs} placeholder="Carbs g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={carbs} />
        <TextInput keyboardType="decimal-pad" onChangeText={setFat} placeholder="Fat g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={fat} />
        <TextInput keyboardType="decimal-pad" onChangeText={setFiber} placeholder="Fiber g optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={fiber} />
        <TextInput keyboardType="number-pad" onChangeText={setSodium} placeholder="Sodium mg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sodium} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              const payload = {
                calories: parseRequiredNonNegativeNumber(calories, "Calories"),
                proteinGrams: parseRequiredNonNegativeNumber(protein, "Protein"),
                carbohydrateGrams: parseRequiredNonNegativeNumber(carbs, "Carbs"),
                fatGrams: parseRequiredNonNegativeNumber(fat, "Fat")
              };
              const fiberGrams = parseOptionalNonNegativeNumber(fiber, "Fiber");
              const sodiumMg = parseOptionalNonNegativeNumber(sodium, "Sodium");
              await actions.logFood({
                ...payload,
                ...(fiberGrams === undefined ? {} : { fiberGrams }),
                ...(sodiumMg === undefined ? {} : { sodiumMg })
              });
              setCalories("");
              setProtein("");
              setCarbs("");
              setFat("");
              setFiber("");
              setSodium("");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>Save food</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function ProtectedWorkoutLogCard({ actions, busy }: QuickLogCardProps) {
  const [logKind, setLogKind] = useState<"completed" | "planned">("completed");
  const [type, setType] = useState<"technical_session" | "pads_mitts" | "bag_work" | "sparring" | "roadwork" | "coach_assigned_strength" | "recovery_day">("technical_session");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [intensity, setIntensity] = useState<"easy" | "moderate" | "hard" | "max">("moderate");
  const [rounds, setRounds] = useState("");
  const [note, setNote] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Training log failed.");
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Training log</Text>
        <Text style={screenStyles.subtle}>Completed sessions are history. Planned anchors are protected boxing commitments.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={logKind === "completed"} busy={busy} label="Completed session" onPress={() => setLogKind("completed")} />
          <ToggleButton active={logKind === "planned"} busy={busy} label="Planned anchor" onPress={() => setLogKind("planned")} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["technical_session", "pads_mitts", "bag_work", "sparring", "roadwork", "coach_assigned_strength", "recovery_day"] as const).map((option) => (
            <ToggleButton active={type === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setType(option)} />
          ))}
        </View>
        <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["easy", "moderate", "hard", "max"] as const).map((option) => (
            <ToggleButton active={intensity === option} busy={busy} key={option} label={option} onPress={() => setIntensity(option)} />
          ))}
        </View>
        <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
        <TextInput onChangeText={setNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={note} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              const parsedRounds = parseOptionalPositiveInteger(rounds, "Rounds");
              await actions.logProtectedWorkout({
                logKind,
                type,
                durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Duration"),
                intensity,
                ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
                ...(note.trim() ? { note: note.trim() } : {})
              });
              setDurationMinutes("");
              setRounds("");
              setNote("");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{logKind === "completed" ? "Log completed session" : "Save planned anchor"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
