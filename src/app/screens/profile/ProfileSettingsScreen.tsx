import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import { parseRequiredDateYYYYMMDD, parseRequiredPositiveInteger } from "../../forms/validation";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import type { ISODateString } from "../../../engine/core/types";
import type { ProfileSettingsDraft } from "../../../services/supabase/onboardingService";
import { screenStyles } from "../screenStyles";

export interface ProfileSettingsScreenProps {
  asOfDate: ISODateString;
  busy: boolean;
  cycleTrackingPreference: "enabled" | "disabled" | "undecided";
  equipmentAccess: readonly string[];
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "metric" | "imperial";
  wearablePreference: "manual_only" | "wearable_connected" | "undecided";
}

function OptionButton({ active, busy, label, onPress }: { active: boolean; busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[screenStyles.quietButton, active ? { borderColor: colors.blueIQ } : null]}>
      <Text style={screenStyles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

export function ProfileSettingsScreen({
  asOfDate,
  busy,
  cycleTrackingPreference,
  equipmentAccess,
  onUpdateSettings,
  preferredUnits,
  wearablePreference
}: ProfileSettingsScreenProps) {
  const [cyclePreference, setCyclePreference] = useState(cycleTrackingPreference);
  const [wearable, setWearable] = useState(wearablePreference);
  const [units, setUnits] = useState(preferredUnits);
  const [equipment, setEquipment] = useState(equipmentAccess.join(", "));
  const [protectedType, setProtectedType] = useState<"technical_session" | "pads_mitts" | "bag_work" | "sparring" | "roadwork" | "coach_assigned_strength" | "recovery_day">("technical_session");
  const [protectedDate, setProtectedDate] = useState(asOfDate);
  const [durationMinutes, setDurationMinutes] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Profile settings could not be saved.");

  const save = async () => {
    await runWithMessage(async () => {
      const equipmentAccessDraft = equipment.split(",").map((item) => item.trim()).filter(Boolean);
      if (equipmentAccessDraft.length === 0) {
        throw new Error("Equipment access is required. Enter none/bodyweight if that is the honest setup.");
      }
      const protectedWorkout =
        durationMinutes.trim().length > 0
          ? {
              type: protectedType,
              date: parseRequiredDateYYYYMMDD(protectedDate, "Protected anchor date"),
              durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Protected anchor duration"),
              intensity: "moderate" as const,
              note: "Profile schedule edit"
            }
          : undefined;
      await onUpdateSettings({
        cycleTrackingPreference: cyclePreference,
        wearablePreference: wearable,
        preferredUnits: units,
        equipmentAccess: equipmentAccessDraft,
        ...(protectedWorkout ? { protectedWorkout } : {})
      });
      setDurationMinutes("");
    });
  };

  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Settings</Text>
        <Text style={screenStyles.subtle}>Cycle support is optional and private. Manual input stays complete. If imperial is selected, CornerIQ still stores kg internally for now.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {cycleTrackingPreference === "enabled" && cyclePreference === "disabled" ? <Text style={screenStyles.subtle}>This hides cycle context but does not delete prior logs.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["enabled", "disabled", "undecided"] as const).map((option) => (
            <OptionButton active={cyclePreference === option} busy={busy} key={option} label={`Cycle ${option}`} onPress={() => setCyclePreference(option)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={wearable === "manual_only"} busy={busy} label="Manual only" onPress={() => setWearable("manual_only")} />
          <OptionButton active={wearable === "wearable_connected"} busy={busy} label="Connect later" onPress={() => setWearable("wearable_connected")} />
          <OptionButton active={wearable === "undecided"} busy={busy} label="Wearable undecided" onPress={() => setWearable("undecided")} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["metric", "imperial"] as const).map((option) => (
            <OptionButton active={units === option} busy={busy} key={option} label={option} onPress={() => setUnits(option)} />
          ))}
        </View>
        <TextInput onChangeText={setEquipment} placeholder="Equipment, comma-separated" placeholderTextColor={colors.wrap} style={screenStyles.input} value={equipment} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["technical_session", "pads_mitts", "bag_work", "sparring", "roadwork", "coach_assigned_strength", "recovery_day"] as const).map((option) => (
            <OptionButton active={protectedType === option} busy={busy} key={option} label={option.replace(/_/g, " ")} onPress={() => setProtectedType(option)} />
          ))}
        </View>
        <TextInput onChangeText={setProtectedDate} placeholder="Protected anchor date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={protectedDate} />
        <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Add protected session minutes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>Save settings</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
