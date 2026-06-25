export const CANONICAL_EQUIPMENT_IDS = [
  "none",
  "bodyweight",
  "bag",
  "full_gym",
  "jump_rope",
  "dumbbells",
  "barbell",
  "pull_up_bar",
  "bands",
  "bench",
  "bike",
  "landmine",
  "medicine_ball",
  "rower",
  "trap_bar",
  "tennis_ball",
  "hill",
  "mirror",
  "line",
  "gloves",
  "hand_wraps"
] as const;

export type CanonicalEquipmentId = (typeof CANONICAL_EQUIPMENT_IDS)[number];

const canonicalEquipmentSet = new Set<string>(CANONICAL_EQUIPMENT_IDS);
const noEquipmentIds = new Set<CanonicalEquipmentId>(["none", "bodyweight"]);
const descriptiveNoEquipmentTags = new Set(["no_equipment", "minimal"]);
const fullGymCapabilities: readonly CanonicalEquipmentId[] = [
  "full_gym",
  "dumbbells",
  "barbell",
  "pull_up_bar",
  "bands",
  "bench",
  "bike",
  "landmine",
  "medicine_ball",
  "rower",
  "trap_bar",
  "tennis_ball",
  "jump_rope"
];

const aliases: Record<string, CanonicalEquipmentId> = {
  band: "bands",
  bands: "bands",
  barbell: "barbell",
  bar_bell: "barbell",
  bag: "bag",
  boxing_bag: "bag",
  heavy_bag: "bag",
  heavybag: "bag",
  bodyweight: "bodyweight",
  body_weight: "bodyweight",
  bodyweight_only: "bodyweight",
  body_weight_only: "bodyweight",
  no_equipment: "none",
  none: "none",
  nothing: "none",
  full_gym: "full_gym",
  gym: "full_gym",
  fullgym: "full_gym",
  jump_rope: "jump_rope",
  skipping_rope: "jump_rope",
  dumbbell: "dumbbells",
  dumbbells: "dumbbells",
  db: "dumbbells",
  dbs: "dumbbells",
  pullup_bar: "pull_up_bar",
  pull_up_bar: "pull_up_bar",
  chin_up_bar: "pull_up_bar",
  bench: "bench",
  bike: "bike",
  bicycle: "bike",
  stationary_bike: "bike",
  landmine: "landmine",
  med_ball: "medicine_ball",
  medicine_ball: "medicine_ball",
  rower: "rower",
  rowing_machine: "rower",
  trap_bar: "trap_bar",
  hex_bar: "trap_bar",
  tennis_ball: "tennis_ball",
  hill: "hill",
  mirror: "mirror",
  line: "line",
  gloves: "gloves",
  boxing_gloves: "gloves",
  hand_wraps: "hand_wraps",
  wraps: "hand_wraps"
};

export interface NormalizedEquipmentAccess {
  values: readonly string[];
  known: readonly CanonicalEquipmentId[];
  unknownNotes: readonly string[];
  capabilities: ReadonlySet<CanonicalEquipmentId>;
  hasNoKnownRealEquipment: boolean;
}

export function normalizeEquipmentToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalEquipmentId(value: string): CanonicalEquipmentId | null {
  const token = normalizeEquipmentToken(value);
  if (!token) {
    return null;
  }
  if (aliases[token]) {
    return aliases[token];
  }
  return canonicalEquipmentSet.has(token) ? (token as CanonicalEquipmentId) : null;
}

function uniqueInInputOrder<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}

export function normalizeEquipmentAccessDetails(values: readonly string[] | null | undefined): NormalizedEquipmentAccess {
  const known: CanonicalEquipmentId[] = [];
  const unknownNotes: string[] = [];

  for (const rawValue of values ?? []) {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      continue;
    }
    const canonical = canonicalEquipmentId(trimmed);
    if (canonical) {
      known.push(canonical);
    } else {
      unknownNotes.push(trimmed);
    }
  }

  const uniqueKnown = uniqueInInputOrder(known);
  const realKnown = uniqueKnown.filter((item) => !noEquipmentIds.has(item));
  const noEquipmentKnown = uniqueKnown.filter((item) => noEquipmentIds.has(item));
  const normalizedKnown: readonly CanonicalEquipmentId[] =
    realKnown.length > 0 ? realKnown : noEquipmentKnown.length > 0 ? [noEquipmentKnown.includes("bodyweight") ? "bodyweight" : "none"] : [];
  const capabilities = new Set<CanonicalEquipmentId>();

  for (const item of normalizedKnown) {
    if (item === "full_gym") {
      for (const capability of fullGymCapabilities) {
        capabilities.add(capability);
      }
      continue;
    }
    if (!noEquipmentIds.has(item)) {
      capabilities.add(item);
    }
  }

  return {
    values: [...normalizedKnown, ...uniqueInInputOrder(unknownNotes)],
    known: normalizedKnown,
    unknownNotes: uniqueInInputOrder(unknownNotes),
    capabilities,
    hasNoKnownRealEquipment: capabilities.size === 0
  };
}

export function normalizeEquipmentAccess(values: readonly string[] | null | undefined): readonly string[] {
  return normalizeEquipmentAccessDetails(values).values;
}

export function hasEquipmentCapability(values: readonly string[] | null | undefined, requirement: string): boolean {
  const canonical = canonicalEquipmentId(requirement);
  if (!canonical) {
    return descriptiveNoEquipmentTags.has(normalizeEquipmentToken(requirement));
  }
  if (noEquipmentIds.has(canonical)) {
    return true;
  }
  return normalizeEquipmentAccessDetails(values).capabilities.has(canonical);
}

export function hasAllEquipmentCapabilities(values: readonly string[] | null | undefined, requirements: readonly string[] | null | undefined): boolean {
  return (requirements ?? []).every((requirement) => hasEquipmentCapability(values, requirement));
}

export function hasAnyEquipmentCapability(values: readonly string[] | null | undefined, requirements: readonly string[] | null | undefined): boolean {
  const required = requirements ?? [];
  return required.length === 0 || required.some((requirement) => hasEquipmentCapability(values, requirement));
}

export function hasNoKnownRealEquipment(values: readonly string[] | null | undefined): boolean {
  return normalizeEquipmentAccessDetails(values).hasNoKnownRealEquipment;
}

export function formatEquipmentAccessLabel(value: string): string {
  const canonical = canonicalEquipmentId(value);
  const display = canonical ?? value;
  return display
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
