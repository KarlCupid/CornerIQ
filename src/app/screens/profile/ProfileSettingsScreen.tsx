import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, spacing } from "../../../design/theme";
import { formatEquipmentAccessLabel, normalizeEquipmentAccess } from "../../../engine/athlete/equipmentAccess";
import type { ISODateString } from "../../../engine/core/types";
import type { ProfileSettingsDraft } from "../../../services/supabase/onboardingService";
import { BOXING_EQUIPMENT_OPTIONS, toggleEquipmentSelection } from "../equipmentOptions";
import { screenStyles } from "../screenStyles";

export interface ProfileSettingsScreenProps {
  asOfDate?: ISODateString | undefined;
  busy: boolean;
  cycleTrackingPreference: "enabled" | "disabled" | "undecided";
  equipmentAccess: readonly string[];
  initialPage?: "equipment" | "overview" | undefined;
  onClose?: (() => void) | undefined;
  onOpenPlan?: (() => void) | undefined;
  onUpdateSettings: (draft: ProfileSettingsDraft) => Promise<void>;
  preferredUnits: "metric" | "imperial";
  wearablePreference?: "manual_only" | "wearable_connected" | "undecided" | undefined;
}

function OptionButton({ active, busy, icon, label, onPress }: { active: boolean; busy: boolean; icon?: keyof typeof Ionicons.glyphMap | undefined; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={[screenStyles.chip, active ? screenStyles.chipSelected : null, { flexDirection: "row", gap: spacing.sm, minHeight: 48 }]}
    >
      {icon ? <Ionicons color={active ? colors.blueIQ : colors.mutedText} name={icon} size={18} /> : null}
      <Text style={[screenStyles.chipText, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
      {active ? <Ionicons color={colors.blueIQ} name="checkmark-circle" size={18} /> : null}
    </Pressable>
  );
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
  busy,
  cycleTrackingPreference,
  equipmentAccess,
  initialPage = "overview",
  onClose,
  onOpenPlan,
  onUpdateSettings,
  preferredUnits
}: ProfileSettingsScreenProps) {
  const [cyclePreference, setCyclePreference] = useState(cycleTrackingPreference);
  const [units, setUnits] = useState(preferredUnits);
  const [page, setPage] = useState<"equipment" | "overview">(initialPage);
  const selectableValues = new Set<string>(BOXING_EQUIPMENT_OPTIONS.map((option) => option.value));
  const initialEquipment = normalizeEquipmentAccess(equipmentAccess).filter((item) => selectableValues.has(item));
  const [equipment, setEquipment] = useState<readonly string[]>(initialEquipment);
  const { message: error, runWithMessage } = useFormMessage("Profile settings could not be saved.");

  const saveDraft = async (equipmentDraft: readonly string[]) => {
    await runWithMessage(async () => {
      if (equipmentDraft.length === 0) {
        throw new Error("Choose at least one equipment option. Pick Bodyweight only if that is your current setup.");
      }
      await onUpdateSettings({
        cycleTrackingPreference: cyclePreference,
        preferredUnits: units,
        equipmentAccess: [...equipmentDraft]
      });
      onClose?.();
    });
  };

  if (page === "equipment") {
    return (
      <View style={{ gap: spacing.lg }} testID="profile-equipment-wizard">
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.title}>Equipment access</Text>
          <Text style={screenStyles.body}>Choose what you can reliably use. These are the same choices used during onboarding.</Text>
        </View>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        <View style={{ gap: spacing.sm }}>
          {BOXING_EQUIPMENT_OPTIONS.map((option) => (
            <OptionButton
              active={equipment.includes(option.value)}
              busy={busy}
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => setEquipment((current) => toggleEquipmentSelection(current, option.value))}
            />
          ))}
        </View>
        {equipment.length === 0 ? <Text style={[screenStyles.subtle, { color: colors.amberCaution }]}>Choose at least one option before saving.</Text> : null}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPage("overview")} style={[screenStyles.quietButton, { flex: 1 }]}>
            <Text style={screenStyles.quietButtonText}>Back</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || equipment.length === 0 }} disabled={busy || equipment.length === 0} onPress={() => void saveDraft(equipment)} style={[screenStyles.button, { flex: 1, opacity: busy || equipment.length === 0 ? 0.5 : 1 }]}>
            <Text style={screenStyles.buttonText}>Save equipment</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }} testID="profile-settings-overview">
      <View style={{ gap: spacing.xs }}>
        <Text style={screenStyles.title}>Edit setup</Text>
        <Text style={screenStyles.body}>Update the preferences that shape how CornerIQ displays and builds your plan.</Text>
      </View>
      {error ? (
        <EngineCard>
          <Text style={screenStyles.sectionTitle}>Settings message</Text>
          <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text>
        </EngineCard>
      ) : null}
      <SettingsGroup title="Units" subtitle="Your display preference. Calculations remain consistent behind the scenes.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={units === "metric"} busy={busy} label="Metric" onPress={() => setUnits("metric")} />
          <OptionButton active={units === "imperial"} busy={busy} label="Imperial" onPress={() => setUnits("imperial")} />
        </View>
      </SettingsGroup>
      <SettingsGroup title="Cycle support" subtitle="Optional, private, and symptom-aware.">
        {cycleTrackingPreference === "enabled" && cyclePreference === "disabled" ? <Text style={screenStyles.subtle}>Turning this off hides cycle context but does not delete prior logs.</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <OptionButton active={cyclePreference === "enabled"} busy={busy} label="On" onPress={() => setCyclePreference("enabled")} />
          <OptionButton active={cyclePreference === "disabled"} busy={busy} label="Off" onPress={() => setCyclePreference("disabled")} />
          <OptionButton active={cyclePreference === "undecided"} busy={busy} label="Not sure" onPress={() => setCyclePreference("undecided")} />
        </View>
      </SettingsGroup>
      <SettingsGroup title="Equipment" subtitle="Your current reliable access.">
        <Text style={screenStyles.body}>
          {equipmentAccess.length > 0 ? equipmentAccess.map(formatEquipmentAccessLabel).join(" · ") : "No equipment selected"}
        </Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPage("equipment")} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>Edit equipment</Text>
        </Pressable>
      </SettingsGroup>
      <SettingsGroup title="Training plan" subtitle="Goals, schedule, and recurring sessions live in Plan.">
        <Pressable accessibilityRole="button" disabled={busy || !onOpenPlan} onPress={onOpenPlan} style={[screenStyles.quietButton, { opacity: busy || !onOpenPlan ? 0.5 : 1 }]}>
          <Text style={screenStyles.quietButtonText}>Open Plan</Text>
        </Pressable>
      </SettingsGroup>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {onClose ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={[screenStyles.quietButton, { flex: 1 }]}>
            <Text style={screenStyles.quietButtonText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void saveDraft(equipmentAccess)} style={[screenStyles.button, { flex: 1, opacity: busy ? 0.5 : 1 }]}>
          <Text style={screenStyles.buttonText}>Save settings</Text>
        </Pressable>
      </View>
    </View>
  );
}
