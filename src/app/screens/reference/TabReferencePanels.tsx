import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageBackground, Pressable, Text, View } from "react-native";
import fuelHero from "../../../../assets/backgrounds/tab-fuel-hero.png";
import { accentColor, accentWash, type LuminousAccent } from "../../../design/components/LuminousScreen";
import { alphaHex, glassStyles } from "../../../design/glass";
import { colors, radii, spacing } from "../../../design/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const referenceAccent = {
  blue: accentColor.blue,
  green: accentColor.green,
  orange: "#F7B23E",
  purple: accentColor.purple,
  neutral: "#A9B9CF"
} satisfies Record<"blue" | "green" | "orange" | "purple" | "neutral", string>;

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
  value
}: {
  accent: keyof typeof referenceAccent;
  label: string;
  size?: number | undefined;
  value: number;
}) {
  const color = referenceAccent[accent];
  const segmentCount = 28;
  const radius = size / 2 - 7;
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * segmentCount);
  return (
    <View accessibilityLabel={`${label}: ${value} percent`} style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
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
        {value}%
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
  title
}: {
  accent: keyof typeof referenceAccent;
  checked?: boolean | undefined;
  icon?: IconName | undefined;
  meta: string;
  onPress?: (() => void) | undefined;
  play?: boolean | undefined;
  title: string;
}) {
  const color = referenceAccent[accent];
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
          backgroundColor: checked ? color : "transparent",
          borderColor: checked ? alphaHex(color, "AA") : "rgba(255, 255, 255, 0.42)",
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 25,
          justifyContent: "center",
          width: 25
        }}
      >
        {checked ? <Ionicons color={colors.canvas} name="checkmark" size={16} /> : play ? <Ionicons color={colors.canvas} name="play" size={12} /> : null}
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

function MacroBlock({
  label,
  percent,
  value
}: {
  label: string;
  percent: string;
  value: string;
}) {
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
      <ProgressLine accent="orange" value={Number.parseInt(percent, 10) / 100} />
    </View>
  );
}

function MiniBars({ accent }: { accent: keyof typeof referenceAccent }) {
  const color = referenceAccent[accent];
  const bars = [0.34, 0.44, 0.52, 0.62, 0.76, 1, 0.64, 0.82];
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.sm, height: 70 }}>
        {bars.map((height, index) => (
          <View key={`mini-bar:${index}`} style={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: index === 5 ? color : alphaHex(color, "66"),
                borderRadius: 4,
                height: `${height * 100}%`,
                width: "72%"
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {["M", "T", "W", "T", "F", "F", "S", "S"].map((label, index) => (
          <Text key={`mini-bar-label:${index}`} style={{ color: index === 5 ? colors.canvas : colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 13, textAlign: "center" }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Sparkline({ accent }: { accent: keyof typeof referenceAccent }) {
  const color = referenceAccent[accent];
  const values = [0.24, 0.4, 0.36, 0.52, 0.45, 0.66, 0.42, 0.74, 0.9, 0.68, 0.78, 0.58, 0.64];
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

function DayStrip() {
  const days = [
    ["M", "20"],
    ["T", "21"],
    ["W", "22"],
    ["T", "23"],
    ["F", "24"],
    ["S", "25"],
    ["S", "26"]
  ] as const;
  return (
    <ReferenceCard style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {days.map(([label, date]) => {
          const selected = date === "23";
          return (
            <View key={`day:${label}:${date}`} style={{ alignItems: "center", gap: 3, minWidth: 34 }}>
              <Text style={{ color: colors.wrap, fontSize: 10, fontWeight: "800", lineHeight: 13 }}>{label}</Text>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: selected ? referenceAccent.green : "transparent",
                  borderRadius: radii.pill,
                  height: 22,
                  justifyContent: "center",
                  width: 22
                }}
              >
                <Text style={{ color: colors.canvas, fontSize: 11, fontWeight: "900", lineHeight: 14 }}>{date}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ReferenceCard>
  );
}

export function TodayReferencePanel({
  onOpenPlan,
  onOpenTrain,
  onOpenTrainWorkout
}: {
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
            <Text style={{ color: colors.canvas, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 33 }}>85%</Text>
            <Text style={{ color: referenceAccent.blue, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>Very Ready</Text>
          </View>
          <MiniRing accent="blue" label="Daily readiness" size={74} value={85} />
          <View style={{ gap: 4, minWidth: 84 }}>
            {[
              ["Sleep", "8.2h"],
              ["HRV", "72ms"],
              ["Energy", "High"]
            ].map(([label, value]) => (
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
              <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 22 }}>Technical Precision</Text>
              <Text numberOfLines={2} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>
                Focus on fundamentals and controlled power.
              </Text>
            </View>
            <Ionicons color={colors.wrap} name="chevron-forward" size={18} />
          </View>
        </ReferenceCard>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel accent="blue" title="Today's plan" />
        <ReferenceCard style={{ paddingTop: spacing.sm }}>
          <ReferenceRow accent="blue" checked icon="body-outline" meta="3 rounds" onPress={onOpenTrainWorkout} title="Shadow Boxing" />
          <ReferenceRow accent="blue" icon="barbell-outline" meta="5 rounds" onPress={onOpenTrainWorkout} title="Heavy Bag Power" />
          <ReferenceRow accent="blue" icon="walk-outline" meta="20 min" onPress={onOpenPlan} title="Core and Mobility" />
        </ReferenceCard>
      </View>

      <ReferenceCard>
        <SectionLabel accent="blue" title="Calories burned" />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginTop: spacing.xs }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.canvas, fontSize: 25, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 31 }}>612 <Text style={{ fontSize: 13 }}>kcal</Text></Text>
            <Text style={{ color: referenceAccent.blue, fontSize: 11, fontWeight: "800", lineHeight: 14 }}>+12% vs yesterday</Text>
          </View>
          <Sparkline accent="blue" />
        </View>
      </ReferenceCard>
    </View>
  );
}

export function TrainReferencePanel({
  onOpenDetails,
  onStartSession
}: {
  onOpenDetails?: (() => void) | undefined;
  onStartSession?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="train-reference-panel">
      <ReferenceCard>
        <SectionLabel accent="purple" title="Next session" />
        <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "900", lineHeight: 22, marginTop: spacing.xs }}>Heavy Bag Power</Text>
        <Pressable
          accessibilityRole="button"
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
          <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>Start Session</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          <MetaChip accent="purple" icon="time-outline" label="60 min" />
          <MetaChip accent="purple" icon="flame-outline" label="High intensity" />
        </View>
      </ReferenceCard>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel accent="purple" action="View all" title="Workouts" />
        <ReferenceCard style={{ paddingTop: spacing.sm }}>
          <ReferenceRow accent="purple" checked icon="flask-outline" meta="40 min" onPress={onOpenDetails} title="Technical Drills" />
          <ReferenceRow accent="purple" icon="footsteps-outline" meta="6 x 3 min" onPress={onOpenDetails} title="Footwork Rounds" />
          <ReferenceRow accent="purple" icon="body-outline" meta="20 min" onPress={onOpenDetails} title="Conditioning" />
        </ReferenceCard>
      </View>

      <ReferenceCard>
        <SectionLabel accent="purple" title="Weekly training load" />
        <Text style={{ color: colors.canvas, fontSize: 21, fontWeight: "900", lineHeight: 26, marginTop: spacing.xs }}>High</Text>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>+18% vs last week</Text>
        <MiniBars accent="purple" />
      </ReferenceCard>
    </View>
  );
}

export function FuelReferencePanel({
  onAddWater,
  onLogMeal
}: {
  onAddWater?: (() => void) | undefined;
  onLogMeal?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="fuel-reference-panel">
      <ReferenceCard>
        <SectionLabel accent="orange" title="Calorie target" />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginTop: spacing.xs }}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={{ color: colors.canvas, fontSize: 29, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 35 }}>2,450 <Text style={{ fontSize: 15 }}>kcal</Text></Text>
            <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>of 2,800 kcal</Text>
          </View>
          <MiniRing accent="orange" label="Calorie target" size={82} value={87} />
        </View>
        <View style={{ borderTopColor: "rgba(255, 255, 255, 0.1)", borderTopWidth: 1, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm }}>
          <MacroBlock label="Protein" percent="40%" value="175g" />
          <MacroBlock label="Carbs" percent="40%" value="275g" />
          <MacroBlock label="Fats" percent="20%" value="75g" />
        </View>
      </ReferenceCard>

      <ReferenceCard>
        <SectionLabel accent="orange" title="Hydration" />
        <Text style={{ color: colors.canvas, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 34, marginTop: spacing.xs }}>2.3 L</Text>
        <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>of 3.0 L goal</Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8, marginTop: spacing.sm }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Ionicons key={`water:${index}`} color={index < 6 ? referenceAccent.orange : "rgba(247, 178, 62, 0.48)"} name={index < 7 ? "water" : "water-outline"} size={20} />
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
                <Text style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>Lunch</Text>
                <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>Grilled Chicken Bowl</Text>
                <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>620 kcal</Text>
              </View>
              <View style={{ alignItems: "center", backgroundColor: referenceAccent.orange, borderRadius: radii.pill, height: 26, justifyContent: "center", width: 26 }}>
                <Ionicons color={colors.cornerBlack} name="checkmark" size={16} />
              </View>
            </View>
          </ReferenceCard>
        </Pressable>
      </View>
    </View>
  );
}

export function PlanReferencePanel({
  onAdjustPlan,
  onOpenDetails
}: {
  onAdjustPlan?: (() => void) | undefined;
  onOpenDetails?: (() => void) | undefined;
}) {
  return (
    <View style={{ gap: spacing.md }} testID="plan-reference-panel">
      <DayStrip />
      <ReferenceCard>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <SectionLabel accent="green" title="This week" />
            <Text style={{ color: colors.canvas, fontSize: 22, fontWeight: "900", lineHeight: 27 }}>Week 21</Text>
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
            <Text style={{ color: referenceAccent.green, fontSize: 12, fontWeight: "900", lineHeight: 15 }}>On Track</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <ProgressLine accent="green" value={0.7} />
          <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>4 of 6 sessions completed</Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          {([
            ["MON", "20", "Technical Drills", "45 min", true, false],
            ["TUE", "21", "Strength Training", "60 min", true, false],
            ["WED", "22", "Footwork Rounds", "6 x 3 min", true, false],
            ["THU", "23", "Conditioning", "30 min", false, true],
            ["FRI", "24", "Rest and Mobility", "20 min", false, false]
          ] as const).map(([day, date, title, meta, checked, play]) => (
            <Pressable accessibilityRole="button" key={`plan-row:${day}`} onPress={onOpenDetails}>
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
                  <Text style={{ color: colors.mutedText, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{day}</Text>
                  <Text style={{ color: colors.canvas, fontSize: 19, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 23 }}>{date}</Text>
                </View>
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{title}</Text>
                  <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>{meta}</Text>
                </View>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: checked ? referenceAccent.green : "transparent",
                    borderColor: checked ? alphaHex(referenceAccent.green, "AA") : "rgba(255, 255, 255, 0.42)",
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    height: 25,
                    justifyContent: "center",
                    width: 25
                  }}
                >
                  {checked ? <Ionicons color={colors.canvas} name="checkmark" size={15} /> : play ? <Ionicons color={colors.canvas} name="play" size={12} /> : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ReferenceCard>
    </View>
  );
}

function PerformanceTile({
  delta,
  label,
  value
}: {
  delta: string;
  label: string;
  value: string;
}) {
  return (
    <View style={{ ...glassStyles.tile, flex: 1, gap: 2, minHeight: 74, minWidth: 84, padding: spacing.sm }}>
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{label}</Text>
      <Text style={{ color: colors.canvas, fontSize: 21, fontVariant: ["tabular-nums"], fontWeight: "900", lineHeight: 26 }}>{value}</Text>
      <Text style={{ color: referenceAccent.green, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{delta}</Text>
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
  name,
  onOpenAthlete,
  onOpenSettings,
  subtitle
}: {
  name: string;
  onOpenAthlete?: (() => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
  subtitle: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "A";
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
            <Text style={{ color: colors.canvas, fontSize: 27, fontWeight: "800", lineHeight: 33 }}>{initial}</Text>
          </View>
          <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>{name}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{subtitle}</Text>
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
        <SectionLabel accent="neutral" action="This month" title="Performance" />
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          <PerformanceTile delta="+12%" label="Sessions" value="18" />
          <PerformanceTile delta="+8%" label="Win Rate" value="72%" />
          <PerformanceTile delta="+15%" label="Rounds" value="48" />
        </View>
      </ReferenceCard>

      <ReferenceCard>
        <SectionLabel accent="neutral" action="View all" title="Achievements" />
        <AchievementRow accent="blue" icon="ribbon-outline" meta="Train 4 weeks in a row" title="Consistency" />
        <AchievementRow accent="orange" icon="shield-checkmark-outline" meta="Complete 10 plan sessions" title="Iron Routine" />
        <AchievementRow accent="blue" icon="sunny-outline" meta="5:00 AM workouts, 7 days" title="Early Riser" />
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
