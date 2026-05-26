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
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, selected: active }} disabled={busy} onPress={onPress} style={[screenStyles.chip, active ? screenStyles.chipSelected : null]}>
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

type ProtectedType = "technical_session" | "pads_mitts" | "bag_work" | "sparring" | "roadwork" | "coach_assigned_strength" | "recovery_day";

const protectedTypeOptions: readonly { label: string; value: ProtectedType }[] = [
  { label: "Technical session", value: "technical_session" },
  { label: "Pads or mitts", value: "pads_mitts" },
  { label: "Bag work", value: "bag_work" },
  { label: "Coach-led sparring", value: "sparring" },
  { label: "Roadwork", value: "roadwork" },
  { label: "Coach strength", value: "coach_assigned_strength" },
  { label: "Recovery day", value: "recovery_day" }
];

function equipmentLabel(item: string): string {
  return item
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SettingsGroup({ children, subtitle, title }: React.PropsWithChildren<{ subtitle?: string | undefined; title: string }>) {
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={screenStyles.subtle}>{subtitle}</Text> : null}
        {children}
      </View>
    </EngineCard>
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
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [protectedType, setProtectedType] = useState<ProtectedType>("technical_session");
  const [protectedDate, setProtectedDate] = useState(asOfDate);
  const [durationMinutes, setDurationMinutes] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Profile settings could not be saved.");
  const equipmentItems = equipment.split(",").map((item) => item.trim()).filter(Boolean);

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
    <View style={{ gap: spacing.lg }}>
      {error ? (
        <EngineCard>
          <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text>
        </EngineCard>
      ) : null}
      <SettingsGroup title="Cycle support" subtitle="Optional, private, and symptom-aware.">
        {cycleTrackingPreference === "enabled" && cyclePreference === "disabled" ? <Text style={screenStyles.subtle}>This hides cycle context but does not delete prior logs.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={cyclePreference === "enabled"} busy={busy} label="On" onPress={() => setCyclePreference("enabled")} />
          <OptionButton active={cyclePreference === "disabled"} busy={busy} label="Off" onPress={() => setCyclePreference("disabled")} />
          <OptionButton active={cyclePreference === "undecided"} busy={busy} label="Not sure" onPress={() => setCyclePreference("undecided")} />
        </View>
      </SettingsGroup>
      <SettingsGroup title="Wearables" subtitle="Manual input remains complete without a device.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={wearable === "manual_only"} busy={busy} label="Manual only" onPress={() => setWearable("manual_only")} />
          <OptionButton active={wearable === "wearable_connected"} busy={busy} label="Connect later" onPress={() => setWearable("wearable_connected")} />
          <OptionButton active={wearable === "undecided"} busy={busy} label="Not sure" onPress={() => setWearable("undecided")} />
        </View>
      </SettingsGroup>
      <SettingsGroup title="Units" subtitle="CornerIQ stores kg internally during this beta.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={units === "metric"} busy={busy} label="Metric" onPress={() => setUnits("metric")} />
          <OptionButton active={units === "imperial"} busy={busy} label="Imperial" onPress={() => setUnits("imperial")} />
        </View>
      </SettingsGroup>
      <SettingsGroup title="Equipment" subtitle="Shown as friendly access chips; editing stays compact.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {equipmentItems.length > 0 ? equipmentItems.map((item) => (
            <View key={`equipment:${item}`} style={screenStyles.chip}>
              <Text style={screenStyles.chipText}>{equipmentLabel(item)}</Text>
            </View>
          )) : (
            <Text style={screenStyles.subtle}>No equipment listed yet.</Text>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: equipmentOpen }} disabled={busy} onPress={() => setEquipmentOpen((value) => !value)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{equipmentOpen ? "Done editing equipment" : "Edit equipment"}</Text>
        </Pressable>
        {equipmentOpen ? <TextInput onChangeText={setEquipment} placeholder="Equipment, comma-separated" placeholderTextColor={colors.wrap} style={screenStyles.input} value={equipment} /> : null}
      </SettingsGroup>
      <SettingsGroup title="Protected boxing sessions" subtitle="Optional one-off anchor. Leave minutes blank if there is nothing to add.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {protectedTypeOptions.map((option) => (
            <OptionButton active={protectedType === option.value} busy={busy} key={option.value} label={option.label} onPress={() => setProtectedType(option.value)} />
          ))}
        </View>
        <TextInput onChangeText={setProtectedDate} placeholder="Protected anchor date YYYY-MM-DD" placeholderTextColor={colors.wrap} style={screenStyles.input} value={protectedDate} />
        <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Add protected session minutes optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
      </SettingsGroup>
      <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={screenStyles.button}>
        <Text style={screenStyles.buttonText}>Save settings</Text>
      </Pressable>
    </View>
  );
}
