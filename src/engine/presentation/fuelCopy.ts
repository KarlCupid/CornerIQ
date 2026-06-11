const FUEL_REPLACEMENTS: readonly [RegExp, string][] = [
  [/\btarget confidence\b/gi, "how sure we are"],
  [/\bprovisional\b/gi, "a rough guide"],
  [/\bunder-fueling evidence\b/gi, "too little food for the work"],
  [/\bunder-fueling\b/gi, "too little food"],
  [/\bdeficit pressure\b/gi, "weight-loss pressure"],
  [/\bbody-composition trajectory\b/gi, "weight trend"],
  [/\bbody composition\b/gi, "body weight trend"],
  [/\bbody-mass context\b/gi, "weight trend"],
  [/\bbody-mass\b/gi, "body weight"],
  [/\bbody mass\b/gi, "body weight"],
  [/\bhard stop\b/gi, "safety stop"],
  [/\bhard-stop\b/gi, "safety-stop"],
  [/\bacute scale-manipulation\b/gi, "quick scale change"],
  [/\bacute protocol\b/gi, "quick cut plan"],
  [/\bacute support\b/gi, "fight-week support"],
  [/\blow residue\b/gi, "lower fiber"],
  [/\bcarbohydrate\b/gi, "carb"],
  [/\bmacros?\b/gi, "food targets"],
  [/\bcalories were not cut\b/gi, "calories stay steady"],
  [/\bweight-class pressure\b/gi, "weight pressure"],
  [/\bqualified clinical review\b/gi, "qualified support"],
  [/\bprofessional review\b/gi, "qualified support"]
];

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function plainFuelCopy(value: string): string {
  return collapseWhitespace(FUEL_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value));
}

export function compactFuelCopy(value: string, maxLength = 128): string {
  const copy = plainFuelCopy(value);
  if (copy.length <= maxLength) {
    return copy;
  }
  const firstSentence = copy.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= maxLength) {
    return firstSentence;
  }
  return `${copy.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
