import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface PromoScreenshotManifest {
  readonly entries: readonly {
    readonly approvedSurfaces: readonly string[];
    readonly captureStatus: string;
    readonly file: string;
    readonly privacyReview: string;
    readonly safetyReview: string;
  }[];
  readonly privacyReview: string;
  readonly safetyReview: string;
}

const promoSourcePaths = ["apps/promo-video/src/video.jsx", "apps/promo-video/src/instagram-aura-teaser.jsx"] as const;

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function readManifest(): PromoScreenshotManifest {
  return JSON.parse(read("apps/promo-video/public/screenshots/manifest.json")) as PromoScreenshotManifest;
}

describe("promo and peripheral release surfaces", () => {
  it("keeps public promo copy in support-not-replacement framing", () => {
    const source = promoSourcePaths.map(read).join("\n");

    expect(source).toContain("Educational support, not medical, dietetic, or coaching care.");
    expect(source).toContain("Not medical, dietetic, or coaching care.");
    expect(source).not.toContain("CornerIQ gives you the plan.");
    expect(source).not.toContain("Every round. Fully guided.");
    expect(source).not.toContain("before you have a full team");
  });

  it("keeps every referenced promo screenshot listed in the provenance manifest", () => {
    const manifest = readManifest();
    const entriesByFile = new Map(manifest.entries.map((entry) => [entry.file, entry]));
    const referencedScreenshots = new Set<string>();

    for (const sourcePath of promoSourcePaths) {
      const source = read(sourcePath);
      for (const match of source.matchAll(/screenshots\/([^'"]+\.png)/g)) {
        const file = match[1];
        if (file) {
          referencedScreenshots.add(file);
        }
      }
    }

    expect(manifest.privacyReview).toContain("credentials");
    expect(manifest.safetyReview).toContain("missing-data-is-unknown");
    expect(referencedScreenshots.size).toBeGreaterThan(0);

    for (const file of referencedScreenshots) {
      const entry = entriesByFile.get(file);
      expect(entry, file).toBeDefined();
      expect(existsSync(join("apps/promo-video/public/screenshots", file))).toBe(true);
      expect(entry?.captureStatus, file).toMatch(/current_reviewed|legacy_retained/);
      expect(entry?.privacyReview, file).toContain("No credentials");
      expect(entry?.safetyReview.length, file).toBeGreaterThan(20);
      expect(entry?.approvedSurfaces.length, file).toBeGreaterThan(0);
    }
  });

  it("keeps Apple release docs aligned with icon/splash preflight behavior", () => {
    const handoff = read("docs/release/APPLE_REVIEW_HANDOFF.md");
    const designQa = read("design-qa.md");
    const appConfig = read("app.json");

    expect(appConfig).toContain("./assets/app-icon.png");
    expect(appConfig).toContain("./assets/splash-screen.png");
    expect(handoff).toContain("App icon and splash files are wired in `app.json`");
    expect(handoff).toContain("does not prove final App Store artwork acceptance");
    expect(designQa).toContain("Icon/splash files are wired");
    expect(`${handoff}\n${designQa}`).not.toContain("Final app icon is not wired.");
    expect(`${handoff}\n${designQa}`).not.toContain("Final splash image is not wired.");
    expect(`${handoff}\n${designQa}`).not.toContain("public privacy-policy URL not finalized");
  });

  it("keeps published privacy-policy sources free of unresolved placeholders", () => {
    const policy = read("docs/legal/PRIVACY_POLICY_TEMPLATE.md");
    const handoff = read("docs/release/APPLE_REVIEW_HANDOFF.md");

    expect(policy).toContain("Backups, security logs, processor logs");
    expect(policy).not.toMatch(/\[(insert|replace|todo|tbd)[^\]]*\]/i);
    expect(handoff).toContain("Privacy Policy URL: published");
  });
});
