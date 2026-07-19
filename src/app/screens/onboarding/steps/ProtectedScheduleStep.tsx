import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { spacing } from "../../../../design/theme";
import { fontFamilies } from "../../../../design/typography";
import type { ExistingTrainingComponent } from "../../../../engine/core/types";
import { existingTrainingDraftTitle, workoutTypeForExistingTraining, type RecurringProtectedWorkoutAnchorDraft } from "../../../../services/supabase/onboardingService";
import { onboardingColors, onboardingStyles } from "../onboardingTheme";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput, OnboardingInlineAction } from "./StepControls";

const weekdays = [
  ["Monday", "monday"], ["Tuesday", "tuesday"], ["Wednesday", "wednesday"], ["Thursday", "thursday"],
  ["Friday", "friday"], ["Saturday", "saturday"], ["Sunday", "sunday"]
] as const;

const componentOptions: readonly { label: string; value: ExistingTrainingComponent }[] = [
  { label: "Boxing", value: "boxing" },
  { label: "Sparring", value: "sparring" },
  { label: "Strength", value: "strength" },
  { label: "Conditioning", value: "conditioning" }
];

const boxingOptions = [
  ["Boxing class", "boxing_class"], ["Technical work", "technical_work"], ["Pads / mitts", "pads_mitts"],
  ["Bag work", "bag_work"], ["Footwork", "footwork"]
] as const;
const strengthOptions = [["Full body", "full_body"], ["Lower body", "lower_body"], ["Upper body", "upper_body"], ["Core / trunk", "trunk"]] as const;
const conditioningOptions = [
  ["Steady cardio", "steady_cardio"], ["Intervals", "intervals"], ["Short bursts", "short_bursts"],
  ["Timed rounds", "timed_rounds"], ["Circuit", "circuit"]
] as const;

function intensityForRpe(rpe: number): RecurringProtectedWorkoutAnchorDraft["intensity"] {
  if (rpe <= 3) return "easy";
  if (rpe <= 6) return "moderate";
  if (rpe <= 8) return "hard";
  return "max";
}

function weekdayLabel(value: RecurringProtectedWorkoutAnchorDraft["weekday"]): string {
  return weekdays.find(([, weekday]) => weekday === value)?.[0] ?? value;
}

export function ProtectedScheduleStep({ draft, setStepError, updateDraft }: OnboardingStepProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [components, setComponents] = useState<ExistingTrainingComponent[]>(["boxing"]);
  const [primaryComponent, setPrimaryComponent] = useState<ExistingTrainingComponent | null>(null);
  const [weekday, setWeekday] = useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>("monday");
  const [duration, setDuration] = useState("60");
  const [rpe, setRpe] = useState(6);
  const [boxingFormat, setBoxingFormat] = useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["boxingFormat"]>>("technical_work");
  const [strengthArea, setStrengthArea] = useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["strengthArea"]>>("full_body");
  const [conditioningFormat, setConditioningFormat] = useState<NonNullable<RecurringProtectedWorkoutAnchorDraft["conditioningFormat"]>>("steady_cardio");
  const workouts = draft.recurringProtectedSchedule ?? [];

  const toggleComponent = (component: ExistingTrainingComponent) => {
    const next = components.includes(component) ? components.filter((item) => item !== component) : [...components, component];
    if (next.length === 0) return;
    setComponents(next);
    if (primaryComponent && !next.includes(primaryComponent)) setPrimaryComponent(null);
  };

  const resetEditor = () => {
    setEditingIndex(null);
    setComponents(["boxing"]);
    setPrimaryComponent(null);
    setWeekday("monday");
    setDuration("60");
    setRpe(6);
    setBoxingFormat("technical_work");
    setStrengthArea("full_body");
    setConditioningFormat("steady_cardio");
  };

  const saveWorkout = () => {
    const durationMinutes = Number(duration);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setStepError("Enter a valid workout duration.");
      return;
    }
    const next: RecurringProtectedWorkoutAnchorDraft = {
      type: workoutTypeForExistingTraining(components, boxingFormat),
      components,
      primaryComponent: components.length > 1 ? primaryComponent : components[0] ?? null,
      weekday,
      durationMinutes,
      intensity: intensityForRpe(rpe),
      ...(components.includes("boxing") ? { boxingFormat } : {}),
      ...(components.includes("strength") ? { strengthArea } : {}),
      ...(components.includes("conditioning") ? { conditioningFormat } : {})
    };
    updateDraft((current) => {
      const currentWorkouts = [...(current.recurringProtectedSchedule ?? [])];
      if (editingIndex === null) currentWorkouts.push(next);
      else currentWorkouts[editingIndex] = { ...currentWorkouts[editingIndex], ...next };
      return { ...current, protectedScheduleChoice: "has_anchors", recurringProtectedSchedule: currentWorkouts };
    });
    setStepError(null);
    resetEditor();
  };

  const editWorkout = (index: number) => {
    const workout = workouts[index];
    if (!workout) return;
    const nextComponents = workout.components ?? ([workout.type === "sparring" ? "sparring" : "boxing"] as ExistingTrainingComponent[]);
    setEditingIndex(index);
    setComponents([...nextComponents]);
    setPrimaryComponent(workout.primaryComponent ?? null);
    setWeekday(workout.weekday);
    setDuration(String(workout.durationMinutes));
    setRpe(workout.intensity === "easy" ? 3 : workout.intensity === "moderate" ? 6 : workout.intensity === "hard" ? 8 : 10);
    setBoxingFormat(workout.boxingFormat ?? "technical_work");
    setStrengthArea(workout.strengthArea ?? "full_body");
    setConditioningFormat(workout.conditioningFormat ?? "steady_cardio");
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {workouts.map((workout, index) => (
        <View
          key={workout.id ?? `existing:${index}`}
          style={{ alignItems: "center", backgroundColor: onboardingColors.inkRaised, borderColor: onboardingColors.hairline, borderLeftColor: onboardingColors.cyan, borderLeftWidth: 4, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 70, padding: spacing.md }}
        >
          <Pressable accessibilityRole="button" onPress={() => editWorkout(index)} style={{ flex: 1 }}>
            <Text style={onboardingStyles.fieldLabel}>{weekdayLabel(workout.weekday)} · {existingTrainingDraftTitle(workout)}</Text>
            <Text style={onboardingStyles.bodyCopy}>{workout.durationMinutes} min · {workout.intensity}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Remove ${weekdayLabel(workout.weekday)} workout`}
            accessibilityRole="button"
            onPress={() => updateDraft((current) => ({ ...current, recurringProtectedSchedule: (current.recurringProtectedSchedule ?? []).filter((_, itemIndex) => itemIndex !== index) }))}
            style={{ alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.sm }}
          >
            <Text style={{ color: "#FF6A77", fontFamily: fontFamilies.bold, fontSize: 14, fontWeight: "700" }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <FieldGroup helper="Choose every part included in this workout." label="Workout includes">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {componentOptions.map((option) => <ChipButton active={components.includes(option.value)} key={option.value} label={option.label} onPress={() => toggleComponent(option.value)} />)}
        </View>
      </FieldGroup>

      {components.length > 1 ? (
        <FieldGroup helper="Choose the part that takes the most work, or leave it balanced." label="Main part">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <ChipButton active={primaryComponent === null} label="No single main part" onPress={() => setPrimaryComponent(null)} />
            {components.map((component) => <ChipButton active={primaryComponent === component} key={component} label={componentOptions.find((option) => option.value === component)?.label ?? component} onPress={() => setPrimaryComponent(component)} />)}
          </View>
        </FieldGroup>
      ) : null}

      {components.includes("boxing") ? <FieldGroup label="Boxing work"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{boxingOptions.map(([label, value]) => <ChipButton active={boxingFormat === value} key={value} label={label} onPress={() => setBoxingFormat(value)} />)}</View></FieldGroup> : null}
      {components.includes("strength") ? <FieldGroup helper="What area does the strength work mainly train?" label="Strength area"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{strengthOptions.map(([label, value]) => <ChipButton active={strengthArea === value} key={value} label={label} onPress={() => setStrengthArea(value)} />)}</View></FieldGroup> : null}
      {components.includes("conditioning") ? <FieldGroup label="Conditioning format"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{conditioningOptions.map(([label, value]) => <ChipButton active={conditioningFormat === value} key={value} label={label} onPress={() => setConditioningFormat(value)} />)}</View></FieldGroup> : null}

      <FieldGroup label="Day"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{weekdays.map(([label, value]) => <ChipButton active={weekday === value} key={value} label={label.slice(0, 3)} onPress={() => setWeekday(value)} />)}</View></FieldGroup>
      <LabeledTextInput keyboardType="number-pad" label="Total duration (minutes)" onChangeText={setDuration} placeholder="60" value={duration} />
      <FieldGroup helper="1 is very easy. 10 is an all-out effort." label="Expected effort"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{[2, 4, 6, 8, 10].map((value) => <ChipButton active={rpe === value} key={value} label={String(value)} onPress={() => setRpe(value)} />)}</View></FieldGroup>
      <OnboardingInlineAction label={editingIndex === null ? "Add workout" : "Save changes"} onPress={saveWorkout} />
      {workouts.length === 0 ? <Text style={onboardingStyles.bodyCopy}>No existing workouts is a valid schedule. You can add them later in Plan.</Text> : null}
    </View>
  );
}
