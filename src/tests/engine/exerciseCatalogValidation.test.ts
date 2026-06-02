import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../engine/training/exerciseCatalog";
import { validateExerciseCatalog } from "../../engine/training/exerciseCatalogValidation";

const requiredExerciseIds = [
  "stance_guard_reset",
  "jab_line_mechanics",
  "double_jab_exit",
  "jab_body_jab_head",
  "shadowboxing_technical_rounds",
  "slip_line_entry",
  "roll_pivot_reset",
  "pivot_out_reset",
  "mirror_feint_reaction",
  "counter_timing_shadow",
  "rhythm_change_round",
  "defense_after_combo_round",
  "bag_jab_control_round",
  "bag_combo_exit_round",
  "rope_line_ringcraft",
  "corner_escape_pattern",
  "ring_cutoff_step",
  "reactive_footwork_callout",
  "technical_quality_gate",
  "optional_film_self_check",
  "trap_bar_deadlift",
  "goblet_squat_to_box",
  "hip_hinge_rdl",
  "rear_foot_elevated_split_squat",
  "split_squat_iso",
  "one_arm_row",
  "band_row",
  "landmine_press",
  "band_press_split_stance",
  "incline_push_up",
  "push_up_plus",
  "pallof_press",
  "dead_bug_anti_extension",
  "side_plank_knee_down",
  "adductor_side_plank_regression",
  "med_ball_scoop_toss",
  "med_ball_rotational_throw",
  "med_ball_shot_put_throw",
  "step_and_snap_rotation",
  "hip_switch_step",
  "low_amplitude_pogo",
  "snap_down_landing",
  "alactic_sprint_gated",
  "bike_alactic_spin",
  "reaction_cue_step",
  "tennis_ball_reaction_drop",
  "low_impact_agility_clock",
  "zone2_roadwork_talk_test",
  "tempo_roadwork",
  "roadwork_interval_controlled",
  "bike_rower_zone2",
  "bike_tempo_blocks",
  "bike_rower_intervals",
  "round_based_conditioning_support",
  "low_impact_round_circuit",
  "easy_walk_reset",
  "movement_prep_flow",
  "mobility_reset_flow",
  "recovery_breathing_mobility",
  "lateral_lunge_regression",
  "calf_ankle_capacity",
  "serratus_wall_slide",
  "ytwl_raise",
  "band_external_rotation",
  "wrist_pronation_supination",
  "wrist_extension_flexion_control",
  "open_close_hand_pump",
  "towel_squeeze_breathing",
  "neck_isometric_hand_resisted",
  "trap_posture_breathing_carry"
] as const;

describe("exercise catalog validation", () => {
  it("passes the production catalog", () => {
    const result = validateExerciseCatalog(exerciseCatalog);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("contains every exercise id required by the boxing template population spec as first-class catalog rows", () => {
    const exerciseIds = new Set(exerciseCatalog.map((exercise) => exercise.exerciseId));

    expect(requiredExerciseIds.filter((exerciseId) => !exerciseIds.has(exerciseId))).toEqual([]);
  });

  it("fails intentionally malformed catalog fixtures", () => {
    const malformed = [
      exerciseCatalog[0]!,
      {
        ...exerciseCatalog[0]!,
        name: "Unsafe contact power drill",
        boxingTransfer: "",
        coachingNotes: [""],
        requiredEquipment: ["barbell"],
        substitutions: [],
        stopConditions: []
      },
      {
        ...exerciseCatalog.find((exercise) => exercise.category === "power")!,
        exerciseId: "bad_power",
        stopConditions: ["Keep going until tired"]
      }
    ];

    const result = validateExerciseCatalog(malformed);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Duplicate exerciseId");
    expect(result.errors.join(" ")).toContain("missing boxingTransfer");
    expect(result.errors.join(" ")).toContain("prohibited term");
    expect(result.errors.join(" ")).toContain("speed or quality stop");
  });
});
