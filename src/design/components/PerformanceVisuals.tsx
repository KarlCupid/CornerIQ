import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { glassStyles } from "../glass";
import { useLuminousScreenTheme } from "../luminousTheme";
import { colors, radii, spacing } from "../theme";
import { fontFamilies } from "../typography";
import type { BarVisual, BreakdownVisual, ModifierVisual, ProgressVisual, TimelineVisual, TrendPoint, VisualTone, WorkoutLogContributionVisual } from "../../engine/presentation/dashboardVisualData";
import { PremiumCard } from "./PremiumPrimitives";

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

interface ChartPoint {
  x: number;
  y: number;
}

function smoothPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0]!.x} ${points[0]!.y}`;
  }
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export function SvgProgressRing({
  accessibilityLabel,
  children,
  ratio,
  size = 96,
  strokeWidth = 8,
  testID,
  tone = "blue"
}: React.PropsWithChildren<{
  accessibilityLabel: string;
  ratio: number;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  testID?: string | undefined;
  tone?: VisualTone | undefined;
}>) {
  const clamped = clamp01(ratio);
  const color = colorForTone(tone);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: "center", height: size, justifyContent: "center", position: "relative", width: size }}
      testID={testID}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={center}
          cy={center}
          fill="transparent"
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={center}
          cy={center}
          fill="transparent"
          r={radius}
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={{ alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 }}>
        {children}
      </View>
    </View>
  );
}

export function DashboardCard({
  children,
  density = "compact",
  footer,
  headerRight,
  testID,
  title,
  titleVariant = "quiet"
}: React.PropsWithChildren<{
  density?: "compact" | "regular" | undefined;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  testID?: string | undefined;
  title: string;
  titleVariant?: "loud" | "quiet" | undefined;
}>) {
  const quietTitle = titleVariant === "quiet";
  const theme = useLuminousScreenTheme();
  return (
    <PremiumCard density={density === "compact" ? "compact" : "regular"} testID={testID}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text numberOfLines={2} style={{ color: quietTitle ? colors.wrap : theme.accentColor, flex: 1, fontFamily: quietTitle ? fontFamilies.bold : fontFamilies.black, fontSize: quietTitle ? 14 : 12, fontWeight: quietTitle ? "700" : "900", letterSpacing: 0, lineHeight: quietTitle ? 18 : 16, textTransform: quietTitle ? "none" : "uppercase" }}>
          {quietTitle ? title : title.toUpperCase()}
        </Text>
        {headerRight}
      </View>
      {children}
      {footer}
    </PremiumCard>
  );
}

export function DashboardPill({ label, tone: _tone = "blue" }: { label: string; tone?: VisualTone | undefined }) {
  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignSelf: "flex-start",
        maxWidth: 180,
        color: colors.wrap,
        fontFamily: fontFamilies.extraBold,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0,
        lineHeight: 16
      }}
    >
      {label}
    </Text>
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
    <SvgProgressRing
      accessibilityLabel={`${label}: ${value === null ? "not logged" : `${value} of ${max}`}`}
      ratio={ratio}
      size={size}
      strokeWidth={8}
      testID={testID}
      tone={value === null ? "muted" : tone}
    >
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ color: colors.canvas, fontFamily: fontFamilies.black, fontSize: value === null ? 28 : 40, fontWeight: "900", lineHeight: value === null ? 34 : 46 }}>
          {value === null ? "Log" : Math.round(value)}
        </Text>
        <Text style={{ color: colors.wrap, fontFamily: fontFamilies.extraBold, fontSize: 13, fontWeight: "800", lineHeight: 17 }}>
          {subLabel ?? `/${max}`}
        </Text>
      </View>
    </SvgProgressRing>
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

export function VisualMetricTile({ item, variant = "loud" }: { item: ModifierVisual; variant?: "loud" | "quiet" | undefined }) {
  const quiet = variant === "quiet";
  const theme = useLuminousScreenTheme();
  return (
    <View
      style={{
        ...glassStyles.tile,
        backgroundColor: theme.tile,
        borderColor: theme.tileBorder,
        flexBasis: quiet ? 128 : 116,
        flexGrow: 1,
        gap: spacing.xs,
        minHeight: quiet ? 70 : 86,
        padding: quiet ? spacing.sm : spacing.md
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.wrap, fontSize: 11, fontWeight: quiet ? "700" : "900", lineHeight: 15 }}>
        {quiet ? item.label : item.label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={{ color: colorForTone(item.tone), fontSize: quiet ? 16 : 18, fontWeight: quiet ? "800" : "900", lineHeight: quiet ? 21 : 24 }}>
        {item.value}
      </Text>
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.13)", borderRadius: radii.pill, height: quiet ? 5 : 7, overflow: "hidden" }}>
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
  const theme = useLuminousScreenTheme();
  const maxValue = Math.max(0, ...bars.map((bar) => bar.value));
  const topAxis = maxValue > 0 ? String(Math.ceil(maxValue)) : "";
  const midAxis = maxValue > 1 ? String(Math.round(maxValue / 2)) : "";
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <View style={{ alignItems: "stretch", flexDirection: "row", gap: spacing.sm }}>
        <View style={{ alignItems: "flex-end", height, justifyContent: "space-between", width: 30 }}>
          {[topAxis, midAxis, "0"].map((value, index) => (
            <Text key={`bar-axis:${index}`} numberOfLines={1} style={{ color: colors.mutedText, fontFamily: fontFamilies.extraBold, fontSize: 10, fontWeight: "800", lineHeight: 12 }}>
              {value}
            </Text>
          ))}
        </View>
        <View style={{ alignItems: "flex-end", flex: 1, flexDirection: "row", gap: spacing.sm, height }}>
          {bars.map((bar, index) => (
            <View key={`bar:${bar.label}:${index}`} style={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", minWidth: 22 }}>
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
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, paddingLeft: 30 + spacing.sm }}>
        {bars.map((bar, index) => (
          <Text key={`bar-label:${bar.label}:${index}`} numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontFamily: fontFamilies.extraBold, fontSize: 10, fontWeight: "800", lineHeight: 14, textAlign: "center" }}>
            {bar.label}
          </Text>
        ))}
      </View>
      {referenceLabel ? <Text style={{ color: theme.accentColor, fontFamily: fontFamilies.extraBold, fontSize: 11, fontWeight: "800", lineHeight: 15, textAlign: "right" }}>{referenceLabel}</Text> : null}
    </View>
  );
}

export function WeeklyLoadBars(props: { bars: readonly BarVisual[]; testID?: string | undefined }) {
  return <MiniBarChart bars={props.bars} height={120} testID={props.testID} />;
}

const workoutLogFill: Record<0 | 1 | 2 | 3, string> = {
  0: "rgba(232, 240, 255, 0.07)",
  1: "rgba(39, 206, 241, 0.34)",
  2: "rgba(39, 206, 241, 0.58)",
  3: colors.blueIQ
};

export function WorkoutLogContributionGrid({
  visual,
  testID
}: {
  visual: WorkoutLogContributionVisual;
  testID?: string | undefined;
}) {
  return (
    <View
      accessibilityLabel={`${visual.totalLoggedDays} workout days logged in ${visual.windowLabel}. ${visual.totalMinutes} total minutes.`}
      style={{ gap: spacing.md }}
      testID={testID}
    >
      <View style={{ alignItems: "baseline", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
        <Text style={{ color: colors.canvas, flexShrink: 1, fontFamily: fontFamilies.extraBold, fontSize: 24, fontWeight: "800", lineHeight: 30 }}>
          {visual.totalLoggedDays} logged day{visual.totalLoggedDays === 1 ? "" : "s"}
        </Text>
        <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.extraBold, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "right" }}>
          {visual.totalMinutes} min
        </Text>
      </View>
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.sm }}>
        <View style={{ gap: 6, paddingTop: 18, width: 14 }}>
          {visual.weekdayLabels.map((label, index) => (
            <Text key={`workout-log-weekday:${label}:${index}`} style={{ color: colors.mutedText, fontFamily: fontFamilies.bold, fontSize: 9, fontWeight: "700", height: 14, lineHeight: 14, textAlign: "center" }}>
              {label}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: "row", gap: 7, justifyContent: "space-between" }}>
          {visual.weeks.map((week, weekIndex) => (
            <View key={`workout-log-week:${week.label}:${weekIndex}`} style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.mutedText, fontFamily: fontFamilies.bold, fontSize: 9, fontWeight: "700", lineHeight: 12, textAlign: "center" }}>
                {week.label}
              </Text>
              {week.days.map((day) => (
                <View
                  accessibilityLabel={`${day.date}: ${day.valueLabel}`}
                  key={`workout-log-day:${day.date}`}
                  style={{
                    backgroundColor: workoutLogFill[day.level],
                    borderColor: day.logged ? "rgba(39, 206, 241, 0.34)" : "rgba(232, 240, 255, 0.08)",
                    borderRadius: 4,
                    borderWidth: 1,
                    height: 14,
                    opacity: day.logged ? 1 : 0.86,
                    width: "100%"
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "flex-end" }}>
        <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.bold, fontSize: 10, fontWeight: "700", lineHeight: 14 }}>Less</Text>
        {[0, 1, 2, 3].map((level) => (
          <View key={`workout-log-legend:${level}`} style={{ backgroundColor: workoutLogFill[level as 0 | 1 | 2 | 3], borderColor: "rgba(232, 240, 255, 0.11)", borderRadius: 3, borderWidth: 1, height: 10, width: 10 }} />
        ))}
        <Text style={{ color: colors.mutedText, fontFamily: fontFamilies.bold, fontSize: 10, fontWeight: "700", lineHeight: 14 }}>More</Text>
      </View>
    </View>
  );
}

export function TrendLineChart({
  accent = "blue",
  height = 128,
  points,
  testID,
  width = 280
}: {
  accent?: VisualTone | undefined;
  height?: number | undefined;
  points: readonly TrendPoint[];
  testID?: string | undefined;
  width?: number | undefined;
}) {
  const [layoutWidth, setLayoutWidth] = React.useState(width);
  const theme = useLuminousScreenTheme();
  const chartWidth = Math.max(240, layoutWidth || width);
  const plotHeight = Math.max(56, height);
  const accentColor = colorForTone(accent);
  if (points.length === 0) {
    return (
      <View
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0) {
            setLayoutWidth(nextWidth);
          }
        }}
        style={{
          ...glassStyles.tile,
          alignItems: "center",
          alignSelf: "stretch",
          backgroundColor: theme.tile,
          borderColor: `${accentColor}2F`,
          boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 10px 28px rgba(0, 0, 0, 0.2), 0 0 18px ${toneWash[accent]}`,
          gap: spacing.xs,
          minHeight: height,
          justifyContent: "center",
          padding: spacing.lg,
          width: "100%"
        }}
        testID={testID}
      >
        <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "900", lineHeight: 20, textAlign: "center" }}>Trend unknown</Text>
        <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700", lineHeight: 16, textAlign: "center" }}>Log more body weights to draw the line.</Text>
      </View>
    );
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const minPoint = points[values.indexOf(min)];
  const maxPoint = points[values.indexOf(max)];
  const latestPoint = points[points.length - 1];
  const spread = Math.max(0.01, max - min);
  const flatTrend = points.length === 1 || min === max;
  const ratios = points.map((point) => (flatTrend ? 0.5 : clamp01((point.value - min) / spread)));
  const horizontalPadding = 26;
  const topPadding = 26;
  const bottomPadding = 24;
  const innerWidth = Math.max(1, chartWidth - horizontalPadding * 2);
  const innerHeight = Math.max(1, plotHeight - topPadding - bottomPadding);
  const chartPoints = points.map((point, index) => ({
    x: horizontalPadding + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / Math.max(1, points.length - 1)),
    y: topPadding + (1 - (ratios[index] ?? 0.5)) * innerHeight
  }));
  const linePath = smoothPath(chartPoints);
  const firstChartPoint = chartPoints[0];
  const lastChartPoint = chartPoints[chartPoints.length - 1];
  const areaPath = linePath && firstChartPoint && lastChartPoint
    ? `${linePath} L ${lastChartPoint.x} ${plotHeight - bottomPadding} L ${firstChartPoint.x} ${plotHeight - bottomPadding} Z`
    : "";
  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0) {
          setLayoutWidth(nextWidth);
        }
      }}
      style={{ alignSelf: "stretch", gap: spacing.sm, width: "100%" }}
      testID={testID}
    >
      <View
        style={{
          ...glassStyles.tile,
          backgroundColor: theme.tile,
          borderColor: `${accentColor}30`,
          boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 26px rgba(0, 0, 0, 0.24), 0 0 18px ${toneWash[accent]}`,
          height: plotHeight,
          overflow: "hidden",
          position: "relative",
          width: "100%"
        }}
      >
        <Svg height={plotHeight} width={chartWidth}>
          {[0, 0.5, 1].map((row) => (
            <Line
              key={`grid:${row}`}
              stroke="rgba(255, 255, 255, 0.10)"
              {...(row === 0.5 ? { strokeDasharray: "5 6" } : {})}
              strokeWidth={1}
              x1={horizontalPadding}
              x2={chartWidth - horizontalPadding}
              y1={topPadding + innerHeight * row}
              y2={topPadding + innerHeight * row}
            />
          ))}
          <Line
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={1}
            x1={horizontalPadding}
            x2={chartWidth - horizontalPadding}
            y1={plotHeight - bottomPadding}
            y2={plotHeight - bottomPadding}
          />
          {lastChartPoint ? (
            <Line
              stroke={`${accentColor}55`}
              strokeDasharray="4 5"
              strokeWidth={1}
              x1={lastChartPoint.x}
              x2={lastChartPoint.x}
              y1={topPadding}
              y2={plotHeight - bottomPadding}
            />
          ) : null}
          {areaPath ? <Path d={areaPath} fill={`${accentColor}1F`} /> : null}
          {linePath ? (
            <Path
              d={linePath}
              fill="transparent"
              stroke={`${accentColor}55`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={7}
            />
          ) : null}
          {linePath ? (
            <Path
              d={linePath}
              fill="transparent"
              stroke={accentColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3.5}
            />
          ) : null}
          {chartPoints.map((point, index) => (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={index === chartPoints.length - 1 ? accentColor : colors.cornerBlack}
              key={`trend-dot:${points[index]?.label ?? index}`}
              r={index === chartPoints.length - 1 ? 5.5 : 4}
              stroke={index === chartPoints.length - 1 ? colors.canvas : `${accentColor}BB`}
              strokeWidth={index === chartPoints.length - 1 ? 2 : 2.5}
            />
          ))}
        </Svg>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", left: spacing.sm, position: "absolute", right: spacing.sm, top: spacing.sm }}>
          <View
            style={{
              backgroundColor: `${accentColor}22`,
              borderColor: `${accentColor}55`,
              borderRadius: radii.pill,
              borderWidth: 1,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2
            }}
          >
            <Text numberOfLines={1} style={{ color: accentColor, fontSize: 10, fontWeight: "900", lineHeight: 14 }}>
              {latestPoint?.valueLabel ?? (min === max ? `${Math.round(max)}` : `${Math.round(min)}-${Math.round(max)}`)}
            </Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14, textAlign: "right" }}>
            {points.length} logs
          </Text>
        </View>
        <View style={{ bottom: spacing.sm, flexDirection: "row", justifyContent: "space-between", left: spacing.sm, position: "absolute", right: spacing.sm }}>
          <Text numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14 }}>
            Low {minPoint?.valueLabel ?? "unknown"}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14, textAlign: "right" }}>
            High {maxPoint?.valueLabel ?? "unknown"}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
        {points.map((point, index) => (
          <Text key={`trend-label:${point.label}:${index}`} numberOfLines={1} style={{ color: colors.mutedText, flex: 1, fontSize: 10, fontWeight: "800", lineHeight: 14, minWidth: 0, textAlign: "center" }}>
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
            ...glassStyles.tile,
            backgroundColor: toneWash[item.tone],
            borderColor: `${colorForTone(item.tone)}66`,
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
  const theme = useLuminousScreenTheme();
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
        <View style={{ backgroundColor: colors.cornerBlack, borderColor: theme.accentColor, borderRadius: radii.pill, borderWidth: 2, height: 18, left: `${currentPosition * 100}%`, marginLeft: -9, position: "absolute", top: 0, width: 18 }} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
        <Text style={{ color: colors.readyGreen, flex: 1, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>{currentLabel}</Text>
        <Text style={{ color: theme.accentColor, flex: 1, fontSize: 13, fontWeight: "900", lineHeight: 17, textAlign: "right" }}>{targetLabel}</Text>
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
  const theme = useLuminousScreenTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} testID={testID}>
      {weeks.map((week) => (
        <View
          key={`block-week:${week.label}:${week.subtitle}`}
          style={{
            ...glassStyles.tile,
            backgroundColor: week.active ? theme.control : theme.tile,
            borderColor: week.active ? theme.accentColor : theme.tileBorder,
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
