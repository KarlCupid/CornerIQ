# Engine Evidence Registry

CornerIQ uses conservative deterministic rules, not a validated physiological model. This registry records the current threshold posture so engine rules are auditable, reviewable, and honest about uncertainty.

The source of truth for threshold coverage is `src/engine/evidence/evidenceRegistry.ts`. Each entry lists affected files, functions, threshold values, rationale, source posture, owner, review cadence, known limitations, beta calibration plan, and sources or internal policy notes.

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
- Generated session active block and preview scope.

## Evidence Posture

- External guidance informs broad fueling, RED-S, hydration, and cycle-health posture.
- CornerIQ-specific thresholds remain conservative heuristics until athlete outcome data and qualified review calibrate them.
- No threshold should be marketed as a clinical diagnosis, medical advice, validated dietetic prescription, or guaranteed performance model.
- Generated training should be described as boxing support, not coaching/programming replacement.
- Low-residue and rehydration outputs are safety-oriented checklists, not weight-cut instructions.
- Missing data remains unknown, not safe.

## Source Anchors

- IOC RED-S consensus update: https://bjsm.bmj.com/content/52/11/687
- Academy/DC/ACSM nutrition position: https://pubmed.ncbi.nlm.nih.gov/26920240/
- NATA fluid replacement statement: https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/
- ACOG menstrual cycle as a vital sign: https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign

## Review Rule

When a nontrivial threshold changes, update the registry and add or update an engine test before UI code relies on that behavior.
