import React from "react";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import type { BarVisual, BreakdownVisual, ModifierVisual, ProgressVisual, TimelineVisual, TrendPoint, VisualTone } from "../../engine/presentation/dashboardVisualData";

const toneColors: Record<VisualTone, string> = {
  blue: colors.blueIQ,
  gold: colors.gold,
  green: colors.readyGreen,
  muted: colors.mutedText,
  orange: colors.amberCaution,
  purple: colors.powerPurple,
  red: colors.redCorner
};

const toneWash: Record<VisualTone, string> = {
  blue: "rgba(39, 206, 241, 0.16)",
  gold: "rgba(255, 216, 97, 0.15)",
  green: "rgba(56, 226, 138, 0.14)",
  muted: "rgba(183, 196, 217, 0.12)",
  orange: "rgba(255, 148, 72, 0.15)",
  purple: "rgba(150, 87, 245, 0.15)",
  red: "rgba(255, 82, 101, 0.16)"
};

function colorForTone(tone: VisualTone): string {
  return toneColors[tone];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function DashboardCard({
  children,
  footer,
  headerRight,
  testID,
  title
}: React.PropsWithChildren<{
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  testID?: string | undefined;
  title: string;
}>) {
  return (
    <View
      style={{
        backgroundColor: "rgba(10, 16, 31, 0.92)",
        borderColor: "rgba(255, 255, 255, 0.14)",
        borderRadius: radii.card,
        borderWidth: 1,
        gap: spacing.md,
        overflow: "hidden",
        padding: spacing.lg
      }}
      testID={testID}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text numberOfLines={2} style={{ color: colors.canvas, flex: 1, fontSize: 13, fontWeight: "900", letterSpacing: 0, lineHeight: 17 }}>
          {title.toUpperCase()}
        </Text>
        {headerRight}
      </View>
      {children}
      {footer}
    </View>
  );
}

export function DashboardPill({ label, tone = "blue" }: { label: string; tone?: VisualTone | undefined }) {
  const toneColor = colorForTone(tone);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: toneWash[tone],
        borderColor: `${toneColor}66`,
        borderRadius: radii.pill,
        borderWidth: 1,
        minHeight: 28,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      }}
    >
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

function RingSegments({
  ratio,
  segmentCount,
  size,
  startAngle = -90,
  sweepAngle = 360,
  tone
}: {
  ratio: number;
  segmentCount: number;
  size: number;
  startAngle?: number | undefined;
  sweepAngle?: number | undefined;
  tone: VisualTone;
}) {
  const filled = Math.round(clamp01(ratio) * segmentCount);
  const radius = size / 2 - 8;
  const segmentWidth = 4;
  const segmentHeight = sweepAngle >= 360 ? 16 : 14;
  return (
    <>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const angle = startAngle + (sweepAngle * index) / Math.max(1, segmentCount - 1);
        const radians = (angle * Math.PI) / 180;
        const active = index < filled;
        return (
          <View
            key={`ring-segment:${index}`}
            style={{
              backgroundColor: active ? colorForTone(tone) : "rgba(255, 255, 255, 0.12)",
              borderRadius: radii.pill,
              height: segmentHeight,
              left: size / 2 + Math.cos(radians) * radius - segmentWidth / 2,
              opacity: active ? 1 : 0.7,
              position: "absolute",
              top: size / 2 + Math.sin(radians) * radius - segmentHeight / 2,
              transform: [{ rotate: `${angle + 90}deg` }],
              width: segmentWidth
            }}
          />
        );
      })}
    </>
  );
}

export function MetricRing({
  label,
  max = 100,
  size = 132,
  subLabel,
  testID,
  tone = "blue",
  value
}: {
  label: string;
  max?: number | undefined;
  size?: number | undefined;
  subLabel?: string | undefined;
  testID?: string | undefined;
  tone?: VisualTone | undefined;
  value: number | null;
}) {
  const ratio = value === null || max <= 0 ? 0 : value / max;
  return (
    <View
      accessibilityLabel={`${label}: ${value === null ? "not logged" : `${value} of ${max}`}`}
      style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}
      testID={testID}
    >
      <RingSegments ratio={ratio} segmentCount={32} size={size} tone={value === null ? "muted" : tone} />
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ color: colors.canvas, fontSize: value === null ? 28 : 40, fontWeight: "900", lineHeight: value === null ? 34 : 46 }}>
          {value === null ? "Log" : Math.round(value)}
        </Text>
        <Text style={{ color: colors.wrap, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>
          {subLabel ?? `/${max}`}
        </Text>
      </View>
    </View>
  );
}

export function MacroRing({ item, size = 116 }: { item: ProgressVisual; size?: number | undefined }) {
  const current = Math.round(item.ratio * 100);
  return (
    <View style={{ alignItems: "center", flex: 1, gap: spacing.xs, minWidth: 92 }}>
      <MetricRing label={item.label} max={100} size={size} subLabel={`${item.valueLabel} / ${item.targetLabel}`} tone={item.tone} value={current} />
      <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
        {item.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function SemiGauge({
  label,
  score,
  size = 176,
  tone = "blue"
}: {
  label: string;
  score: number;
  size?: number | undefined;
  tone?: VisualTone | undefined;
}) {
  return (
    <View accessibilityLabel={`${label}: ${Math.round(score)} percent`} style={{ alignItems: "center", minHeight: size / 1.9, width: size }}>
      <View style={{ height: size / 2, overflow: "hidden", width: size }}>
        <View style={{ height: size, position: "relative", width: size }}>
          <RingSegments ratio={score / 100} segmentCount={18} size={size} startAngle={180} sweepAngle={180} tone={tone} />
        </View>
      </View>
      <Text style={{ color: colorForTone(tone), fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{label}</Text>
    </View>
  );
}

export function ProgressMeter({ compact = false, item }: { compact?: boolean | undefined; item: ProgressVisual }) {
  const width = `${Math.max(5, clamp01(item.ratio) * 100)}%` as `${number}%`;
  return (
    <View accessibilityLabel={`${item.label}: ${item.valueLabel} of ${item.targetLabel}`} style={{ gap: spacing.xs }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: compact ? 12 : 14, fontWeight: "800", lineHeight: compact ? 16 : 18 }}>
          {item.label}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: compact ? 11 : 12, fontWeight: "800", lineHeight: 16 }}>
          {item.valueLabel} / {item.targetLabel}
        </Text>
      </View>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: radii.pill, height: compact ? 7 : 10, overflow: "hidden" }}>
        <View style={{ backgroundColor: colorForTone(item.tone), borderRadius: radii.pill, height: "100%", width }} />
      </View>
    </View>
  );
}

export function ModifierRow({ item }: { item: ModifierVisual }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 32 }}>
      <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>
        {item.label}
      </Text>
      <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: 12, fontWeight: "900", lineHeight: 16, maxWidth: 112, textAlign: "right" }}>
        {item.value}
      </Text>
      <View style={{ flexDirection: "row", gap: 3, width: 56 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`modifier-dot:${item.label}:${index}`}
            style={{
              backgroundColor: index < Math.round(clamp01(item.ratio) * 4) ? colorForTone(item.tone) : "rgba(255, 255, 255, 0.13)",
              borderRadius: radii.pill,
              flex: 1,
              height: 6
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function VisualMetricTile({ item }: { item: ModifierVisual }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: radii.tile,
        borderWidth: 1,
        flexBasis: 116,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: 86,
        padding: spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>
        {item.label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: 18, fontWeight: "900", lineHeight: 24 }}>
        {item.value}
      </Text>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.13)", borderRadius: radii.pill, height: 7, overflow: "hidden" }}>
        <View style={{ backgroundColor: colorForTone(item.tone), height: "100%", width: `${Math.max(8, clamp01(item.ratio) * 100)}%` }} />
      </View>
    </View>
  );
}

export function MiniBarChart({
  bars,
  height = 116,
  referenceLabel,
  testID
}: {
  bars: readonly BarVisual[];
  height?: number | undefined;
  referenceLabel?: string | undefined;
  testID?: string | undefined;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.sm, height }}>
        {bars.map((bar, index) => (
          <View key={`bar:${bar.label}:${index}`} style={{ alignItems: "center", flex: 1, gap: spacing.xs, height: "100%", justifyContent: "flex-end", minWidth: 22 }}>
            {bar.markerLabel ? <DashboardPill label={bar.markerLabel} tone="blue" /> : null}
            <View
              style={{
                backgroundColor: bar.faded ? "transparent" : colorForTone(bar.tone),
                borderColor: bar.faded ? "rgba(255, 255, 255, 0.24)" : `${colorForTone(bar.tone)}77`,
                borderRadius: 8,
                borderStyle: bar.faded ? "dashed" : "solid",
                borderWidth: bar.faded ? 1 : 0,
                height: `${Math.max(8, clamp01(bar.ratio) * 100)}%`,
                opacity: bar.faded ? 0.55 : 1,
                width: "72%"
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {bars.map((bar, index) => (
          <Text key={`bar-label:${bar.label}:${index}`} numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14, textAlign: "center" }}>
            {bar.label}
          </Text>
        ))}
      </View>
      {referenceLabel ? <Text style={{ color: colors.blueIQ, fontSize: 11, fontWeight: "800", lineHeight: 15, textAlign: "right" }}>{referenceLabel}</Text> : null}
    </View>
  );
}

export function WeeklyLoadBars(props: { bars: readonly BarVisual[]; testID?: string | undefined }) {
  return <MiniBarChart bars={props.bars} height={120} testID={props.testID} />;
}

function linePoint(point: TrendPoint, min: number, max: number, index: number, count: number, width: number, height: number) {
  const x = count <= 1 ? width / 2 : (index / (count - 1)) * width;
  const spread = Math.max(0.01, max - min);
  const y = height - ((point.value - min) / spread) * height;
  return { x, y };
}

export function TrendLineChart({
  accent = "blue",
  height = 96,
  points,
  testID,
  width = 250
}: {
  accent?: VisualTone | undefined;
  height?: number | undefined;
  points: readonly TrendPoint[];
  testID?: string | undefined;
  width?: number | undefined;
}) {
  if (points.length === 0) {
    return (
      <View style={{ alignItems: "center", borderColor: colors.line, borderRadius: radii.tile, borderWidth: 1, minHeight: height, justifyContent: "center" }} testID={testID}>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>Trend unknown</Text>
      </View>
    );
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const dots = points.map((point, index) => linePoint(point, min, max, index, points.length, width, height));
  return (
    <View style={{ gap: spacing.xs }} testID={testID}>
      <View style={{ height: height + 12, maxWidth: "100%", overflow: "hidden", position: "relative", width }}>
        {dots.slice(1).map((dot, index) => {
          const previous = dots[index];
          if (!previous) {
            return null;
          }
          const dx = dot.x - previous.x;
          const dy = dot.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={`trend-line:${index}`}
              style={{
                backgroundColor: colorForTone(accent),
                borderRadius: radii.pill,
                height: 3,
                left: previous.x + dx / 2 - length / 2,
                opacity: 0.85,
                position: "absolute",
                top: previous.y + dy / 2 + 6,
                transform: [{ rotate: `${angle}rad` }],
                width: length
              }}
            />
          );
        })}
        {dots.map((dot, index) => (
          <View
            key={`trend-dot:${index}`}
            style={{
              backgroundColor: colors.cornerBlack,
              borderColor: colorForTone(accent),
              borderRadius: radii.pill,
              borderWidth: 3,
              height: 14,
              left: dot.x - 7,
              position: "absolute",
              top: dot.y,
              width: 14
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", maxWidth: "100%", width }}>
        {points.map((point, index) => (
          <Text key={`trend-label:${index}`} numberOfLines={1} style={{ color: colors.mutedText, fontSize: 10, fontWeight: "800", lineHeight: 14 }}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function DonutBreakdown({
  items,
  label,
  size = 144,
  testID
}: {
  items: readonly BreakdownVisual[];
  label: string;
  size?: number | undefined;
  testID?: string | undefined;
}) {
  const segmentCount = 36;
  const expanded = Array.from({ length: segmentCount }).map((_, index) => {
    const percent = ((index + 0.5) / segmentCount) * 100;
    let cumulative = 0;
    return items.find((item) => {
      cumulative += item.percent;
      return percent <= cumulative;
    }) ?? items[items.length - 1];
  });
  return (
    <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }} testID={testID}>
      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        {expanded.map((item, index) => {
          const angle = -90 + (360 * index) / segmentCount;
          const radius = size / 2 - 8;
          const radians = (angle * Math.PI) / 180;
          return (
            <View
              key={`donut:${index}`}
              style={{
                backgroundColor: item ? colorForTone(item.tone) : "rgba(255, 255, 255, 0.12)",
                borderRadius: radii.pill,
                height: 18,
                left: size / 2 + Math.cos(radians) * radius - 3,
                position: "absolute",
                top: size / 2 + Math.sin(radians) * radius - 9,
                transform: [{ rotate: `${angle + 90}deg` }],
                width: 6
              }}
            />
          );
        })}
        <Text style={{ color: colors.canvas, fontSize: 28, fontWeight: "900", lineHeight: 34 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.sm, minWidth: 160 }}>
        {items.map((item) => (
          <View key={`donut-row:${item.label}`} style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View style={{ backgroundColor: colorForTone(item.tone), borderRadius: radii.pill, height: 10, width: 10 }} />
            <Text numberOfLines={1} style={{ color: colors.canvas, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>
              {item.label}
            </Text>
            <Text style={{ color: colors.wrap, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
              {item.valueLabel}  {item.percent}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TimelineStrip({ items, testID }: { items: readonly TimelineVisual[]; testID?: string | undefined }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID={testID}>
      {items.map((item, index) => (
        <View
          key={`timeline:${item.label}:${index}`}
          style={{
            backgroundColor: toneWash[item.tone],
            borderColor: `${colorForTone(item.tone)}66`,
            borderRadius: radii.tile,
            borderWidth: 1,
            flexBasis: 148,
            flexGrow: 1,
            gap: spacing.xs,
            minHeight: 82,
            padding: spacing.md
          }}
        >
          <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
            {item.label}
          </Text>
          <Text numberOfLines={2} style={{ color: colors.canvas, fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "700", lineHeight: 15 }}>
            {item.subtitle}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function RangeGauge({
  current,
  currentLabel,
  max,
  min,
  target,
  targetLabel
}: {
  current: number | null;
  currentLabel: string;
  max: number | null;
  min: number | null;
  target: number | null;
  targetLabel: string;
}) {
  const lower = min ?? (current === null ? 0 : current - 2);
  const upper = max ?? (current === null ? 1 : current + 2);
  const spread = Math.max(0.1, upper - lower);
  const currentPosition = current === null ? 0.5 : clamp01((current - lower) / spread);
  const targetPosition = target === null ? null : clamp01((target - lower) / spread);
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{min === null ? "Min unknown" : `${lower.toFixed(1)} kg`}</Text>
        <Text style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>{max === null ? "Max unknown" : `${upper.toFixed(1)} kg`}</Text>
      </View>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: radii.pill, height: 18, overflow: "hidden", position: "relative" }}>
        <View style={{ backgroundColor: colors.redCorner, height: "100%", left: 0, opacity: 0.72, position: "absolute", width: "22%" }} />
        <View style={{ backgroundColor: colors.amberCaution, height: "100%", left: "22%", opacity: 0.8, position: "absolute", width: "24%" }} />
        <View style={{ backgroundColor: colors.readyGreen, height: "100%", left: "46%", opacity: 0.82, position: "absolute", width: "54%" }} />
        {targetPosition === null ? null : <View style={{ backgroundColor: colors.canvas, height: "100%", left: `${targetPosition * 100}%`, position: "absolute", width: 2 }} />}
        <View style={{ backgroundColor: colors.cornerBlack, borderColor: colors.blueIQ, borderRadius: radii.pill, borderWidth: 2, height: 18, left: `${currentPosition * 100}%`, marginLeft: -9, position: "absolute", top: 0, width: 18 }} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <Text style={{ color: colors.readyGreen, flex: 1, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{currentLabel}</Text>
        <Text style={{ color: colors.blueIQ, flex: 1, fontSize: 13, fontWeight: "900", lineHeight: 17, textAlign: "right" }}>{targetLabel}</Text>
      </View>
    </View>
  );
}

export function HeatmapDots({ dots }: { dots: readonly VisualTone[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {dots.map((tone, index) => (
        <View key={`heat-dot:${index}`} style={{ backgroundColor: colorForTone(tone), borderRadius: radii.pill, height: 10, opacity: tone === "muted" ? 0.65 : 1, width: 10 }} />
      ))}
    </View>
  );
}

export function BlockOverviewDots({
  weeks,
  testID
}: {
  testID?: string | undefined;
  weeks: readonly {
    active: boolean;
    dots: readonly VisualTone[];
    label: string;
    subtitle: string;
  }[];
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID={testID}>
      {weeks.map((week) => (
        <View
          key={`block-week:${week.label}:${week.subtitle}`}
          style={{
            backgroundColor: week.active ? "rgba(39, 206, 241, 0.12)" : "rgba(255, 255, 255, 0.055)",
            borderColor: week.active ? "rgba(39, 206, 241, 0.8)" : colors.line,
            borderRadius: radii.tile,
            borderWidth: 1,
            flexBasis: 130,
            flexGrow: 1,
            gap: spacing.sm,
            padding: spacing.md
          }}
        >
          <Text numberOfLines={1} style={{ color: colors.canvas, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
            {week.label}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: "800", lineHeight: 15 }}>
            {week.subtitle}
          </Text>
          <HeatmapDots dots={week.dots} />
        </View>
      ))}
    </View>
  );
}
