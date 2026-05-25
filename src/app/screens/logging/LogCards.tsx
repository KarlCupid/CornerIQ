import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalNonNegativeNumber,
  parseOptionalPositiveInteger,
  parseRequiredNonNegativeNumber,
  parseRequiredInteger,
  parseRequiredPositiveInteger,
  parseRequiredPositiveNumber,
  validateOneToFive
} from "../../forms/validation";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import type { QuickLogActions } from "../../../hooks/useQuickLogs";
import type { CycleSymptom, RecentLogsViewModel, SessionIntensity } from "../../../engine/core/types";
import { screenStyles } from "../screenStyles";

interface LogCardProps {
  busy: boolean;
}

interface QuickLogCardProps extends LogCardProps {
  actions: QuickLogActions;
}

type DailyLogStatus = RecentLogsViewModel["readinessToday"];
type HydrationTodayStatus = RecentLogsViewModel["hydrationToday"];
type FoodTodayStatus = RecentLogsViewModel["foodToday"];

function ToggleButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

function QuickLogHelp() {
  return <Text style={screenStyles.subtle}>Log enough for today. Optional fields can stay blank; missed logs stay unknown.</Text>;
}

function DailyLogFrame({
  busy,
  children,
  status,
  title
}: React.PropsWithChildren<{
  busy: boolean;
  status?: DailyLogStatus | undefined;
  title: string;
}>) {
  const [open, setOpen] = useState(() => !(status?.loggedToday ?? false));

  React.useEffect(() => {
    if (status?.loggedToday) {
      setOpen(false);
    }
  }, [status?.loggedToday, status?.summary]);

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{title}</Text>
        {status ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={status.loggedToday ? screenStyles.successText : screenStyles.callout}>{status.statusLabel}</Text>
            <Text style={screenStyles.body}>{status.summary}</Text>
            <Text style={screenStyles.subtle}>Why: {status.why}</Text>
          </View>
        ) : (
          <QuickLogHelp />
        )}
        {status?.loggedToday && !open ? (
          <Pressable accessibilityLabel={status.actionLabel} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setOpen(true)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{status.actionLabel}</Text>
          </Pressable>
        ) : null}
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
      </View>
    </EngineCard>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <Text style={screenStyles.fieldLabel}>{children}</Text>;
}

function ReadinessScaleHelp() {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.subtle}>Use a 1-5 scale: 1 = low/poor, 5 = high/great.</Text>
      <Text style={screenStyles.subtle}>For soreness/stress: 1 = none/easy, 5 = very high.</Text>
    </View>
  );
}

function parseRequiredSessionRpe(value: string): number {
  const parsed = parseRequiredInteger(value, "Session RPE", { example: "6" });
  if (parsed < 1 || parsed > 10) {
    throw new Error("Session RPE is required: choose a whole number from 1 to 10. Example: 6.");
  }
  return parsed;
}

function intensityFromSessionRpe(rpe: number): SessionIntensity {
  if (rpe <= 3) {
    return "easy";
  }
  if (rpe <= 6) {
    return "moderate";
  }
  if (rpe <= 8) {
    return "hard";
  }
  return "max";
}

export function BodyMassLogCard({ actions, busy, status }: QuickLogCardProps & { status?: DailyLogStatus | undefined }) {
  const [bodyMassKg, setBodyMassKg] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Body mass log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <DailyLogFrame busy={busy} status={status} title="Body mass">
        <QuickLogHelp />
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Body mass (kg)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setBodyMassKg} placeholder="kg" placeholderTextColor={colors.wrap} style={screenStyles.input} value={bodyMassKg} />
        <Pressable
          accessibilityLabel={busy ? "Saving body mass log" : status?.loggedToday ? "Update body mass" : "Log body mass"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              await actions.logBodyMass({ bodyMassKg: parseRequiredPositiveNumber(bodyMassKg, "Body mass", { example: "66.4" }) });
              setBodyMassKg("");
              setSuccess("Body mass saved. Trend confidence has fresher scale context; readiness can still be unknown.");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving body mass..." : status?.loggedToday ? "Update body mass" : "Log body mass"}</Text>
        </Pressable>
    </DailyLogFrame>
  );
}

export function ReadinessCheckInCard({ actions, busy, status }: QuickLogCardProps & { status?: DailyLogStatus | undefined }) {
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
  const [success, setSuccess] = useState<string | null>(null);

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
    <DailyLogFrame busy={busy} status={status} title={status?.loggedToday ? "Readiness summary" : "Readiness check due"}>
        <QuickLogHelp />
        <ReadinessScaleHelp />
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Sleep hours</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setSleepHours} placeholder="Sleep hours" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sleepHours} />
        <InputLabel>Sleep quality (1-5)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setSleepQuality} placeholder="Sleep quality 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sleepQuality} />
        <InputLabel>Energy (1-5)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setEnergy} placeholder="Energy 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={energy} />
        <InputLabel>Soreness (1-5)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setSoreness} placeholder="Soreness 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={soreness} />
        <InputLabel>Stress (1-5)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setStress} placeholder="Stress 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={stress} />
        <InputLabel>Mood (1-5)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setMood} placeholder="Mood 1-5" placeholderTextColor={colors.wrap} style={screenStyles.input} value={mood} />
        <InputLabel>Pain notes (optional)</InputLabel>
        <TextInput onChangeText={setPainNotes} placeholder="Pain notes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={painNotes} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={illness} busy={busy} label="Illness" onPress={() => setIllness((value) => !value)} />
          <ToggleButton active={dizziness} busy={busy} label="Dizziness" onPress={() => setDizziness((value) => !value)} />
          <ToggleButton active={fainting} busy={busy} label="Fainting" onPress={() => setFainting((value) => !value)} />
        </View>
        <Pressable
          accessibilityLabel={busy ? "Saving readiness log" : status?.loggedToday ? "Update readiness" : "Log readiness"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
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
              setSuccess("Readiness logged. CornerIQ has more confidence for today's training call.");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving readiness..." : status?.loggedToday ? "Update readiness" : "Log readiness"}</Text>
        </Pressable>
    </DailyLogFrame>
  );
}

export function HydrationLogCard({ actions, busy, status }: QuickLogCardProps & { status?: HydrationTodayStatus | undefined }) {
  const [liters, setLiters] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Hydration log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Add hydration</Text>
        <Text style={screenStyles.callout}>{status?.totalLabel ?? "Today's hydration total: add water when you have a true amount."}</Text>
        <Text style={screenStyles.subtle}>{status?.addToTodayCopy ?? "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."}</Text>
        {status ? <Text style={screenStyles.subtle}>Status: {status.statusLabel}. {status.summary}</Text> : <QuickLogHelp />}
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Water (liters)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setLiters} placeholder="Water liters" placeholderTextColor={colors.wrap} style={screenStyles.input} value={liters} />
        <InputLabel>Sodium (mg, optional)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setSodiumMg} placeholder="Sodium mg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sodiumMg} />
        <Pressable
          accessibilityLabel={busy ? "Saving hydration log" : "Add hydration"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              const sodium = parseOptionalNonNegativeNumber(sodiumMg, "Sodium");
              const payload = { liters: parseRequiredNonNegativeNumber(liters, "Water liters", { example: "2.5" }) };
              await actions.logHydration(sodium === undefined ? payload : { ...payload, sodiumMg: sodium });
              setLiters("");
              setSodiumMg("");
              setSuccess("Hydration logged. Fuel confidence has fresher fluid context; food can still be unknown.");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving hydration..." : "Add hydration"}</Text>
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
  const [success, setSuccess] = useState<string | null>(null);

  const toggleSymptom = (symptom: CycleSymptom) => {
    setSymptoms((current) => (current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]));
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Cycle</Text>
        <Text style={screenStyles.subtle}>Optional and private. Log enough for today; this is for symptoms and training context, not fertility tracking.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Flow level</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["unknown", "none", "light", "moderate", "heavy", "very_heavy"] as const).map((level) => (
            <ToggleButton active={flowLevel === level} busy={busy} key={level} label={level.replace(/_/g, " ")} onPress={() => setFlowLevel(level)} />
          ))}
        </View>
        <InputLabel>Symptoms</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {cycleSymptomOptions.slice(0, 8).map((symptom) => (
            <ToggleButton active={symptoms.includes(symptom)} busy={busy} key={symptom} label={symptom.replace(/_/g, " ")} onPress={() => toggleSymptom(symptom)} />
          ))}
        </View>
        <InputLabel>Cycle notes for today</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={bleedStart} busy={busy} label="Bleed start" onPress={() => setBleedStart((value) => !value)} />
          <ToggleButton active={bleedEnd} busy={busy} label="Bleed end" onPress={() => setBleedEnd((value) => !value)} />
          <ToggleButton active={hormonalContraception !== "unknown"} busy={busy} label="Hormonal contraception" onPress={() => setHormonalContraception((value) => (value === "unknown" ? "combined_pill" : "unknown"))} />
        </View>
        <Pressable
          accessibilityLabel={busy ? "Saving cycle log" : "Log cycle"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
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
              setSuccess("Cycle log saved. Symptom context stays private and can improve today's confidence when relevant.");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving cycle..." : "Log cycle"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function FoodQuickLogCard({ actions, busy, status }: QuickLogCardProps & { status?: FoodTodayStatus | undefined }) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Food log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Add meal/snack</Text>
        <Text style={screenStyles.body}>{status?.addEntryCopy ?? "Use this for one meal/snack or a day total. Multiple entries add up in today's context."}</Text>
        <Text style={screenStyles.subtle}>Status: {status?.statusLabel ?? "Entries add up"}. {status?.summary ?? "Add to today; this does not replace existing food entries."}</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Calories</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setCalories} placeholder="Calories" placeholderTextColor={colors.wrap} style={screenStyles.input} value={calories} />
        <InputLabel>Protein (g)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setProtein} placeholder="Protein g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={protein} />
        <InputLabel>Carbs (g)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setCarbs} placeholder="Carbs g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={carbs} />
        <InputLabel>Fat (g)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setFat} placeholder="Fat g" placeholderTextColor={colors.wrap} style={screenStyles.input} value={fat} />
        <InputLabel>Fiber (g, optional)</InputLabel>
        <TextInput keyboardType="decimal-pad" onChangeText={setFiber} placeholder="Fiber g optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={fiber} />
        <InputLabel>Sodium (mg, optional)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setSodium} placeholder="Sodium mg optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sodium} />
        <Pressable
          accessibilityLabel={busy ? "Saving food log" : "Add food entry"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
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
              setSuccess("Food logged. Fuel confidence has more intake context; missing hydration still lowers confidence when absent.");
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving food..." : status?.actionLabel ?? "Add food entry"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}

export function ProtectedWorkoutLogCard({ actions, busy }: QuickLogCardProps) {
  const [logKind, setLogKind] = useState<"completed" | "planned">("completed");
  const [type, setType] = useState<"technical_session" | "pads_mitts" | "bag_work" | "sparring" | "roadwork" | "coach_assigned_strength" | "recovery_day">("technical_session");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [sessionRpe, setSessionRpe] = useState("");
  const [rounds, setRounds] = useState("");
  const [note, setNote] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Training log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Training log</Text>
        <Text style={screenStyles.subtle}>Log enough for today. Completed sessions are history; planned anchors are protected boxing commitments.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Log type</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={logKind === "completed"} busy={busy} label="Completed session" onPress={() => setLogKind("completed")} />
          <ToggleButton active={logKind === "planned"} busy={busy} label="Planned anchor" onPress={() => setLogKind("planned")} />
        </View>
        <InputLabel>Session type</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["technical_session", "pads_mitts", "bag_work", "sparring", "roadwork", "coach_assigned_strength", "recovery_day"] as const).map((option) => (
            <ToggleButton active={type === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setType(option)} />
          ))}
        </View>
        <InputLabel>Duration (minutes)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
        <InputLabel>Session RPE (1-10)</InputLabel>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.subtle}>Use RPE instead of easy/moderate/hard labels: 1-3 easy, 4-6 moderate, 7-8 hard, 9-10 max.</Text>
          <TextInput keyboardType="number-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
        </View>
        <InputLabel>Rounds (optional)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
        <InputLabel>Note (optional)</InputLabel>
        <TextInput onChangeText={setNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={note} />
        <Pressable
          accessibilityLabel={busy ? "Saving training log" : logKind === "completed" ? "Log completed session" : "Save planned anchor"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              const parsedRounds = parseOptionalPositiveInteger(rounds, "Rounds");
              const parsedSessionRpe = parseRequiredSessionRpe(sessionRpe);
              await actions.logProtectedWorkout({
                logKind,
                type,
                durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Duration"),
                intensity: intensityFromSessionRpe(parsedSessionRpe),
                sessionRpe: parsedSessionRpe,
                ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
                ...(note.trim() ? { note: note.trim() } : {})
              });
              setDurationMinutes("");
              setSessionRpe("");
              setRounds("");
              setNote("");
              setSuccess(
                logKind === "completed"
                  ? "Training logged. Plan confidence has more real completion and RPE context."
                  : "Planned anchor saved. CornerIQ has a boxing commitment to protect when the plan refreshes."
              );
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving training..." : logKind === "completed" ? "Log completed session" : "Save planned anchor"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
