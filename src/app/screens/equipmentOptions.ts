export const BOXING_EQUIPMENT_OPTIONS = [
  { icon: "body-outline", label: "Bodyweight only", value: "bodyweight" },
  { icon: "sync-outline", label: "Jump rope", value: "jump_rope" },
  { icon: "barbell-outline", label: "Dumbbells", value: "dumbbells" },
  { icon: "barbell-outline", label: "Barbell", value: "barbell" },
  { icon: "remove-outline", label: "Pull-up bar", value: "pull_up_bar" },
  { icon: "shield-outline", label: "Heavy bag", value: "bag" },
  { icon: "fitness-outline", label: "Full gym", value: "full_gym" }
] as const;

export function toggleEquipmentSelection(current: readonly string[], value: string): string[] {
  if (value === "bodyweight") {
    return current.includes("bodyweight") ? [] : ["bodyweight"];
  }

  const withoutBodyweight = current.filter((item) => item !== "bodyweight");
  return withoutBodyweight.includes(value)
    ? withoutBodyweight.filter((item) => item !== value)
    : [...withoutBodyweight, value];
}
