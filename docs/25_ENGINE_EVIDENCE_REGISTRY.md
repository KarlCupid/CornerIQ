# Engine Evidence Registry

CornerIQ uses conservative deterministic rules, not a validated physiological model. This registry records the current threshold posture so engine rules are auditable, reviewable, and honest about uncertainty.

The cross-engine source of truth for threshold coverage is `src/engine/evidence/evidenceRegistry.ts`. Fuel science thresholds also have a typed registry at `src/engine/nutrition/evidenceRegistry.ts`, which is referenced by nutrition target ranges, food-log quality, under-fueling risk, energy availability, and Hydration V2. Each entry lists affected files, functions, threshold values, rationale, source posture, owner, review cadence, known limitations, beta calibration plan, and sources or internal policy notes.

This is not a clinical validation package. Current thresholds are conservative beta heuristics unless a future qualified review and calibration dataset says otherwise. The registry is meant to make the engine reviewable, not to make medical, dietetic, or coaching claims.

## Current Coverage

- Readiness self-report score and symptom penalties.
- Under-fueling evidence, including target-relative low intake.
- Hydration plain-water/low-sodium risk.
- Body-mass robust trend estimation.
- Cycle uncertainty and symptom-first support.
- Acute weight-class safety gates.
- Generated support duration and load gates.
- Macro targets by body size and training demand.
- Fight-week low-residue, tournament, and rehydration guidance.
- Confidence-aware Fuel target ranges rather than exact prescriptions.
- Food-log quality states, including calories-only and macro-partial manual logs.
- Energy-availability exact/proxy/not-estimated states.
- Hydration V2 baseline, warning-symptom, overdrinking, hydration-testing, and post-weigh-in review gates.
- Generated session active block and preview scope.
- Structured exercise actuals without load-note inference.
- Nutrition target confidence/provisionality.
- Nutrition reviewer permission boundaries.
- Cycle longitudinal symptom summaries.
- Portable app-data export redaction.

## Evidence Posture

- External guidance informs broad fueling, RED-S, hydration, and cycle-health posture.
- CornerIQ-specific thresholds remain conservative heuristics until athlete outcome data and qualified review calibrate them.
- No threshold should be marketed as a clinical diagnosis, medical advice, validated dietetic prescription, or guaranteed performance model.
- Generated training should be described as boxing support, not coaching/programming replacement.
- Low-residue and rehydration outputs are safety-oriented checklists, not weight-cut instructions.
- Hydration output must never become water-loading, sodium-manipulation, dehydration, or fluid-restriction protocol generation.
- Fuel targets are ranges with explicit confidence and can be unavailable when current body mass is missing or stale.
- Missing data remains unknown, not safe.

## Source Anchors

- IOC REDs consensus update: https://bjsm.bmj.com/content/57/17/1073
- Academy/DC/ACSM nutrition position: https://pubmed.ncbi.nlm.nih.gov/26920240/
- NATA fluid replacement statement: https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/
- NATA safe weight loss and maintenance practices: https://pubmed.ncbi.nlm.nih.gov/21669045/
- ISSN sport nutrition position stand for weight-making risk context: https://pubmed.ncbi.nlm.nih.gov/40059405/
- ACOG menstrual cycle as a vital sign: https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign

Combat-sport and weight-making sources are safety anchors only. They do not broaden CornerIQ beyond boxing and do not authorize generated dehydration, water-loading, sodium-manipulation, fluid-restriction, or make-weight-at-all-costs protocols.

## Review Rule

When a nontrivial threshold changes, update the relevant registry and add or update an engine test before UI code relies on that behavior. Nutrition changes that cite fuel-science thresholds should call `assertFuelEvidenceIds` or otherwise be covered by the Fuel evidence registry tests.
