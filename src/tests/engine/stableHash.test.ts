import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJson, stableHash } from "../../engine/core/stableHash";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("stableHash", () => {
  it("canonicalizes object key order before hashing", () => {
    const canonical = canonicalJson({ b: 2, a: 1 });

    expect(canonical).toBe('{"a":1,"b":2}');
    expect(stableHash({ b: 2, a: 1 })).toBe(stableHash({ a: 1, b: 2 }));
    expect(stableHash({ b: 2, a: 1 })).toBe(sha256(canonical));
    expect(stableHash({ b: 2, a: 1 })).toHaveLength(64);
  });

  it("keeps array order significant for audit identity", () => {
    expect(stableHash({ values: [1, 2, 3] })).not.toBe(stableHash({ values: [3, 2, 1] }));
  });
});
