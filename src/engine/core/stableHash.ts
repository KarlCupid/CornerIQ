function canonicalJsonValue(value: unknown): string | undefined {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  const toJson = (value as { toJSON?: () => unknown }).toJSON;
  if (typeof toJson === "function") {
    return canonicalJsonValue(toJson.call(value));
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonValue(item) ?? "null").join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => {
      const serialized = canonicalJsonValue(record[key]);
      return serialized === undefined ? null : `${JSON.stringify(key)}:${serialized}`;
    })
    .filter((entry): entry is string => entry !== null);
  return `{${entries.join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  return canonicalJsonValue(value) ?? "null";
}

function rightRotate(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function utf8Bytes(text: string): readonly number[] {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >>> 12), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >>> 18), 0x80 | ((codePoint >>> 12) & 0x3f), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

function wordAt(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] ?? 0) << 24) | ((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0)) >>> 0;
}

const SHA256_K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function sha256Text(text: string): string {
  const source = utf8Bytes(text);
  const bitLength = source.length * 8;
  const totalLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(totalLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  bytes[totalLength - 8] = (highBits >>> 24) & 0xff;
  bytes[totalLength - 7] = (highBits >>> 16) & 0xff;
  bytes[totalLength - 6] = (highBits >>> 8) & 0xff;
  bytes[totalLength - 5] = highBits & 0xff;
  bytes[totalLength - 4] = (lowBits >>> 24) & 0xff;
  bytes[totalLength - 3] = (lowBits >>> 16) & 0xff;
  bytes[totalLength - 2] = (lowBits >>> 8) & 0xff;
  bytes[totalLength - 1] = lowBits & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Array<number>(64).fill(0);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = wordAt(bytes, chunk + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15] ?? 0;
      const previous2 = words[index - 2] ?? 0;
      const s0 = rightRotate(previous15, 7) ^ rightRotate(previous15, 18) ^ (previous15 >>> 3);
      const s1 = rightRotate(previous2, 17) ^ rightRotate(previous2, 19) ^ (previous2 >>> 10);
      words[index] = ((words[index - 16] ?? 0) + s0 + (words[index - 7] ?? 0) + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (SHA256_K[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => word.toString(16).padStart(8, "0")).join("");
}

export function stableHash(value: unknown): string {
  return sha256Text(canonicalJson(value));
}
