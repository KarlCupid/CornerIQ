# Fight Week Protocol Boundary

Date: 2026-06-30

Purpose: define the closest CornerIQ can get to a fight-week make-weight protocol while preserving athlete safety, App Store review posture, and scientific honesty.

This is product and engineering guidance, not legal advice, medical clearance, or a clinical validation package. CornerIQ is a boxing app. Combat-sport evidence is used only where boxing-specific evidence is sparse and should not broaden the product into MMA or generic combat sports.

## Decision

CornerIQ can show a visible fight-week runway and athlete-facing nutrition targets. The automatic app-generated mode should stop at:

- fight-date and weigh-in logistics
- current scale trend, target class, and six-day checkpoint math
- chronic loss runway through the camp
- modeled same-day acute scale allowance from low-residue/gut-content reduction only
- calories, protein, carbohydrate, fat, fiber, and normal hydration ranges
- sodium consistency and sweat-replacement reminders
- body-mass logging, symptom checks, and hard stop rules
- post-weigh-in refuel and rehydration education

CornerIQ should not automatically generate:

- water loading
- fluid restriction
- sodium restriction or sodium manipulation
- dehydration targets
- sauna, hot bath, sweat suit, spitting, laxative, diuretic, vomiting, or thermal-loss instructions
- "make weight anyway" overrides

The closest defensible version is a two-lane model:

1. Athlete-facing automatic lane: "Cut Runway" or "Fight Week Checkpoint", not "dehydration protocol". It can give precise food and fiber targets, but only inside normal hydration and sodium-consistency boundaries.
2. Qualified-reviewed lane: a registered dietitian, physician, athletic trainer, or approved qualified support person can enter or approve a reviewed plan. The app displays, logs, monitors stop flags, and requires review metadata. The app does not invent fluid or sodium restriction numbers.

## Product Boundary

### Automatic Athlete-Facing Lane

Allowed outputs:

- Target and current trend:
  - current body mass
  - target class plus allowance
  - days to weigh-in
  - five-to-six-day acute-entry checkpoint
  - required weekly loss to checkpoint
  - final modeled scale allowance
- Nutrition:
  - calorie range matched to training load and minimum energy availability posture
  - protein-protected target range
  - carbohydrate floor for boxing training quality
  - fat floor
  - low-residue/fiber target for the final days when eligible
  - familiar-food guidance
  - "do not lower calories just because fiber is lower"
- Hydration:
  - normal drinking to thirst or individualized sweat-rate replacement
  - electrolyte attention for hard sweating sessions
  - warning against excess plain water
- Sodium:
  - keep usual sodium consistent
  - replace sweat losses
  - no athlete-led sodium cut
- Monitoring:
  - morning body mass under consistent conditions
  - urine/color or hydration-status education
  - dizziness, fainting, confusion, severe headache, vomiting, diarrhea, chest pain, heat illness signs, severe cramps, illness, heavy bleeding with dizziness, pregnancy risk, ED/REDs risk, kidney/cardiac/hypertension flags
- Messaging:
  - "modeled scale allowance", not "guaranteed fat loss"
  - "low-residue/gut-content", not "dehydration"
  - "qualified review required" when outside automatic thresholds

Recommended automatic cap:

- Same-day weigh-in: automatic final-week scale allowance up to 1.0-1.5% body mass from low-residue/gut-content plus ordinary scale-noise modeling.
- Same-day above 1.5% in final week: review required.
- Same-day above roughly 2.0% in fight week: present as materially outside the preferred amateur boxing range even if it is below the hard automatic block.
- Same-day above 3.0% in final week: block automatic guidance and require qualified support or class change.
- Day-before weigh-in: can support a larger review-gated runway, but automatic dehydration instructions should still be blocked.
- Minors: no acute cut lane.

### Qualified-Reviewed Lane

Allowed with clear review metadata:

- Display a professional-reviewed plan entered by the qualified reviewer.
- Show daily checklist and adherence logging.
- Monitor body mass, symptoms, and hydration status.
- Stop or escalate if flags appear.
- Record review status, reviewer role, timestamp, scope, and expiry.

Still avoid:

- app-generated sodium or fluid restriction
- app-generated water-loading schedules
- app-generated thermal dehydration steps
- auto-adjusting fluid or sodium downward from scale trend

App Review posture: this is more defensible if CornerIQ is positioned as a sport-nutrition planning and tracking app that discloses methodology, cites sources, protects health data, reminds users to consult qualified professionals, and blocks high-risk scenarios. It becomes materially riskier if the app autonomously tells an athlete how little water or sodium to consume to make weight.

## Math Model

Same-day fight-week planning should separate the camp target from the official weigh-in target.

Definitions:

- `officialTarget` = weigh-in class plus permitted allowance.
- `automaticAcuteAllowancePercent` = same-day final-week modeled allowance, currently 1.5%.
- `checkpointTarget = officialTarget / (1 - automaticAcuteAllowancePercent)`.
- `checkpointDate = weighInDate - 6 days`.
- Chronic runway is current body mass to checkpoint target, not current body mass to official target.

Example:

- Current: 149 lb.
- Official same-day target: 140 lb.
- Fight: exactly 5 weeks out.
- Automatic acute allowance: 1.5%.
- Six-day checkpoint: `140 / 0.985 = 142.13 lb`.
- Chronic loss needed before checkpoint: `149 - 142.13 = 6.87 lb`.
- Time to checkpoint: 29 days.
- Weekly loss rate: about `6.87 / 149 / (29 / 7) = 1.11% body mass/week`.
- Final modeled scale allowance: `142.13 - 140 = 2.13 lb`.

Interpretation: this should not be blocked as impossible. It is a "behind / monitor closely / review if symptoms or poor data" case, not a same-day dehydration protocol. The app should show the checkpoint and nutrition runway, then require review if the athlete reaches the final week above the automatic allowance.

## Evidence Summary

### Apple And Regulatory Posture

- Apple App Review Guideline 1.4 says apps that risk physical harm may be rejected. Guideline 1.4.1 says medical/health apps with accuracy claims must disclose data and methodology and should remind users to check with a doctor before medical decisions. Guideline 1.4.5 says apps should not urge customers into activities that risk physical harm.
- Apple Guideline 5.1.3 treats health, fitness, and medical data as especially sensitive. Health/fitness data may not be used or disclosed for advertising, marketing, or use-based data mining, and collected health data must be specifically disclosed.
- Apple Health & Fitness category examples include weight loss, so weight-management functionality is not inherently disallowed. The risk is unsafe protocol generation, unsupported medical claims, and poor health-data handling.
- Apple now asks Health & Fitness and Medical apps distributed in the United States, United Kingdom, or European Union to declare whether the app is a regulated medical device.
- FDA examples of non-device software include general wellness apps, dietary logs, calorie counters, meal planners, and apps that help healthy people make behavioral suggestions around general fitness, health, or wellness. Risk increases if the app claims to diagnose, treat, or replace professional judgment.

Product implication: an evidence-backed sport-nutrition planner with disclosed methodology is plausible. An autonomous dehydration-prescription engine is the wrong App Store and safety posture.

### Boxing Same-Day Logistics

- Amateur/Olympic-style boxing commonly uses same-day or daily weigh-ins, pre-bout medical checks, and short recovery windows compared with day-before professional weigh-ins.
- IBA technical rules describe daily weigh-ins on competition days and specify minimum time between weigh-in completion and the first bout. This makes day-before combat-sport cutting evidence a poor default for same-day amateur boxing.
- World Boxing medical guidance includes pre-bout medical screening and physiological red flags such as fever, elevated resting heart rate, and elevated blood pressure.
- Boxing Canada recommends athletes stay close to fighting weight and cites performance risk from even small dehydration.
- England Boxing weight-management guidance warns against rapid/excessive dehydration and emphasizes planning so dehydration methods are not required.

Product implication: for an amateur same-day boxer, CornerIQ should be more conservative than generic combat-sport evidence. The app should optimize the five-to-six-day checkpoint, low residue, fueling, and hydration recovery, not chase a larger final-day cut.

### Chronic Loss

- NATA safe weight-loss guidance recommends average goals around 1-2 lb per week and not exceeding 1.5% body weight loss per week. Higher rates may indicate dehydration or unsafe restriction.
- CornerIQ should keep 0.75% body mass/week as "likely/on-track" and 1.5% body mass/week as a review boundary, not a default target.

Product implication: the app can calculate whether the athlete can reach the six-day checkpoint through normal camp nutrition rather than treating the full scale gap as final-week acute loss.

### Low-Residue / Fiber

- Foo et al. studied 19 healthy men using a four-day low-fiber diet under matched energy, macronutrient, fluid, and sodium conditions. The intervention used less than 10 g fiber/day and produced greater body-mass reduction than habitual intake by day 4-5, with about 0.58 kg and 0.74% relative difference by day 5.
- The same paper notes low-fiber diets are intended to reduce undigested fiber, bacteria, and water retained in the intestines, not to dehydrate the athlete.
- The ISSN combat-sport position stand discusses low-fiber approaches as a short-term fight-week strategy and summarizes possible body-mass effects around 1-2% in some contexts.

Product implication: this is the best automatic fight-week lever. It supports showing fiber targets and low-residue food guidance when eligible, while keeping calories, fluid, and sodium stable.

### Carbohydrate / Glycogen

- Schytz et al. found a moderate-carbohydrate strategy after glycogen depletion produced lower muscle glycogen than high carbohydrate and about 0.7 kg lower body mass, without reducing one-minute or fifteen-minute cycling test performance in the studied men.
- The same paper describes glycogen-associated water as a contributor to body mass. However, boxing performance, repeated rounds, and same-day recovery are not identical to those cycling tests.
- The 2025 ISSN combat-sport position stand says protein should be prioritized and carbohydrates should support training demands, with macronutrients not dropping below carbohydrate 3.0-4.0 g/kg/day, protein 1.2-2.0 g/kg/day, and fat 0.5-1.0 g/kg/day during longitudinal descents.

Product implication: CornerIQ can periodize carbs and avoid overfeeding residue/glycogen near weigh-in, but should not run aggressive low-carb depletion automatically for an amateur same-day boxer.

### Water Loading And Fluid Restriction

- Reale et al. tested water loading in combat-sport athletes: 100 ml/kg/day for three days versus 40 ml/kg/day, followed by 15 ml/kg on day 4. Water loading produced about 0.6% greater body-mass loss after fluid restriction under study conditions, with electrolytes remaining in reference range and no performance difference detected.
- NATA fluid guidance stresses that both hypohydration and hyperhydration can harm performance and health. It identifies approximately 2% hypohydration as enough to compromise multiple outcomes, greater than 3% as increasing heat-illness risk, and greater than 5% as consistently associated with impaired performance and symptoms. It also warns that overdrinking can cause exercise-associated hyponatremia.
- England Boxing warns that excessive fluid intake can cause hyponatremia and severe harm, and boxing guidance generally treats dehydration as a performance and health risk rather than a routine same-day tactic.

Product implication: water loading and fluid restriction are scientifically studied, but that does not make them appropriate for automatic app generation, especially for same-day amateur boxing. The app can explain why review is required and can monitor safety, but should not calculate a user-specific water restriction schedule on its own.

### Sodium

- Reale et al. and the ISSN position stand discuss sodium restriction as a weight-cut tool, but NATA fluid guidance emphasizes individualized sodium/electrolyte replacement and the risks of both low sodium and overhydration.
- Sodium manipulation interacts with sweat loss, heat, blood pressure, kidney status, medication use, and hyponatremia risk.

Product implication: automatic mode should keep sodium consistent and restore electrolytes. Athlete-led sodium restriction should be review-gated.

### Post-Weigh-In Recovery

- NATA fluid guidance and boxing weight-management guidance support replacing exercise fluid losses with more than the scale loss when full rehydration is needed, while avoiding plain-water overdrinking.
- ISSN combat-sport guidance discusses oral rehydration solutions and sodium-containing fluids after weigh-in, but same-day boxing limits how much can realistically be restored before the bout.

Product implication: CornerIQ can automate post-weigh-in refuel and rehydration prompts with conservative pacing, carbs, electrolytes, and symptom checks. It should not imply that a large acute cut can be safely reversed in a same-day window.

### REDs, Disordered Eating, Cycle, And Stop Flags

- The IOC 2023 REDs consensus frames low energy availability as a syndrome with health and performance consequences in male and female athletes.
- NATA disordered-eating guidance stresses prevention, detection, and comprehensive management in athletes.
- ACOG recommends menstrual history as a vital sign in adolescents, and irregular or abnormal patterns can indicate broader health issues.

Product implication: the engine must stop when under-fueling, ED risk, severe symptoms, cycle red flags, pregnancy risk, illness, or medical risk flags are present. Missing data remains unknown, not safe.

### Automatic Stop Flags

Immediate red state, stop guidance, and seek qualified/ringside review:

- minor athlete attempting rapid weight loss
- any diuretics, laxatives, vomiting, enemas, diet pills, sauna suits, hot baths/wraps, spitting, or intentional dehydration
- confusion, fainting, collapse, seizure, chest pain, severe headache, repeated vomiting/diarrhea, shortness of breath, heat-illness signs, severe dizziness, palpitations, or inability to concentrate
- body mass down more than 2% from likely fluid loss, or training sweat loss not being restored
- illness, fever, acute injury, unresolved concussion symptoms, pregnancy or possible pregnancy, seizure history concern, uncontrolled diabetes/thyroid issue, significant psychiatric distress, or disclosed eating-disorder behavior
- pre-bout-like red flags such as resting heart rate above 100, temperature above 38 C / 100.4 F, or blood pressure around or above 140/90
- missing current weight, hydration, symptoms, weigh-in timing, or cycle context when relevant

## Evidence Links

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Store Health & Fitness category: https://developer.apple.com/app-store/categories/
- Apple health/medical device declaration notice: https://developer.apple.com/news/?id=nyqbfz1y
- Apple regulated medical device declaration: https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status/
- FDA examples of software functions that are not medical devices: https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-are-not-medical-devices
- IBA technical and competition rules: https://www.iba.sport/wp-content/uploads/2023/04/20240303-IBA-Technical-Competition-Rules-v7-clean.pdf
- World Boxing medical handbook: https://worldboxing.org/wp-content/uploads/2025/06/2025-medical-handbook.pdf
- Boxing Canada making weight in boxing: https://boxingcanada.org/wp-content/uploads/2016/10/Making-Weight-in-Boxing.pdf
- England Boxing weight-management guidance: https://www.englandboxing.org/wp-content/uploads/2024/12/EB-Weight-management-guidance-final-draft-1.pdf
- NATA safe weight loss and maintenance practices: https://pmc.ncbi.nlm.nih.gov/articles/PMC3419563/
- NATA fluid replacement for the physically active: https://www.nata.org/sites/default/files/2025-08/fluid_replacement_for_the_physically_active.pdf
- ACSM weight-category sports consensus: https://pubmed.ncbi.nlm.nih.gov/33790193/
- ISSN combat-sport nutrition and weight-cut position stand: https://doi.org/10.1080/15502783.2025.2467909
- Reale, Slater, and Burke acute weight management overview: https://www.gssiweb.org/sports-science-exchange/article/acute-weight-management-in-combat-sports-pre-weigh-in-weight-loss-post-weigh-in-recovery-and-competition-nutrition-strategies/1000
- Foo et al. low-fiber diet and body mass: https://researchonline.ljmu.ac.uk/16285/1/Foo%20et%20al.%20%282022%29%20A%20short-term%20low%20fibre%20diet%20reduces%20body%20mass%20in%20healthy%20men%20implications%20for%20weight%20sensitive%20sports.pdf
- Schytz et al. glycogen and body mass: https://pure.au.dk/ws/portalfiles/portal/404091636/Scandinavian_Med_Sci_Sports_-_2023_-_Schytz_-_Lowered_muscle_glycogen_reduces_body_mass_with_no_effect_on_short_term.pdf
- Reale et al. water loading: https://research.bond.edu.au/en/publications/the-effect-of-water-loading-on-acute-weight-loss-following-fluid-/
- Franchini et al. combat-sport rapid weight loss review: https://pmc.ncbi.nlm.nih.gov/articles/PMC3607973/
- IOC 2023 REDs consensus: https://bjsm.bmj.com/content/57/17/1073
- NATA disordered eating in athletes: https://pmc.ncbi.nlm.nih.gov/articles/PMC2231403/
- ACOG menstrual cycle as a vital sign: https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign

## Implementation Requirements

- Engine first. Screens must read fight-week state from deterministic engine view models.
- Show the checkpoint explicitly in Fuel and Plan when a fight target exists.
- Rename athlete-facing copy away from "protocol" when it is automatic. Prefer "Cut Runway", "Fight Week Checkpoint", or "Make-Weight Readiness".
- Add a visible automatic allowance breakdown:
  - chronic loss to checkpoint
  - low-residue/gut-content modeled allowance
  - review-required gap
- Add a "qualified review required" state for fluid/sodium manipulation requests.
- Add a reviewer-entered plan model only if reviewer identity, role, timestamp, scope, and expiry can be stored safely.
- Do not expose water-loading, sodium restriction, or fluid-restriction numbers from automatic engine paths.
- Provide App Review notes explaining:
  - this is sport nutrition and readiness support, not medical diagnosis or treatment
  - methodology and evidence are disclosed
  - hydration/sodium manipulation is not auto-generated
  - minors and high-risk states are blocked
  - health data is protected and not used for advertising
