import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import type {
  ProfileCommandCenterViewModel,
  ProfileIdentityViewModel,
  ProfileLedgerItemViewModel,
  ProfileMetricViewModel,
  ProfileSignalViewModel,
  ProfileViewModel,
  ProfileVisualTone
} from "../../../engine/core/types";
import { glassStyles } from "../../../design/glass";
import { useLuminousScreenTheme } from "../../../design/luminousTheme";
import { colors, radii, spacing } from "../../../design/theme";
import { typography } from "../../../design/typography";
import { DashboardCard, DashboardPill } from "../../../design/components/PerformanceVisuals";
import { screenStyles } from "../screenStyles";

const toneColors: Record<ProfileVisualTone, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  muted: colors.mutedText,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

const toneWash: Record<ProfileVisualTone, string> = {
  blue: "rgba(39, 206, 241, 0.15)",
  gold: "rgba(255, 216, 97, 0.15)",
  green: "rgba(56, 226, 138, 0.14)",
  muted: "rgba(183, 196, 217, 0.11)",
  orange: "rgba(255, 148, 72, 0.15)",
  purple: "rgba(150, 87, 245, 0.15)",
  red: "rgba(255, 82, 101, 0.16)"
};

const metricIcons: readonly (keyof typeof Ionicons.glyphMap)[] = [
  "person-circle-outline",
  "analytics-outline",
  "finger-print-outline",
  "shield-checkmark-outline"
];

const signalIcons: readonly (keyof typeof Ionicons.glyphMap)[] = [
  "pulse-outline",
  "scale-outline",
  "restaurant-outline",
  "watch-outline",
  "lock-closed-outline",
  "barbell-outline"
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function progressWidth(ratio: number): `${number}%` {
  return `${Math.max(6, Math.round(clamp01(ratio) * 100))}%`;
}

function ToneIcon({
  color,
  name,
  size = 17
}: {
  color: string;
  name: keyof typeof Ionicons.glyphMap;
  size?: number | undefined;
}) {
  return <Ionicons color={color} name={name} size={size} />;
}

function GlowLine({ tone }: { tone: ProfileVisualTone }) {
  return (
    <View
      style={{
        backgroundColor: toneColors[tone],
        borderRadius: radii.pill,
        height: 3,
        opacity: 0.92,
        width: 44
      }}
    />
  );
}

function OrbitRing({
  command
}: {
  command: ProfileCommandCenterViewModel;
}) {
  const size = 172;
  const segmentCount = 44;
  const filled = Math.round(clamp01((command.score ?? 0) / 100) * segmentCount);
  const radius = size / 2 - 10;
  return (
    <View
      accessibilityLabel={`Command clarity ${command.scoreLabel}. ${command.statusLabel}`}
      style={{
        alignItems: "center",
        height: size,
        justifyContent: "center",
        width: size
      }}
      testID="profile-command-core"
    >
      {Array.from({ length: segmentCount }).map((_, index) => {
        const angle = -90 + (360 * index) / segmentCount;
        const radians = (angle * Math.PI) / 180;
        const active = index < filled;
        const metricTone = command.metrics[index % Math.max(1, command.metrics.length)]?.tone ?? command.tone;
        const tone = active ? metricTone : "muted";
        return (
          <View
            key={`profile-orbit:${index}`}
            style={{
              backgroundColor: active ? toneColors[tone] : "rgba(255, 255, 255, 0.11)",
              borderRadius: radii.pill,
              height: active ? 18 : 12,
              left: size / 2 + Math.cos(radians) * radius - 2,
              opacity: active ? 0.95 : 0.55,
              position: "absolute",
              top: size / 2 + Math.sin(radians) * radius - 8,
              transform: [{ rotate: `${angle + 90}deg` }],
              width: 4
            }}
          />
        );
      })}
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(7, 11, 24, 0.82)",
          borderColor: `${toneColors[command.tone]}66`,
          borderRadius: 58,
          borderWidth: 1,
          gap: 2,
          height: 116,
          justifyContent: "center",
          width: 116
        }}
      >
        <Text style={{ color: toneColors[command.tone], fontSize: 42, fontWeight: "900", lineHeight: 48 }}>{command.scoreLabel}</Text>
        <Text numberOfLines={2} style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16, maxWidth: 88, textAlign: "center" }}>
          {command.statusLabel}
        </Text>
      </View>
    </View>
  );
}

function IdentityPanel({ identity }: { identity: ProfileIdentityViewModel }) {
  const facts = [
    { label: "Phase", value: identity.phaseLabel, tone: "blue" as const },
    { label: "Goal", value: identity.objectiveLabel, tone: "purple" as const },
    { label: "Bout", value: identity.fightContextLabel, tone: "gold" as const },
    { label: "Stance", value: identity.stanceLabel, tone: "green" as const },
    { label: "Mass", value: identity.bodyMassLabel, tone: "orange" as const },
    { label: "Ring age", value: identity.trainingAgeLabel, tone: "muted" as const }
  ];
  return (
    <View style={{ flex: 1, gap: spacing.md, minWidth: 240 }}>
      <View style={{ gap: spacing.xs }}>
        <GlowLine tone="blue" />
        <Text style={{ color: colors.canvas, fontSize: 24, fontWeight: "900", lineHeight: 30 }}>{identity.title}</Text>
        <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "700", lineHeight: 20 }}>{identity.subtitle}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {facts.map((fact) => (
          <View
            key={`profile-identity:${fact.label}`}
            style={{
              backgroundColor: toneWash[fact.tone],
              borderColor: `${toneColors[fact.tone]}55`,
              borderRadius: 16,
              borderWidth: 1,
              flexBasis: 128,
              flexGrow: 1,
              gap: 2,
              minHeight: 66,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <Text numberOfLines={1} style={{ color: toneColors[fact.tone], fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
              {fact.label.toUpperCase()}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>
              {fact.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricTile({
  icon,
  metric
}: {
  icon: keyof typeof Ionicons.glyphMap;
  metric: ProfileMetricViewModel;
}) {
  const color = toneColors[metric.tone];
  return (
    <View
      accessibilityLabel={`${metric.label}: ${metric.value}. ${metric.meta}`}
      style={{
        backgroundColor: toneWash[metric.tone],
        borderColor: `${color}55`,
        borderRadius: 16,
        borderWidth: 1,
        flexBasis: 154,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 104,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <ToneIcon color={color} name={icon} />
        <Text numberOfLines={1} style={{ color, flex: 1, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
          {metric.label.toUpperCase()}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>
        {metric.value}
      </Text>
      <Text numberOfLines={2} style={{ color: colors.wrap, fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
        {metric.meta}
      </Text>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: radii.pill, height: 6, overflow: "hidden" }}>
        <View style={{ backgroundColor: color, borderRadius: radii.pill, height: "100%", width: progressWidth(metric.ratio) }} />
      </View>
    </View>
  );
}

export function ProfileCommandCenter({
  asOfDate,
  viewModel
}: {
  asOfDate: string;
  viewModel: ProfileViewModel;
}) {
  const theme = useLuminousScreenTheme();
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: theme.cardDeep,
        borderColor: theme.cardBorder,
        boxShadow: `0 18px 42px rgba(0, 0, 0, 0.34), 0 0 22px ${theme.strongGlow}`,
        gap: spacing.lg,
        overflow: "hidden",
        padding: spacing.lg
      }}
      testID="profile-command-center"
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: theme.hairline,
          height: 1,
          left: spacing.lg,
          position: "absolute",
          right: spacing.lg,
          top: 0
        }}
      />
      <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }}>
        <IdentityPanel identity={viewModel.identity} />
        <View style={{ alignItems: "center", gap: spacing.sm, minWidth: 188 }}>
          <OrbitRing command={viewModel.commandCenter} />
          <DashboardPill label={`As of ${asOfDate}`} tone={viewModel.commandCenter.tone === "red" ? "red" : "muted"} />
        </View>
      </View>
      <Text style={{ color: colors.wrap, fontSize: 15, fontWeight: "600", lineHeight: 21 }}>{viewModel.commandCenter.summary}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {viewModel.commandCenter.metrics.map((metric, index) => (
          <MetricTile icon={metricIcons[index % metricIcons.length] ?? "analytics-outline"} key={`profile-command-metric:${metric.label}`} metric={metric} />
        ))}
      </View>
    </View>
  );
}

function SignalNode({
  icon,
  signal
}: {
  icon: keyof typeof Ionicons.glyphMap;
  signal: ProfileSignalViewModel;
}) {
  const color = toneColors[signal.tone];
  return (
    <View
      accessibilityLabel={`${signal.label}: ${signal.value}. ${signal.detail}`}
      style={{
        borderBottomColor: "rgba(255, 255, 255, 0.09)",
        borderBottomWidth: 1,
        gap: spacing.xs,
        minHeight: 100,
        paddingBottom: spacing.sm
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: toneWash[signal.tone],
            borderColor: `${color}55`,
            borderRadius: radii.pill,
            borderWidth: 1,
            height: 34,
            justifyContent: "center",
            width: 34
          }}
        >
          <ToneIcon color={color} name={icon} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>
            {signal.label}
          </Text>
          <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
            {signal.value}
          </Text>
        </View>
      </View>
      <Text numberOfLines={3} style={{ color: colors.wrap, fontSize: 13, fontWeight: "500", lineHeight: 18 }}>
        {signal.detail}
      </Text>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.11)", borderRadius: radii.pill, height: 5, overflow: "hidden" }}>
        <View style={{ backgroundColor: color, borderRadius: radii.pill, height: "100%", width: progressWidth(signal.ratio) }} />
      </View>
    </View>
  );
}

export function ProfileDataConstellation({ signals }: { signals: readonly ProfileSignalViewModel[] }) {
  return (
    <DashboardCard headerRight={<DashboardPill label="Unknown stays unknown" tone="orange" />} testID="profile-signal-constellation" title="Signal constellation">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {signals.map((signal, index) => (
          <View key={`profile-signal:${signal.label}`} style={{ flexBasis: 260, flexGrow: 1, minWidth: 220 }}>
            <SignalNode icon={signalIcons[index % signalIcons.length] ?? "analytics-outline"} signal={signal} />
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

export function ProfileIntelligenceLayers({ layers }: { layers: readonly ProfileMetricViewModel[] }) {
  return (
    <DashboardCard headerRight={<DashboardPill label="Decision trail" tone="purple" />} title="Corner intelligence layers">
      <View style={{ gap: spacing.md }}>
        {layers.map((layer, index) => {
          const color = toneColors[layer.tone];
          return (
            <View key={`profile-layer:${layer.label}`} style={{ gap: spacing.xs }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16, width: 28 }}>{String(index + 1).padStart(2, "0")}</Text>
                <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>
                  {layer.label}
                </Text>
                <Text numberOfLines={1} style={{ color, fontSize: 13, fontWeight: "900", lineHeight: 18, maxWidth: 116, textAlign: "right" }}>
                  {layer.value}
                </Text>
              </View>
              <Text numberOfLines={2} style={{ color: colors.wrap, fontSize: 12, fontWeight: "500", lineHeight: 17, paddingLeft: 40 }}>
                {layer.meta}
              </Text>
              <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: radii.pill, height: 7, marginLeft: 40, overflow: "hidden" }}>
                <View style={{ backgroundColor: color, borderRadius: radii.pill, height: "100%", width: progressWidth(layer.ratio) }} />
              </View>
            </View>
          );
        })}
      </View>
    </DashboardCard>
  );
}

export function ProfilePrivacyMatrix({ items }: { items: readonly ProfileSignalViewModel[] }) {
  return (
    <DashboardCard headerRight={<DashboardPill label="Private by default" tone="green" />} title="Privacy vault">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {items.map((item) => {
          const color = toneColors[item.tone];
          return (
            <View
              key={`profile-privacy-matrix:${item.label}`}
              style={{
                ...glassStyles.tile,
                backgroundColor: toneWash[item.tone],
                borderColor: `${color}55`,
                flexBasis: 166,
                flexGrow: 1,
                gap: spacing.xs,
                minHeight: 128,
                padding: spacing.md
              }}
            >
              <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
                {item.label.toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>
                {item.value}
              </Text>
              <Text numberOfLines={3} style={{ color: colors.wrap, flex: 1, fontSize: 12, fontWeight: "500", lineHeight: 17 }}>
                {item.detail}
              </Text>
            </View>
          );
        })}
      </View>
    </DashboardCard>
  );
}

export function ProfileSafetyLedger({ items }: { items: readonly ProfileLedgerItemViewModel[] }) {
  return (
    <DashboardCard headerRight={<DashboardPill label="Read-only" tone="orange" />} testID="profile-safety-ledger" title="Safety ledger">
      <View style={{ gap: spacing.md }}>
        {items.map((item, index) => {
          const color = toneColors[item.tone];
          const last = index === items.length - 1;
          return (
            <View key={`profile-safety-ledger:${item.label}`} style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ alignItems: "center", width: 34 }}>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: toneWash[item.tone],
                    borderColor: `${color}66`,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    height: 30,
                    justifyContent: "center",
                    width: 30
                  }}
                >
                  <Text style={{ color, fontSize: 11, fontWeight: "900", lineHeight: 14 }}>{index + 1}</Text>
                </View>
                {!last ? <View style={{ backgroundColor: "rgba(255, 255, 255, 0.14)", flex: 1, marginTop: spacing.xs, width: 1 }} /> : null}
              </View>
              <View style={{ flex: 1, gap: spacing.xs, minWidth: 0, paddingBottom: last ? 0 : spacing.md }}>
                <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                  <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16, minWidth: 44 }}>
                    {item.label}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>
                    {item.title}
                  </Text>
                </View>
                <Text numberOfLines={3} style={screenStyles.subtle}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </DashboardCard>
  );
}

export function ProfileSystemNote() {
  const theme = useLuminousScreenTheme();
  return (
    <View style={{ ...glassStyles.tile, backgroundColor: theme.tile, borderColor: theme.tileBorder, gap: spacing.xs, padding: spacing.md }}>
      <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Maintenance, not pressure</Text>
      <Text style={screenStyles.body}>Profile is for settings, privacy, exports, and safety history. Today remains the place for daily action.</Text>
    </View>
  );
}
