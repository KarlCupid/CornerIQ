import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ExistingBoxingFormat, ExistingConditioningFormat, ExistingStrengthArea, ExistingTrainingComponent, ISODateString, PlanViewModel, SessionIntensity } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { useFormMessage } from "../../forms/useFormMessage";
import { parseRequiredDateYYYYMMDD, parseRequiredPositiveInteger } from "../../forms/validation";
import { workoutTypeForExistingTraining, type ProtectedWorkoutDraft, type RecurringProtectedWorkoutAnchorDraft } from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";

type FixedSession = PlanViewModel["fixedSchedule"][number];
type WeeklyAnchor = PlanViewModel["weeklyAnchors"][number];
type EditorKind = "weekly" | "one_off";

const components: readonly { label: string; value: ExistingTrainingComponent }[] = [
  { label: "Boxing", value: "boxing" }, { label: "Sparring", value: "sparring" },
  { label: "Strength", value: "strength" }, { label: "Conditioning", value: "conditioning" }
];
const weekdays: readonly { label: string; value: RecurringProtectedWorkoutAnchorDraft["weekday"] }[] = [
  { label: "Mon", value: "monday" }, { label: "Tue", value: "tuesday" }, { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" }, { label: "Fri", value: "friday" }, { label: "Sat", value: "saturday" }, { label: "Sun", value: "sunday" }
];
const boxingFormats: readonly [string, ExistingBoxingFormat][] = [["Boxing class", "boxing_class"], ["Technical work", "technical_work"], ["Pads / mitts", "pads_mitts"], ["Bag work", "bag_work"], ["Footwork", "footwork"]];
const strengthAreas: readonly [string, ExistingStrengthArea][] = [["Full body", "full_body"], ["Lower body", "lower_body"], ["Upper body", "upper_body"], ["Core / trunk", "trunk"]];
const conditioningFormats: readonly [string, ExistingConditioningFormat][] = [["Steady cardio", "steady_cardio"], ["Intervals", "intervals"], ["Short bursts", "short_bursts"], ["Timed rounds", "timed_rounds"], ["Circuit", "circuit"]];
const intensities: readonly { label: string; value: SessionIntensity }[] = [{ label: "Easy", value: "easy" }, { label: "Moderate", value: "moderate" }, { label: "Hard", value: "hard" }, { label: "Max", value: "max" }];

export interface FixedBoxingScheduleCardProps {
  asOfDate: ISODateString;
  busy: boolean;
  initialIntent?: FixedBoxingScheduleInitialIntent | null | undefined;
  onDelete: (workoutId: string) => Promise<void>;
  onDeleteWeeklyAnchor: (anchorId: string) => Promise<void>;
  onSave: (workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>;
  onSaveWeeklyAnchor: (anchorId: string | null, draft: RecurringProtectedWorkoutAnchorDraft) => Promise<void>;
  sessions: readonly FixedSession[];
  weeklyAnchors: readonly WeeklyAnchor[];
}

export type FixedBoxingScheduleInitialIntent = { id: number; kind: "add_one_off" };

function Option({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}><Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text></Pressable>;
}

function ChoiceRow<TValue extends string>({ busy, options, value, onChange }: { busy: boolean; options: readonly (readonly [string, TValue])[]; value: TValue; onChange: (value: TValue) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{options.map(([label, option]) => <Option active={value === option} busy={busy} key={option} label={label} onPress={() => onChange(option)} />)}</View>;
}

export function FixedBoxingScheduleCard({ asOfDate, busy, initialIntent, onDelete, onDeleteWeeklyAnchor, onSave, onSaveWeeklyAnchor, sessions, weeklyAnchors }: FixedBoxingScheduleCardProps) {
  const [kind, setKind] = React.useState<EditorKind | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<ExistingTrainingComponent[]>(["boxing"]);
  const [primary, setPrimary] = React.useState<ExistingTrainingComponent | null>(null);
  const [boxingFormat, setBoxingFormat] = React.useState<ExistingBoxingFormat>("technical_work");
  const [strengthArea, setStrengthArea] = React.useState<ExistingStrengthArea>("full_body");
  const [conditioningFormat, setConditioningFormat] = React.useState<ExistingConditioningFormat>("steady_cardio");
  const [weekday, setWeekday] = React.useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>("monday");
  const [date, setDate] = React.useState(asOfDate);
  const [duration, setDuration] = React.useState("60");
  const [intensity, setIntensity] = React.useState<SessionIntensity>("moderate");
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const handledIntent = React.useRef<number | null>(null);
  const { message, runWithMessage } = useFormMessage("Existing workout could not be saved.");

  const reset = React.useCallback((nextKind: EditorKind | null = null) => {
    setKind(nextKind); setEditingId(null); setSelected(["boxing"]); setPrimary(null); setBoxingFormat("technical_work");
    setStrengthArea("full_body"); setConditioningFormat("steady_cardio"); setWeekday("monday"); setDate(asOfDate);
    setDuration("60"); setIntensity("moderate"); setConfirmRemove(false);
  }, [asOfDate]);

  React.useEffect(() => {
    if (initialIntent?.kind === "add_one_off" && initialIntent.id !== handledIntent.current) {
      handledIntent.current = initialIntent.id;
      reset("one_off");
    }
  }, [initialIntent?.id, initialIntent?.kind, reset]);

  const toggle = (component: ExistingTrainingComponent) => {
    const next = selected.includes(component) ? selected.filter((item) => item !== component) : [...selected, component];
    if (next.length === 0) return;
    setSelected(next);
    if (primary && !next.includes(primary)) setPrimary(null);
  };

  const loadEditor = (editorKind: EditorKind, item: FixedSession | WeeklyAnchor) => {
    const legacyComponents: ExistingTrainingComponent[] = item.type === "sparring" ? ["sparring"] : item.type === "coach_assigned_strength" || item.type === "strength" ? ["strength"] : item.type === "roadwork" || item.type === "conditioning" ? ["conditioning"] : ["boxing"];
    setKind(editorKind); setEditingId(item.id); setSelected([...(item.components ?? legacyComponents)]); setPrimary(item.primaryComponent ?? null);
    setBoxingFormat(item.boxingFormat ?? "technical_work"); setStrengthArea(item.strengthArea ?? "full_body");
    setConditioningFormat(item.conditioningFormat ?? "steady_cardio"); setDuration(String(item.durationMinutes)); setIntensity(item.intensity);
    if (editorKind === "weekly") setWeekday((item as WeeklyAnchor).weekday);
    else setDate((item as FixedSession).date);
    setConfirmRemove(false);
  };

  const details = {
    components: selected,
    primaryComponent: selected.length > 1 ? primary : selected[0] ?? null,
    ...(selected.includes("boxing") ? { boxingFormat } : {}),
    ...(selected.includes("strength") ? { strengthArea } : {}),
    ...(selected.includes("conditioning") ? { conditioningFormat } : {})
  };

  const save = () => runWithMessage(async () => {
    const durationMinutes = parseRequiredPositiveInteger(duration, "Duration");
    const type = workoutTypeForExistingTraining(selected, boxingFormat);
    if (kind === "weekly") {
      await onSaveWeeklyAnchor(editingId, { type, weekday, durationMinutes, intensity, ...details });
    } else if (kind === "one_off") {
      await onSave(editingId, { type, date: parseRequiredDateYYYYMMDD(date, "Workout date"), durationMinutes, intensity, ...details });
    }
    reset();
  });

  const remove = () => runWithMessage(async () => {
    if (!editingId || !kind) return;
    if (kind === "weekly") await onDeleteWeeklyAnchor(editingId);
    else await onDelete(editingId);
    reset();
  });

  return (
    <EngineCard>
      <View style={{ gap: spacing.lg }} testID="fixed-boxing-schedule-card">
        <View style={{ gap: spacing.xs }}><Text style={screenStyles.sectionTitle}>Existing training schedule</Text><Text style={screenStyles.body}>CornerIQ plans its workouts around training already on your calendar.</Text></View>
        {message ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{message}</Text> : null}
        <View style={{ gap: spacing.sm }}><Text style={screenStyles.fieldLabel}>Recurring workouts</Text>{weeklyAnchors.length ? weeklyAnchors.map((item) => <Pressable accessibilityRole="button" disabled={busy} key={item.id} onPress={() => loadEditor("weekly", item)} style={screenStyles.quietButton}><Text style={screenStyles.subtle}>Existing training</Text><Text style={screenStyles.quietButtonText}>{item.label}</Text><Text style={screenStyles.subtle}>{item.intensityLabel}</Text></Pressable>) : <Text style={screenStyles.subtle}>No recurring workouts yet.</Text>}</View>
        <View style={{ gap: spacing.sm }}><Text style={screenStyles.fieldLabel}>One-off changes</Text>{sessions.length ? sessions.map((item) => <Pressable accessibilityRole="button" disabled={busy} key={item.id} onPress={() => loadEditor("one_off", item)} style={screenStyles.quietButton}><Text style={screenStyles.subtle}>Existing training</Text><Text style={screenStyles.quietButtonText}>{item.label} · {item.typeLabel}</Text><Text style={screenStyles.subtle}>{item.durationMinutes} min · {item.intensityLabel}</Text></Pressable>) : <Text style={screenStyles.subtle}>No one-off workouts yet.</Text>}</View>
        {kind === null ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}><Pressable accessibilityRole="button" disabled={busy} onPress={() => reset("weekly")} style={[screenStyles.button, { flexGrow: 1 }]}><Text style={screenStyles.buttonText}>Add recurring workout</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => reset("one_off")} style={[screenStyles.quietButton, { flexGrow: 1 }]}><Text style={screenStyles.quietButtonText}>Add one-off workout</Text></Pressable></View> : (
          <View style={{ gap: spacing.md }} testID="existing-training-editor">
            <Text style={screenStyles.callout}>{editingId ? "Edit workout" : kind === "weekly" ? "Add recurring workout" : "Add one-off workout"}</Text>
            <Text style={screenStyles.fieldLabel}>Workout includes</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{components.map((option) => <Option active={selected.includes(option.value)} busy={busy} key={option.value} label={option.label} onPress={() => toggle(option.value)} />)}</View>
            {selected.length > 1 ? <><Text style={screenStyles.fieldLabel}>Main part</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}><Option active={primary === null} busy={busy} label="No single main part" onPress={() => setPrimary(null)} />{selected.map((component) => <Option active={primary === component} busy={busy} key={component} label={components.find((item) => item.value === component)?.label ?? component} onPress={() => setPrimary(component)} />)}</View></> : null}
            {selected.includes("boxing") ? <><Text style={screenStyles.fieldLabel}>Boxing work</Text><ChoiceRow busy={busy} onChange={setBoxingFormat} options={boxingFormats} value={boxingFormat} /></> : null}
            {selected.includes("strength") ? <><Text style={screenStyles.fieldLabel}>Strength area</Text><ChoiceRow busy={busy} onChange={setStrengthArea} options={strengthAreas} value={strengthArea} /></> : null}
            {selected.includes("conditioning") ? <><Text style={screenStyles.fieldLabel}>Conditioning format</Text><ChoiceRow busy={busy} onChange={setConditioningFormat} options={conditioningFormats} value={conditioningFormat} /></> : null}
            {kind === "weekly" ? <><Text style={screenStyles.fieldLabel}>Day</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{weekdays.map((option) => <Option active={weekday === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setWeekday(option.value)} />)}</View></> : <TextInput accessibilityLabel="Workout date" onChangeText={setDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={date} />}
            <TextInput accessibilityLabel="Total duration in minutes" keyboardType="number-pad" onChangeText={setDuration} placeholder="Total duration in minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={duration} />
            <Text style={screenStyles.fieldLabel}>Expected effort</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{intensities.map((option) => <Option active={intensity === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setIntensity(option.value)} />)}</View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}><Pressable accessibilityRole="button" disabled={busy} onPress={save} style={[screenStyles.button, { flexGrow: 1 }]}><Text style={screenStyles.buttonText}>Save workout</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => reset()} style={[screenStyles.quietButton, { flexGrow: 1 }]}><Text style={screenStyles.quietButtonText}>Cancel</Text></Pressable></View>
            {editingId ? <Pressable accessibilityRole="button" disabled={busy} onPress={confirmRemove ? remove : () => setConfirmRemove(true)} style={screenStyles.quietButton}><Text style={[screenStyles.quietButtonText, { color: colors.redCorner }]}>{confirmRemove ? "Confirm remove workout" : "Remove workout"}</Text></Pressable> : null}
          </View>
        )}
      </View>
    </EngineCard>
  );
}
