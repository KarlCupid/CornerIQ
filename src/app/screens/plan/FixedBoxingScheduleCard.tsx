import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ISODateString, PlanViewModel } from "../../../engine/core/types";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { useFormMessage } from "../../forms/useFormMessage";
import { parseOptionalNonNegativeInteger, parseRequiredDateYYYYMMDD, parseRequiredPositiveInteger, parseRequiredTimeHHMM } from "../../forms/validation";
import type { ProtectedWorkoutDraft } from "../../../services/supabase/onboardingService";
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
  { label: "Coach strength", value: "coach_assigned_strength" },
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

export interface FixedBoxingScheduleCardProps {
  asOfDate: ISODateString;
  busy: boolean;
  onDelete: (workoutId: string) => Promise<void>;
  onSave: (workoutId: string | null, draft: ProtectedWorkoutDraft) => Promise<void>;
  sessions: readonly FixedSession[];
  weeklyAnchors: readonly WeeklyAnchor[];
}

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

export function FixedBoxingScheduleCard({ asOfDate, busy, onDelete, onSave, sessions, weeklyAnchors }: FixedBoxingScheduleCardProps) {
  const [editing, setEditing] = React.useState<FixedSession | null>(null);
  const [mode, setMode] = React.useState<"idle" | "add" | "edit">("idle");
  const [type, setType] = React.useState<ProtectedWorkoutDraft["type"]>("technical_session");
  const [date, setDate] = React.useState(asOfDate);
  const [startTime, setStartTime] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("60");
  const [intensity, setIntensity] = React.useState<ProtectedWorkoutDraft["intensity"]>("moderate");
  const [rounds, setRounds] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmRemove, setConfirmRemove] = React.useState(false);
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

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }} testID="fixed-boxing-schedule-card">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.sectionTitle}>Fixed boxing schedule</Text>
          <Text style={screenStyles.body}>CornerIQ builds generated training around these first.</Text>
        </View>
        {formError ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{formError}</Text> : null}
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Weekly anchors</Text>
          {weeklyAnchors.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {weeklyAnchors.map((anchor) => (
                <View
                  key={anchor.id}
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
                </View>
              ))}
            </View>
          ) : (
            <Text style={screenStyles.subtle}>No weekly anchors are scheduled yet.</Text>
          )}
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.fieldLabel}>Upcoming protected sessions</Text>
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
