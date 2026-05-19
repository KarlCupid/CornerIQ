export function postWeighInRecoveryNote(hoursAvailable: number): string {
  return hoursAvailable >= 12
    ? "Stage fluids, sodium, carbs, and familiar meals across the full window."
    : "Use conservative fluids, electrolytes, familiar carbs, and gut comfort before competing.";
}
