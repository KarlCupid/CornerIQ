import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import Module from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const repoRoot = process.cwd();
const reportDir = join(repoRoot, "qa-artifacts", "reports");
const mdPath = join(reportDir, "engine-output-review.md");
const jsonPath = join(reportDir, "engine-output-review.json");

function registerTypeScript() {
  if (Module._extensions[".ts"]?.name === "cornerIqTsLoader") {
    return;
  }
  Module._extensions[".ts"] = function cornerIqTsLoader(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };
}

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redReadinessScenario(base) {
  const todayReadiness = base.readinessHistory[0];
  if (!todayReadiness) {
    throw new Error("Fixture missing readiness history.");
  }
  return {
    ...clone(base),
    athlete: {
      ...clone(base.athlete),
      athleteId: "red_readiness_case"
    },
    readinessHistory: [
      {
        ...clone(todayReadiness),
        energy1To5: 1,
        fainting: true,
        painNotes: ["Sharp knee pain"]
      }
    ]
  };
}

function noEquipmentScenario(base) {
  return {
    ...clone(base),
    athlete: {
      ...clone(base.athlete),
      athleteId: "no_equipment_boxer",
      equipmentAccess: []
    },
    protectedWorkouts: []
  };
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function compactSafetyValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return compact(value);
  }
  if (Array.isArray(value)) {
    return value.map(compactSafetyValue).filter(Boolean).join(", ");
  }
  return compact(JSON.stringify(value));
}

function serializeRiskFlagOrHardStop(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "object") {
    return compact(value);
  }

  const fields = [
    "domain",
    "code",
    "severity",
    "message",
    "hardStop",
    "requiresProfessionalReview",
    "blocksPlan"
  ];
  const entries = fields
    .filter((field) => Object.prototype.hasOwnProperty.call(value, field))
    .map((field) => [field, compactSafetyValue(value[field])])
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== "");

  if (!Object.prototype.hasOwnProperty.call(value, "message")) {
    for (const fallbackField of ["summary", "title", "reason", "why"]) {
      const fallbackValue = compactSafetyValue(value[fallbackField]);
      if (fallbackValue) {
        entries.push(["message", fallbackValue]);
        break;
      }
    }
  }

  if (entries.length === 0) {
    return compact(JSON.stringify(value));
  }

  return entries.map(([field, fieldValue]) => `${field}: ${fieldValue}`).join("; ");
}

function compactEvidenceValue(value) {
  return compactSafetyValue(value) ?? "";
}

function lines(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function scanText(text) {
  const patterns = {
    prohibitedPhrases: /\b(dehydrate to make weight|skip meals to make weight|make weight at all costs|starve yourself|(?:use|take|try|recommend)\s+(?:diuretics?|laxatives?)|(?:use|sit in|spend time in)\s+(?:a\s+)?sauna|wear\s+(?:a\s+)?sweat\s*suit|spit cup|water loading protocol|cut water)\b/i,
    selfClear: /\b(can self-clear|self-clear hard stops: yes|athlete self-clear enabled)\b/i,
    reviewerClear: /\b(reviewer-clear button|reviewer clear button|clear as reviewer)\b/i
  };
  return Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);
}

function summarizeScenario(state, name) {
  const today = state.viewModels.today;
  const fuel = state.viewModels.fuel;
  const train = state.viewModels.train;
  const plan = state.viewModels.plan;
  const session = train.detailedTodaySessions?.[0]?.detail ?? train.detailedTodaySessions?.[0] ?? null;
  const generatedText = JSON.stringify(
    state.training.generatedSessions.map((generatedSession) => ({
      family: generatedSession.family,
      fuelDemand: generatedSession.fuelDemand,
      intensity: generatedSession.intensity,
      prescription: generatedSession.prescription,
      rationale: generatedSession.rationale,
      title: generatedSession.title
    }))
  );
  const fullText = JSON.stringify({
    today,
    fuel,
    train,
    plan,
    safety: state.safety,
    readiness: state.readiness
  });
  const scanFindings = scanText(fullText);
  const generatedContactFail = /\b(sparring|contact|fight simulation|partner drill)\b/i.test(generatedText);

  return {
    name,
    todayPrimaryAction: compact(today.primaryAction ?? today.startHere?.primaryAction ?? today.title),
    fuelPriority: compact(fuel.commandCenter?.primaryFuelAction ?? fuel.commandCenter?.title ?? fuel.title),
    trainPriority: compact(train.todayRole?.summary ?? train.todaySummary),
    workoutSummary: session
      ? compact(`${session.title ?? "Generated support"} ${session.intensity ?? ""} ${session.durationMinutes ?? ""} min`)
      : compact(train.todaySummary),
    planSummary: compact(`${plan.weeklySummary} ${plan.nextWeekPreview?.actionCopy ?? ""}`),
    risksAndHardStops: [
      ...(state.safety?.hardStops ?? []),
      ...(state.safety?.riskSummary ?? []),
      ...(today.riskSummary ?? []),
      ...(fuel.commandCenter?.safetyAction ? [fuel.commandCenter.safetyAction] : [])
    ].map(serializeRiskFlagOrHardStop).filter(Boolean),
    missingDataHandling: [
      compactEvidenceValue(state.readiness?.explanation),
      compactEvidenceValue(state.wearable?.explanation),
      compactEvidenceValue(fuel.commandCenter?.confidenceLabel ?? fuel.commandCenter?.confidence),
      compactEvidenceValue(today.confidenceLabel ?? today.confidence)
    ].filter(Boolean),
    whyAndConfidenceLabels: [
      compactEvidenceValue(today.why ?? today.explanation),
      compactEvidenceValue(fuel.commandCenter?.why),
      compactEvidenceValue(train.todayRole?.explanation),
      compactEvidenceValue(plan.nextWeekPreview?.explanation)
    ].filter(Boolean),
    prohibitedPhraseScan: scanFindings.includes("prohibitedPhrases") ? "fail" : "pass",
    generatedSparringContactScan: generatedContactFail ? "fail" : "pass",
    selfClearScan: scanFindings.includes("selfClear") ? "fail" : "pass",
    reviewerClearExposureScan: scanFindings.includes("reviewerClear") ? "fail" : "pass",
    generatedSupportScanText: generatedText
  };
}

registerTypeScript();

const { resolvePerformanceState } = require(join(repoRoot, "src", "engine", "core", "performanceKernel.ts"));
const fixtures = require(join(repoRoot, "src", "tests", "fixtures", "engineFixtures.ts"));

const scenarios = [
  ["amateur novice build phase", fixtures.amateur_novice_build],
  ["amateur open with protected sparring", fixtures.no_wearable_manual_only],
  ["amateur tournament daily weigh-ins", fixtures.amateur_open_tournament],
  ["pro camp day-before weigh-in", fixtures.pro_8_round_camp_day_before_weigh_in],
  ["same-day weigh-in amateur", fixtures.amateur_elite_camp_same_day_weigh_in],
  ["cycle-enabled high symptoms", fixtures.menstruating_athlete_camp_heavy_symptoms],
  ["manual-only no wearable athlete", fixtures.no_wearable_manual_only],
  ["under-fueling risk case", fixtures.underfueling_risk_camp],
  ["red readiness case", redReadinessScenario(fixtures.no_wearable_manual_only)],
  ["no-equipment boxer", noEquipmentScenario(fixtures.amateur_novice_build)]
];

const results = scenarios.map(([name, journey]) => {
  const state = resolvePerformanceState({
    journey,
    asOfDate: fixtures.fixtureAsOfDate
  });
  return summarizeScenario(state, name);
});

const commit = {
  full: git(["rev-parse", "HEAD"]),
  short: git(["rev-parse", "--short", "HEAD"])
};

mkdirSync(dirname(mdPath), { recursive: true });
const jsonBody = JSON.stringify({ generatedAt: new Date().toISOString(), commit, scenarios: results }, null, 2);
writeFileSync(jsonPath, jsonBody);

const body = `# Engine Output Review

- Commit tested: ${commit.short}
- Commit tested full SHA: ${commit.full}
- Branch: ${git(["branch", "--show-current"])}
- Date: ${new Date().toISOString()}
- Source: deterministic beta personas resolved through the engine and presentation view models.

This report is AI-reviewable evidence. It scans for prohibited phrases and summarizes output, but it does not replace human boxer comprehension review.

${results
  .map(
    (item) => `## ${item.name}

- Today primary action: ${item.todayPrimaryAction || "Not found"}
- Fuel priority: ${item.fuelPriority || "Not found"}
- Train priority/workout summary: ${item.trainPriority || "Not found"} / ${item.workoutSummary || "Not found"}
- Plan/next-week summary: ${item.planSummary || "Not found"}
- Risks/hard stops:
${lines(item.risksAndHardStops)}
- Missing-data handling:
${lines(item.missingDataHandling)}
- Why/confidence labels:
${lines(item.whyAndConfidenceLabels)}
- Prohibited phrase scan: ${item.prohibitedPhraseScan}
- Generated sparring/contact scan: ${item.generatedSparringContactScan}
- Self-clear scan: ${item.selfClearScan}
- Reviewer-clear exposure scan: ${item.reviewerClearExposureScan}

AI review questions:

- Does this feel boxing-specific?
- Is the first action clear?
- Is it safe?
- Does it avoid weight-class pressure?
- Does it avoid overconfidence?
- Is missing data treated as unknown?
- Is this usable for a real beta tester?
`
  )
  .join("\n")}
`;

if (body.includes("[object Object]") || jsonBody.includes("[object Object]")) {
  throw new Error("Engine output review serialization produced [object Object].");
}

writeFileSync(mdPath, body);
console.log(`Engine output review written: ${mdPath}`);
