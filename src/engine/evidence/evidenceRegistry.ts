export type EvidenceSourceKind = "external_guideline" | "consensus_statement" | "clinical_guidance" | "internal_policy" | "statistical_method";

export interface EvidenceSource {
  kind: EvidenceSourceKind;
  label: string;
  url?: string | undefined;
}

export interface EngineEvidenceEntry {
  id: string;
  title: string;
  files: readonly string[];
  thresholds: readonly string[];
  rationale: string;
  sourcePosture: "externally_informed" | "internal_conservative_policy" | "statistical_robustness" | "calibration_required";
  owner: "engine" | "nutrition_safety" | "training_safety" | "cycle_privacy";
  reviewCadence: "quarterly" | "before_beta_release" | "after_calibration_data";
  sources: readonly EvidenceSource[];
}

export const ENGINE_EVIDENCE_REGISTRY: readonly EngineEvidenceEntry[] = [
  {
    id: "readiness-self-report-penalties",
    title: "Manual readiness score and symptom penalties",
    files: ["src/engine/readiness/checkInScoring.ts", "src/engine/readiness/readinessEngine.ts"],
    thresholds: ["five equal 1-5 self-report items", "illness -25", "pain -10", "dizziness/fainting -40"],
    rationale:
      "The score is an explainable safety heuristic for boxer-facing training gates. Hard-stop symptoms are intentionally over-weighted because missing safety is worse than over-conservative programming.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    sources: [
      { kind: "internal_policy", label: "CornerIQ safety rule: missing data is unknown, hard-stop symptoms beat performance." }
    ]
  },
  {
    id: "under-fueling-target-relative",
    title: "Under-fueling safety evidence",
    files: ["src/engine/safety/underFuelingRisk.ts", "src/engine/nutrition/macroTargets.ts"],
    thresholds: ["rapid body-mass trend < -1.2 kg/week", "three complete days below 75% of no-deficit engine calorie target", "estimated cycle day > 45 with fuel/load evidence"],
    rationale:
      "Food logs only become safety evidence when complete enough. Repeated low intake is target-relative instead of absolute kcal-based, while rapid loss and missed-period timing stay conservative review triggers.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    sources: [
      {
        kind: "consensus_statement",
        label: "IOC RED-S consensus update: low energy availability can affect health and performance systems.",
        url: "https://bjsm.bmj.com/content/52/11/687"
      },
      {
        kind: "external_guideline",
        label: "Academy/DC/ACSM nutrition position: athlete fueling should scale to body size, training demand, and goals.",
        url: "https://pubmed.ncbi.nlm.nih.gov/26920240/"
      },
      { kind: "internal_policy", label: "75% target-relative cutoff is a conservative review trigger pending CornerIQ calibration data." }
    ]
  },
  {
    id: "hydration-plain-water-sodium",
    title: "Plain-water and sodium hydration risk",
    files: ["src/engine/safety/dehydrationRisk.ts", "src/engine/nutrition/hydrationEngine.ts", "src/engine/nutrition/nutritionEngine.ts"],
    thresholds: ["high plain-water intake >= max(4.5 L, 0.08 L/kg)", "low sodium evidence < max(500 mg, 120 mg/L logged water)"],
    rationale:
      "The rule is a minimal safety flag for high plain-water intake with very low logged sodium. It is body-size-aware and intentionally does not claim to model sweat rate, heat, or serum sodium.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    sources: [
      {
        kind: "consensus_statement",
        label: "NATA fluid replacement statement: both inadequate and excessive fluid replacement can create health risk.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/"
      },
      { kind: "internal_policy", label: "Sodium mg/L threshold is a conservative log-quality trigger, not a clinical diagnosis." }
    ]
  },
  {
    id: "body-mass-robust-trend",
    title: "Body-mass trend under scale noise",
    files: ["src/engine/bodyMass/bodyMassTrend.ts", "src/engine/bodyMass/scaleNoiseModel.ts"],
    thresholds: ["median daily body mass", "median pairwise slope over recent 14 days", "7-day rolling average retained for display"],
    rationale:
      "Boxing scale data is noisy. Median daily weights and a median pairwise slope reduce sensitivity to sparse timing, single spikes, and same-day duplicates.",
    sourcePosture: "statistical_robustness",
    owner: "engine",
    reviewCadence: "quarterly",
    sources: [
      { kind: "statistical_method", label: "Theil-Sen-style median slope estimator for robust trend estimation." },
      { kind: "internal_policy", label: "Official weigh-in and manual logs remain first-class; missing body mass is unknown." }
    ]
  },
  {
    id: "cycle-symptom-first-uncertainty",
    title: "Cycle phase uncertainty and symptom-first support",
    files: ["src/engine/cycle/cycleEngine.ts", "src/engine/cycle/cycleSafety.ts", "src/engine/cycle/cycleConfidence.ts"],
    thresholds: ["fixed natural-cycle day bins only when not irregular", "interval variance > 7 days marks phase irregular/uncertain", "estimated cycle day > 45 can support under-fueling review evidence"],
    rationale:
      "Cycle support is optional, private, and symptom-aware. The engine avoids phase-based performance claims when timing is irregular, contraception context is present, or symptoms drive the safer decision.",
    sourcePosture: "externally_informed",
    owner: "cycle_privacy",
    reviewCadence: "quarterly",
    sources: [
      {
        kind: "clinical_guidance",
        label: "ACOG: menstrual cycle patterns can be an important health signal; long gaps and heavy symptoms warrant attention.",
        url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign"
      },
      {
        kind: "external_guideline",
        label: "Recent athlete literature still identifies evidence gaps around menstrual-cycle phase, injury, and performance claims.",
        url: "https://pubmed.ncbi.nlm.nih.gov/39215933/"
      }
    ]
  },
  {
    id: "acute-weight-class-safety",
    title: "Acute weight-class eligibility",
    files: ["src/engine/fight/weighInRules.ts", "src/engine/bodyMass/acuteScaleStrategy.ts"],
    thresholds: ["minor athletes blocked", "active ED/severe restriction blocked", "possible/confirmed pregnancy blocked", "same-day required loss > 1% blocked", "within 7 days and required loss > 3% blocked"],
    rationale:
      "These are product safety gates for a boxing-only beta, not athlete-led cut instructions. They intentionally block unsupported acute manipulation and route to qualified review.",
    sourcePosture: "internal_conservative_policy",
    owner: "nutrition_safety",
    reviewCadence: "before_beta_release",
    sources: [
      { kind: "internal_policy", label: "Safety beats performance and weight-class pressure." },
      { kind: "internal_policy", label: "No generated unsafe weight-cut protocol or self-clear path." }
    ]
  },
  {
    id: "training-duration-and-load-gates",
    title: "Generated support duration and load gates",
    files: ["src/engine/training/sessionDurationPolicy.ts", "src/engine/training/trainingGenerationConstraints.ts", "src/engine/training/progressionEngine.ts"],
    thresholds: ["family-specific min/target/max duration profiles", "red readiness or severe fueling risk caps generated work", "hard protected boxing anchors own the stress"],
    rationale:
      "Generated sessions are conservative boxing support. Duration gates protect training quality without creating contact work, coach replacement, or numeric load progression claims.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    sources: [
      { kind: "internal_policy", label: "Boxing-only generated support; no sparring, contact drills, or unsupervised fight simulation." },
      { kind: "internal_policy", label: "Numeric load progression remains deferred until structured load data exists." }
    ]
  },
  {
    id: "macro-target-body-size-demand",
    title: "Macro targets by body size and training demand",
    files: ["src/engine/nutrition/macroTargets.ts", "src/engine/nutrition/sessionFueling.ts"],
    thresholds: ["calorie factors 32-40 kcal/kg by demand tier", "protein 2.0-2.1 g/kg", "carbohydrate 3.2-5.8 g/kg by demand tier", "deficit capped at min(300 kcal, 3.5 kcal/kg) only when safety allows"],
    rationale:
      "Macro targets are body-size and demand scaled heuristics for beta support. They are not individualized dietetics care and should be recalibrated against athlete outcomes and qualified review.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    sources: [
      {
        kind: "external_guideline",
        label: "Academy/DC/ACSM nutrition position: carbohydrate and protein needs vary with body size and training demand.",
        url: "https://pubmed.ncbi.nlm.nih.gov/26920240/"
      },
      { kind: "internal_policy", label: "Deficit pressure is blocked by hard stops, red readiness, cycle noise, or under-fueling evidence." }
    ]
  }
];

export function evidenceForFile(file: string): readonly EngineEvidenceEntry[] {
  return ENGINE_EVIDENCE_REGISTRY.filter((entry) => entry.files.includes(file));
}
