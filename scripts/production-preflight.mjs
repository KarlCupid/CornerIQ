import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const root = process.cwd();
const failures = [];
const warnings = [];
const APPLE_SUBMISSION_MODE_ENV = "CORNERIQ_APPLE_SUBMISSION";
const APPLE_SUBMISSION_READY_VALUE = "1";
const DEFAULT_PUBLIC_PRIVACY_POLICY_URL = "https://sites.google.com/view/corneriq/privacy-policy";
const DEFAULT_PUBLIC_SUPPORT_URL = "https://sites.google.com/view/corneriq/support";

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

function optionalFileExists(path) {
  return existsSync(pathFromRoot(path));
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
  for (const scriptName of ["start", "android", "ios", "web", "typecheck", "test", "test:coverage", "lint", "quality", "smoke:fixtures", "preflight:production", "smoke:live-db"]) {
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
  for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL", "EXPO_PUBLIC_CORNERIQ_SUPPORT_URL"]) {
    if (process.env[name] === undefined && !envExampleNames.has(name)) {
      failures.push(`Missing public env declaration: ${name}`);
    }
  }
}

function checkSensitiveConfigMarkers() {
  const files = ["app.json", "app.config.js", "app.config.ts", "eas.json", "src/services/supabase/client.ts", "src/services/config/runtimeConfig.ts"].filter((path) =>
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

function isPlaceholderPrivacyUrl(value) {
  if (!value) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.hostname === "example.com" || /placeholder/i.test(value);
  } catch {
    return true;
  }
}

function addAppleSubmissionBlocker(message) {
  const formatted = `APPLE_SUBMISSION_BLOCKED: ${message}`;
  if (process.env[APPLE_SUBMISSION_MODE_ENV] === APPLE_SUBMISSION_READY_VALUE) {
    failures.push(formatted);
    return;
  }
  warnings.push(formatted);
}

function checkAppleSubmissionReadiness() {
  const app = readJson("app.json");
  const expo = app.expo ?? {};
  const iconPath = typeof expo.icon === "string" ? expo.icon : "";
  const splash = expo.splash && typeof expo.splash === "object" ? expo.splash : {};
  const splashImagePath = typeof splash.image === "string" ? splash.image : "";
  const privacyPolicyUrl = process.env.EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL ?? DEFAULT_PUBLIC_PRIVACY_POLICY_URL;
  const supportUrl = process.env.EXPO_PUBLIC_CORNERIQ_SUPPORT_URL ?? DEFAULT_PUBLIC_SUPPORT_URL;

  if (!iconPath || !optionalFileExists(iconPath)) {
    addAppleSubmissionBlocker("final app icon is not wired in app.json.");
  }
  if (!splashImagePath || !optionalFileExists(splashImagePath)) {
    addAppleSubmissionBlocker("final splash image is not wired in app.json.");
  }
  if (isPlaceholderPrivacyUrl(privacyPolicyUrl)) {
    addAppleSubmissionBlocker("set EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL to a real public policy URL.");
  }
  if (isPlaceholderPrivacyUrl(supportUrl)) {
    addAppleSubmissionBlocker("set EXPO_PUBLIC_CORNERIQ_SUPPORT_URL to a real public support URL.");
  }
  if (expo.ios?.supportsTablet === true && process.env.CORNERIQ_IPAD_VALIDATED !== "1") {
    addAppleSubmissionBlocker("iPad support is enabled without CORNERIQ_IPAD_VALIDATED=1.");
  }
}

for (const file of ["app.json", "eas.json", "docs/FEATURE_STATUS.md", "docs/KNOWN_GAPS.md", "docs/qa/README.md"]) {
  requireFile(file);
}

checkPackageScripts();
checkEasProfiles();
checkAppConfig();
checkPublicEnvDeclarations();
checkSensitiveConfigMarkers();
checkAppleSubmissionReadiness();

if (failures.length > 0) {
  console.error("Production preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production preflight passed.");
console.log("Checked public env declarations: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL, EXPO_PUBLIC_CORNERIQ_SUPPORT_URL.");
console.log("Checked package scripts, EAS profiles, app config, client config markers, and launch docs.");
if (warnings.length > 0) {
  console.log(`Apple submission checks are warnings unless ${APPLE_SUBMISSION_MODE_ENV}=1.`);
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
