import type {
  ExistingTrainingComponent,
  ProtectedWorkout,
  ProtectedWorkoutType,
  RecurringProtectedWorkoutAnchor
} from "./types";

type ExistingTrainingRecord = Pick<
  ProtectedWorkout | RecurringProtectedWorkoutAnchor,
  "type" | "components" | "primaryComponent"
>;

const LEGACY_COMPONENTS: Record<ProtectedWorkoutType, readonly ExistingTrainingComponent[]> = {
  bag_work: ["boxing"],
  boxing_class: ["boxing"],
  coach_assigned_strength: ["strength"],
  competition: ["boxing"],
  conditioning: ["conditioning"],
  footwork_session: ["boxing"],
  mixed_training: [],
  pads_mitts: ["boxing"],
  recovery_day: [],
  roadwork: ["conditioning"],
  sparring: ["sparring"],
  strength: ["strength"],
  technical_session: ["boxing"],
  travel: []
};

export function existingTrainingComponents(workout: ExistingTrainingRecord): readonly ExistingTrainingComponent[] {
  if (workout.components && workout.components.length > 0) {
    return [...new Set(workout.components)];
  }
  return LEGACY_COMPONENTS[workout.type];
}

export function existingTrainingHasComponent(workout: ExistingTrainingRecord, component: ExistingTrainingComponent): boolean {
  return existingTrainingComponents(workout).includes(component);
}

export function protectedWorkoutTypeForComponents(
  components: readonly ExistingTrainingComponent[],
  boxingFormat?: ProtectedWorkout["boxingFormat"]
): ProtectedWorkoutType {
  const unique = [...new Set(components)];
  if (unique.length !== 1) {
    return "mixed_training";
  }
  switch (unique[0]) {
    case "boxing":
      switch (boxingFormat) {
        case "boxing_class":
          return "boxing_class";
        case "pads_mitts":
          return "pads_mitts";
        case "bag_work":
          return "bag_work";
        case "footwork":
          return "footwork_session";
        case "technical_work":
        default:
          return "technical_session";
      }
    case "sparring":
      return "sparring";
    case "strength":
      return "strength";
    case "conditioning":
      return "conditioning";
  }
  return "mixed_training";
}

export function existingTrainingTitle(workout: ExistingTrainingRecord): string {
  const components = existingTrainingComponents(workout);
  if (components.length === 0) {
    if (workout.type === "competition") return "Competition";
    if (workout.type === "travel") return "Travel";
    if (workout.type === "recovery_day") return "Recovery day";
    return "Existing workout";
  }
  const labels: Record<ExistingTrainingComponent, string> = {
    boxing: "Boxing",
    sparring: "Sparring",
    strength: "Strength",
    conditioning: "Conditioning"
  };
  const ordered = workout.primaryComponent
    ? [workout.primaryComponent, ...components.filter((component) => component !== workout.primaryComponent)]
    : components;
  return ordered.map((component) => labels[component]).join(" + ");
}
