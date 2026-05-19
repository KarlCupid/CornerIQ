import type { CyclePhase, HormonalContraception } from "../core/types";

const suppressiveMethods: readonly HormonalContraception[] = [
  "combined_pill",
  "progestin_only_pill",
  "hormonal_iud",
  "implant",
  "injection",
  "patch",
  "ring"
];

export function phaseForContraception(method: HormonalContraception): CyclePhase | null {
  if (suppressiveMethods.includes(method)) {
    return "hormonal_contraception_suppressed";
  }
  return null;
}
