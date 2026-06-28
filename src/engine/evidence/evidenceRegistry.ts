export type EvidenceSourceKind = "external_guideline" | "consensus_statement" | "clinical_guidance" | "internal_policy" | "statistical_method" | "calibration_required";

export interface EvidenceSource {
  kind: EvidenceSourceKind;
  label: string;
  url?: string | undefined;
}

export interface EngineEvidenceEntry {
  id: string;
  title: string;
  files: readonly string[];
  functions: readonly string[];
  thresholds: readonly string[];
  rationale: string;
  sourcePosture: "externally_informed" | "internal_conservative_policy" | "statistical_robustness" | "calibration_required";
  owner: "engine" | "nutrition_safety" | "training_safety" | "cycle_privacy";
  reviewCadence: "quarterly" | "before_beta_release" | "after_calibration_data";
  knownLimitations: readonly string[];
  betaCalibrationPlan: string;
  sources: readonly EvidenceSource[];
}

export const ENGINE_EVIDENCE_REGISTRY: readonly EngineEvidenceEntry[] = [
  {
    id: "readiness-self-report-penalties",
    title: "Manual readiness score and symptom penalties",
    files: ["src/engine/readiness/checkInScoring.ts", "src/engine/readiness/readinessEngine.ts"],
    functions: ["scoreCheckIn", "resolveReadiness"],
    thresholds: ["five equal 1-5 self-report items", "illness -25", "pain -10", "dizziness/fainting -40"],
    rationale:
      "The score is an explainable safety heuristic for boxer-facing training gates. Hard-stop symptoms are intentionally over-weighted because missing safety is worse than over-conservative programming.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["Self-report is subjective and can be stale or incomplete.", "The score is not a medical triage instrument."],
    betaCalibrationPlan: "Compare readiness color, hard-stop symptoms, and athlete-reported comprehension after guided beta sessions before changing thresholds.",
    sources: [
      { kind: "internal_policy", label: "CornerIQ safety rule: missing data is unknown, hard-stop symptoms beat performance." }
    ]
  },
  {
    id: "under-fueling-target-relative",
    title: "Under-fueling safety evidence",
    files: ["src/engine/safety/underFuelingRisk.ts", "src/engine/nutrition/macroTargets.ts"],
    functions: ["assessUnderFuelingRisk", "calculateMacroTargets"],
    thresholds: ["rapid body-mass trend < -1.2 kg/week", "three complete days below 75% of no-deficit engine calorie target", "estimated cycle day > 45 with fuel/load evidence"],
    rationale:
      "Food logs only become safety evidence when complete enough. Repeated low intake is target-relative instead of absolute kcal-based, while rapid loss and missed-period timing stay conservative review triggers.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["Food logs can be incomplete, misestimated, or intentionally not tracked.", "Target-relative rules are beta heuristics, not dietetic diagnosis."],
    betaCalibrationPlan: "Review complete-log frequency, false positive reports, and safety-review triggers with qualified human review before loosening or tightening.",
    sources: [
      {
        kind: "consensus_statement",
        label: "IOC REDs 2023 consensus update: low energy availability can affect health and performance systems.",
        url: "https://bjsm.bmj.com/content/57/17/1073"
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
    functions: ["assessDehydrationRisk", "resolveHydration", "resolveNutrition"],
    thresholds: ["high plain-water intake >= max(4.5 L, 0.08 L/kg)", "low sodium evidence < max(500 mg, 120 mg/L logged water)"],
    rationale:
      "The rule is a minimal safety flag for high plain-water intake with very low logged sodium. It is body-size-aware and intentionally does not claim to model sweat rate, heat, or serum sodium.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["The app has no sweat-rate, heat exposure, urine, or lab sodium data.", "The output is cautionary and cannot diagnose dehydration or hyponatremia."],
    betaCalibrationPlan: "Audit hydration flags against tester context notes and keep wording cautionary until better hydration inputs exist.",
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
    functions: ["resolveBodyMassTrend", "isScaleConfidenceReduced"],
    thresholds: ["median daily body mass", "median pairwise slope over recent 14 days", "7-day rolling average retained for display"],
    rationale:
      "Boxing scale data is noisy. Median daily weights and a median pairwise slope reduce sensitivity to sparse timing, single spikes, and same-day duplicates.",
    sourcePosture: "statistical_robustness",
    owner: "engine",
    reviewCadence: "quarterly",
    knownLimitations: ["Sparse logs, different scales, hydration shifts, and cycle symptoms can still distort trends.", "The trend does not prove body composition change."],
    betaCalibrationPlan: "Compare trend explanations with manual tester notes and keep weight-class decisions blocked when confidence is low.",
    sources: [
      { kind: "statistical_method", label: "Theil-Sen-style median slope estimator for robust trend estimation." },
      { kind: "internal_policy", label: "Official weigh-in and manual logs remain first-class; missing body mass is unknown." }
    ]
  },
  {
    id: "cycle-symptom-first-uncertainty",
    title: "Cycle phase uncertainty and symptom-first support",
    files: ["src/engine/cycle/cycleEngine.ts", "src/engine/cycle/cycleSafety.ts", "src/engine/cycle/cycleConfidence.ts"],
    functions: ["resolveCycleState", "cycleSafetyFlags", "resolveCycleConfidence"],
    thresholds: ["fixed natural-cycle day bins only when not irregular", "interval variance > 7 days marks phase irregular/uncertain", "estimated cycle day > 45 can support under-fueling review evidence"],
    rationale:
      "Cycle support is optional, private, and symptom-aware. The engine avoids phase-based performance claims when timing is irregular, contraception context is present, or symptoms drive the safer decision.",
    sourcePosture: "externally_informed",
    owner: "cycle_privacy",
    reviewCadence: "quarterly",
    knownLimitations: ["Cycle timing can be irregular or affected by contraception, stress, travel, and under-fueling.", "CornerIQ is not fertility tracking and does not predict fertility windows."],
    betaCalibrationPlan: "Review whether symptom-first copy feels respectful and whether any athlete interprets cycle output as fertility or performance certainty.",
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
    functions: ["resolveAcuteProtocolEligibility", "acuteScaleStrategy"],
    thresholds: ["minor athletes blocked", "active ED/severe restriction blocked", "possible/confirmed pregnancy blocked", "same-day required loss > 1% blocked", "within 7 days and required loss > 3% blocked"],
    rationale:
      "These are product safety gates for a boxing-only beta, not athlete-led cut instructions. They intentionally block unsupported acute manipulation and route to qualified review.",
    sourcePosture: "internal_conservative_policy",
    owner: "nutrition_safety",
    reviewCadence: "before_beta_release",
    knownLimitations: ["Fight rules, hydration testing, and medical eligibility vary by commission and athlete.", "The app intentionally does not provide cut protocols."],
    betaCalibrationPlan: "Keep all blocked cases blocked through beta; collect only comprehension and pressure-risk notes, not athlete-led cut outcomes.",
    sources: [
      {
        kind: "consensus_statement",
        label: "IOC REDs 2023 consensus update: low energy availability and rapid loss are health and performance risk signals.",
        url: "https://bjsm.bmj.com/content/57/17/1073"
      },
      {
        kind: "external_guideline",
        label: "NATA safe weight loss and maintenance practices: weight-class loss should be conservative and supervised when risk is present.",
        url: "https://pubmed.ncbi.nlm.nih.gov/21669045/"
      },
      { kind: "internal_policy", label: "Safety beats performance and weight-class pressure." },
      { kind: "internal_policy", label: "No generated unsafe weight-cut protocol or self-clear path." }
    ]
  },
  {
    id: "training-duration-and-load-gates",
    title: "Generated support duration and load gates",
    files: [
      "src/engine/training/compiler/composeTrainingSession.ts",
      "src/engine/training/compiler/validateCompiledWeek.ts",
      "src/engine/training/trainingGenerationConstraints.ts",
      "src/engine/training/progressionEngine.ts"
    ],
    functions: ["composeTrainingSession", "validateCompiledWeek", "classifyTrainingGenerationConstraints", "recommendTrainingProgression"],
    thresholds: ["structured block durations must match displayed duration", "red readiness overlays today only", "hard protected boxing anchors own the stress"],
    rationale:
      "Generated sessions are conservative boxing support. V2 duration and load gates come from structured blocks and validation rather than family-duration profiles, protecting training quality without creating contact work, coach replacement, or unsupported numeric load claims.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["No structured external load model or coach review is present.", "Free-text load notes are not parsed for progression."],
    betaCalibrationPlan: "Use scenario QA, browser page text, and boxer comprehension notes to verify support sessions feel boxing-specific but not coach replacement.",
    sources: [
      { kind: "internal_policy", label: "Boxing-only generated support; no sparring, contact drills, or unsupervised fight simulation." },
      { kind: "internal_policy", label: "Numeric load progression remains deferred until structured load data exists." }
    ]
  },
  {
    id: "training-compiler-v2-adaptation-budget",
    title: "Training compiler V2 adaptation budgets and structured prescriptions",
    files: [
      "src/engine/training/compiler/compileTrainingWeek.ts",
      "src/engine/training/compiler/resolveWeeklyAdaptationBudget.ts",
      "src/engine/training/compiler/allocateSessionIntents.ts",
      "src/engine/training/compiler/composeTrainingSession.ts",
      "src/engine/training/compiler/validateCompiledWeek.ts",
      "src/engine/training/compiler/planFingerprint.ts",
      "src/engine/training/compiler/applyDailyReadinessOverlay.ts",
      "src/engine/training/compiler/applyPersistentSafetyConstraints.ts"
    ],
    functions: [
      "compileTrainingWeek",
      "resolveWeeklyAdaptationBudget",
      "allocateSessionIntents",
      "composeTrainingSession",
      "validateCompiledWeek",
      "planFingerprint",
      "applyDailyReadinessOverlay",
      "applyPersistentSafetyConstraints"
    ],
    thresholds: [
      "weekly adaptation budget resolved before session selection",
      "allocated generated dose must be present in structured sessions",
      "readiness overlay applies only when readiness.date matches session.date",
      "future hard-stop constraints require explicit active persistent safety state",
      "fingerprint includes exercise-level dose and session intent"
    ],
    rationale:
      "The V2 compiler treats generated training as a structured boxer-support prescription: goals become measurable dose budgets, fixed boxing contributes first, and validation fails when the compiled workout does not contain the allocated work.",
    sourcePosture: "calibration_required",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: [
      "Set, rep, round, and minute ranges are conservative product thresholds until reviewed by qualified boxing and strength-and-conditioning experts.",
      "Some app-facing audit and presentation fields retain legacy-compatible names, but generated workout authority comes from persisted V2 structured prescriptions."
    ],
    betaCalibrationPlan:
      "Run the golden output matrix with boxer, coach, and S&C review; compare completed-session RPE, substitutions, and comprehension before loosening or increasing dose rules.",
    sources: [
      { kind: "internal_policy", label: "CornerIQ V2 rule: plan from adaptation budgets, not workout-family ordering." },
      { kind: "internal_policy", label: "Safety beats performance; missing data stays unknown and daily readiness is same-day only." },
      { kind: "calibration_required", label: "Exact weekly dose ranges require expert review and beta calibration before expansion." }
    ]
  },
  {
    id: "macro-target-body-size-demand",
    title: "Macro targets by body size and training demand",
    files: ["src/engine/nutrition/macroTargets.ts", "src/engine/nutrition/sessionFueling.ts", "src/engine/nutrition/trainingEnergy.ts"],
    functions: ["calculateMacroTargets", "sessionFuelingGuidance"],
    thresholds: [
      "resting energy uses verified fat-free mass with normal confidence, legacy/source-less fat-free mass as low-confidence, otherwise body mass, height, age, and sex-at-birth",
      "planned training energy uses body-size-aware MET proxy by generated session and protected anchor demand",
      "calorie target uncertainty is 8-12%",
      "deficit capped at min(300 kcal, 3.5 kcal/kg, 12% living energy) only when safety allows"
    ],
    rationale:
      "Macro targets are body-size and demand scaled heuristics for beta support. They are not individualized dietetics care and should be recalibrated against athlete outcomes and qualified review.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["Targets are provisional when body-mass confidence is low or logs are incomplete.", "The app is not dietetic care and cannot account for all medical, cultural, or sport-specific nutrition needs."],
    betaCalibrationPlan: "Track whether athletes understand targets as provisional and whether any copy creates weight-class pressure.",
    sources: [
      {
        kind: "external_guideline",
        label: "Academy/DC/ACSM nutrition position: carbohydrate and protein needs vary with body size and training demand.",
        url: "https://pubmed.ncbi.nlm.nih.gov/26920240/"
      },
      { kind: "internal_policy", label: "Deficit pressure is blocked by hard stops, red readiness, cycle noise, or under-fueling evidence." }
    ]
  },
  {
    id: "fuel-timing-around-training",
    title: "Food timing around selected training days",
    files: ["src/engine/nutrition/fuelTiming.ts"],
    functions: ["resolveFuelTimingRecommendations"],
    thresholds: ["normal meal 1-3 or 2-3 hours before selected training", "optional snack 30-60 minutes before", "recovery meal or snack within 1-2 hours after"],
    rationale:
      "Timing recommendations should help boxers execute meaningful training days without turning food logs into a gate. The guidance is optional, plain-language, and only appears when training demand justifies the attention.",
    sourcePosture: "externally_informed",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["No exact training start time is modeled yet.", "GI tolerance, culture, budget, and food access require user choice and later personalization."],
    betaCalibrationPlan: "Review whether boxers understand the timing card and whether it reduces confusion before adding schedule-time personalization.",
    sources: [
      {
        kind: "external_guideline",
        label: "Academy/DC/ACSM nutrition position: meal timing and carbohydrate availability can support training.",
        url: "https://pubmed.ncbi.nlm.nih.gov/26920240/"
      },
      { kind: "internal_policy", label: "Food timing is recommendation-only and never blocks workout generation." }
    ]
  },
  {
    id: "fight-week-low-residue-rehydration",
    title: "Fight-week low-residue, tournament, and rehydration guidance",
    files: ["src/engine/nutrition/fightWeekNutrition.ts", "src/engine/nutrition/sodiumFiberStrategy.ts", "src/engine/nutrition/rehydrationEngine.ts", "src/engine/nutrition/tournamentNutrition.ts"],
    functions: ["fightWeekNutritionNote", "sodiumFiberStrategy", "resolveRehydrationPlan", "tournamentNutritionNote"],
    thresholds: ["low-residue guidance lowers fiber only", "same-day rehydration window 4 hours", "day-before rehydration window 24 hours", "tournament strategy stays near weight"],
    rationale:
      "Fight-week and tournament outputs keep fueling conservative, avoid calorie reduction from low-residue copy, and keep rehydration staged and symptom-aware without prescribing unsafe acute manipulation.",
    sourcePosture: "internal_conservative_policy",
    owner: "nutrition_safety",
    reviewCadence: "before_beta_release",
    knownLimitations: ["The app does not know commission-specific rules, meal tolerance, sweat losses, or clinician instructions.", "Outputs are checklist-style cautions, not personalized medical or dietetic plans."],
    betaCalibrationPlan: "Use guided beta scripts to verify athletes read low-residue and rehydration copy as safety framing, not weight-cut instruction.",
    sources: [
      {
        kind: "external_guideline",
        label: "ISSN sport nutrition position stand: weight-making risk context is a safety anchor, not a generic combat-sport default.",
        url: "https://pubmed.ncbi.nlm.nih.gov/40059405/"
      },
      { kind: "internal_policy", label: "No unsafe weight-cut instructions; low-residue guidance must not reduce calories." },
      { kind: "calibration_required", label: "Tournament and rehydration heuristics require qualified review before any expansion." }
    ]
  },
  {
    id: "generated-session-active-block-scope",
    title: "Generated session active block and preview scope",
    files: [
      "src/engine/training/compiledWeekProjection.ts",
      "src/services/training/materializeNextWeekTrainingPlan.ts",
      "src/services/supabase/trainingRepository.ts",
      "supabase/migrations/010_generated_sessions_training_block_scope.sql"
    ],
    functions: ["projectCompiledWeekToGeneratedSessions", "materializeNextWeekTrainingPlan", "listGeneratedSessions"],
    thresholds: ["preview must be accepted before materialization", "week-boundary materialization unless test override", "V2 preview generated sessions include active block id at save time", "stale block sessions ignored when block scope is requested"],
    rationale:
      "Future generated support must not leak from stale previews, old blocks, or superseded revisions. Persistence scope is a safety rule because stale hard work can become unsafe when current readiness or fueling changed.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "before_beta_release",
    knownLimitations: ["Historical legacy rows can be unscoped and are intentionally filtered out when active block scope is requested.", "Every local migration that affects generated-session identity, temporal replay, and finalization authority requires explicit remote verification before release."],
    betaCalibrationPlan: "Keep stale-session scope tests and remote migration evidence in the release ledger before any beta handoff that relies on persisted generated sessions.",
    sources: [
      { kind: "internal_policy", label: "Persisted generated sessions cannot escape active plan/block scope." },
      { kind: "internal_policy", label: "Missing or stale generated-session scope is unknown, not safe." }
    ]
  },
  {
    id: "structured-load-no-free-text-inference",
    title: "Structured exercise actuals without load-note inference",
    files: [
      "src/engine/training/trainingAnalytics.ts",
      "src/engine/presentation/exerciseHistoryViewModel.ts",
      "src/services/supabase/exerciseResultRepository.ts"
    ],
    functions: ["structuredActualSummary", "structuredLoadSummary", "mapExerciseResultRow"],
    thresholds: ["loadValue/loadUnit required for structured load", "loadText remains notes only", "not enough structured data until explicit fields exist"],
    rationale:
      "Exercise load progression must come from explicit actual fields rather than free-text notes. This prevents accidental scientific overclaiming from ambiguous boxer-entered text.",
    sourcePosture: "internal_conservative_policy",
    owner: "training_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["Structured fields are optional and sparse during beta.", "The engine does not auto-progress load prescriptions from a single structured row."],
    betaCalibrationPlan: "Audit completion speed, structured-field usage, and coach/athlete comprehension before enabling load-prescription progression.",
    sources: [
      { kind: "internal_policy", label: "Free-text load notes are display notes only; missing structured actuals are unknown." }
    ]
  },
  {
    id: "nutrition-target-provisionality",
    title: "Nutrition target confidence and provisionality",
    files: ["src/engine/nutrition/nutritionEngine.ts", "src/engine/presentation/fuelViewModel.ts"],
    functions: ["resolveNutritionTargetConfidence", "buildFuelViewModel"],
    thresholds: ["missing body mass lowers confidence", "stale body mass > 14 days is provisional", "under-fueling or hard stops block deficit pressure"],
    rationale:
      "Fuel targets can look falsely precise. The app therefore surfaces confidence, missing inputs, and safety-gated copy before macro numbers when target context is weak.",
    sourcePosture: "internal_conservative_policy",
    owner: "nutrition_safety",
    reviewCadence: "after_calibration_data",
    knownLimitations: ["Food logs and body mass can be incomplete or intentionally skipped.", "Confidence status is product copy guidance, not dietetic diagnosis."],
    betaCalibrationPlan: "Review whether athletes understand targets as provisional and whether low-confidence copy reduces weight-class pressure.",
    sources: [
      { kind: "internal_policy", label: "Missing data is unknown, not safe; safety beats performance and weight-class pressure." }
    ]
  },
  {
    id: "nutrition-reviewer-permission-boundary",
    title: "Nutrition reviewer transition boundaries",
    files: ["src/engine/nutrition/reviewerWorkflow.ts", "supabase/functions/review-nutrition-safety/policy.ts"],
    functions: ["canTransitionNutritionSafetyReview", "evaluateReviewNutritionSafetyPolicy"],
    thresholds: ["athlete may only acknowledge requested reviews", "clear/not-clear requires trusted server-side reviewer identity", "every reviewer decision requires audit event"],
    rationale:
      "Hard-stop reviews must be readable to athletes but not self-clearable. Reviewer decisions need centralized transition rules before any private reviewer UI exists.",
    sourcePosture: "internal_conservative_policy",
    owner: "nutrition_safety",
    reviewCadence: "before_beta_release",
    knownLimitations: ["Relationship lookup remains a server-side skeleton and returns non-operative until wired.", "No coach/reviewer UI is exposed in the athlete app."],
    betaCalibrationPlan: "Wire active relationship checks and audit persistence in a separate permissioned server pass before exposing reviewer actions.",
    sources: [
      { kind: "internal_policy", label: "No hard-stop self-clear and no reviewer clear without trusted identity plus audit." }
    ]
  },
  {
    id: "cycle-longitudinal-privacy-boundary",
    title: "Cycle longitudinal symptom summaries",
    files: ["src/engine/core/performanceKernel.ts", "src/app/screens/cycle/CycleContextCard.tsx"],
    functions: ["resolvePerformanceState", "CycleContextCard"],
    thresholds: ["disabled tracking shows no cycle trend", "symptom-first support only", "uncertainty copy avoids phase/performance certainty"],
    rationale:
      "Cycle support should help athletes inspect symptom burden and training adjustments without turning private cycle data into fertility or phase-performance claims.",
    sourcePosture: "internal_conservative_policy",
    owner: "cycle_privacy",
    reviewCadence: "quarterly",
    knownLimitations: ["Longitudinal summaries depend on sparse optional logs.", "The engine does not infer fertility windows or claim performance certainty by phase."],
    betaCalibrationPlan: "Review private-cycle copy with testers for comprehension, comfort, and absence of fertility/performance overclaiming.",
    sources: [
      { kind: "internal_policy", label: "Cycle support is optional, private, symptom-aware, and uncertainty-forward." }
    ]
  },
  {
    id: "portable-export-redaction",
    title: "Portable app-data export redaction",
    files: ["src/services/supabase/userDataService.ts", "src/hooks/useUserDataControls.ts"],
    functions: ["generateUserOwnedDataExportBundle", "generateUserOwnedDataExportBundleString"],
    thresholds: ["schemaVersion corneriq.app_data_export.v1", "user id hashed", "secret-shaped keys and values redacted"],
    rationale:
      "User-owned app data export should be portable without exposing secret-shaped payloads, service-only data, or raw auth identity deletion claims.",
    sourcePosture: "internal_conservative_policy",
    owner: "engine",
    reviewCadence: "before_beta_release",
    knownLimitations: ["The export is JSON text rather than platform share-sheet/file-save integration.", "Auth identity deletion remains a trusted server-side gap."],
    betaCalibrationPlan: "Review exported table coverage and redaction fixtures before adding platform save/share or any auth identity deletion workflow.",
    sources: [
      { kind: "internal_policy", label: "Never commit secrets; user data export must redact secret-shaped fields and values." }
    ]
  }
];

export function evidenceForFile(file: string): readonly EngineEvidenceEntry[] {
  return ENGINE_EVIDENCE_REGISTRY.filter((entry) => entry.files.includes(file));
}
