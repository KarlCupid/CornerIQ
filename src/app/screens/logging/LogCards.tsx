import React, { useState } from "react";
import { Pressable, Text as NativeText, TextInput, View, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { useFormMessage } from "../../forms/useFormMessage";
import {
  parseOptionalNonNegativeNumber,
  parseOptionalPositiveInteger,
  parseRequiredNonNegativeNumber,
  parseRequiredInteger,
  parseRequiredPositiveInteger,
  parseRequiredPositiveNumber,
  validateOneToFive
} from "../../forms/validation";
import { EngineCard } from "../../../design/components/EngineCard";
import { colors, radii, spacing } from "../../../design/theme";
import { fontFamilies } from "../../../design/typography";
import type { QuickLogActions } from "../../../hooks/useQuickLogs";
import type { CycleSymptom, RecentLogsViewModel, SessionIntensity } from "../../../engine/core/types";
import { screenStyles } from "../screenStyles";
import { convertMassCopy } from "../displayUnits";

interface LogCardProps {
  busy: boolean;
}

interface QuickLogCardProps extends LogCardProps {
  compact?: boolean | undefined;
  forceOpen?: boolean | undefined;
  actions: QuickLogActions;
  framed?: boolean | undefined;
  onLogged?: (() => void) | undefined;
  surface?: "default" | "fuel" | "today" | undefined;
}

type QuickLogSurface = NonNullable<QuickLogCardProps["surface"]>;

type DailyLogStatus = RecentLogsViewModel["readinessToday"];
type BodyMassTodayStatus = RecentLogsViewModel["bodyMassToday"];
type HydrationTodayStatus = RecentLogsViewModel["hydrationToday"];
type FoodTodayStatus = RecentLogsViewModel["foodToday"];
type ScaleValue = "1" | "2" | "3" | "4" | "5";

const scaleValues: readonly ScaleValue[] = ["1", "2", "3", "4", "5"];
const KG_PER_LB = 0.45359237;

const fuelLogSurface = {
  actionFill: "rgba(148, 88, 54, 0.34)",
  actionBorder: "rgba(217, 160, 112, 0.54)",
  actionShadow: "rgba(119, 69, 38, 0.28)",
  controlFill: "rgba(244, 230, 207, 0.064)",
  controlLine: "rgba(222, 190, 150, 0.18)",
  textBody: "#D8D0C3",
  textMuted: "#AFA595",
  textPrimary: "#F4EFE8"
} as const;

const todayLogSurface = {
  actionBorder: "rgba(39, 206, 241, 0.58)",
  actionFill: "#27CEF1",
  controlFill: "rgba(224, 244, 252, 0.055)",
  controlFillPressed: "rgba(39, 206, 241, 0.13)",
  controlLine: "rgba(205, 239, 247, 0.18)",
  textBody: "#D7E7F4",
  textMuted: "#A9BDD0",
  textPrimary: "#F6FBFF"
} as const;

const QuickLogSurfaceContext = React.createContext<QuickLogSurface>("default");

function editorialFontForStyle(style: TextStyle): string {
  const weight = Number.parseInt(String(style.fontWeight ?? "400"), 10);
  if (weight >= 900) return fontFamilies.black;
  if (weight >= 800) return fontFamilies.extraBold;
  if (weight >= 700) return fontFamilies.bold;
  if (weight >= 600) return fontFamilies.semibold;
  if (weight >= 500) return fontFamilies.medium;
  return fontFamilies.regular;
}

function flattenEditorialStyle(style: unknown): TextStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((item) => flattenEditorialStyle(item)));
  }
  return style && typeof style === "object" ? style as TextStyle : {};
}

function Text({ style, ...props }: TextProps) {
  const surface = React.useContext(QuickLogSurfaceContext);
  const flattened = flattenEditorialStyle(style);
  const todayColor =
    flattened.color === colors.canvas || flattened.color === colors.readyGreen
      ? todayLogSurface.textPrimary
      : flattened.color === colors.wrap
        ? todayLogSurface.textBody
        : flattened.color === colors.mutedText || flattened.color === colors.redCorner
          ? todayLogSurface.textMuted
          : flattened.color;
  return (
    <NativeText
      {...props}
      style={surface === "today" ? [style, { color: todayColor, fontFamily: editorialFontForStyle(flattened) }] : style}
    />
  );
}

function todayActionStyle(secondary = false): ViewStyle {
  return {
    backgroundColor: secondary ? "transparent" : todayLogSurface.actionFill,
    borderColor: secondary ? todayLogSurface.controlLine : todayLogSurface.actionBorder,
    borderRadius: 5,
    borderWidth: 1,
    boxShadow: "none",
    minHeight: secondary ? 44 : 52
  };
}

const todayActionTextStyle: TextStyle = {
  color: colors.cornerBlack,
  fontFamily: fontFamilies.black,
  fontSize: 14,
  fontWeight: "900",
  lineHeight: 18
};

const todayQuietTextStyle: TextStyle = {
  color: todayLogSurface.textPrimary,
  fontFamily: fontFamilies.bold,
  fontSize: 14,
  fontWeight: "700",
  lineHeight: 18
};

function ToggleButton({ active, busy, compact = false, label, onPress }: { active: boolean; busy: boolean; compact?: boolean | undefined; label: string; onPress: () => void }) {
  const surface = React.useContext(QuickLogSurfaceContext);
  const todaySurface = surface === "today";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={[screenStyles.chip, compact ? { minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs } : null, todaySurface ? todayActionStyle(true) : null, todaySurface && active ? { backgroundColor: todayLogSurface.controlFillPressed, borderColor: todayLogSurface.actionBorder } : active ? screenStyles.chipSelected : null]}
    >
      <Text style={[screenStyles.chipText, todaySurface ? todayQuietTextStyle : null, active ? screenStyles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function QuickLogHelp() {
  return <Text style={screenStyles.subtle}>Log enough for today. Optional fields can stay blank; missed logs stay unknown.</Text>;
}

function EngineUseRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexBasis: 142, flexGrow: 1, gap: 2 }}>
      <Text style={{ color: colors.wrap, fontSize: 11, fontWeight: "900", lineHeight: 15 }}>{label}</Text>
      <Text style={screenStyles.subtle}>{value}</Text>
    </View>
  );
}

function DailyLogFrame({
  busy,
  children,
  displayCopy = (value: string) => value,
  forceOpen = false,
  framed = true,
  surface = "default",
  status,
  title
}: React.PropsWithChildren<{
  busy: boolean;
  displayCopy?: ((value: string) => string) | undefined;
  forceOpen?: boolean | undefined;
  framed?: boolean | undefined;
  surface?: QuickLogSurface | undefined;
  status?: DailyLogStatus | undefined;
  title: string;
}>) {
  const [open, setOpen] = useState(() => forceOpen || !(status?.loggedToday ?? false));

  React.useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (status?.loggedToday) {
      setOpen(false);
    }
  }, [forceOpen, status?.loggedToday, status?.summary]);

  const content = (
    <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>{title}</Text>
        {status ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={status.loggedToday ? screenStyles.successText : screenStyles.callout}>{status.statusLabel}</Text>
            <Text style={screenStyles.body}>{displayCopy(status.summary)}</Text>
            <Text style={screenStyles.subtle}>Why: {displayCopy(status.why)}</Text>
          </View>
        ) : (
          <QuickLogHelp />
        )}
        {status?.loggedToday && !open ? (
          <Pressable accessibilityLabel={status.actionLabel} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setOpen(true)} style={screenStyles.quietButton}>
            <Text style={screenStyles.quietButtonText}>{status.actionLabel}</Text>
          </Pressable>
        ) : null}
        {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
    </View>
  );

  return (
    <QuickLogSurfaceContext.Provider value={surface}>
      {framed ? <EngineCard>{content}</EngineCard> : content}
    </QuickLogSurfaceContext.Provider>
  );
}

function FrameOrPlain({ children, framed = true, surface = "default" }: React.PropsWithChildren<{ framed?: boolean | undefined; surface?: QuickLogSurface | undefined }>) {
  const content = <View style={{ gap: spacing.sm }}>{children}</View>;
  return <QuickLogSurfaceContext.Provider value={surface}>{framed ? <EngineCard>{content}</EngineCard> : content}</QuickLogSurfaceContext.Provider>;
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <Text style={screenStyles.fieldLabel}>{children}</Text>;
}

function CompactField({
  compact = false,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value
}: {
  compact?: boolean | undefined;
  keyboardType: "decimal-pad" | "number-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const surface = React.useContext(QuickLogSurfaceContext);
  const todaySurface = surface === "today";
  return (
    <View style={{ flexBasis: compact ? 132 : 148, flexGrow: 1, gap: spacing.xs, minWidth: compact ? 118 : 132 }}>
      <InputLabel>{label}</InputLabel>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={todaySurface ? todayLogSurface.textMuted : colors.wrap}
        style={[screenStyles.input, compact ? { fontSize: 15, minHeight: 44, paddingVertical: spacing.xs } : null, todaySurface ? { backgroundColor: todayLogSurface.controlFill, borderColor: todayLogSurface.controlLine, borderRadius: 5, color: todayLogSurface.textPrimary, fontFamily: fontFamilies.medium } : null]}
        value={value}
      />
    </View>
  );
}

function ReadinessScaleHelp() {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={screenStyles.subtle}>Use a 1-5 scale: 1 = low/poor, 5 = high/great.</Text>
      <Text style={screenStyles.subtle}>For soreness/stress: 1 = none/easy, 5 = very high.</Text>
    </View>
  );
}

function ScaleSegmentedControl({
  busy,
  compact = false,
  label,
  onChange,
  style,
  value
}: {
  busy: boolean;
  compact?: boolean | undefined;
  label: string;
  onChange: (value: ScaleValue) => void;
  style?: ViewStyle | undefined;
  value: string;
}) {
  const surface = React.useContext(QuickLogSurfaceContext);
  const todaySurface = surface === "today";
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <InputLabel>{label}</InputLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {scaleValues.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              accessibilityLabel={`${label} ${option}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, selected }}
              disabled={busy}
              key={`scale-option:${option}`}
              onPress={() => onChange(option)}
              style={[screenStyles.chip, { borderRadius: todaySurface ? 5 : 16, minHeight: todaySurface ? 44 : compact ? 34 : 36, minWidth: compact ? 38 : 42, paddingHorizontal: spacing.sm }, todaySurface ? todayActionStyle(true) : null, todaySurface && selected ? { backgroundColor: todayLogSurface.controlFillPressed, borderColor: todayLogSurface.actionBorder } : selected ? screenStyles.chipSelected : null]}
            >
              <Text style={[screenStyles.chipText, todaySurface ? todayQuietTextStyle : null, selected ? screenStyles.chipTextSelected : null]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function parseRequiredSessionRpe(value: string): number {
  const parsed = parseRequiredInteger(value, "Session RPE", { example: "6" });
  if (parsed < 1 || parsed > 10) {
    throw new Error("Session RPE is required: choose a whole number from 1 to 10. Example: 6.");
  }
  return parsed;
}

function intensityFromSessionRpe(rpe: number): SessionIntensity {
  if (rpe <= 3) {
    return "easy";
  }
  if (rpe <= 6) {
    return "moderate";
  }
  if (rpe <= 8) {
    return "hard";
  }
  return "max";
}

function previewNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function foodEnergyPreview(
  input: { calories: string; protein: string; carbs: string; fat: string },
  validateFoodEnergy: QuickLogActions["validateFoodEnergy"]
): { message: string; valid: boolean } | null {
  const parsed = {
    calories: previewNumber(input.calories),
    proteinGrams: previewNumber(input.protein),
    carbohydrateGrams: previewNumber(input.carbs),
    fatGrams: previewNumber(input.fat)
  };
  const values = [parsed.calories, parsed.proteinGrams, parsed.carbohydrateGrams, parsed.fatGrams];
  if (values.every((value) => value === null)) {
    return null;
  }
  if (parsed.calories === null) {
    return { message: "Enter calories before saving food. Macros can stay blank when unknown.", valid: true };
  }
  if (!validateFoodEnergy) {
    return null;
  }
  const validation = validateFoodEnergy({
    calories: parsed.calories,
    ...(parsed.proteinGrams === null ? {} : { proteinGrams: parsed.proteinGrams }),
    ...(parsed.carbohydrateGrams === null ? {} : { carbohydrateGrams: parsed.carbohydrateGrams }),
    ...(parsed.fatGrams === null ? {} : { fatGrams: parsed.fatGrams })
  });
  return { message: validation.athleteFacingMessage, valid: validation.valid };
}

export function BodyMassLogCard({
  actions,
  busy,
  compact = false,
  forceOpen,
  framed,
  onLogged,
  preferredUnits = "metric",
  status,
  surface = "default",
  title = "Body weight"
}: QuickLogCardProps & { preferredUnits?: "metric" | "imperial" | undefined; status?: BodyMassTodayStatus | undefined; title?: string | undefined }) {
  const [bodyMassValue, setBodyMassValue] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Body weight log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  const usesImperial = preferredUnits === "imperial";
  const unitLabel = usesImperial ? "lb" : "kg";
  const bodyMassExample = usesImperial ? "146" : "66.4";
  return (
    <DailyLogFrame busy={busy} displayCopy={(value) => convertMassCopy(value, preferredUnits)} forceOpen={forceOpen} framed={framed} status={status} surface={surface} title={title}>
        {compact ? null : <QuickLogHelp />}
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <CompactField compact={compact} keyboardType="decimal-pad" label={`Body weight (${unitLabel})`} onChangeText={setBodyMassValue} placeholder={unitLabel} value={bodyMassValue} />
        <Pressable
          accessibilityLabel={busy ? "Saving body weight log" : status?.loggedToday ? "Update body weight" : "Log body weight"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              const enteredBodyMass = parseRequiredPositiveNumber(bodyMassValue, "Body weight", { example: bodyMassExample });
              await actions.logBodyMass({ bodyMassKg: usesImperial ? enteredBodyMass * KG_PER_LB : enteredBodyMass });
              setBodyMassValue("");
              setSuccess(`Body weight saved in ${unitLabel}. Trend confidence has fresher scale context; readiness can still be unknown.`);
              onLogged?.();
            })
          }
          style={[screenStyles.button, surface === "today" ? todayActionStyle() : null]}
        >
          <Text style={[screenStyles.buttonText, surface === "today" ? todayActionTextStyle : null]}>{busy ? "Saving body weight..." : status?.loggedToday ? "Update body weight" : "Log body weight"}</Text>
        </Pressable>
    </DailyLogFrame>
  );
}

export function ReadinessCheckInCard({ actions, busy, compact = false, forceOpen, framed, onLogged, status, surface = "default" }: QuickLogCardProps & { status?: DailyLogStatus | undefined }) {
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [energy, setEnergy] = useState("");
  const [soreness, setSoreness] = useState("");
  const [stress, setStress] = useState("");
  const [mood, setMood] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [illness, setIllness] = useState(false);
  const [dizziness, setDizziness] = useState(false);
  const [fainting, setFainting] = useState(false);
  const { message: error, runWithMessage } = useFormMessage("Readiness log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  const compactLayout = compact || framed === false;
  const requiredScaleStyle: ViewStyle = { flexBasis: compactLayout ? 118 : 152, flexGrow: 1, minWidth: compactLayout ? 106 : 146 };

  const clear = () => {
    setSleepHours("");
    setSleepQuality("");
    setEnergy("");
    setSoreness("");
    setStress("");
    setMood("");
    setPainNotes("");
    setIllness(false);
    setDizziness(false);
    setFainting(false);
  };

  return (
    <DailyLogFrame busy={busy} forceOpen={forceOpen} framed={framed} status={status} surface={surface} title={status?.loggedToday ? "Readiness summary" : "Readiness check due"}>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        {compactLayout ? null : <QuickLogHelp />}
        {compactLayout ? null : <ReadinessScaleHelp />}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <CompactField compact={compactLayout} keyboardType="decimal-pad" label="Sleep hours" onChangeText={setSleepHours} placeholder="Sleep hours" value={sleepHours} />
          <ScaleSegmentedControl busy={busy} compact={compactLayout} label="Energy (1-5)" onChange={setEnergy} style={requiredScaleStyle} value={energy} />
          <ScaleSegmentedControl busy={busy} compact={compactLayout} label="Soreness (1-5)" onChange={setSoreness} style={requiredScaleStyle} value={soreness} />
          <ScaleSegmentedControl busy={busy} compact={compactLayout} label="Sleep quality (1-5)" onChange={setSleepQuality} style={requiredScaleStyle} value={sleepQuality} />
          <ScaleSegmentedControl busy={busy} compact={compactLayout} label="Stress (1-5)" onChange={setStress} style={requiredScaleStyle} value={stress} />
          <ScaleSegmentedControl busy={busy} compact={compactLayout} label="Mood (1-5)" onChange={setMood} style={requiredScaleStyle} value={mood} />
        </View>
        <InputLabel>Pain notes (optional)</InputLabel>
        <TextInput accessibilityLabel="Pain notes" onChangeText={setPainNotes} placeholder="Pain notes optional" placeholderTextColor={surface === "today" ? todayLogSurface.textMuted : colors.wrap} style={[screenStyles.input, compactLayout ? { fontSize: 15, minHeight: 44, paddingVertical: spacing.xs } : null, surface === "today" ? { backgroundColor: todayLogSurface.controlFill, borderColor: todayLogSurface.controlLine, borderRadius: 5, color: todayLogSurface.textPrimary, fontFamily: fontFamilies.medium } : null]} value={painNotes} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={illness} busy={busy} compact={compactLayout} label="Illness" onPress={() => setIllness((value) => !value)} />
          <ToggleButton active={dizziness} busy={busy} compact={compactLayout} label="Dizziness" onPress={() => setDizziness((value) => !value)} />
          <ToggleButton active={fainting} busy={busy} compact={compactLayout} label="Fainting" onPress={() => setFainting((value) => !value)} />
        </View>
        <Pressable
          accessibilityLabel={busy ? "Saving readiness log" : status?.loggedToday ? "Update readiness" : "Log readiness"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              if (!sleepQuality.trim() || !stress.trim() || !mood.trim()) {
                throw new Error("Choose sleep quality, stress, and mood before logging readiness.");
              }
              await actions.logReadiness({
                sleepHours: parseRequiredNonNegativeNumber(sleepHours, "Sleep hours", { example: "7.5" }),
                sleepQuality1To5: validateOneToFive(sleepQuality, "Sleep quality"),
                energy1To5: validateOneToFive(energy, "Energy"),
                soreness1To5: validateOneToFive(soreness, "Soreness"),
                stress1To5: validateOneToFive(stress, "Stress"),
                mood1To5: validateOneToFive(mood, "Mood"),
                painNotes: painNotes.trim() ? [painNotes.trim()] : [],
                illnessSymptoms: illness ? ["illness"] : [],
                dizziness,
                fainting
              });
              clear();
              setSuccess("Readiness logged. CornerIQ has more confidence for today's training call.");
              onLogged?.();
            })
          }
          style={[screenStyles.button, surface === "today" ? todayActionStyle() : null]}
        >
          <Text style={[screenStyles.buttonText, surface === "today" ? todayActionTextStyle : null]}>{busy ? "Saving readiness..." : status?.loggedToday ? "Update readiness" : "Log readiness"}</Text>
        </Pressable>
    </DailyLogFrame>
  );
}

export function HydrationLogCard({ actions, busy, compact = false, framed, onLogged, status, surface = "default" }: QuickLogCardProps & { status?: HydrationTodayStatus | undefined }) {
  const [liters, setLiters] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [moreFieldsOpen, setMoreFieldsOpen] = useState(false);
  const { message: error, runWithMessage } = useFormMessage("Hydration log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  const actionLabel = (status?.actionLabel ?? "Add water").replace(/log\s+water/i, "Add water");
  const fuelSurface = surface === "fuel";
  return (
    <FrameOrPlain framed={framed} surface={surface}>
        <Text style={[screenStyles.sectionTitle, fuelSurface ? { color: fuelLogSurface.textPrimary, fontWeight: "800" } : null]}>Add water</Text>
        <Text style={[screenStyles.callout, fuelSurface ? { color: fuelLogSurface.textPrimary, fontWeight: "700" } : null]}>{status?.totalLabel ?? "Today's hydration total: add water when you have a true amount."}</Text>
        <Text style={[screenStyles.subtle, fuelSurface ? { color: fuelLogSurface.textMuted } : null]}>{status?.addToTodayCopy ?? "Add hydration to today. Each save adds another water/sodium entry; it does not replace or set a daily total."}</Text>
        {status ? <Text style={[screenStyles.subtle, fuelSurface ? { color: fuelLogSurface.textMuted } : null]}>Status: {status.statusLabel}. {status.summary}</Text> : <QuickLogHelp />}
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <CompactField compact={compact} keyboardType="decimal-pad" label="Water (liters)" onChangeText={setLiters} placeholder="Water liters" value={liters} />
          {moreFieldsOpen ? <CompactField compact={compact} keyboardType="number-pad" label="Sodium (mg, optional)" onChangeText={setSodiumMg} placeholder="Sodium mg optional" value={sodiumMg} /> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable
            accessibilityLabel={busy ? "Saving hydration log" : actionLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() =>
              runWithMessage(async () => {
                setSuccess(null);
                const sodium = parseOptionalNonNegativeNumber(sodiumMg, "Sodium");
                const payload = { liters: parseRequiredNonNegativeNumber(liters, "Water liters", { example: "2.5" }) };
                await actions.logHydration(sodium === undefined ? payload : { ...payload, sodiumMg: sodium });
                setLiters("");
                setSodiumMg("");
                setMoreFieldsOpen(false);
                setSuccess("Hydration logged. Fuel confidence has fresher fluid context; food can still be unknown.");
                onLogged?.();
              })
            }
            style={[
              screenStyles.button,
              { flexBasis: 180, flexGrow: 1 },
              fuelSurface
                ? {
                    backgroundColor: fuelLogSurface.actionFill,
                    borderColor: fuelLogSurface.actionBorder,
                    borderRadius: radii.pill,
                    boxShadow: `0 12px 28px ${fuelLogSurface.actionShadow}`
                  }
                : surface === "today" ? todayActionStyle() : null
            ]}
          >
            <Text style={[screenStyles.buttonText, fuelSurface ? { color: fuelLogSurface.textPrimary } : surface === "today" ? todayActionTextStyle : null]}>{busy ? "Saving water..." : actionLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={moreFieldsOpen ? "Hide more hydration fields" : "Show more hydration fields"}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, expanded: moreFieldsOpen }}
            disabled={busy}
            onPress={() => setMoreFieldsOpen((value) => !value)}
            style={[
              screenStyles.quietButton,
              { flexBasis: 132, flexGrow: 1 },
              fuelSurface ? { backgroundColor: fuelLogSurface.controlFill, borderColor: fuelLogSurface.controlLine } : surface === "today" ? todayActionStyle(true) : null
            ]}
          >
            <Text style={[screenStyles.quietButtonText, fuelSurface ? { color: fuelLogSurface.textBody } : surface === "today" ? todayQuietTextStyle : null]}>{moreFieldsOpen ? "Hide more fields" : "More fields"}</Text>
          </Pressable>
        </View>
    </FrameOrPlain>
  );
}

export function CycleLogCard({ actions, busy, cycleSymptomOptions, surface = "default" }: QuickLogCardProps & { cycleSymptomOptions: readonly CycleSymptom[] }) {
  const [flowLevel, setFlowLevel] = useState<"none" | "spotting" | "light" | "moderate" | "heavy" | "very_heavy" | "unknown">("unknown");
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [bleedStart, setBleedStart] = useState(false);
  const [bleedEnd, setBleedEnd] = useState(false);
  const [hormonalContraception, setHormonalContraception] = useState<"none" | "combined_pill" | "progestin_only_pill" | "hormonal_iud" | "copper_iud" | "implant" | "injection" | "patch" | "ring" | "unknown">("unknown");
  const { message: error, runWithMessage } = useFormMessage("Cycle log failed.");
  const [success, setSuccess] = useState<string | null>(null);

  const toggleSymptom = (symptom: CycleSymptom) => {
    setSymptoms((current) => (current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]));
  };

  return (
    <QuickLogSurfaceContext.Provider value={surface}>
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Cycle</Text>
        <Text style={screenStyles.subtle}>Optional and private. Log enough for today; this is for symptoms and training context, not fertility tracking.</Text>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Flow level</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["unknown", "none", "light", "moderate", "heavy", "very_heavy"] as const).map((level) => (
            <ToggleButton active={flowLevel === level} busy={busy} key={level} label={level.replace(/_/g, " ")} onPress={() => setFlowLevel(level)} />
          ))}
        </View>
        <InputLabel>Symptoms</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {cycleSymptomOptions.slice(0, 8).map((symptom, index) => (
            <ToggleButton active={symptoms.includes(symptom)} busy={busy} key={`cycle-symptom:${index}`} label={symptom.replace(/_/g, " ")} onPress={() => toggleSymptom(symptom)} />
          ))}
        </View>
        <InputLabel>Cycle notes for today</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={bleedStart} busy={busy} label="Bleed start" onPress={() => setBleedStart((value) => !value)} />
          <ToggleButton active={bleedEnd} busy={busy} label="Bleed end" onPress={() => setBleedEnd((value) => !value)} />
          <ToggleButton active={hormonalContraception !== "unknown"} busy={busy} label="Hormonal contraception" onPress={() => setHormonalContraception((value) => (value === "unknown" ? "combined_pill" : "unknown"))} />
        </View>
        <Pressable
          accessibilityLabel={busy ? "Saving cycle log" : "Log cycle"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              await actions.logCycle({
                flowLevel,
                symptoms,
                bleedStart,
                bleedEnd,
                hormonalContraception
              });
              setSymptoms([]);
              setBleedStart(false);
              setBleedEnd(false);
              setSuccess("Cycle log saved. Symptom context stays private and can improve today's confidence when relevant.");
            })
          }
          style={[screenStyles.button, surface === "today" ? todayActionStyle() : null]}
        >
          <Text style={[screenStyles.buttonText, surface === "today" ? todayActionTextStyle : null]}>{busy ? "Saving cycle..." : "Log cycle"}</Text>
        </Pressable>
      </View>
    </EngineCard>
    </QuickLogSurfaceContext.Provider>
  );
}

export function FoodQuickLogCard({ actions, busy, status, surface = "default" }: QuickLogCardProps & { status?: FoodTodayStatus | undefined }) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const [moreFieldsOpen, setMoreFieldsOpen] = useState(false);
  const { message: error, runWithMessage } = useFormMessage("Food log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  const macroPreview = foodEnergyPreview({ calories, protein, carbs, fat }, actions.validateFoodEnergy);
  const fuelSurface = surface === "fuel";
  return (
    <QuickLogSurfaceContext.Provider value={surface}>
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={[screenStyles.sectionTitle, fuelSurface ? { color: fuelLogSurface.textPrimary, fontWeight: "800" } : null]}>Log food</Text>
        <Text style={[screenStyles.body, fuelSurface ? { color: fuelLogSurface.textBody } : null]}>Add a meal, snack, or day total.</Text>
        <Text style={[screenStyles.subtle, fuelSurface ? { color: fuelLogSurface.textMuted } : null]}>Status: {status?.statusLabel ?? "Macro check"}. {status?.summary ?? status?.addEntryCopy ?? "Add to today; this does not replace existing food entries."}</Text>
        {macroPreview ? <Text style={macroPreview.valid ? screenStyles.subtle : [screenStyles.subtle, { color: colors.redCorner }]}>{macroPreview.message}</Text> : null}
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <CompactField keyboardType="number-pad" label="Calories" onChangeText={setCalories} placeholder="Calories" value={calories} />
          <CompactField keyboardType="decimal-pad" label="Protein (g)" onChangeText={setProtein} placeholder="Protein g" value={protein} />
          <CompactField keyboardType="decimal-pad" label="Carbs (g)" onChangeText={setCarbs} placeholder="Carbs g" value={carbs} />
          <CompactField keyboardType="decimal-pad" label="Fat (g)" onChangeText={setFat} placeholder="Fat g" value={fat} />
          {moreFieldsOpen ? (
            <>
              <CompactField keyboardType="decimal-pad" label="Fiber (g, optional)" onChangeText={setFiber} placeholder="Fiber g optional" value={fiber} />
              <CompactField keyboardType="number-pad" label="Sodium (mg, optional)" onChangeText={setSodium} placeholder="Sodium mg optional" value={sodium} />
            </>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Pressable
            accessibilityLabel={busy ? "Saving food log" : "Log food"}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() =>
              runWithMessage(async () => {
                setSuccess(null);
                const proteinGrams = parseOptionalNonNegativeNumber(protein, "Protein");
                const carbohydrateGrams = parseOptionalNonNegativeNumber(carbs, "Carbs");
                const fatGrams = parseOptionalNonNegativeNumber(fat, "Fat");
                const payload = {
                  calories: parseRequiredNonNegativeNumber(calories, "Calories"),
                  ...(proteinGrams === undefined ? {} : { proteinGrams }),
                  ...(carbohydrateGrams === undefined ? {} : { carbohydrateGrams }),
                  ...(fatGrams === undefined ? {} : { fatGrams })
                };
                const validation = actions.validateFoodEnergy?.(payload);
                if (validation && !validation.valid) {
                  throw new Error(validation.athleteFacingMessage);
                }
                const fiberGrams = parseOptionalNonNegativeNumber(fiber, "Fiber");
                const sodiumMg = parseOptionalNonNegativeNumber(sodium, "Sodium");
                await actions.logFood({
                  ...payload,
                  ...(fiberGrams === undefined ? {} : { fiberGrams }),
                  ...(sodiumMg === undefined ? {} : { sodiumMg })
                });
                setCalories("");
                setProtein("");
                setCarbs("");
                setFat("");
                setFiber("");
                setSodium("");
                setMoreFieldsOpen(false);
                setSuccess("Food logged. Fuel confidence has more intake context; missing hydration still lowers confidence when absent.");
              })
            }
            style={[
              screenStyles.button,
              { flexBasis: 180, flexGrow: 1 },
              fuelSurface
                ? {
                    backgroundColor: fuelLogSurface.actionFill,
                    borderColor: fuelLogSurface.actionBorder,
                    borderRadius: radii.pill,
                    boxShadow: `0 12px 28px ${fuelLogSurface.actionShadow}`
                  }
                : null
            ]}
          >
            <Text style={[screenStyles.buttonText, fuelSurface ? { color: fuelLogSurface.textPrimary } : null]}>{busy ? "Saving food..." : "Log food"}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={moreFieldsOpen ? "Hide more food fields" : "Show more food fields"}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, expanded: moreFieldsOpen }}
            disabled={busy}
            onPress={() => setMoreFieldsOpen((value) => !value)}
            style={[
              screenStyles.quietButton,
              { flexBasis: 132, flexGrow: 1 },
              fuelSurface ? { backgroundColor: fuelLogSurface.controlFill, borderColor: fuelLogSurface.controlLine } : null
            ]}
          >
            <Text style={[screenStyles.quietButtonText, fuelSurface ? { color: fuelLogSurface.textBody } : null]}>{moreFieldsOpen ? "Hide more fields" : "More fields"}</Text>
          </Pressable>
        </View>
      </View>
    </EngineCard>
    </QuickLogSurfaceContext.Provider>
  );
}

export function ProtectedWorkoutLogCard({ actions, busy }: QuickLogCardProps) {
  const [logKind, setLogKind] = useState<"completed" | "planned">("completed");
  const [type, setType] = useState<"technical_session" | "pads_mitts" | "bag_work" | "sparring" | "roadwork" | "coach_assigned_strength" | "recovery_day">("technical_session");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [sessionRpe, setSessionRpe] = useState("");
  const [rounds, setRounds] = useState("");
  const [note, setNote] = useState("");
  const { message: error, runWithMessage } = useFormMessage("Training log failed.");
  const [success, setSuccess] = useState<string | null>(null);
  const typeLabels: Record<typeof type, string> = {
    technical_session: "technical session",
    pads_mitts: "pads / mitts",
    bag_work: "bag work",
    sparring: "coach/team sparring",
    roadwork: "roadwork",
    coach_assigned_strength: "assigned strength",
    recovery_day: "recovery day"
  };
  return (
    <EngineCard>
      <View style={{ gap: spacing.sm }}>
        <Text style={screenStyles.sectionTitle}>Training log</Text>
        <Text style={screenStyles.body}>Log the signals CornerIQ can use. Completed sessions update history; planned sessions become fixed boxing commitments.</Text>
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.14)",
            borderRadius: radii.tile,
            borderWidth: 1,
            gap: spacing.sm,
            padding: spacing.md
          }}
        >
          <Text style={{ color: colors.canvas, fontSize: 12, fontWeight: "900", lineHeight: 16, textTransform: "uppercase" }}>What affects the engine</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <EngineUseRow label="Duration + RPE" value="Training load and intensity." />
            <EngineUseRow label="Rounds" value="Boxing volume context." />
            <EngineUseRow label="Notes" value="Pain, quality, missed work, or why plans changed." />
          </View>
        </View>
        {error ? <Text style={[screenStyles.subtle, { color: colors.redCorner }]}>{error}</Text> : null}
        {success ? <Text style={screenStyles.successText}>{success}</Text> : null}
        <InputLabel>Log type</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <ToggleButton active={logKind === "completed"} busy={busy} label="Completed session" onPress={() => setLogKind("completed")} />
          <ToggleButton active={logKind === "planned"} busy={busy} label="Planned session" onPress={() => setLogKind("planned")} />
        </View>
        <InputLabel>Session type</InputLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["technical_session", "pads_mitts", "bag_work", "sparring", "roadwork", "coach_assigned_strength", "recovery_day"] as const).map((option) => (
            <ToggleButton active={type === option} busy={busy} key={option} label={typeLabels[option]} onPress={() => setType(option)} />
          ))}
        </View>
        <InputLabel>Duration (minutes)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setDurationMinutes} placeholder="Duration minutes" placeholderTextColor={colors.wrap} style={screenStyles.input} value={durationMinutes} />
        <InputLabel>Session RPE (1-10)</InputLabel>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.subtle}>Use RPE instead of easy/moderate/hard labels: 1-3 easy, 4-6 moderate, 7-8 hard, 9-10 max.</Text>
          <TextInput keyboardType="number-pad" onChangeText={setSessionRpe} placeholder="Session RPE 1-10" placeholderTextColor={colors.wrap} style={screenStyles.input} value={sessionRpe} />
        </View>
        <InputLabel>Rounds completed or planned (optional)</InputLabel>
        <TextInput keyboardType="number-pad" onChangeText={setRounds} placeholder="Rounds optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={rounds} />
        <InputLabel>Note: pain, quality, missed work, or schedule context (optional)</InputLabel>
        <TextInput onChangeText={setNote} placeholder="Pain, quality, missed work, or reason optional" placeholderTextColor={colors.wrap} style={screenStyles.input} value={note} />
        <Pressable
          accessibilityLabel={busy ? "Saving training log" : logKind === "completed" ? "Log completed session" : "Save planned session"}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            runWithMessage(async () => {
              setSuccess(null);
              const parsedRounds = parseOptionalPositiveInteger(rounds, "Rounds");
              const parsedSessionRpe = parseRequiredSessionRpe(sessionRpe);
              await actions.logProtectedWorkout({
                logKind,
                type,
                durationMinutes: parseRequiredPositiveInteger(durationMinutes, "Duration"),
                intensity: intensityFromSessionRpe(parsedSessionRpe),
                sessionRpe: parsedSessionRpe,
                ...(parsedRounds === undefined ? {} : { rounds: parsedRounds }),
                ...(note.trim() ? { note: note.trim() } : {})
              });
              setDurationMinutes("");
              setSessionRpe("");
              setRounds("");
              setNote("");
              setSuccess(
                logKind === "completed"
                  ? "Training logged. Plan confidence has more real completion and RPE context."
                  : "Planned session saved. CornerIQ has a boxing commitment to protect when the plan refreshes."
              );
            })
          }
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonText}>{busy ? "Saving training..." : logKind === "completed" ? "Log completed session" : "Save planned session"}</Text>
        </Pressable>
      </View>
    </EngineCard>
  );
}
