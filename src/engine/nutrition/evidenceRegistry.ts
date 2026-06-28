export interface EvidenceBackedThreshold {
  id: string;
  value: number | string | { min: number; max: number };
  unit: string;
  sourceTitle: string;
  sourceUrlOrDoi?: string | undefined;
  sourceType:
    | "guideline"
    | "consensus"
    | "position_stand"
    | "review"
    | "expert_review"
    | "internal_conservative_default";
  lastReviewedAt: string;
  appliesTo: readonly string[];
  contraindications: readonly string[];
  confidence: "low" | "moderate" | "high";
  notes: string;
}

export const FUEL_EVIDENCE_REGISTRY: readonly EvidenceBackedThreshold[] = [
  {
    id: "carb_light_technical_3_5_g_per_kg",
    value: { min: 3, max: 5 },
    unit: "g/kg/day",
    sourceTitle: "Nutrition and Athletic Performance position stand",
    sourceUrlOrDoi: "10.1016/j.jand.2015.12.006",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "light technical training", "recovery days"],
    contraindications: ["medical nutrition restriction", "active safety block"],
    confidence: "moderate",
    notes: "Use as training-demand range context, not an exact prescription."
  },
  {
    id: "carb_moderate_training_4_6_g_per_kg",
    value: { min: 4, max: 6 },
    unit: "g/kg/day",
    sourceTitle: "Nutrition and Athletic Performance position stand",
    sourceUrlOrDoi: "10.1016/j.jand.2015.12.006",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "moderate boxing", "strength and power training"],
    contraindications: ["medical nutrition restriction", "review-gated fight-week manipulation"],
    confidence: "moderate",
    notes: "CornerIQ scales within this range by boxer training demand."
  },
  {
    id: "carb_moderate_intense_training_5_8_g_per_kg",
    value: { min: 5, max: 8 },
    unit: "g/kg/day",
    sourceTitle: "ISSN Exercise & Sports Nutrition Review Update",
    sourceUrlOrDoi: "10.1186/s12970-018-0242-y",
    sourceType: "review",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "moderate intense training", "boxing camp proxy"],
    contraindications: ["medical nutrition restriction", "review-gated fight-week manipulation"],
    confidence: "moderate",
    notes: "Use as range context, not exact prescription."
  },
  {
    id: "protein_general_training_1_2_1_6_g_per_kg",
    value: { min: 1.2, max: 1.6 },
    unit: "g/kg/day",
    sourceTitle: "ISSN Position Stand: Protein and Exercise",
    sourceUrlOrDoi: "10.1186/s12970-017-0177-8",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["healthy exercising adults", "lower-load training"],
    contraindications: ["kidney disease or clinician-directed restriction"],
    confidence: "high",
    notes: "Lower-load protein support range."
  },
  {
    id: "protein_boxing_training_1_6_2_2_g_per_kg",
    value: { min: 1.6, max: 2.2 },
    unit: "g/kg/day",
    sourceTitle: "ISSN Position Stand: Protein and Exercise",
    sourceUrlOrDoi: "10.1186/s12970-017-0177-8",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["healthy exercising adults", "boxing training", "strength and power"],
    contraindications: ["kidney disease or clinician-directed restriction"],
    confidence: "high",
    notes: "CornerIQ keeps this range steady while protecting hard-session carbohydrates."
  },
  {
    id: "protein_deficit_lean_mass_2_0_2_4_g_per_kg",
    value: { min: 2.0, max: 2.4 },
    unit: "g/kg/day",
    sourceTitle: "ISSN Position Stand: Protein and Exercise",
    sourceUrlOrDoi: "10.1186/s12970-017-0177-8",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "energy deficit with lean-mass retention"],
    contraindications: ["kidney disease or clinician-directed restriction", "under-fueling risk"],
    confidence: "moderate",
    notes: "Use cautiously; under-fueling gates block deficit pressure."
  },
  {
    id: "fat_practical_floor_0_5_0_7_g_per_kg",
    value: { min: 0.5, max: 0.7 },
    unit: "g/kg/day",
    sourceTitle: "Nutrition and Athletic Performance position stand",
    sourceUrlOrDoi: "10.1016/j.jand.2015.12.006",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "broad fueling guardrail"],
    contraindications: ["clinician-directed medical nutrition therapy"],
    confidence: "moderate",
    notes: "Practical floor to avoid very-low-fat weight-pressure patterns."
  },
  {
    id: "adult_amdr_fat_20_35_percent_energy",
    value: { min: 20, max: 35 },
    unit: "percent_energy",
    sourceTitle: "Dietary Reference Intakes: AMDR",
    sourceType: "guideline",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult broad nutrition guardrail"],
    contraindications: ["clinician-directed medical nutrition therapy"],
    confidence: "high",
    notes: "Use as broad guardrail, not athlete-specific prescription."
  },
  {
    id: "fiber_context_14_g_per_1000_kcal",
    value: 14,
    unit: "g/1000_kcal",
    sourceTitle: "Dietary Reference Intakes: fiber context",
    sourceType: "guideline",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult broad nutrition context"],
    contraindications: ["fight-week gut comfort short-term adjustment", "clinician-directed restriction"],
    confidence: "moderate",
    notes: "Context only; fight week separates gut comfort from calories."
  },
  {
    id: "baseline_water_context_30_40_ml_per_kg",
    value: { min: 30, max: 40 },
    unit: "ml/kg/day",
    sourceTitle: "NATA Fluid Replacement for the Physically Active",
    sourceUrlOrDoi: "10.4085/1062-6050-52.9.02",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["physically active adults", "baseline context"],
    contraindications: ["kidney disease", "cardiac condition", "clinician-directed fluid restriction"],
    confidence: "moderate",
    notes: "Baseline context only; prefer sweat-rate/body-mass-change data when available."
  },
  {
    id: "mifflin_st_jeor_rmr_context",
    value: "10*kg + 6.25*cm - 5*age + sex_constant",
    unit: "kcal/day_equation",
    sourceTitle: "Mifflin-St Jeor resting energy equation",
    sourceType: "review",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult resting energy estimate", "daily fuel target baseline"],
    contraindications: ["clinical metabolic condition", "clinician-directed nutrition therapy"],
    confidence: "moderate",
    notes: "Used as a baseline estimate, then adjusted for boxing demand and uncertainty."
  },
  {
    id: "cunningham_rmr_lean_mass_context",
    value: "370 + 21.6*fat_free_mass_kg",
    unit: "kcal/day_equation",
    sourceTitle: "Cunningham resting energy equation using fat-free mass",
    sourceUrlOrDoi: "10.1093/ajcn/54.6.963",
    sourceType: "review",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult resting energy estimate", "known fat-free mass", "daily fuel target baseline"],
    contraindications: ["invalid or unverified fat-free mass", "clinical metabolic condition", "clinician-directed nutrition therapy"],
    confidence: "moderate",
    notes: "Used before Mifflin when fat-free mass is available; source-less legacy FFM keeps calorie confidence low until source, date, and confidence are known."
  },
  {
    id: "training_energy_met_context_by_demand",
    value: { min: 2.5, max: 10 },
    unit: "MET_proxy",
    sourceTitle: "CornerIQ training-energy demand proxy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["planned generated training", "protected boxing anchors", "energy availability exercise estimate"],
    contraindications: ["missing body mass", "measured exercise energy available"],
    confidence: "low",
    notes: "Body-size-aware estimate for planned work; replace with measured or calibrated data when available."
  },
  {
    id: "energy_target_uncertainty_8_12_percent",
    value: { min: 8, max: 12 },
    unit: "percent_energy",
    sourceTitle: "CornerIQ calorie-target uncertainty policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["daily calorie target", "low-confidence body or profile inputs"],
    contraindications: ["qualified individualized nutrition plan"],
    confidence: "moderate",
    notes: "The UI shows the middle target; the engine keeps a wider hidden range when confidence is limited."
  },
  {
    id: "fuel_timing_pre_training_1_4_hours",
    value: { min: 1, max: 4 },
    unit: "hours_before_training",
    sourceTitle: "Nutrition and Athletic Performance position stand",
    sourceUrlOrDoi: "10.1016/j.jand.2015.12.006",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "pre-training meal timing", "boxing training days"],
    contraindications: ["medical nutrition restriction", "GI intolerance requiring individual review"],
    confidence: "moderate",
    notes: "Translated into simple optional meal and snack guidance for selected training days."
  },
  {
    id: "fuel_timing_post_training_1_2_hours",
    value: { min: 1, max: 2 },
    unit: "hours_after_training",
    sourceTitle: "Nutrition and Athletic Performance position stand",
    sourceUrlOrDoi: "10.1016/j.jand.2015.12.006",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "post-training recovery timing", "boxing training days"],
    contraindications: ["medical nutrition restriction", "GI intolerance requiring individual review"],
    confidence: "moderate",
    notes: "Used as optional recovery-meal timing, not as a mandatory rule."
  },
  {
    id: "plain_water_overdrinking_context_0_08_l_per_kg",
    value: 0.08,
    unit: "L/kg/day",
    sourceTitle: "NATA Fluid Replacement for the Physically Active",
    sourceUrlOrDoi: "10.4085/1062-6050-52.9.02",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["high water log with low sodium context"],
    contraindications: ["medical hydration plan"],
    confidence: "moderate",
    notes: "Conservative log-quality warning for excessive plain water without sodium context."
  },
  {
    id: "chronic_loss_conservative_0_25_0_75_percent_per_week",
    value: { min: 0.25, max: 0.75 },
    unit: "percent_body_mass_per_week",
    sourceTitle: "NATA Safe Weight Loss and Maintenance Practices",
    sourceUrlOrDoi: "PMID:21669045",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult combat-sport weight-class context"],
    contraindications: ["minor athletes", "under-fueling risk", "pregnancy/postpartum", "active hard stop"],
    confidence: "moderate",
    notes: "Software default for slow trend review, not pressure to lose weight."
  },
  {
    id: "rapid_loss_underfueling_risk_1_percent_per_week",
    value: 1,
    unit: "percent_body_mass_per_week",
    sourceTitle: "IOC RED-S consensus statements",
    sourceUrlOrDoi: "10.1136/bjsports-2023-106994",
    sourceType: "consensus",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["adult athletes", "under-fueling risk screening"],
    contraindications: ["none; conservative safety trigger"],
    confidence: "moderate",
    notes: "Rapid loss is risk evidence even when food logs are absent."
  },
  {
    id: "same_day_weigh_in_conservative_1_percent_body_mass",
    value: 1,
    unit: "percent_body_mass",
    sourceTitle: "CornerIQ internal conservative same-day policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["same-day weigh-in safety gate"],
    contraindications: ["minor athlete", "medical flag", "under-fueling risk"],
    confidence: "moderate",
    notes: "Blocks automatic acute support; does not expose cut instructions."
  },
  {
    id: "short_notice_loss_review_3_percent_7_days",
    value: { min: 3, max: 7 },
    unit: "percent_body_mass_within_days",
    sourceTitle: "CornerIQ internal conservative short-notice policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["short-notice camp triage"],
    contraindications: ["minor athlete", "medical flag", "under-fueling risk"],
    confidence: "moderate",
    notes: "Routes to review/block rather than acute instructions."
  },
  {
    id: "body_mass_freshness_active_fight_7_days",
    value: 7,
    unit: "days",
    sourceTitle: "CornerIQ internal conservative data freshness policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["active fight", "weight-class target", "fight week"],
    contraindications: [],
    confidence: "moderate",
    notes: "Missing or stale body mass stays unknown and cannot authorize scale-driven targets."
  },
  {
    id: "body_mass_freshness_general_14_days",
    value: 14,
    unit: "days",
    sourceTitle: "CornerIQ internal conservative data freshness policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["general training fuel personalization"],
    contraindications: [],
    confidence: "moderate",
    notes: "Older body-mass logs make targets provisional or unavailable depending phase."
  },
  {
    id: "low_intake_repeated_3_days_below_75_percent",
    value: { min: 3, max: 75 },
    unit: "days_and_percent_target",
    sourceTitle: "IOC RED-S consensus statements with CornerIQ conservative trigger",
    sourceUrlOrDoi: "10.1136/bjsports-2023-106994",
    sourceType: "consensus",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["complete high-confidence food logs", "under-fueling risk screening"],
    contraindications: ["partial logs", "quick fuel checks", "not-tracking days"],
    confidence: "moderate",
    notes: "Partial logs and missing logs cannot create low-intake evidence."
  },
  {
    id: "food_log_complete_confidence_0_55",
    value: 0.55,
    unit: "confidence_score",
    sourceTitle: "CornerIQ internal food-log quality policy",
    sourceType: "internal_conservative_default",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["food-log target comparison", "under-fueling evidence gating"],
    contraindications: ["partial logs", "quick fuel checks", "not-tracking days"],
    confidence: "moderate",
    notes: "Food logs need enough completeness before safety evidence can be created."
  },
  {
    id: "energy_availability_watch_30_45_kcal_per_kg_ffm",
    value: { min: 30, max: 45 },
    unit: "kcal/kg_ffm/day",
    sourceTitle: "IOC RED-S consensus statements",
    sourceUrlOrDoi: "10.1136/bjsports-2023-106994",
    sourceType: "consensus",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["energy availability estimate when intake, exercise energy, and FFM are available"],
    contraindications: ["missing FFM", "partial intake logs"],
    confidence: "moderate",
    notes: "Used only when adequate inputs exist; otherwise return proxy or not-estimated status."
  },
  {
    id: "hydration_warning_symptoms_hard_stop",
    value: "dizziness_confusion_fainting_chest_pain_severe_cramping_inability_to_urinate_persistent_vomiting_severe_headache",
    unit: "symptom_set",
    sourceTitle: "NATA Fluid Replacement for the Physically Active",
    sourceUrlOrDoi: "10.4085/1062-6050-52.9.02",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["hydration warning symptoms", "post-weigh-in support"],
    contraindications: [],
    confidence: "high",
    notes: "Severe symptoms block automatic plans and route to qualified or medical support."
  },
  {
    id: "unsafe_weight_loss_methods_prohibited",
    value: "prohibit",
    unit: "policy",
    sourceTitle: "NATA/ISSN sport safety guidance anchors",
    sourceType: "position_stand",
    lastReviewedAt: "2026-06-27",
    appliesTo: ["all athletes", "all phases"],
    contraindications: [],
    confidence: "high",
    notes: "No unsafe athlete-led weight-cut instructions or make-weight-at-all-costs copy."
  }
];

const registryById = new Map(FUEL_EVIDENCE_REGISTRY.map((entry) => [entry.id, entry]));

export function fuelEvidenceById(id: string): EvidenceBackedThreshold | null {
  return registryById.get(id) ?? null;
}

export function assertFuelEvidenceIds(ids: readonly string[], context: string): void {
  const missing = ids.filter((id) => !registryById.has(id));
  if (missing.length > 0) {
    throw new Error(`${context} references unregistered Fuel evidence id(s): ${missing.join(", ")}`);
  }
}
