# Engine Evidence Registry

CornerIQ uses conservative deterministic rules, not a validated physiological model. This registry records the current threshold posture so engine rules are auditable, reviewable, and honest about uncertainty.

The source of truth for threshold coverage is `src/engine/evidence/evidenceRegistry.ts`. Each entry lists affected files, threshold values, rationale, source posture, owner, review cadence, and sources or internal policy notes.

## Current Coverage

- Readiness self-report score and symptom penalties.
- Under-fueling evidence, including target-relative low intake.
- Hydration plain-water/low-sodium risk.
- Body-mass robust trend estimation.
- Cycle uncertainty and symptom-first support.
- Acute weight-class safety gates.
- Generated support duration and load gates.
- Macro targets by body size and training demand.

## Evidence Posture

- External guidance informs broad fueling, RED-S, hydration, and cycle-health posture.
- CornerIQ-specific thresholds remain conservative heuristics until athlete outcome data and qualified review calibrate them.
- No threshold should be marketed as a clinical diagnosis, medical advice, validated dietetic prescription, or guaranteed performance model.
- Missing data remains unknown, not safe.

## Source Anchors

- IOC RED-S consensus update: https://bjsm.bmj.com/content/52/11/687
- Academy/DC/ACSM nutrition position: https://pubmed.ncbi.nlm.nih.gov/26920240/
- NATA fluid replacement statement: https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/
- ACOG menstrual cycle as a vital sign: https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign

## Review Rule

When a nontrivial threshold changes, update the registry and add or update an engine test before UI code relies on that behavior.
