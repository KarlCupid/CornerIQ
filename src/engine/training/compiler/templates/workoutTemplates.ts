import type {
  BoxingSkillSubFocus,
  MovementPattern,
  PlanSubFocus,
  SessionRole,
  TrainingAdaptation,
  TrainingGoalMode,
  TrainingPrimaryFocus
} from "../types";
import type { WorkoutTemplate, WorkoutTemplateBlock, WorkoutTemplateSlot } from "./templateTypes";

const allGoalModes: readonly TrainingGoalMode[] = ["build", "fight_camp", "tournament", "recovery_reset", "maintenance"];
const buildGoalModes: readonly TrainingGoalMode[] = ["build", "fight_camp", "maintenance"];
const allFocuses: readonly TrainingPrimaryFocus[] = ["balanced", "strength", "power", "conditioning", "mobility_recovery", "boxing_skill"];

function slot(input: WorkoutTemplateSlot): WorkoutTemplateSlot {
  return input;
}

function block(input: WorkoutTemplateBlock): WorkoutTemplateBlock {
  return input;
}

function mobilitySlot(id = "movement_prep", role = "easy_movement"): WorkoutTemplateSlot {
  return slot({
    id,
    role,
    priority: "accessory",
    adaptation: "mobility",
    movementPatterns: ["mobility"],
    durationRangeSeconds: { min: 180, max: 900 }
  });
}

function warmupBlock(id = "warmup", title = "Warm-up"): WorkoutTemplateBlock {
  return block({
    id,
    role: "warm_up",
    title,
    adaptation: "mobility",
    minDurationMinutes: 5,
    defaultDurationMinutes: 8,
    maxDurationMinutes: 12,
    slots: [mobilitySlot("movement_prep", "warm_up")],
    coachingNotes: ["Warm up slowly and check how you feel before the main work."]
  });
}

function cooldownBlock(id = "cooldown", title = "Cooldown"): WorkoutTemplateBlock {
  return block({
    id,
    role: "cooldown",
    title,
    adaptation: "mobility",
    minDurationMinutes: 5,
    defaultDurationMinutes: 8,
    maxDurationMinutes: 12,
    slots: [mobilitySlot("recovery_downshift", "easy_finish")],
    coachingNotes: ["Finish easy. Do not add extra work."]
  });
}

function template(input: WorkoutTemplate): WorkoutTemplate {
  return input;
}

function strengthBlock(input: {
  id?: string | undefined;
  title?: string | undefined;
  slots: readonly WorkoutTemplateSlot[];
  min?: number | undefined;
  defaults?: number | undefined;
  max?: number | undefined;
}): WorkoutTemplateBlock {
  return block({
    id: input.id ?? "strength",
    role: "primary",
    title: input.title ?? "Strength work",
    adaptation: "strength",
    minDurationMinutes: input.min ?? 20,
    defaultDurationMinutes: input.defaults ?? 30,
    maxDurationMinutes: input.max ?? 45,
    slots: input.slots,
    coachingNotes: ["Keep clean reps in reserve.", "Rest until the next set can stay controlled."]
  });
}

function strengthTemplate(input: {
  id: string;
  title: string;
  roles: readonly SessionRole[];
  subFocuses?: readonly PlanSubFocus[] | undefined;
  slots: readonly WorkoutTemplateSlot[];
  defaultDurationMinutes?: number | undefined;
  defaultHardness?: WorkoutTemplate["defaultHardness"] | undefined;
}): WorkoutTemplate {
  const defaultDuration = input.defaultDurationMinutes ?? 50;
  return template({
    id: input.id,
    title: input.title,
    category: "strength",
    compatibleGoalModes: buildGoalModes,
    compatiblePrimaryFocuses: ["balanced", "strength", "conditioning", "power"],
    compatibleSubFocuses: input.subFocuses,
    compatibleRoles: input.roles,
    defaultHardness: input.defaultHardness ?? "moderate",
    minDurationMinutes: 35,
    defaultDurationMinutes: defaultDuration,
    maxDurationMinutes: 70,
    blocks: [warmupBlock(), strengthBlock({ slots: input.slots, defaults: Math.max(22, defaultDuration - 18) }), cooldownBlock()],
    constraints: {
      avoidNearSparring: true,
      avoidHardBoxingSameDay: true,
      countsAsHardGeneratedDay: input.defaultHardness === "hard"
    }
  });
}

const lowerPrimary = slot({
  id: "lower_primary",
  role: "lower_primary",
  priority: "primary",
  adaptation: "strength",
  movementPatterns: ["squat", "hinge", "unilateral"],
  defaultSets: 3,
  repRange: { min: 5, max: 10 }
});

const squatPrimary = slot({
  id: "primary_squat",
  role: "squat",
  priority: "primary",
  adaptation: "strength",
  movementPatterns: ["squat"],
  defaultSets: 3,
  repRange: { min: 5, max: 10 }
});

const hingePrimary = slot({
  id: "primary_hinge",
  role: "hinge",
  priority: "primary",
  adaptation: "strength",
  movementPatterns: ["hinge"],
  defaultSets: 3,
  repRange: { min: 5, max: 10 }
});

const unilateralSupport = slot({
  id: "primary_unilateral",
  role: "unilateral",
  priority: "secondary",
  adaptation: "strength",
  movementPatterns: ["unilateral"],
  defaultSets: 2,
  repRange: { min: 6, max: 10 }
});

const upperPush = slot({
  id: "upper_push",
  role: "upper_push",
  priority: "secondary",
  adaptation: "strength",
  movementPatterns: ["push"],
  defaultSets: 2,
  repRange: { min: 6, max: 12 }
});

const upperPull = slot({
  id: "upper_pull",
  role: "upper_pull",
  priority: "secondary",
  adaptation: "strength",
  movementPatterns: ["pull"],
  defaultSets: 2,
  repRange: { min: 8, max: 12 }
});

const trunkControl = slot({
  id: "trunk_control",
  role: "trunk_control",
  priority: "accessory",
  adaptation: "strength",
  movementPatterns: ["anti_rotation", "anti_extension"],
  defaultSets: 2,
  repRange: { min: 6, max: 12 }
});

function conditioningTemplate(input: {
  id: string;
  title: string;
  roles: readonly SessionRole[];
  energySystemIntent: WorkoutTemplateSlot["energySystemIntent"];
  defaultHardness: WorkoutTemplate["defaultHardness"];
  subFocuses?: readonly PlanSubFocus[] | undefined;
}): WorkoutTemplate {
  return template({
    id: input.id,
    title: input.title,
    category: "conditioning",
    compatibleGoalModes: buildGoalModes,
    compatiblePrimaryFocuses: ["balanced", "conditioning", "power"],
    compatibleSubFocuses: input.subFocuses,
    compatibleRoles: input.roles,
    defaultHardness: input.defaultHardness,
    minDurationMinutes: 30,
    defaultDurationMinutes: 45,
    maxDurationMinutes: 65,
    blocks: [
      warmupBlock(),
      block({
        id: "conditioning",
        role: "conditioning",
        title: "Conditioning work",
        adaptation: "conditioning",
        minDurationMinutes: 18,
        defaultDurationMinutes: 30,
        maxDurationMinutes: 48,
        slots: [
          slot({
            id: input.energySystemIntent ?? "aerobic_base",
            role: "conditioning",
            priority: "primary",
            adaptation: "conditioning",
            movementPatterns: ["locomotion"],
            energySystemIntent: input.energySystemIntent
          })
        ],
        coachingNotes: ["Keep the pace controlled.", "Stop if breathing, posture, or movement changes."]
      }),
      cooldownBlock()
    ],
    constraints: {
      avoidHardBoxingSameDay: true,
      countsAsHardGeneratedDay: input.defaultHardness === "hard"
    }
  });
}

function boxingTemplate(input: {
  id: string;
  title: string;
  theme?: BoxingSkillSubFocus | undefined;
  roles?: readonly SessionRole[] | undefined;
  category?: WorkoutTemplate["category"] | undefined;
  defaultHardness?: WorkoutTemplate["defaultHardness"] | undefined;
  defaultEquipmentMode?: WorkoutTemplate["defaultEquipmentMode"] | undefined;
  subFocuses?: readonly PlanSubFocus[] | undefined;
}): WorkoutTemplate {
  const category = input.category ?? "boxing_skill";
  return template({
    id: input.id,
    title: input.title,
    category,
    compatibleGoalModes: buildGoalModes,
    compatiblePrimaryFocuses: ["balanced", "boxing_skill", "conditioning"],
    compatibleSubFocuses: input.subFocuses,
    compatibleRoles: input.roles ?? ["boxing_skill"],
    defaultHardness: input.defaultHardness ?? "moderate",
    minDurationMinutes: 30,
    defaultDurationMinutes: 42,
    maxDurationMinutes: 60,
    defaultEquipmentMode: input.defaultEquipmentMode ?? (input.id === "boxing_bag_skill" ? "bag" : "none"),
    blocks: [
      warmupBlock("boxing_warmup", "Warm-up"),
      block({
        id: "boxing_rounds",
        role: "boxing_rounds",
        title: "Solo boxing rounds",
        adaptation: category === "conditioning" ? "conditioning" : "boxing_skill",
        minDurationMinutes: 15,
        defaultDurationMinutes: 28,
        maxDurationMinutes: 42,
        slots: [
          slot({
            id: input.theme ? `boxing_skill_${input.theme}` : category === "conditioning" ? "boxing_conditioning" : "boxing_skill_shadow",
            role: "solo_boxing_rounds",
            priority: "primary",
            adaptation: category === "conditioning" ? "conditioning" : "boxing_skill",
            movementPatterns: ["locomotion"],
            boxingTheme: input.theme
          })
        ],
        coachingNotes: ["Keep all boxing work solo.", "Stop if guard, stance, balance, or breathing breaks repeatedly."]
      }),
      cooldownBlock()
    ],
    constraints: {
      avoidHardBoxingSameDay: true,
      countsAsHardGeneratedDay: category === "conditioning",
      soloOnly: true,
      requiresEquipment: input.id === "boxing_bag_skill" ? ["bag"] : []
    }
  });
}

function mobilityTemplate(input: {
  id: string;
  title: string;
  category?: WorkoutTemplate["category"] | undefined;
  subFocuses?: readonly PlanSubFocus[] | undefined;
  slots?: readonly WorkoutTemplateSlot[] | undefined;
}): WorkoutTemplate {
  return template({
    id: input.id,
    title: input.title,
    category: input.category ?? "mobility",
    compatibleGoalModes: allGoalModes,
    compatiblePrimaryFocuses: allFocuses,
    compatibleSubFocuses: input.subFocuses,
    compatibleRoles: ["mobility_recovery", "durability_support"],
    defaultHardness: "recovery",
    minDurationMinutes: 20,
    defaultDurationMinutes: 30,
    maxDurationMinutes: 45,
    blocks: [
      block({
        id: "mobility",
        role: "mobility",
        title: "Easy mobility",
        adaptation: input.category === "durability" ? "durability" : "mobility",
        minDurationMinutes: 15,
        defaultDurationMinutes: 25,
        maxDurationMinutes: 40,
        slots: input.slots ?? [mobilitySlot("recovery_downshift", "easy_recovery")],
        coachingNotes: ["Move in an easy range.", "Stop if symptoms increase."]
      }),
      cooldownBlock("final_check", "Final check")
    ],
    constraints: {
      allowOnHardBoxingDay: true,
      countsAsHardGeneratedDay: false
    }
  });
}

function powerTemplate(input: {
  id: string;
  title: string;
  slots: readonly WorkoutTemplateSlot[];
  subFocuses?: readonly PlanSubFocus[] | undefined;
}): WorkoutTemplate {
  return template({
    id: input.id,
    title: input.title,
    category: "power",
    compatibleGoalModes: buildGoalModes,
    compatiblePrimaryFocuses: ["balanced", "power"],
    compatibleSubFocuses: input.subFocuses,
    compatibleRoles: ["power_quality", "alactic_conditioning"],
    defaultHardness: "hard",
    minDurationMinutes: 35,
    defaultDurationMinutes: 45,
    maxDurationMinutes: 60,
    blocks: [
      warmupBlock(),
      block({
        id: "power",
        role: "primary",
        title: "Power work",
        adaptation: "power",
        minDurationMinutes: 18,
        defaultDurationMinutes: 26,
        maxDurationMinutes: 36,
        slots: input.slots,
        coachingNotes: ["Every rep should look fast.", "Stop before reps slow down."]
      }),
      cooldownBlock()
    ],
    constraints: {
      avoidNearSparring: true,
      avoidHardBoxingSameDay: true,
      countsAsHardGeneratedDay: true
    }
  });
}

export const workoutTemplates: readonly WorkoutTemplate[] = [
  strengthTemplate({
    id: "compact_full_body_strength",
    title: "Compact full-body strength",
    roles: ["primary_strength", "strength_maintenance"],
    subFocuses: ["full_body_strength", "strength_maintenance"],
    slots: [lowerPrimary, upperPull, trunkControl],
    defaultDurationMinutes: 40
  }),
  strengthTemplate({
    id: "full_body_strength_base",
    title: "Full-body strength base",
    roles: ["primary_strength", "secondary_strength"],
    subFocuses: ["full_body_strength"],
    slots: [squatPrimary, hingePrimary, unilateralSupport, upperPush, upperPull, trunkControl],
    defaultDurationMinutes: 55
  }),
  strengthTemplate({
    id: "lower_body_strength_builder",
    title: "Lower-body strength builder",
    roles: ["primary_strength", "secondary_strength"],
    subFocuses: ["lower_body_strength", "unilateral_control"],
    slots: [squatPrimary, hingePrimary, unilateralSupport, trunkControl],
    defaultDurationMinutes: 55,
    defaultHardness: "hard"
  }),
  strengthTemplate({
    id: "posterior_chain_strength_builder",
    title: "Posterior-chain strength builder",
    roles: ["primary_strength", "secondary_strength"],
    subFocuses: ["posterior_chain_strength"],
    slots: [hingePrimary, unilateralSupport, squatPrimary, upperPull, trunkControl],
    defaultDurationMinutes: 55,
    defaultHardness: "hard"
  }),
  strengthTemplate({
    id: "upper_body_trunk_strength",
    title: "Upper-body and trunk strength",
    roles: ["primary_strength", "secondary_strength"],
    subFocuses: ["upper_body_trunk_strength", "stance_posture_strength"],
    slots: [upperPush, upperPull, trunkControl, hingePrimary],
    defaultDurationMinutes: 50
  }),
  strengthTemplate({
    id: "strength_maintenance",
    title: "Strength maintenance",
    roles: ["strength_maintenance"],
    subFocuses: ["strength_maintenance"],
    slots: [lowerPrimary, upperPull, trunkControl],
    defaultDurationMinutes: 40
  }),
  powerTemplate({
    id: "rotational_power_quality",
    title: "Power quality exposure",
    subFocuses: ["rotational_power", "power_maintenance"],
    slots: [
      slot({ id: "power_rotation", role: "rotation_power", priority: "primary", adaptation: "power", movementPatterns: ["rotation"], defaultSets: 4, repRange: { min: 3, max: 5 } }),
      slot({ id: "power_lower", role: "lower_power", priority: "secondary", adaptation: "power", movementPatterns: ["unilateral", "ankle_tendon"], defaultSets: 3, repRange: { min: 2, max: 5 } })
    ]
  }),
  powerTemplate({
    id: "first_step_power_quality",
    title: "First-step power quality",
    subFocuses: ["first_step_explosiveness", "reaction_timing"],
    slots: [
      slot({ id: "power_lower", role: "first_step", priority: "primary", adaptation: "power", movementPatterns: ["ankle_tendon", "locomotion"], defaultSets: 4, repRange: { min: 1, max: 4 } }),
      slot({ id: "power_rotation", role: "rotation_support", priority: "secondary", adaptation: "power", movementPatterns: ["rotation"], defaultSets: 3, repRange: { min: 3, max: 5 } })
    ]
  }),
  conditioningTemplate({
    id: "alactic_speed",
    title: "Short-burst speed",
    roles: ["alactic_conditioning", "power_quality"],
    energySystemIntent: "alactic",
    defaultHardness: "hard",
    subFocuses: ["sprint_alactic_conditioning", "alactic_speed"]
  }),
  conditioningTemplate({
    id: "aerobic_base_support",
    title: "Aerobic base support",
    roles: ["aerobic_conditioning"],
    energySystemIntent: "aerobic_base",
    defaultHardness: "moderate",
    subFocuses: ["aerobic_base", "recovery_conditioning"]
  }),
  conditioningTemplate({
    id: "tempo_conditioning_day",
    title: "Tempo conditioning day",
    roles: ["tempo_conditioning"],
    energySystemIntent: "tempo",
    defaultHardness: "hard",
    subFocuses: ["tempo"]
  }),
  conditioningTemplate({
    id: "interval_conditioning_day",
    title: "Interval conditioning day",
    roles: ["interval_conditioning"],
    energySystemIntent: "intervals",
    defaultHardness: "hard",
    subFocuses: ["intervals"]
  }),
  boxingTemplate({
    id: "boxing_round_conditioning",
    title: "Solo round conditioning",
    roles: ["boxing_conditioning"],
    category: "conditioning",
    defaultHardness: "hard",
    subFocuses: ["repeatable_rounds", "boxing_specific_conditioning"]
  }),
  boxingTemplate({ id: "boxing_skill_shadow", title: "Solo shadowboxing skill", subFocuses: ["shadowboxing_mechanics", "pressure_control"] }),
  boxingTemplate({ id: "boxing_jab_system", title: "Jab system rounds", theme: "jab_system", subFocuses: ["jab_system"] }),
  boxingTemplate({ id: "boxing_entry_exit", title: "Entry and exit rounds", theme: "entries_exits", subFocuses: ["entries_exits"] }),
  boxingTemplate({ id: "boxing_defense_reset", title: "Defense reset rounds", theme: "defense_after_punching", subFocuses: ["defense_after_punching"] }),
  boxingTemplate({ id: "boxing_footwork_ringcraft", title: "Footwork rounds", theme: "footwork_ringcraft", defaultEquipmentMode: "line", subFocuses: ["footwork_ringcraft", "outside_movement"] }),
  boxingTemplate({ id: "boxing_counter_timing", title: "Counter timing rounds", theme: "counter_timing", subFocuses: ["counter_timing"] }),
  boxingTemplate({ id: "boxing_bag_skill", title: "Bag skill rounds", theme: "bag_skill", subFocuses: ["bag_skill"] }),
  mobilityTemplate({ id: "mobility_recovery_reset", title: "Recovery mobility reset", category: "recovery", subFocuses: ["general_recovery", "post_bout", "travel", "soreness_management"] }),
  mobilityTemplate({ id: "hip_ankle_mobility", title: "Hip and ankle mobility", subFocuses: ["hips_ankles"], slots: [mobilitySlot("mobility_hips_ankles", "hips_ankles")] }),
  mobilityTemplate({ id: "shoulders_thoracic_mobility", title: "Shoulder and upper-back mobility", subFocuses: ["shoulders_thoracic"], slots: [mobilitySlot("mobility_shoulders_t_spine", "shoulders_upper_back")] }),
  mobilityTemplate({
    id: "trunk_guard_posture",
    title: "Trunk and guard posture",
    category: "durability",
    subFocuses: ["trunk_guard_posture", "stance_posture_strength"],
    slots: [
      slot({ id: "trunk_anti_extension", role: "trunk_control", priority: "primary", adaptation: "durability", movementPatterns: ["anti_extension"], defaultSets: 2 }),
      slot({ id: "trunk_anti_rotation", role: "trunk_control", priority: "primary", adaptation: "durability", movementPatterns: ["anti_rotation"], defaultSets: 2 }),
      mobilitySlot("recovery_downshift", "easy_finish")
    ]
  }),
  mobilityTemplate({
    id: "durability_support_layer",
    title: "Durability support",
    category: "durability",
    slots: [
      slot({ id: "trunk_anti_rotation", role: "trunk_control", priority: "primary", adaptation: "durability", movementPatterns: ["anti_rotation"], defaultSets: 2 }),
      slot({ id: "scapular_control", role: "shoulder_control", priority: "secondary", adaptation: "durability", movementPatterns: ["scapular_control", "pull"], defaultSets: 2 }),
      mobilitySlot("recovery_downshift", "easy_finish")
    ]
  }),
  template({
    id: "fight_week_sharpness",
    title: "Fight-week sharpness",
    category: "taper",
    compatibleGoalModes: ["tournament", "fight_camp"],
    compatiblePrimaryFocuses: allFocuses,
    compatibleRoles: ["boxing_skill", "mobility_recovery"],
    defaultHardness: "easy",
    minDurationMinutes: 20,
    defaultDurationMinutes: 28,
    maxDurationMinutes: 40,
    blocks: [
      warmupBlock(),
      block({
        id: "sharpness",
        role: "boxing_rounds",
        title: "Short sharpness touches",
        adaptation: "boxing_skill",
        minDurationMinutes: 8,
        defaultDurationMinutes: 15,
        maxDurationMinutes: 22,
        slots: [slot({ id: "boxing_skill_jab", role: "short_skill_touch", priority: "primary", adaptation: "boxing_skill", movementPatterns: ["locomotion"], boxingTheme: "jab_system" })],
        coachingNotes: ["Keep it fast and clean only.", "Leave fresher than you started."]
      }),
      cooldownBlock()
    ],
    constraints: {
      allowOnHardBoxingDay: true,
      countsAsHardGeneratedDay: false,
      soloOnly: true
    }
  })
];

export function getWorkoutTemplate(templateId: string | undefined): WorkoutTemplate | undefined {
  if (!templateId) {
    return undefined;
  }
  return workoutTemplates.find((templateItem) => templateItem.id === templateId);
}

export function templatePrimaryMovementPatterns(templateItem: WorkoutTemplate): readonly MovementPattern[] {
  return [
    ...new Set(
      templateItem.blocks.flatMap((templateBlock) =>
        templateBlock.slots.flatMap((templateSlot) => (templateSlot.movementPatterns ? [...templateSlot.movementPatterns] : []))
      )
    )
  ];
}

export function templatePrimaryAdaptation(templateItem: WorkoutTemplate): TrainingAdaptation {
  if (templateItem.category === "taper") {
    return "boxing_skill";
  }
  if (templateItem.category === "recovery") {
    return "recovery";
  }
  return templateItem.category === "boxing_skill" ? "boxing_skill" : templateItem.category;
}
