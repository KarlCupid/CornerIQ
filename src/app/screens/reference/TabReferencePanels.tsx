import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageBackground, Pressable, Text, View } from "react-native";
import fuelHero from "../../../../assets/backgrounds/tab-fuel-hero.png";
import { accentColor, accentWash, type LuminousAccent } from "../../../design/components/LuminousScreen";
import { alphaHex, glassStyles } from "../../../design/glass";
import { colors, radii, spacing } from "../../../design/theme";
import type {
  FuelReferencePanelViewModel,
  PlanReferencePanelViewModel,
  ProfileReferencePanelViewModel,
  ReferenceRowViewModel,
  ReferenceBarViewModel,
  ReferenceTone,
  TodayReferencePanelViewModel,
  TrainReferencePanelViewModel
} from "../../../engine/presentation/referencePanelViewModel";

type IconName = keyof typeof Ionicons.glyphMap;

const referenceAccent = {
  blue: accentColor.blue,
  gold: colors.gold,
  green: accentColor.green,
  muted: "#A9B9CF",
  neutral: "#A9B9CF",
  orange: "#F7B23E",
  purple: accentColor.purple,
  red: colors.redCorner
} satisfies Record<ReferenceTone, string>;

const cardBase = {
  ...glassStyles.cardDeep,
  backgroundColor: "rgba(8, 13, 24, 0.88)",
  borderColor: "rgba(255, 255, 255, 0.12)",
  borderRadius: 16,
  overflow: "hidden" as const,
  padding: spacing.md
};

function SectionLabel({
  action,
  accent = "blue",
  title
}: {
  action?: string | undefined;
  accent?: keyof typeof referenceAccent | undefined;
  title: string;
}) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
      <Text style={{ color: colors.wrap, flex: 1, fontSize: 11, fontWeight: "900", letterSpacing: 0, lineHeight: 14, textTransform: "uppercase" }}>
        {title}
      </Text>
      {action ? (
        <Text style={{ color: referenceAccent[accent], fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

function ReferenceCard({
  children,
  style,
  testID
}: React.PropsWithChildren<{
  style?: object | undefined;
  testID?: string | undefined;
}>) {
  return (
    <View style={[cardBase, style]} testID={testID}>
      {children}
    </View>
  );
}

function IconBubble({
  accent,
  icon
}: {
  accent: keyof typeof referenceAccent;
  icon: IconName;
}) {
  const color = referenceAccent[accent];
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: alphaHex(color, "20"),
        borderColor: alphaHex(color, "55"),
        borderRadius: 15,
        borderWidth: 1,
        height: 40,
        justifyContent: "center",
        width: 40
      }}
    >
      <Ionicons color={color} name={icon} size={20} />
    </View>
  );
}

function MiniRing({
  accent,
  label,
  size = 70,
  value,
  valueLabel
}: {
  accent: keyof typeof referenceAccent;
  label: string;
  size?: number | undefined;
  value: number | null;
  valueLabel?: string | undefined;
}) {
  const color = referenceAccent[accent];
  const segmentCount = 28;
  const radius = size / 2 - 7;
  const safeValue = value ?? 0;
  const filled = Math.round((Math.max(0, Math.min(100, safeValue)) / 100) * segmentCount);
  return (
    <View accessibilityLabel={`${label}: ${value === null ? "unknown" : `${value} percent`}`} style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const angle = -90 + (360 * index) / segmentCount;
        const radians = (angle * Math.PI) / 180;
        const active = index < filled;
        return (
          <View
            key={`${label}:ring:${index}`}
            style={{
              backgroundColor: active ? color : "rgba(255, 255, 255, 0.13)",
              borderRadius: radii.pill,
              height: 11,
              left: size / 2 + Math.cos(radians) * radius - 2,
              opacity: active ? 1 : 0.62,
              position: "absolute",
              top: size / 2 + Math.sin(radians) * radius - 5.5,
              transform: [{ rotate: `${angle + 90}deg` }],
              width: 4
            }}
          />
        );
      })}
      <Text style={{ color: colors.canvas, fontSize: 17, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 22 }}>
        {valueLabel ?? (value === null ? "Log" : `${value}%`)}
      </Text>
    </View>
  );
}

function ProgressLine({
  accent,
  value
}: {
  accent: keyof typeof referenceAccent;
  value: number;
}) {
  const color = referenceAccent[accent];
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={{ backgroundColor: "rgba(255, 255, 255, 0.14)", borderRadius: radii.pill, height: 6, overflow: "hidden" }}>
      <View style={{ backgroundColor: color, borderRadius: radii.pill, height: "100%", width: `${Math.max(7, clamped * 100)}%` }} />
    </View>
  );
}

function MetaChip({
  accent,
  icon,
  label
}: {
  accent: keyof typeof referenceAccent;
  icon: IconName;
  label: string;
}) {
  const color = referenceAccent[accent];
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
        borderWidth: 1,
        flex: 1,
        flexDirection: "row",
        gap: spacing.xs,
        minHeight: 36,
        minWidth: 112,
        paddingHorizontal: spacing.sm
      }}
    >
      <Ionicons color={color} name={icon} size={14} />
      <Text numberOfLines={1} style={{ color: colors.wrap, flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>
        {label}
      </Text>
    </View>
  );
}

function ReferenceRow({
  accent,
  checked = false,
  icon,
  meta,
  onPress,
  play = false,
  status,
  title
}: {
  accent: keyof typeof referenceAccent;
  checked?: boolean | undefined;
  icon?: IconName | undefined;
  meta: string;
  onPress?: (() => void) | undefined;
  play?: boolean | undefined;
  status?: ReferenceRowViewModel["status"] | undefined;
  title: string;
}) {
  const color = referenceAccent[accent];
  const activePlay = play || status === "current";
  const activeChecked = checked;
  const content = (
    <View
      style={{
        alignItems: "center",
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        minHeight: 50,
        paddingVertical: spacing.xs
      }}
    >
      {icon ? <IconBubble accent={accent} icon={icon} /> : null}
      <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
          {meta}
        </Text>
      </View>
      <View
        style={{
          alignItems: "center",
          backgroundColor: activeChecked ? color : "transparent",
          borderColor: activeChecked ? alphaHex(color, "AA") : activePlay ? alphaHex(color, "AA") : "rgba(255, 255, 255, 0.42)",
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 25,
          justifyContent: "center",
          width: 25
        }}
      >
        {activeChecked ? <Ionicons color={colors.canvas} name="checkmark" size={16} /> : activePlay ? <Ionicons color={colors.canvas} name="play" size={12} /> : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

function iconForReferenceKind(kind: ReferenceRowViewModel["kind"]): IconName {
  switch (kind) {
    case "boxing":
      return "body-outline";
    case "fuel":
      return "restaurant-outline";
    case "profile":
      return "person-outline";
    case "recovery":
      return "walk-outline";
    case "settings":
      return "settings-outline";
    case "support":
      return "barbell-outline";
    case "schedule":
    default:
      return "calendar-outline";
  }
}

function MacroBlock({
  label,
  percent,
  value
}: {
  label: string;
  percent: string;
  value: string;
}) {
  const percentValue = Number.parseInt(percent, 10);
  return (
    <View style={{ flex: 1, gap: 2, minWidth: 74 }}>
      <Text numberOfLines={1} style={{ color: referenceAccent.orange, fontSize: 10, fontWeight: "900", lineHeight: 13, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 21 }}>
        {value}
      </Text>
      <Text style={{ color: colors.mutedText, fontSize: 10, fontWeight: "700", lineHeight: 13 }}>
        {percent}
      </Text>
      <ProgressLine accent="orange" value={Number.isFinite(percentValue) ? percentValue / 100 : 0} />
    </View>
  );
}

function MiniBars({ accent, bars }: { accent: keyof typeof referenceAccent; bars?: readonly ReferenceBarViewModel[] | undefined }) {
  const color = referenceAccent[accent];
  const resolvedBars = bars && bars.length > 0
    ? bars
    : [0.34, 0.44, 0.52, 0.62, 0.76, 1, 0.64, 0.82].map((ratio, index) => ({
        active: index === 5,
        label: ["M", "T", "W", "T", "F", "S", "S", ""][index] ?? "",
        ratio,
        tone: accent
      }));
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.sm, height: 70 }}>
        {resolvedBars.map((bar, index) => (
          <View key={`mini-bar:${bar.label}:${index}`} style={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: bar.active ? referenceAccent[bar.tone] : alphaHex(referenceAccent[bar.tone] ?? color, "66"),
                borderRadius: 4,
                height: `${Math.max(8, bar.ratio * 100)}%`,
                width: "72%"
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {resolvedBars.map((bar, index) => (
          <Text key={`mini-bar-label:${bar.label}:${index}`} style={{ color: bar.active ? colors.canvas : colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 13, textAlign: "center" }}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Sparkline({ accent, bars }: { accent: keyof typeof referenceAccent; bars?: readonly ReferenceBarViewModel[] | undefined }) {
  const color = referenceAccent[accent];
  const values = bars && bars.length > 0 ? bars.map((bar) => bar.ratio) : [0.24, 0.4, 0.36, 0.52, 0.45, 0.66, 0.42, 0.74, 0.9, 0.68, 0.78, 0.58, 0.64];
  return (
    <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 3, height: 44, width: 150 }}>
      {values.map((height, index) => (
        <View
          key={`spark:${index}`}
          style={{
            backgroundColor: color,
            borderRadius: 3,
            height: `${Math.max(12, height * 100)}%`,
            opacity: index > 8 ? 1 : 0.72,
            width: 7
          }}
        />
      ))}
    </View>
  );
}

function DayStrip({ days }: { days: PlanReferencePanelViewModel["weekStrip"] }) {
  return (
    <ReferenceCard style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {days.map((item, index) => {
          const selected = item.selected;
          const color = referenceAccent[item.tone];
          return (
            <View key={`day:${item.label}:${item.day}:${index}`} style={{ alignItems: "center", gap: 3, minWidth: 34 }}>
              <Text style={{ color: colors.wrap, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>{item.label}</Text>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: selected ? color : "transparent",
                  borderRadius: radii.pill,
                  height: 22,
                  justifyContent: "center",
                  width: 22
                }}
              >
                <Text style={{ color: colors.canvas, fontSize: 11, fontWeight: "900", lineHeight: 14 }}>{item.day}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ReferenceCard>
  );
}

export function TodayReferencePanel({
  model,
  onOpenPlan,
  onOpenTrain,
  onOpenTrainWorkout
}: {
  model: TodayReferencePanelViewModel;
  onOpenPlan?: (() => void) | undefined;
  onOpenTrain?: (() => void) | undefined;
  onOpenTrainWorkout?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="today-reference-panel">
      <ReferenceCard>
        <SectionLabel accent="blue" title="Daily readiness" />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginTop: spacing.sm }}>
          <View style={{ gap: spacing.xs, minWidth: 82 }}>
            <Text style={{ color: colors.canvas, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 33 }}>{model.readiness.scoreLabel}</Text>
            <Text style={{ color: referenceAccent.blue, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>{model.readiness.statusLabel}</Text>
          </View>
          <MiniRing accent="blue" label="Daily readiness" size={74} value={model.readiness.ringValue} valueLabel={model.readiness.ringValue === null ? "Log" : undefined} />
          <View style={{ gap: 4, minWidth: 84 }}>
            {model.readiness.metrics.map(({ label, value }) => (
              <View key={`today-ready:${label}`} style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{label}</Text>
                <Text style={{ color: colors.canvas, fontSize: 11, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 15 }}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ReferenceCard>

      <Pressable accessibilityRole="button" onPress={onOpenTrain}>
        <ReferenceCard>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
              <SectionLabel accent="blue" title="Daily mission" />
              <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 22 }}>{model.mission.title}</Text>
              <Text numberOfLines={2} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>
                {model.mission.summary}
              </Text>
            </View>
            <Ionicons color={colors.wrap} name="chevron-forward" size={18} />
          </View>
        </ReferenceCard>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel accent="blue" title="Today's plan" />
        <ReferenceCard style={{ paddingTop: spacing.sm }}>
          {model.planRows.map((row) => (
            <ReferenceRow
              accent={row.tone === "neutral" || row.tone === "muted" ? "blue" : row.tone}
              icon={iconForReferenceKind(row.kind)}
              key={row.id}
              meta={row.meta}
              onPress={row.kind === "support" || row.kind === "boxing" ? onOpenTrainWorkout : onOpenPlan}
              status={row.status}
              title={row.title}
            />
          ))}
        </ReferenceCard>
      </View>

      <ReferenceCard>
        <SectionLabel accent="blue" title={model.load.title} />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginTop: spacing.xs }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.canvas, fontSize: 25, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 31 }}>{model.load.valueLabel}</Text>
            <Text style={{ color: referenceAccent.blue, fontSize: 11, fontWeight: "800", lineHeight: 14 }}>{model.load.meta}</Text>
          </View>
          <Sparkline accent="blue" bars={model.load.bars} />
        </View>
      </ReferenceCard>
    </View>
  );
}

export function TrainReferencePanel({
  model,
  onOpenDetails,
  onStartSession
}: {
  model: TrainReferencePanelViewModel;
  onOpenDetails?: (() => void) | undefined;
  onStartSession?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="train-reference-panel">
      <ReferenceCard>
        <SectionLabel accent="purple" title="Next session" />
        <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 22, marginTop: spacing.xs }}>{model.nextSession.title}</Text>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16, marginTop: 2 }}>{model.nextSession.meta}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: model.nextSession.disabled }}
          disabled={model.nextSession.disabled}
          onPress={onStartSession}
          style={{
            alignItems: "center",
            backgroundColor: referenceAccent.purple,
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 11,
            borderWidth: 1,
            flexDirection: "row",
            gap: spacing.sm,
            justifyContent: "center",
            marginTop: spacing.sm,
            minHeight: 43,
            paddingHorizontal: spacing.md
          }}
        >
          <Ionicons color={colors.canvas} name="play" size={15} />
          <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{model.nextSession.buttonLabel}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          {model.nextSession.chips.slice(0, 3).map((chip, index) => (
            <MetaChip accent="purple" icon={index === 0 ? "calendar-outline" : index === 1 ? "time-outline" : "flame-outline"} key={`train-next-chip:${chip.label}`} label={chip.value} />
          ))}
        </View>
      </ReferenceCard>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel accent="purple" action="View all" title="Workouts" />
        <ReferenceCard style={{ paddingTop: spacing.sm }}>
          {model.workoutRows.map((row) => (
            <ReferenceRow
              accent={row.tone === "neutral" || row.tone === "muted" ? "purple" : row.tone}
              icon={iconForReferenceKind(row.kind)}
              key={row.id}
              meta={row.meta}
              onPress={onOpenDetails}
              status={row.status}
              title={row.title}
            />
          ))}
        </ReferenceCard>
      </View>

      <ReferenceCard>
        <SectionLabel accent="purple" title="Weekly training load" />
        <Text style={{ color: colors.canvas, fontSize: 21, fontWeight: "900", lineHeight: 26, marginTop: spacing.xs }}>{model.weeklyLoad.valueLabel}</Text>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{model.weeklyLoad.meta}</Text>
        <MiniBars accent="purple" bars={model.weeklyLoad.bars} />
      </ReferenceCard>
    </View>
  );
}

export function FuelReferencePanel({
  model,
  onAddWater,
  onLogMeal
}: {
  model: FuelReferencePanelViewModel;
  onAddWater?: (() => void) | undefined;
  onLogMeal?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-reference-panel">
      <ReferenceCard>
            <SectionLabel accent="orange" title="Calorie target" />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginTop: spacing.xs }}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 29, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 35 }}>{model.calorie.loggedLabel}</Text>
            <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>of {model.calorie.targetLabel}</Text>
          </View>
          <MiniRing accent="orange" label="Calorie target" size={82} value={model.calorie.ringValue} />
        </View>
        <View style={{ borderTopColor: "rgba(255, 255, 255, 0.1)", borderTopWidth: 1, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm }}>
          {model.macros.map((macro) => <MacroBlock key={`fuel-macro:${macro.label}`} label={macro.label} percent={macro.percentLabel} value={macro.value} />)}
        </View>
      </ReferenceCard>

      <ReferenceCard>
        <SectionLabel accent="orange" title="Hydration" />
        <Text style={{ color: colors.canvas, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 34, marginTop: spacing.xs }}>{model.hydration.loggedLabel}</Text>
        <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>of {model.hydration.targetLabel}</Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8, marginTop: spacing.sm }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Ionicons key={`water:${index}`} color={index < Math.round(model.hydration.ratio * 8) ? referenceAccent.orange : "rgba(247, 178, 62, 0.48)"} name={index < Math.round(model.hydration.ratio * 8) ? "water" : "water-outline"} size={20} />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onAddWater}
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.14)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 32,
              justifyContent: "center",
              marginLeft: "auto",
              width: 32
            }}
          >
            <Ionicons color={colors.canvas} name="add" size={18} />
          </Pressable>
        </View>
      </ReferenceCard>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel accent="orange" action="View all" title="Meals" />
        <Pressable accessibilityRole="button" onPress={onLogMeal}>
          <ReferenceCard>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <ImageBackground imageStyle={{ borderRadius: 12 }} resizeMode="cover" source={fuelHero} style={{ borderRadius: 12, height: 58, overflow: "hidden", width: 66 }} />
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>{model.meal.title}</Text>
                <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{model.meal.summary}</Text>
                <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{model.meal.meta}</Text>
              </View>
              <View style={{ alignItems: "center", backgroundColor: referenceAccent.orange, borderRadius: radii.pill, height: 26, justifyContent: "center", width: 26 }}>
                <Ionicons color={colors.cornerBlack} name={model.meal.logged ? "checkmark" : "add"} size={16} />
              </View>
            </View>
          </ReferenceCard>
        </Pressable>
      </View>
    </View>
  );
}

export function PlanReferencePanel({
  model,
  onAdjustPlan
}: {
  model: PlanReferencePanelViewModel;
  onAdjustPlan?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="plan-reference-panel">
      <DayStrip days={model.weekStrip} />
      <ReferenceCard>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <SectionLabel accent="green" title="This week" />
            <Text style={{ color: colors.canvas, fontSize: 22, fontWeight: "900", lineHeight: 27 }}>{model.week.title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onAdjustPlan}
            style={{
              backgroundColor: alphaHex(referenceAccent.green, "18"),
              borderColor: alphaHex(referenceAccent.green, "55"),
              borderRadius: radii.pill,
              borderWidth: 1,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5
            }}
          >
            <Text style={{ color: referenceAccent.green, fontSize: 12, fontWeight: "900", lineHeight: 15 }}>{model.week.statusLabel}</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <ProgressLine accent="green" value={model.week.progress} />
          <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{model.week.summary}</Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          {model.dayRows.map((row) => {
            const [dateLabel = "", meta = row.meta] = row.meta.split(" - ");
            const weekday = dateLabel.split(",")[0] ?? "";
            const dayNumber = row.id.slice(-2);
            const color = referenceAccent[row.tone === "neutral" || row.tone === "muted" ? "green" : row.tone];
            return (
            <View key={`plan-row:${row.id}`}>
              <View
                style={{
                  alignItems: "center",
                  borderBottomColor: "rgba(255, 255, 255, 0.08)",
                  borderBottomWidth: 1,
                  flexDirection: "row",
                  gap: spacing.md,
                  minHeight: 52,
                  paddingVertical: spacing.xs
                }}
              >
                <View style={{ width: 42 }}>
                  <Text style={{ color: colors.mutedText, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{weekday.toUpperCase()}</Text>
                  <Text style={{ color: colors.canvas, fontSize: 19, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 23 }}>{dayNumber.replace(",", "")}</Text>
                </View>
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{row.title}</Text>
                  <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{meta}</Text>
                </View>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: "transparent",
                    borderColor: row.status === "current" ? alphaHex(color, "AA") : "rgba(255, 255, 255, 0.42)",
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    height: 25,
                    justifyContent: "center",
                    width: 25
                  }}
                >
                  {row.status === "current" ? <Ionicons color={colors.canvas} name="play" size={12} /> : null}
                </View>
              </View>
            </View>
          );
          })}
        </View>
      </ReferenceCard>
    </View>
  );
}

function PerformanceTile({
  delta,
  label,
  tone = "green",
  value
}: {
  delta: string;
  label: string;
  tone?: ReferenceTone | undefined;
  value: string;
}) {
  const color = referenceAccent[tone];
  return (
    <View style={{ ...glassStyles.tile, flex: 1, gap: 2, minHeight: 74, minWidth: 84, padding: spacing.sm }}>
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text style={{ color: colors.canvas, fontSize: 21, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 26 }}>{value}</Text>
      <Text numberOfLines={1} style={{ color, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{delta}</Text>
    </View>
  );
}

function AchievementRow({
  accent,
  icon,
  meta,
  title
}: {
  accent: keyof typeof referenceAccent;
  icon: IconName;
  meta: string;
  title: string;
}) {
  return (
    <View style={{ alignItems: "center", borderBottomColor: "rgba(255, 255, 255, 0.08)", borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 49 }}>
      <IconBubble accent={accent} icon={icon} />
      <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{title}</Text>
        <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{meta}</Text>
      </View>
      <View style={{ alignItems: "center", borderColor: "rgba(255, 255, 255, 0.18)", borderRadius: radii.pill, borderWidth: 1, height: 24, justifyContent: "center", width: 24 }}>
        <Ionicons color={colors.wrap} name="chevron-forward" size={13} />
      </View>
    </View>
  );
}

export function ProfileReferencePanel({
  model,
  onOpenAthlete,
  onOpenSettings
}: {
  model: ProfileReferencePanelViewModel;
  onOpenAthlete?: (() => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="profile-reference-panel">
      <ReferenceCard>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(169, 185, 207, 0.18)",
              borderColor: "rgba(169, 185, 207, 0.45)",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 58,
              justifyContent: "center",
              width: 58
            }}
          >
            <Text style={{ color: colors.canvas, fontSize: 27, fontWeight: "800", lineHeight: 33 }}>{model.identity.initial}</Text>
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>{model.identity.name}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{model.identity.subtitle}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenAthlete}
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.075)",
                borderColor: "rgba(255, 255, 255, 0.13)",
                borderRadius: 11,
                borderWidth: 1,
                flexDirection: "row",
                gap: spacing.sm,
                justifyContent: "space-between",
                minHeight: 36,
                paddingHorizontal: spacing.md
              }}
            >
              <Text style={{ color: colors.canvas, flex: 1, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>View Profile</Text>
              <Ionicons color={colors.wrap} name="chevron-forward" size={15} />
            </Pressable>
          </View>
        </View>
      </ReferenceCard>

      <ReferenceCard>
        <SectionLabel accent="neutral" action="Now" title="Performance" />
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          {model.performance.map((item) => (
            <PerformanceTile delta={item.meta} key={`profile-performance:${item.label}`} label={item.label} tone={item.tone} value={item.value} />
          ))}
        </View>
      </ReferenceCard>

      <ReferenceCard>
        <SectionLabel accent="neutral" action="View all" title="Safety ledger" />
        {model.ledger.map((item) => (
          <AchievementRow
            accent={item.tone === "neutral" || item.tone === "muted" ? "neutral" : item.tone}
            icon={item.tone === "red" ? "warning-outline" : item.tone === "orange" ? "shield-checkmark-outline" : "ribbon-outline"}
            key={item.id}
            meta={item.meta}
            title={item.title}
          />
        ))}
      </ReferenceCard>

      <Pressable accessibilityRole="button" onPress={onOpenSettings}>
        <ReferenceCard>
          <SectionLabel accent="neutral" title="Settings" />
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, minHeight: 44 }}>
            <Ionicons color={colors.wrap} name="settings-outline" size={18} />
            <Text style={{ color: colors.canvas, flex: 1, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>Account</Text>
            <Ionicons color={colors.wrap} name="chevron-forward" size={16} />
          </View>
        </ReferenceCard>
      </Pressable>
    </View>
  );
}

export function referencePanelTopGlow(accent: LuminousAccent): object {
  return {
    backgroundColor: accentWash[accent],
    borderRadius: radii.card,
    bottom: -8,
    height: 20,
    left: spacing.lg,
    opacity: 0.32,
    position: "absolute",
    right: spacing.lg
  };
}
