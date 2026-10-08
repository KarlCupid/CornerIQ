import { createRequire } from "node:module";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const loadTool = createRequire(resolve("package.json"));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xQAAAAASUVORK5CYII=",
  "base64"
);

describe("patched build dependency compatibility", () => {
  for (const consumer of ["root", "@expo/metro"]) {
    function loadAssets() {
      const consumerRequire = consumer === "root" ? loadTool : createRequire(loadTool.resolve("@expo/metro/package.json"));
      // Resolve from both consumers, including when npm deduplicates Metro.
      return loadTool(join(dirname(consumerRequire.resolve("metro/package.json")), "src/Assets.js")) as {
        getAssetSize: (type: string, content: Buffer, filePath: string) => { width: number; height: number };
        getAssetData: (assetPath: string, localPath: string, plugins: string[], platform: string, publicPath: string) => Promise<{
          width: number; height: number; scales: number[]; files: string[];
        }>;
      };
    }

    it(`${consumer} Metro reads PNG dimensions from buffers`, () => {
      const assets = loadAssets();
      expect(assets.getAssetSize("png", png, "fixture.png")).toMatchObject({ width: 1, height: 1 });
    });

    it(`${consumer} Metro resolves image metadata from a real asset filename`, async () => {
      const fixtureDirectory = mkdtempSync(join(tmpdir(), "corneriq-metro-asset-"));
      const fixturePath = join(fixtureDirectory, "fixture.png");
      try {
        writeFileSync(fixturePath, png);
        const data = await loadAssets().getAssetData(fixturePath, "fixture.png", [], "ios", "/assets");
        expect(data).toMatchObject({ width: 1, height: 1, scales: [1], files: [fixturePath] });
      } finally {
        unlinkSync(fixturePath);
        rmdirSync(fixtureDirectory);
      }
    });
  }

  it("xcode generates valid distinct project identifiers using the UUID override", () => {
    const xcode = loadTool("xcode") as {
      project: (filePath: string) => {
        hash: { project: { objects: Record<string, unknown> } };
        generateUuid: () => string;
      };
    };
    const project = xcode.project("compatibility.pbxproj");
    project.hash = { project: { objects: { PBXFileReference: {} } } };
    const first = project.generateUuid();
    const second = project.generateUuid();
    expect(first).toMatch(/^[A-F0-9]{24}$/);
    expect(second).toMatch(/^[A-F0-9]{24}$/);
    expect(second).not.toBe(first);
  });
});
