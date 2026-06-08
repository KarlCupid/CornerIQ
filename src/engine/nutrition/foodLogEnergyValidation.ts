export interface FoodLogEnergyInput {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
}

export type FoodLogEnergyValidationStatus = "valid" | "empty" | "invalid_number" | "missing_macro_energy" | "inconsistent";

export interface FoodLogEnergyValidationResult {
  status: FoodLogEnergyValidationStatus;
  valid: boolean;
  macroCalories: number;
  calorieDelta: number;
  tolerance: number;
  calorieRange: {
    min: number;
    max: number;
  };
  athleteFacingMessage: string;
  engineReason: string;
}

export const FOOD_LOG_MACRO_KCAL_PER_GRAM = {
  protein: 4,
  carbohydrate: 4,
  fat: 9
} as const;

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function roundedKcal(value: number): number {
  return Math.round(value);
}

function toleranceForMacroCalories(macroCalories: number): number {
  if (macroCalories <= 0) {
    return 0;
  }
  const labelTolerance = Math.max(25, macroCalories * 0.2);
  const boundedTolerance = Math.min(labelTolerance, macroCalories * 0.45);
  return Math.max(1, roundedKcal(boundedTolerance));
}

export function estimateFoodLogMacroCalories(input: Pick<FoodLogEnergyInput, "proteinGrams" | "carbohydrateGrams" | "fatGrams">): number {
  return roundedKcal(
    input.proteinGrams * FOOD_LOG_MACRO_KCAL_PER_GRAM.protein +
      input.carbohydrateGrams * FOOD_LOG_MACRO_KCAL_PER_GRAM.carbohydrate +
      input.fatGrams * FOOD_LOG_MACRO_KCAL_PER_GRAM.fat
  );
}

export function validateFoodLogEnergy(input: FoodLogEnergyInput): FoodLogEnergyValidationResult {
  const macroCalories = estimateFoodLogMacroCalories(input);
  const calories = roundedKcal(input.calories);
  const tolerance = toleranceForMacroCalories(macroCalories);
  const calorieRange = {
    min: macroCalories > 0 ? Math.max(1, roundedKcal(macroCalories - tolerance)) : 0,
    max: macroCalories > 0 ? roundedKcal(macroCalories + tolerance) : 0
  };
  const calorieDelta = roundedKcal(input.calories - macroCalories);

  if (![input.calories, input.proteinGrams, input.carbohydrateGrams, input.fatGrams].every(finiteNonNegative)) {
    return {
      status: "invalid_number",
      valid: false,
      macroCalories,
      calorieDelta,
      tolerance,
      calorieRange,
      athleteFacingMessage: "Food entry values must be finite, non-negative numbers.",
      engineReason: "Food log contains a non-finite or negative calorie/macro value."
    };
  }

  if (input.calories === 0 && macroCalories === 0) {
    return {
      status: "empty",
      valid: false,
      macroCalories,
      calorieDelta,
      tolerance,
      calorieRange,
      athleteFacingMessage: "Food entry needs calories or macro grams greater than 0.",
      engineReason: "Food log has no calorie or macro energy."
    };
  }

  if (input.calories > 0 && macroCalories === 0) {
    return {
      status: "missing_macro_energy",
      valid: false,
      macroCalories,
      calorieDelta,
      tolerance,
      calorieRange,
      athleteFacingMessage: "Food calories need matching protein, carbs, or fat grams before saving.",
      engineReason: "Food log records calories without protein, carbohydrate, or fat grams."
    };
  }

  if (calories < calorieRange.min || calories > calorieRange.max) {
    const message = `Calories do not match macros: protein/carbs/fat estimate ${macroCalories} kcal, so enter ${calorieRange.min}-${calorieRange.max} kcal or correct the macros.`;
    return {
      status: "inconsistent",
      valid: false,
      macroCalories,
      calorieDelta,
      tolerance,
      calorieRange,
      athleteFacingMessage: message,
      engineReason: message
    };
  }

  return {
    status: "valid",
    valid: true,
    macroCalories,
    calorieDelta,
    tolerance,
    calorieRange,
    athleteFacingMessage: `Macro estimate: ${macroCalories} kcal from protein, carbs, and fat.`,
    engineReason: "Food calories are consistent with protein, carbohydrate, and fat energy."
  };
}

export function assertValidFoodLogEnergy(input: FoodLogEnergyInput): void {
  const validation = validateFoodLogEnergy(input);
  if (!validation.valid) {
    throw new Error(validation.athleteFacingMessage);
  }
}
