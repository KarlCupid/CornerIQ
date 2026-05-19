export interface ExerciseCatalogItem {
  id: string;
  name: string;
  family: string;
  boxingRationale: string;
  beginnerEligible: boolean;
}

export const exerciseCatalog: readonly ExerciseCatalogItem[] = [
  {
    id: "trap_bar_deadlift",
    name: "Trap bar deadlift",
    family: "strength_lower",
    boxingRationale: "Builds lower-body force without chasing fatigue.",
    beginnerEligible: true
  },
  {
    id: "med_ball_rotational_throw",
    name: "Med ball rotational throw",
    family: "power_rotational",
    boxingRationale: "Trains hip-to-shoulder power transfer for punching support.",
    beginnerEligible: true
  },
  {
    id: "zone2_roadwork",
    name: "Zone 2 roadwork",
    family: "roadwork_zone2",
    boxingRationale: "Builds recovery capacity between rounds and sessions.",
    beginnerEligible: true
  }
];
