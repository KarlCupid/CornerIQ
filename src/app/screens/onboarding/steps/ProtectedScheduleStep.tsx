import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFormMessage } from "../../../forms/useFormMessage";
import { parseRequiredPositiveInteger } from "../../../forms/validation";
import { colors, spacing } from "../../../../design/theme";
import type { ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft } from "../../../../services/supabase/onboardingService";
import { screenStyles } from "../../screenStyles";
import type { OnboardingStepProps } from "./BoxerBasicsStep";
import { ChipButton, FieldGroup, LabeledTextInput } from "./StepControls";

const weekdays = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" }
] as const;

const timeOfDayOptions = ["No set time", "Morning", "Afternoon", "Evening"] as const;
const rpeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type RpeOption = (typeof rpeOptions)[number];

const anchorTypes: Array<{ label: string; value: ProtectedWorkoutDraft["type"] }> = [
  { label: "Technical session", value: "technical_session" },
  { label: "Pads or mitts", value: "pads_mitts" },
  { label: "Bag work", value: "bag_work" },
  { label: "Footwork", value: "footwork_session" },
  { label: "Coach-led sparring", value: "sparring" },
  { label: "Roadwork", value: "roadwork" },
  { label: "Coach-assigned strength", value: "coach_assigned_strength" },
  { label: "Travel", value: "travel" },
  { label: "Recovery day", value: "recovery_day" }
];

function weekdayLabel(weekday: RecurringProtectedWorkoutAnchorDraft["weekday"]): string {
  return weekdays.find((day) => day.value === weekday)?.label ?? "Weekly";
}

function humanType(type: ProtectedWorkoutDraft["type"]): string {
  return anchorTypes.find((option) => option.value === type)?.label ?? type.replace(/_/g, " ");
}

function intensityForRpe(rpe: RpeOption): ProtectedWorkoutDraft["intensity"] {
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

function rpeSummary(workout: Pick<ProtectedWorkoutDraft, "intensity" | "note">): string {
  const noteRpe = workout.note?.match(/\bRPE\s+(10|[1-9])\b/i)?.[1];
  if (noteRpe) {
    return `RPE ${noteRpe}`;
  }
  switch (workout.intensity) {
    case "easy":
      return "RPE 1-3";
    case "moderate":
      return "RPE 4-6";
    case "hard":
      return "RPE 7-8";
    case "max":
      return "RPE 9-10";
  }
}

export function ProtectedScheduleStep({ draft, updateDraft }: OnboardingStepProps) {
  const [type, setType] = useState<ProtectedWorkoutDraft["type"]>("technical_session");
  const [weekday, setWeekday] = useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>(draft.recurringProtectedSchedule?.[0]?.weekday ?? "wednesday");
  const [timeOfDay, setTimeOfDay] = useState<(typeof timeOfDayOptions)[number]>("Evening");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [rpe, setRpe] = useState<RpeOption>(6);
  const { message: error, runWithMessage } = useFormMessage("Anchor could not be added.");

  const addAnchor = () => {
    void runWithMessage(async () => {
      const dayLabel = weekdays.find((day) => day.value === weekday)?.label ?? "weekly";
      const timeNote = timeOfDay === "No set time" ? "no set time" : timeOfDay.toLowerCase();
      updateDraft((current) => ({
        ...current,
        recurringProtectedSchedule: [
          ...(current.recurringProtectedSchedule ?? []),
          {
            type,
            weekday,
            durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Anchor duration"),
            intensity: intensityForRpe(rpe),
            note: `RPE ${rpe}; weekly ${dayLabel} ${timeNote} anchor`
          }
        ]
      }));
    });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={screenStyles.sectionTitle}>Protected boxing anchors</Text>
      <Text style={screenStyles.subtle}>
        Add recurring weekly commitments the engine should protect: boxing sessions, coach-led sparring you already have, travel, or recovery days. CornerIQ does not generate sparring or contact.
      </Text>
      <Text style={screenStyles.exampleText}>Example: Tuesday evening pads, 60 min, RPE 6.</Text>
      <Text style={screenStyles.exampleText}>Example: Thursday coach-led sparring, 90 min, RPE 8.</Text>
      <Text style={screenStyles.exampleText}>Example: Sunday recovery, 30 min, RPE 2.</Text>
      {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
      {(draft.recurringProtectedSchedule ?? []).map((workout, index) => (
        <Text key={`protected-anchor:${index}`} style={screenStyles.body}>
          Every {weekdayLabel(workout.weekday)} - {humanType(workout.type)} - {workout.durationMinutes} min - {rpeSummary(workout)}
        </Text>
      ))}
      <FieldGroup helper="Choose the day this usually repeats each week." label="Day of week">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {weekdays.map((option) => (
            <ChipButton active={weekday === option.value} key={`weekday:${option.value}`} label={option.label} onPress={() => setWeekday(option.value)} />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="Optional. Use a broad time of day if exact clock time is not helpful." label="Time of day">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {timeOfDayOptions.map((option) => (
            <ChipButton active={timeOfDay === option} key={option} label={option} onPress={() => setTimeOfDay(option)} />
          ))}
        </View>
      </FieldGroup>
      <FieldGroup helper="What kind of commitment is already on your calendar?" label="Anchor type">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {anchorTypes.map((option) => (
            <ChipButton active={type === option.value} key={option.value} label={option.label} onPress={() => setType(option.value)} />
          ))}
        </View>
      </FieldGroup>
      <LabeledTextInput
        example="60"
        helper="Minutes the engine should protect before adding generated training around it."
        keyboardType="number-pad"
        label="Duration (minutes)"
        onChangeText={setDurationMinutes}
        placeholder="Duration minutes"
        value={durationMinutes}
      />
      <FieldGroup helper="RPE = how hard this session usually feels. 1 = very easy, 10 = all-out." label="RPE">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {rpeOptions.map((option) => (
            <ChipButton active={rpe === option} key={option} label={`${option}`} onPress={() => setRpe(option)} />
          ))}
        </View>
      </FieldGroup>
      <Pressable accessibilityRole="button" onPress={addAnchor} style={screenStyles.button}>
        <Text style={screenStyles.buttonText}>Add anchor</Text>
      </Pressable>
    </View>
  );
}
