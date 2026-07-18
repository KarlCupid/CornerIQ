import { describe, expect, it } from "vitest";
import { RecurringProtectedWorkoutAnchorSchema } from "../../engine/core/schemas";
import { plainWorkoutTitle } from "../../engine/presentation/trainingCopy";
import { existingTrainingComponents, existingTrainingTitle, protectedWorkoutTypeForComponents } from "../../engine/training/existingTraining";
import { materializeRecurringProtectedAnchors } from "../../engine/training/protectedAnchors";
import { isHighStimulusProtectedWorkout } from "../../engine/training/trainingStimulus";

describe("structured existing training", () => {
  it("supports any boxing, sparring, strength, and conditioning combination", () => {
    const components = ["boxing", "strength", "conditioning"] as const;
    expect(protectedWorkoutTypeForComponents(components, "bag_work")).toBe("mixed_training");
    expect(existingTrainingComponents({ type: "mixed_training", components, primaryComponent: "boxing" })).toEqual(components);
    expect(existingTrainingTitle({ type: "mixed_training", components, primaryComponent: "boxing" })).toBe("Boxing + Strength + Conditioning");
  });

  it("keeps sparring protected even inside a hybrid workout", () => {
    expect(isHighStimulusProtectedWorkout({
      id: "hybrid",
      type: "mixed_training",
      components: ["sparring", "conditioning"],
      primaryComponent: "sparring",
      conditioningFormat: "timed_rounds",
      date: "2026-07-20",
      durationMinutes: 75,
      intensity: "moderate",
      protected: true
    })).toBe(true);
  });

  it("preserves structured details when a recurring workout is materialized", () => {
    const anchor = RecurringProtectedWorkoutAnchorSchema.parse({
      id: "weekly_hybrid",
      type: "mixed_training",
      weekday: "monday",
      durationMinutes: 80,
      intensity: "hard",
      protected: true,
      components: ["boxing", "strength"],
      primaryComponent: null,
      boxingFormat: "technical_work",
      strengthArea: "full_body"
    });
    const [workout] = materializeRecurringProtectedAnchors({
      recurringAnchors: [anchor],
      startDate: "2026-07-20",
      endDate: "2026-07-20"
    });
    expect(workout).toMatchObject({
      components: ["boxing", "strength"],
      primaryComponent: null,
      boxingFormat: "technical_work",
      strengthArea: "full_body",
      durationMinutes: 80
    });
  });

  it("uses the canonical family title for generated CornerIQ workouts", () => {
    expect(plainWorkoutTitle("V2 lower-body prescription", "strength_lower")).toBe("Leg strength");
    expect(plainWorkoutTitle("A completely different stored title", "strength_lower")).toBe("Leg strength");
  });
});
