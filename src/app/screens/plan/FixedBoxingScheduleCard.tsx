import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { useFormMessage } from "../../forms/useFormMessage";
import { parseOptionalNonNegativeInteger, parseRequiredDateYYYYMMDD, parseRequiredPositiveInteger, parseRequiredTimeHHMM } from "../../forms/validation";
import type { ProtectedWorkoutDraft, RecurringProtectedWorkoutAnchorDraft } from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";

type FixedSession = PlanViewModel["fixedSchedule"][number];
type WeeklyAnchor = PlanViewModel["weeklyAnchors"][number];

const typeOptions: readonly { label: string; value: ProtectedWorkoutDraft["type"] }[] = [
  { label: "Boxing class", value: "boxing_class" },
  { label: "Technical session", value: "technical_session" },
  { label: "Pads / mitts", value: "pads_mitts" },
  { label: "Bag work", value: "bag_work" },
  { label: "Footwork", value: "footwork_session" },
  { label: "Sparring", value: "sparring" },
  { label: "Roadwork", value: "roadwork" },
  { label: "Assigned strength", value: "coach_assigned_strength" },
  { label: "Competition", value: "competition" },
  { label: "Travel", value: "travel" },
  { label: "Recovery day", value: "recovery_day" }
];

const intensityOptions: readonly { label: string; value: ProtectedWorkoutDraft["intensity"] }[] = [
  { label: "Easy", value: "easy" },
  { label: "Moderate", value: "moderate" },
  { label: "Hard", value: "hard" },
  { label: "Max", value: "max" }
];

const weekdayOptions: readonly { label: string; value: RecurringProtectedWorkoutAnchorDraft["weekday"] }[] = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" }
];

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

export type FixedBoxingScheduleInitialIntent = {
  id: number;
  kind: "add_one_off";
};

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}>
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function parseOptionalTime(value: string): string | undefined {
  return value.trim() ? parseRequiredTimeHHMM(value, "Start time") : undefined;
}

export function FixedBoxingScheduleCard({ asOfDate, busy, initialIntent, onDelete, onDeleteWeeklyAnchor, onSave, onSaveWeeklyAnchor, sessions, weeklyAnchors }: FixedBoxingScheduleCardProps) {
  const [editing, setEditing] = React.useState<FixedSession | null>(null);
  const [weeklyEditing, setWeeklyEditing] = React.useState<WeeklyAnchor | null>(null);
  const [mode, setMode] = React.useState<"idle" | "add" | "edit">("idle");
  const [type, setType] = React.useState<ProtectedWorkoutDraft["type"]>("technical_session");
  const [date, setDate] = React.useState(asOfDate);
  const [startTime, setStartTime] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("60");
  const [intensity, setIntensity] = React.useState<ProtectedWorkoutDraft["intensity"]>("moderate");
  const [rounds, setRounds] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [weeklyType, setWeeklyType] = React.useState<RecurringProtectedWorkoutAnchorDraft["type"]>("technical_session");
  const [weeklyWeekday, setWeeklyWeekday] = React.useState<RecurringProtectedWorkoutAnchorDraft["weekday"]>("monday");
  const [weeklyStartTime, setWeeklyStartTime] = React.useState("");
  const [weeklyDurationMinutes, setWeeklyDurationMinutes] = React.useState("60");
  const [weeklyIntensity, setWeeklyIntensity] = React.useState<RecurringProtectedWorkoutAnchorDraft["intensity"]>("moderate");
  const [weeklyRounds, setWeeklyRounds] = React.useState("");
  const [weeklyNote, setWeeklyNote] = React.useState("");
  const [confirmRemoveWeekly, setConfirmRemoveWeekly] = React.useState(false);
  const handledInitialIntentIdRef = React.useRef<number | null>(null);
  const { message: formError, runWithMessage } = useFormMessage("Fixed boxing session could not be saved.");

  const resetForAdd = () => {
    setEditing(null);
    setMode("add");
    setType("technical_session");
    setDate(asOfDate);
    setStartTime("");
    setDurationMinutes("60");
    setIntensity("moderate");
    setRounds("");
    setNote("");
    setConfirmRemove(false);
  };

  React.useEffect(() => {
    if (initialIntent?.kind !== "add_one_off" || initialIntent.id === handledInitialIntentIdRef.current) {
      return;
    }
    handledInitialIntentIdRef.current = initialIntent.id;
    resetForAdd();
  }, [asOfDate, initialIntent?.id, initialIntent?.kind]);

  const editSession = (session: FixedSession) => {
    setEditing(session);
    setMode("edit");
    const editableType = typeOptions.find((option) => option.value === session.type)?.value ?? "technical_session";
    setType(editableType);
    setDate(session.date);
    setStartTime(session.startTime ?? "");
    setDurationMinutes(`${session.durationMinutes}`);
    setIntensity(session.intensity);
    setRounds(session.rounds === null ? "" : `${session.rounds}`);
    setNote(session.note ?? "");
    setConfirmRemove(false);
  };

  const cancel = () => {
    setEditing(null);
    setMode("idle");
    setConfirmRemove(false);
  };

  const editWeeklyAnchor = (anchor: WeeklyAnchor) => {
    setWeeklyEditing(anchor);
    setWeeklyType(anchor.type);
    setWeeklyWeekday(anchor.weekday);
    setWeeklyStartTime(anchor.startTime ?? "");
    setWeeklyDurationMinutes(`${anchor.durationMinutes}`);
    setWeeklyIntensity(anchor.intensity);
    setWeeklyRounds(anchor.rounds === null ? "" : `${anchor.rounds}`);
    setWeeklyNote(anchor.note ?? "");
    setConfirmRemoveWeekly(false);
  };

  const cancelWeekly = () => {
    setWeeklyEditing(null);
    setConfirmRemoveWeekly(false);
  };

  const save = async () => {
    await runWithMessage(async () => {
      const parsedStartTime = parseOptionalTime(startTime);
      const parsedRounds = parseOptionalNonNegativeInteger(rounds, "Rounds");
      const trimmedNote = note.trim();
      await onSave(mode === "edit" ? editing?.id ?? null : null, {
        type,
        date: parseRequiredDateYYYYMMDD(date, "Session date"),
        ...(parsedStartTime ? { startTime: parsedStartTime, localStartTime: parsedStartTime } : {}),
        durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Duration minutes"),
        intensity,
        ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
        ...(trimmedNote ? { note: trimmedNote } : {})
      });
      cancel();
    });
  };

  const remove = async () => {
    if (!editing) {
      return;
    }
    await runWithMessage(async () => {
      await onDelete(editing.id);
      cancel();
    });
  };

  const saveWeekly = async () => {
    if (!weeklyEditing) {
      return;
    }
    await runWithMessage(async () => {
      const parsedStartTime = parseOptionalTime(weeklyStartTime);
      const parsedRounds = parseOptionalNonNegativeInteger(weeklyRounds, "Rounds");
      const trimmedNote = weeklyNote.trim();
      await onSaveWeeklyAnchor(weeklyEditing.id, {
        type: weeklyType,
        weekday: weeklyWeekday,
        ...(parsedStartTime ? { localStartTime: parsedStartTime } : {}),
        durationMinutes: parseRequiredPositiveInteger(weeklyDurationMinutes, "Duration minutes"),
        intensity: weeklyIntensity,
        ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
        ...(trimmedNote ? { note: trimmedNote } : {}),
        ...(weeklyEditing.activeFrom ? { activeFrom: weeklyEditing.activeFrom } : {}),
        ...(weeklyEditing.activeUntil ? { activeUntil: weeklyEditing.activeUntil } : {})
      });
      cancelWeekly();
    });
  };

  const removeWeekly = async () => {
    if (!weeklyEditing) {
      return;
    }
    await runWithMessage(async () => {
      await onDeleteWeeklyAnchor(weeklyEditing.id);
      cancelWeekly();
    });
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fixed-boxing-schedule-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Fixed boxing schedule</Text>
          <Text style={screenStyles.body}>CornerIQ builds support workouts around these first.</Text>
        </View>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Weekly boxing sessions</Text>
          {weeklyAnchors.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {weeklyAnchors.map((anchor) => (
                <Pressable
                  accessibilityLabel={`Edit weekly ${anchor.typeLabel} on ${anchor.weekday}`}
                  accessibilityRole="button"
                  disabled={busy}
                  key={anchor.id}
                  onPress={() => editWeeklyAnchor(anchor)}
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.10)",
                    borderRadius: 18,
                    borderWidth: 1,
                    gap: spacing.xs,
                    minHeight: 58,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm
                  }}
                >
                  <Text numberOfLines={1} style={screenStyles.fieldLabel}>{anchor.label}</Text>
                  <Text numberOfLines={1} style={screenStyles.subtle}>{anchor.intensityLabel}{anchor.rounds ? `, ${anchor.rounds} rounds` : ""}</Text>
                  <Text numberOfLines={1} style={screenStyles.subtle}>Tap to edit or remove weekly session.</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={screenStyles.subtle}>No weekly boxing sessions are scheduled yet.</Text>
          )}
        </View>
        {weeklyEditing ? (
          <View style={{ gap: spacing.sm }} testID="weekly-anchor-editor">
            <Text style={screenStyles.callout}>Edit weekly session</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {typeOptions.map((option) => <OptionButton active={weeklyType === option.value} busy={busy} key={`weekly-type:${option.value}`} label={option.label} onPress={() => setWeeklyType(option.value)} />)}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {weekdayOptions.map((option) => <OptionButton active={weeklyWeekday === option.value} busy={busy} key={`weekly-day:${option.value}`} label={option.label} onPress={() => setWeeklyWeekday(option.value)} />)}
            </View>
            <TextInput keyboardType="number-pad" onChangeText={setWeeklyStartTime} placeholder="Time optional HH:MM" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weeklyStartTime} />
            <TextInput keyboardType="number-pad" onChangeText={setWeeklyDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weeklyDurationMinutes} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {intensityOptions.map((option) => <OptionButton active={weeklyIntensity === option.value} busy={busy} key={`weekly-intensity:${option.value}`} label={option.label} onPress={() => setWeeklyIntensity(option.value)} />)}
            </View>
            <TextInput keyboardType="number-pad" onChangeText={setWeeklyRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weeklyRounds} />
            <TextInput onChangeText={setWeeklyNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={weeklyNote} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={saveWeekly} style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}>
                <Text style={screenStyles.buttonText}>Save weekly session</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={cancelWeekly} style={[screenStyles.quietButton, { flexBasis: 120, flexGrow: 1 }]}>
                <Text style={screenStyles.quietButtonText}>Cancel</Text>
              </Pressable>
            </View>
            {confirmRemoveWeekly ? <Text style={screenStyles.subtle}>Remove this weekly session?</Text> : null}
            <Pressable accessibilityRole="button" disabled={busy} onPress={confirmRemoveWeekly ? removeWeekly : () => setConfirmRemoveWeekly(true)} style={screenStyles.quietButton}>
              <Text style={[screenStyles.quietButtonText, { color: colors.redCorner }]}>{confirmRemoveWeekly ? "Confirm remove weekly session" : "Remove weekly session"}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Upcoming boxing sessions</Text>
          {sessions.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {sessions.map((session) => (
                <Pressable
                  accessibilityLabel={`Edit ${session.typeLabel} on ${session.date}`}
                  accessibilityRole="button"
                  disabled={busy}
                  key={session.id}
                  onPress={() => editSession(session)}
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.10)",
                    borderRadius: 18,
                    borderWidth: 1,
                    gap: spacing.xs,
                    minHeight: 58,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm
                  }}
                >
                  <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                    <Text numberOfLines={1} style={screenStyles.fieldLabel}>{session.label}{session.startTime ? `, ${session.startTime}` : ""}</Text>
                    <Text numberOfLines={1} style={screenStyles.subtle}>{session.durationMinutes} min</Text>
                  </View>
                  <Text numberOfLines={1} style={screenStyles.body}>{session.typeLabel}</Text>
                  <Text numberOfLines={1} style={screenStyles.subtle}>{session.intensityLabel}{session.rounds ? `, ${session.rounds} rounds` : ""}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={screenStyles.subtle}>No upcoming dated sessions are scheduled yet.</Text>
          )}
        </View>
        {mode === "idle" ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={resetForAdd} style={screenStyles.button}>
            <Text style={screenStyles.buttonText}>Add one-off session</Text>
          </Pressable>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={screenStyles.callout}>{mode === "edit" ? "Edit fixed session" : "Add one-off session"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {typeOptions.map((option) => <OptionButton active={type === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setType(option.value)} />)}
            </View>
            <TextInput onChangeText={setDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={date} />
            <TextInput keyboardType="number-pad" onChangeText={setStartTime} placeholder="Time optional HH:MM" placeholderTextColor={colors.wrap} style={screenStyles.input} value={startTime} />
            <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {intensityOptions.map((option) => <OptionButton active={intensity === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setIntensity(option.value)} />)}
            </View>
            <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
            <TextInput onChangeText={setNote} placeholder="Note optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={note} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={[screenStyles.button, { flexBasis: 150, flexGrow: 1 }]}>
                <Text style={screenStyles.buttonText}>{mode === "edit" ? "Save changes" : "Save session"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={cancel} style={[screenStyles.quietButton, { flexBasis: 120, flexGrow: 1 }]}>
                <Text style={screenStyles.quietButtonText}>Cancel</Text>
              </Pressable>
            </View>
            {mode === "edit" ? (
              <View style={{ gap: spacing.sm }}>
                {confirmRemove ? <Text style={screenStyles.subtle}>Remove this fixed boxing session?</Text> : null}
                <Pressable accessibilityRole="button" disabled={busy} onPress={confirmRemove ? remove : () => setConfirmRemove(true)} style={screenStyles.quietButton}>
                  <Text style={[screenStyles.quietButtonText, { color: colors.redCorner }]}>{confirmRemove ? "Confirm remove" : "Remove session"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </EngineCard>
  );
}
