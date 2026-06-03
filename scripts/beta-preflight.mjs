import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

function pathFromRoot(path) {
  return join(root, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(pathFromRoot(path), "utf8"));
}

function requireFile(path) {
  if (!existsSync(pathFromRoot(path))) {
    failures.push(`Missing required file: ${path}`);
  }
}

function parseEnvExampleNames() {
  const path = pathFromRoot(".env.example");
  if (!existsSync(path)) {
    return new Set();
  }
  return new Set(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=", 1)[0])
  );
}

function checkPackageScripts() {
  const packageJson = readJson("package.json");
  const scripts = packageJson.scripts ?? {};
  for (const scriptName of ["start", "android", "ios", "web", "typecheck", "test", "test:coverage", "lint", "quality", "smoke:fixtures", "preflight:beta", "smoke:live-db"]) {
    if (typeof scripts[scriptName] !== "string") {
      failures.push(`Missing package script: ${scriptName}`);
    }
  }
}

function checkEasProfiles() {
  const eas = readJson("eas.json");
  for (const profile of ["development", "preview", "production"]) {
    if (!eas.build?.[profile]) {
      failures.push(`Missing EAS build profile: ${profile}`);
    }
  }
}

function checkAppConfig() {
  const app = readJson("app.json");
  const projectId = app.expo?.extra?.eas?.projectId;
  if (projectId !== undefined && (typeof projectId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId))) {
    failures.push("Invalid EAS projectId in app.json; expected UUID.");
  }
}

function checkPublicEnvDeclarations() {
  const envExampleNames = parseEnvExampleNames();
  for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]) {
    if (process.env[name] === undefined && !envExampleNames.has(name)) {
      failures.push(`Missing public env declaration: ${name}`);
    }
  }
}

function checkSensitiveConfigMarkers() {
  const files = ["app.json", "app.config.js", "app.config.ts", "eas.json", "src/services/supabase/client.ts", "src/services/config/betaRuntimeConfig.ts"].filter((path) =>
    existsSync(pathFromRoot(path))
  );
  const markers = [
    { label: "server-only Supabase role marker", pattern: /SUPABASE_SERVICE_ROLE|service_role/i },
    { label: "smoke email variable", pattern: /CORNERIQ_SMOKE_EMAIL/i },
    { label: "smoke password variable", pattern: /CORNERIQ_SMOKE_PASSWORD/i }
  ];

  for (const file of files) {
    const source = readFileSync(pathFromRoot(file), "utf8");
    for (const marker of markers) {
      if (marker.pattern.test(source)) {
        failures.push(`${file} contains ${marker.label}`);
      }
    }
  }
}

for (const file of ["app.json", "eas.json", "docs/20_BETA_TESTING_AND_FEEDBACK_PLAN.md", "docs/21_BETA_RELEASE_OPERATIONS.md", "docs/23_BETA_RELEASE_CANDIDATE_CHECKLIST.md", "docs/24_EXPO_EAS_BETA_DISTRIBUTION.md"]) {
  requireFile(file);
}

checkPackageScripts();
checkEasProfiles();
checkAppConfig();
checkPublicEnvDeclarations();
checkSensitiveConfigMarkers();

if (failures.length > 0) {
  console.error("Beta preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Beta preflight passed.");
console.log("Checked public env declarations: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY.");
console.log("Checked package scripts, EAS profiles, app config, client config markers, and beta release docs.");
