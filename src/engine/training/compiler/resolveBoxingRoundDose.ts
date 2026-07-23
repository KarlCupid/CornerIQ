import { hasEquipmentCapability } from "../../athlete/equipmentAccess";
import type { AthleteTrainingProfile, BoxingModality, BoxingRoundPrescription, BoxingSkillSubFocus, SessionIntent } from "./types";

type BoxingEnergySystem = "technical_aerobic" | "alactic_speed" | "round_tolerance";
type WorkoutLength = "short" | "medium" | "long";

interface BoxingRoundPlanStep {
  title: string;
  job: string;
  doThis: string;
  cue: string;
  doNotAdd: string;
  qualityCheck: string;
  downshift: string;
}

interface BoxingRoundPlanInput {
  title: string;
  job: string;
  doThis: string;
  cue: string;
  doNotAdd: string;
  qualityCheck?: string;
  downshift?: string;
}

interface BoxingRoundTiming {
  durationSeconds: number;
  restSeconds: number;
  rpe: number;
}

function step(input: BoxingRoundPlanInput): BoxingRoundPlanStep {
  return {
    ...input,
    qualityCheck: input.qualityCheck ?? "This round counts if the job stays clean through the final 30 seconds.",
    downshift: input.downshift ?? "If the job breaks twice, slow down and use the simplest version."
  };
}

function modalityFor(input: { athlete: AthleteTrainingProfile; theme: BoxingSkillSubFocus | undefined; conditioning: boolean }): BoxingModality {
  if ((input.theme === "bag_skill" || input.conditioning) && hasEquipmentCapability(input.athlete.equipment, "bag")) {
    return "heavy_bag";
  }
  if (input.theme === "footwork_ringcraft" || input.theme === "outside_movement") {
    return "floor_line_footwork";
  }
  if (input.theme === "counter_timing" || input.theme === "defense_after_punching") {
    return hasEquipmentCapability(input.athlete.equipment, "mirror") ? "mirror_work" : "solo_reaction";
  }
  return "shadowboxing";
}

const THEME_ROUND_PLANS: Record<BoxingSkillSubFocus, readonly BoxingRoundPlanStep[]> = {
  jab_system: [
    step({
      title: "Jab Home",
      job: "Make the jab come back every time.",
      doThis: "Jab once. Bring the hand back to your cheek. Set your feet before the next jab.",
      cue: "Jab home first.",
      doNotAdd: "No second punch until the jab hand is back."
    }),
    step({
      title: "Step Jab",
      job: "Connect the jab to the lead foot.",
      doThis: "Step with the lead foot as you jab. Bring the rear foot back under you after the hand returns.",
      cue: "Step, jab, recover.",
      doNotAdd: "Do not reach for range with your shoulder."
    }),
    step({
      title: "Double Jab",
      job: "Keep the second jab relaxed.",
      doThis: "Throw two jabs. The first finds range. The second stays light. Reset your stance after both hands return.",
      cue: "Two touches, same guard.",
      doNotAdd: "Do not turn this into a hard flurry."
    }),
    step({
      title: "Body Line Jab",
      job: "Change level without dropping your eyes.",
      doThis: "Soften your knees, touch the body line with the jab, stand tall, and bring the hand back.",
      cue: "Small level change.",
      doNotAdd: "Do not bend at the waist or stare down."
    }),
    step({
      title: "Jab Exit",
      job: "Leave after the jab.",
      doThis: "Jab in, bring the hand home, step out, and pause in stance before you throw again.",
      cue: "In clean, out clean.",
      doNotAdd: "Do not add a second punch on the way out."
    }),
    step({
      title: "Jab Then Defend",
      job: "Put a small defensive reset after the jab.",
      doThis: "Jab, bring it home, make one small slip or pull, then reset your feet.",
      cue: "Jab home, defense small.",
      doNotAdd: "Do not make the defense big or off balance."
    }),
    step({
      title: "Jab Rhythm",
      job: "Change rhythm without changing your guard return.",
      doThis: "Mix single jab, double jab, and pause. Every option ends with the same hand return.",
      cue: "Different rhythm, same return.",
      doNotAdd: "Do not rush the pause."
    }),
    step({
      title: "Clean Jab Round",
      job: "Use the cleanest jab from the day.",
      doThis: "Pick the jab version that stayed sharp. Repeat it with calm breathing and quiet feet.",
      cue: "Sharp because clean.",
      doNotAdd: "Do not chase speed if your guard or feet get loose."
    })
  ],
  entries_exits: [
    step({
      title: "In Out Stance",
      job: "Own the entry and the exit before punching.",
      doThis: "Step in from stance, step out, and recover stance width. Freeze for one beat before repeating.",
      cue: "In, out, stance.",
      doNotAdd: "Do not punch until the feet reset."
    }),
    step({
      title: "Jab Entry",
      job: "Enter behind one jab and leave clean.",
      doThis: "Step in with the jab, bring the hand back to guard, step out, then freeze in stance.",
      cue: "Jab in, freeze out.",
      doNotAdd: "Do not drift forward after the jab."
    }),
    step({
      title: "Double Jab Entry",
      job: "Use two jabs without getting stuck in range.",
      doThis: "First jab steps in. Second jab holds range. Bring both hands home and exit.",
      cue: "Two jabs, then leave.",
      doNotAdd: "Do not throw a third punch before the exit."
    }),
    step({
      title: "One Two Exit",
      job: "End the one-two with your feet under you.",
      doThis: "Throw a jab-cross, bring both hands back, then take a small L-step out and reset.",
      cue: "One-two, small L.",
      doNotAdd: "Do not let the cross pull your rear foot across."
    }),
    step({
      title: "Pivot Exit",
      job: "Make the exit small and balanced.",
      doThis: "Jab in, pivot out a small amount, recover stance, and breathe before the next entry.",
      cue: "Pivot small, recover tall.",
      doNotAdd: "Do not spin or over-rotate."
    }),
    step({
      title: "Freeze Check",
      job: "Show the reset after every exit.",
      doThis: "Enter, exit, and freeze for one beat. The freeze should show guard, soft knees, and stance width.",
      cue: "Freeze shows the reset.",
      doNotAdd: "Do not hide a messy exit by moving again."
    }),
    step({
      title: "Paused Entry",
      job: "Use patience before the entry.",
      doThis: "Pause in stance, enter on purpose, then leave at the same calm speed.",
      cue: "Pause, enter, leave.",
      doNotAdd: "Do not rush the exit to make up for the pause."
    }),
    step({
      title: "Best Entry Exit",
      job: "Repeat the entry and exit that stayed clean.",
      doThis: "Use the cleanest pattern from the session. Keep the exit quiet even when the entry feels sharp.",
      cue: "Quiet exit wins.",
      doNotAdd: "Do not add volume just because the first rep feels good."
    })
  ],
  defense_after_punching: [
    step({
      title: "Guard Return",
      job: "Finish every punch with both hands home.",
      doThis: "Move in stance and throw light single punches. Each punch ends with both hands back at guard.",
      cue: "Hands finish home.",
      doNotAdd: "Do not move your feet while a hand is still out."
    }),
    step({
      title: "Jab Slip",
      job: "Slip only after the jab comes home.",
      doThis: "Jab, bring it back, slip just outside the center line, then reset your stance.",
      cue: "Jab home, slip small.",
      doNotAdd: "Do not dip low or twist your feet."
    }),
    step({
      title: "One Two Roll",
      job: "Roll from the legs, not the waist.",
      doThis: "Touch a jab-cross, bring both hands home, make a small roll, and finish with eyes forward.",
      cue: "Roll from the legs.",
      doNotAdd: "Do not swing your head past your knees."
    }),
    step({
      title: "Pull And Reset",
      job: "Make the pull small and recover your feet.",
      doThis: "Punch once, pull back a small amount, then step your feet back under your hips before punching again.",
      cue: "Pull small, feet back.",
      doNotAdd: "Do not lean back and stay there."
    }),
    step({
      title: "Punch Defend Leave",
      job: "Stop the pattern after the exit.",
      doThis: "Punch once or twice, defend once, exit once, then pause before repeating.",
      cue: "Punch, defend, leave.",
      doNotAdd: "Do not add a bonus punch after the defense."
    }),
    step({
      title: "Delayed Defense",
      job: "Keep the defense deliberate.",
      doThis: "Punch, pause for one beat, make a small slip, roll, or pull, then reset.",
      cue: "Pause before defense.",
      doNotAdd: "Do not twitch through the defense."
    }),
    step({
      title: "Compact Guard",
      job: "Stay protected without getting tense.",
      doThis: "Keep elbows near your ribs and shoulders loose. Punch light, defend small, recover stance.",
      cue: "Compact, not tense.",
      doNotAdd: "Do not clamp your shoulders up to your ears."
    }),
    step({
      title: "Clean Punch Defense",
      job: "Repeat the cleanest punch-defense-reset pattern.",
      doThis: "Pick the pattern that kept your posture stacked. Add speed only if the reset stays immediate.",
      cue: "Stacked posture.",
      doNotAdd: "Do not chase speed through a sloppy reset."
    })
  ],
  footwork_ringcraft: [
    step({
      title: "Step Slide Width",
      job: "Restore stance width after every step.",
      doThis: "Step and slide on a floor line or imaginary line. The lead foot starts and the rear foot restores stance width.",
      cue: "Step, slide, width.",
      doNotAdd: "Do not let your feet come together."
    }),
    step({
      title: "Four Directions",
      job: "Move without crossing your feet.",
      doThis: "Move forward, back, left, and right. Keep your hands available and your stance the same size.",
      cue: "No crossed feet.",
      doNotAdd: "Do not bounce into narrow feet."
    }),
    step({
      title: "Touch Angle Freeze",
      job: "Punch first, angle second, freeze third.",
      doThis: "Jab once, take a small angle, then freeze in stance before the next jab.",
      cue: "Touch, angle, freeze.",
      doNotAdd: "Do not turn the angle into a big circle."
    }),
    step({
      title: "Small Pivot",
      job: "Pivot without losing your base.",
      doThis: "Touch the jab, pivot out small, and finish with both feet under your hips.",
      cue: "Pivot small.",
      doNotAdd: "Do not let the rear foot drag behind."
    }),
    step({
      title: "Circle And Reclaim",
      job: "Circle in small steps and return to stance.",
      doThis: "Circle out for three small steps, reclaim stance, then jab only after balance returns.",
      cue: "Circle, reclaim, jab.",
      doNotAdd: "Do not punch while your feet are still catching up."
    }),
    step({
      title: "Corner Exit",
      job: "Step out before adding offense.",
      doThis: "Use the line or floor as a corner. Step out, angle off, recover stance, then punch if clean.",
      cue: "Escape before punching.",
      doNotAdd: "Do not punch your way through bad foot position."
    }),
    step({
      title: "Reclaim Center",
      job: "Take your mark and leave on purpose.",
      doThis: "Step to your mark, bring guard home, then leave on a small angle.",
      cue: "Reclaim, then leave.",
      doNotAdd: "Do not stand tall and flat after reclaiming."
    }),
    step({
      title: "Best Angle",
      job: "Use the cleanest angle pattern.",
      doThis: "Repeat the angle that kept your feet quiet. Add speed only while stance width holds.",
      cue: "Quiet feet at speed.",
      doNotAdd: "Do not turn speed into hopping."
    })
  ],
  counter_timing: [
    step({
      title: "Feint Pause Touch",
      job: "Make the pause part of the rep.",
      doThis: "Feint small, pause for one beat, touch one jab or cross, then reset.",
      cue: "The pause counts.",
      doNotAdd: "Do not skip the pause when you feel quick."
    }),
    step({
      title: "Call And Answer",
      job: "Answer only after the cue.",
      doThis: "Say 'now' quietly, slip small, answer with one jab or cross, then reset.",
      cue: "Now, slip, answer.",
      doNotAdd: "Do not throw before your own cue."
    }),
    step({
      title: "Draw Answer Leave",
      job: "Use a small draw before the answer.",
      doThis: "Show a shoulder or foot feint, wait, touch one answer, and step out.",
      cue: "Draw, answer, leave.",
      doNotAdd: "Do not add a second answer before the exit."
    }),
    step({
      title: "Slow Fast",
      job: "Change speed without losing the reset.",
      doThis: "Move through one slow beat, throw one fast punch, then fully reset.",
      cue: "Slow-fast, reset.",
      doNotAdd: "Do not stay fast after the punch."
    }),
    step({
      title: "Defend Then Answer",
      job: "Defense comes first.",
      doThis: "Slip or pull small, answer once, exit once, then pause.",
      cue: "Defense, answer, exit.",
      doNotAdd: "Do not answer while your feet are narrow."
    }),
    step({
      title: "Rear Hand Answer",
      job: "Keep the rear hand direct and calm.",
      doThis: "Feint, pause, touch a straight rear hand, bring it home, and step out.",
      cue: "Rear hand home.",
      doNotAdd: "Do not swing the rear hand wide."
    }),
    step({
      title: "Timing Mix",
      job: "Mix feint, pause, and single answer.",
      doThis: "Choose jab, cross, slip, or pull after the pause. Reset fully before choosing again.",
      cue: "Calm answer only.",
      doNotAdd: "Do not let the mix become random volume."
    }),
    step({
      title: "Sharp Reset",
      job: "Be fast only if the reset is immediate.",
      doThis: "Repeat the calmest timing pattern. Each answer should feel sharp and end at guard.",
      cue: "Fast with a reset.",
      doNotAdd: "Do not chase longer combinations in this focus."
    })
  ],
  pressure_control: [
    step({
      title: "Balanced Step In",
      job: "Step in without crowding your stance.",
      doThis: "Step in behind the jab, stop at balanced range, then step out before your feet narrow.",
      cue: "Pressure stops balanced.",
      doNotAdd: "Do not keep walking forward after balance fades."
    }),
    step({
      title: "Compact One Two",
      job: "Keep pressure compact.",
      doThis: "Use a jab-cross with relaxed shoulders. Bring both hands home, then angle out.",
      cue: "Compact, then angle.",
      doNotAdd: "Do not load up or throw past your feet."
    }),
    step({
      title: "Body Head Touch",
      job: "Change level and come back tall.",
      doThis: "Touch the body line, return tall, touch the head line, then leave range.",
      cue: "Body line, tall exit.",
      doNotAdd: "Do not stay low after the body touch."
    }),
    step({
      title: "Three Touch Burst",
      job: "Stop at three touches.",
      doThis: "Use up to three light punches. After the third, guard home and step out.",
      cue: "Three touches max.",
      doNotAdd: "Do not turn three into five."
    }),
    step({
      title: "Forward Then Exit",
      job: "Every forward action gets an exit.",
      doThis: "Move forward for short bursts. Each burst ends with a step out or angle off.",
      cue: "Every burst exits.",
      doNotAdd: "Do not let forward movement become chasing."
    }),
    step({
      title: "Pressure Breath",
      job: "Breathe before adding more pressure.",
      doThis: "After each burst, take a long exhale, drop your shoulders, and recover stance.",
      cue: "Exhale before more.",
      doNotAdd: "Do not stack bursts on top of messy breathing."
    }),
    step({
      title: "Step Touch Angle",
      job: "Pressure ends on an angle.",
      doThis: "Step in, touch once or twice, angle off, and freeze in stance.",
      cue: "Step, touch, angle.",
      doNotAdd: "Do not finish square in front of the bag or mirror."
    }),
    step({
      title: "Clean Pressure",
      job: "Repeat the pressure pattern that stayed calm.",
      doThis: "Use the best burst from the session. Output only counts if the exit is still there.",
      cue: "Exit makes it count.",
      doNotAdd: "Do not finish with a sprint."
    })
  ],
  outside_movement: [
    step({
      title: "Long Stance",
      job: "Start long and ready.",
      doThis: "Hold a balanced stance with lead hand ready, rear hand home, soft knees, and light feet.",
      cue: "Long stance ready.",
      doNotAdd: "Do not stand tall with locked knees."
    }),
    step({
      title: "Touch And Leave",
      job: "Touch range and leave it.",
      doThis: "Jab to touch range, bring the hand home, step out, and reset.",
      cue: "Touch range, leave.",
      doNotAdd: "Do not admire the jab in range."
    }),
    step({
      title: "Small Circle",
      job: "Circle without crossing your feet.",
      doThis: "Circle out in small steps. Keep hands up and stance width steady.",
      cue: "Small circle, hands up.",
      doNotAdd: "Do not drift with your hands low."
    }),
    step({
      title: "Pivot To Long",
      job: "Use the pivot to return to long range.",
      doThis: "Touch the jab, pivot outside, and recover long range before the next touch.",
      cue: "Pivot to long range.",
      doNotAdd: "Do not pivot into narrow feet."
    }),
    step({
      title: "Leave And Reclaim",
      job: "Leave the line and take it back.",
      doThis: "Use the floor line as center. Leave the line, reclaim it, then punch only after stance returns.",
      cue: "Reclaim before punch.",
      doNotAdd: "Do not punch while leaning into the line."
    }),
    step({
      title: "In One Out One",
      job: "Control distance with one step.",
      doThis: "Step in once, touch once, step out once. Keep posture tall without locking your knees.",
      cue: "In one, out one.",
      doNotAdd: "Do not take extra steps to fix a long reach."
    }),
    step({
      title: "Circle With Purpose",
      job: "End every circle somewhere useful.",
      doThis: "Jab, circle, reset. The circle ends either in clean punch range or clearly out of range.",
      cue: "Circle with purpose.",
      doNotAdd: "Do not circle just to keep moving."
    }),
    step({
      title: "Best Long Pattern",
      job: "Repeat the cleanest long-range pattern.",
      doThis: "Keep the jab connected to the feet. Leave range before your stance gets flat.",
      cue: "Jab tied to feet.",
      doNotAdd: "Do not chase pace over distance control."
    })
  ],
  bag_skill: [
    step({
      title: "Find Range",
      job: "Touch the bag without reaching.",
      doThis: "Stand where your jab can touch the bag. Jab lightly, bring the hand back, and reset your feet.",
      cue: "Touch, home, reset.",
      doNotAdd: "Do not lean or push the bag."
    }),
    step({
      title: "Single Touch Accuracy",
      job: "Make each touch land where you choose.",
      doThis: "Touch single jabs on the same spot. Reset distance after every touch.",
      cue: "Pick the spot.",
      doNotAdd: "Do not punch harder to fix poor range."
    }),
    step({
      title: "One Two Home",
      job: "Bring both hands home after the one-two.",
      doThis: "Touch jab-cross. Bring the jab back before the cross leaves. Bring the cross back before you move.",
      cue: "Both hands home.",
      doNotAdd: "Do not let the bag pull you forward."
    }),
    step({
      title: "Body Head Touches",
      job: "Change level lightly and stay balanced.",
      doThis: "Touch body line, touch head line, bring both hands home, then step out.",
      cue: "Body-head, step out.",
      doNotAdd: "Do not load up on the body touch."
    }),
    step({
      title: "Short Combo Exit",
      job: "Keep combinations short and accurate.",
      doThis: "Use two or three light punches, bring hands home, then leave before the bag swings back.",
      cue: "Short combo, leave.",
      doNotAdd: "Do not throw more than three punches."
    }),
    step({
      title: "Combo Defend Off",
      job: "Defend after the bag touch.",
      doThis: "Touch a short combo, make one small slip or roll, then step off the bag.",
      cue: "Combo, defend, off.",
      doNotAdd: "Do not stand still after the combo."
    }),
    step({
      title: "Accuracy Round",
      job: "Keep accuracy above power.",
      doThis: "Pick two target heights on the bag. Move between them with light, clean touches and guard return.",
      cue: "Accuracy before power.",
      doNotAdd: "Do not push through tired shoulders."
    }),
    step({
      title: "Clean Bag Sequence",
      job: "Use the cleanest bag sequence from the day.",
      doThis: "Repeat the sequence that kept range, guard, and exit organized. Power stays capped.",
      cue: "Clean beats hard.",
      doNotAdd: "Do not finish with heavy power shots."
    })
  ],
  shadowboxing_mechanics: [
    step({
      title: "Stance Audit",
      job: "Check stance before adding punches.",
      doThis: "Move slowly and check guard height, chin position, soft knees, and stance width.",
      cue: "Stance audit first.",
      doNotAdd: "Do not start flowing before stance is set."
    }),
    step({
      title: "Jab Mechanics",
      job: "Make the single jab clean.",
      doThis: "Jab once, bring the hand home, keep the rear hand home, and reset your feet.",
      cue: "Touch, home, reset.",
      doNotAdd: "Do not let the rear hand drop."
    }),
    step({
      title: "One Two Mechanics",
      job: "Make both straight punches return.",
      doThis: "Throw a slow jab-cross. Bring the jab back before the cross leaves. Bring the cross back before your feet move.",
      cue: "Both hands back.",
      doNotAdd: "Do not let the cross drag your stance long."
    }),
    step({
      title: "Lead Hook Check",
      job: "Keep the lead hook short and balanced.",
      doThis: "Turn a short lead hook at half speed, bring the hand back, and reset stance width.",
      cue: "Short hook, home.",
      doNotAdd: "Do not swing wide or spin your hips past your feet."
    }),
    step({
      title: "Hands Then Feet",
      job: "Move only after the hands come home.",
      doThis: "Punch once or twice. Bring both hands back. Then move your feet and reset.",
      cue: "Hands first, then feet.",
      doNotAdd: "Do not punch and drift at the same time."
    }),
    step({
      title: "Small Defense",
      job: "Add defense without breaking posture.",
      doThis: "Punch once or twice, make one small slip, roll, or pull, then recover stance.",
      cue: "Defense stays small.",
      doNotAdd: "Do not duck low or lean away."
    }),
    step({
      title: "Angle Reset",
      job: "Angle without narrowing your stance.",
      doThis: "Jab, take a small angle, and reset fully. The angle should not change stance width.",
      cue: "Angle without narrowing.",
      doNotAdd: "Do not cross your feet on the angle."
    }),
    step({
      title: "Short Clean Flow",
      job: "Build a short flow with a clear stop.",
      doThis: "Use one or two punches, one defensive reset, one exit, then pause.",
      cue: "Flow has a stop.",
      doNotAdd: "Do not make the flow endless."
    })
  ]
};

const SOLO_CONDITIONING_ROUNDS: readonly BoxingRoundPlanStep[] = [
  step({
    title: "Controlled Pace",
    job: "Move at a pace you can repeat.",
    doThis: "Move in stance. Every 20 seconds, check hands at guard and feet under hips.",
    cue: "Controlled pace only.",
    doNotAdd: "Do not turn the first round into a sprint."
  }),
  step({
    title: "Straight Punch Rhythm",
    job: "Keep the rhythm clean.",
    doThis: "Use light jab-cross rhythm. Every pair ends with both hands back before the next step.",
    cue: "Hands return first.",
    doNotAdd: "Do not let rhythm become arm swinging."
  }),
  step({
    title: "Burst Reset",
    job: "Separate work from reset.",
    doThis: "Use a short burst, step out, breathe, then repeat.",
    cue: "Burst, step out, breathe.",
    doNotAdd: "Do not stack bursts without the reset."
  }),
  step({
    title: "Low Impact Round",
    job: "Stay organized when breathing rises.",
    doThis: "Use low-impact footwork when breathing climbs. Keep posture tall and shoulders loose.",
    cue: "Low impact is allowed.",
    doNotAdd: "Do not hop through fatigue."
  }),
  step({
    title: "Minute Check",
    job: "Hold pace without losing guard.",
    doThis: "At the end of each minute, check that both hands still return to guard.",
    cue: "Guard still home.",
    doNotAdd: "Do not keep pace if guard return disappears."
  }),
  step({
    title: "Rhythm And Feet",
    job: "Alternate punches with quiet footwork.",
    doThis: "Use 10 seconds of light punch rhythm, then 10 seconds of quiet footwork.",
    cue: "Rhythm, then feet.",
    doNotAdd: "Do not punch through the footwork section."
  }),
  step({
    title: "Repeatable Pressure",
    job: "Keep the same quality late in the round.",
    doThis: "Hold a pace that still gives you clean stance width and controlled breathing near the bell.",
    cue: "Back off early.",
    doNotAdd: "Do not wait until form breaks to slow down."
  }),
  step({
    title: "Clean Finish",
    job: "Finish with clean rhythm, not a sprint.",
    doThis: "Use the cleanest repeatable rhythm from the workout. Keep hands home and breathing steady.",
    cue: "No sprint finish.",
    doNotAdd: "Do not add a bonus round or sprint finish."
  })
];

const BAG_CONDITIONING_ROUNDS: readonly BoxingRoundPlanStep[] = [
  step({
    title: "Light Round Pace",
    job: "Touch the bag at a pace you can repeat.",
    doThis: "Use light bag touches. Keep power capped and reset distance after each burst.",
    cue: "Light at round pace.",
    doNotAdd: "Do not push the bag or load up."
  }),
  step({
    title: "Pair And Step Off",
    job: "End each pair at guard.",
    doThis: "Use jab-cross rhythm. Hands come home after every pair, then step off before the bag crowds you.",
    cue: "Pair, home, step off.",
    doNotAdd: "Do not stand in front of the bag after the pair."
  }),
  step({
    title: "Three Punch Burst",
    job: "Keep bursts short.",
    doThis: "Use three light punches max, then breathe and reset range.",
    cue: "Three punches max.",
    doNotAdd: "Do not turn the burst into a long combination."
  }),
  step({
    title: "Touch And Move",
    job: "Use footwork to keep posture clean.",
    doThis: "Alternate bag touches with footwork around the bag. Keep shoulders loose and eyes up.",
    cue: "Touch, move, posture.",
    doNotAdd: "Do not lean into the bag for rest."
  }),
  step({
    title: "Organized Pressure",
    job: "Pressure only counts while form holds.",
    doThis: "Hold repeatable pressure only while guard return and distance reset stay organized.",
    cue: "Organized pressure.",
    doNotAdd: "Do not trade accuracy for output."
  }),
  step({
    title: "Burst Defend Off",
    job: "Put defense after every burst.",
    doThis: "Burst, hands home, make one small slip or roll, then step off the bag.",
    cue: "Burst, defense, off.",
    doNotAdd: "Do not admire the burst in range."
  }),
  step({
    title: "Accuracy Check",
    job: "Let accuracy set the pace.",
    doThis: "Back off early if your touches miss, push, or land with tense shoulders.",
    cue: "Accuracy tells the truth.",
    doNotAdd: "Do not punch harder when accuracy drops."
  }),
  step({
    title: "Clean Bag Finish",
    job: "Finish repeatable, not heavy.",
    doThis: "Use the cleanest bag rhythm from the workout. Keep power capped through the bell.",
    cue: "No power finish.",
    doNotAdd: "Do not finish with heavy power shots."
  })
];

function planStep(plan: readonly BoxingRoundPlanStep[], roundNumber: number): BoxingRoundPlanStep {
  return plan[Math.min(roundNumber - 1, plan.length - 1)] ?? plan[0]!;
}

function roundPlan(input: { theme: BoxingSkillSubFocus | undefined; roundNumber: number; conditioning: boolean; modality: BoxingModality }): BoxingRoundPlanStep {
  if (input.conditioning) {
    return planStep(input.modality === "heavy_bag" ? BAG_CONDITIONING_ROUNDS : SOLO_CONDITIONING_ROUNDS, input.roundNumber);
  }
  const theme = input.theme === "bag_skill" && input.modality !== "heavy_bag" ? "shadowboxing_mechanics" : input.theme ?? "shadowboxing_mechanics";
  return planStep(THEME_ROUND_PLANS[theme], input.roundNumber);
}

function workoutLengthFor(dose: SessionIntent["trainingDose"]): WorkoutLength {
  if (dose === "minimal") {
    return "short";
  }
  if (dose === "standard") {
    return "medium";
  }
  return "long";
}

function energySystemFor(input: { theme: BoxingSkillSubFocus | undefined; conditioning: boolean }): BoxingEnergySystem {
  if (input.conditioning || input.theme === "pressure_control") {
    return "round_tolerance";
  }
  if (input.theme === "counter_timing") {
    return "alactic_speed";
  }
  return "technical_aerobic";
}

function timingFor(system: BoxingEnergySystem, length: WorkoutLength): BoxingRoundTiming {
  if (system === "alactic_speed") {
    return {
      durationSeconds: 60,
      restSeconds: length === "short" ? 75 : 90,
      rpe: 6
    };
  }
  if (system === "round_tolerance") {
    return {
      durationSeconds: length === "short" ? 120 : length === "medium" ? 150 : 180,
      restSeconds: length === "long" ? 75 : 60,
      rpe: length === "short" ? 6 : 7
    };
  }
  return {
    durationSeconds: length === "short" ? 120 : length === "medium" ? 150 : 180,
    restSeconds: 60,
    rpe: length === "long" ? 6 : 5
  };
}

function purposeFor(input: { theme: BoxingSkillSubFocus | undefined; conditioning: boolean }): BoxingRoundPrescription["purpose"] {
  if (input.conditioning) {
    return "boxing_conditioning";
  }
  if (input.theme === "footwork_ringcraft" || input.theme === "outside_movement") {
    return "footwork_ringcraft";
  }
  if (input.theme === "counter_timing") {
    return "speed_timing";
  }
  if (input.theme === "shadowboxing_mechanics") {
    return "skill_acquisition";
  }
  return "technical_consolidation";
}

function technicalQualityCheckpoint(input: { system: BoxingEnergySystem; modality: BoxingModality }): string {
  if (input.modality === "heavy_bag" && input.system === "round_tolerance") {
    return "Bag conditioning counts only while accuracy, guard return, range reset, and capped power are still visible near the bell.";
  }
  if (input.system === "round_tolerance") {
    return "Conditioning counts only while guard return, stance width, and breathing stay organized near the bell.";
  }
  if (input.system === "alactic_speed") {
    return "Speed work counts only if the answer is sharp, calm, and fully reset before the next rep.";
  }
  if (input.modality === "heavy_bag") {
    return "A bag round counts only if accuracy, guard return, distance reset, and capped power stay visible.";
  }
  if (input.modality === "floor_line_footwork") {
    return "A footwork round counts only if feet do not cross, stance width returns, guard stays available, and exits stay quiet.";
  }
  return "A technical round counts only if guard return, stance width, and the round job stay visible near the bell.";
}

function progressionRule(input: { system: BoxingEnergySystem; modality: BoxingModality }): string {
  if (input.system === "alactic_speed") {
    return "Keep rounds short. Progress by cleaner timing or one added round, not by longer bursts.";
  }
  if (input.system === "round_tolerance") {
    return "Add one round before increasing pace. Do not add a sprint finish or bonus round.";
  }
  if (input.modality === "heavy_bag") {
    return "Progress by adding one constraint before adding power; power stays capped unless accuracy and exits hold.";
  }
  return "Progress by adding one constraint or one round only after guard, feet, and breathing finish clean.";
}

function progressedRoundCount(base: number, intent: SessionIntent): number {
  if (intent.progressionIntent === "progress") return Math.min(10, base + 1);
  if (intent.progressionIntent === "regress") return Math.max(2, base - 1);
  return base;
}

export function resolveBoxingRoundDose(input: { athlete: AthleteTrainingProfile; intent: SessionIntent }): BoxingRoundPrescription {
  const conditioning = input.intent.role === "boxing_conditioning" || input.intent.energySystemIntent === "boxing_round_conditioning";
  const rounds = progressedRoundCount(Math.max(3, conditioning ? input.intent.doseAllocation.boxingConditioningRounds : input.intent.doseAllocation.boxingTechnicalRounds), input.intent);
  const theme = input.intent.boxingTheme;
  const modality = modalityFor({ athlete: input.athlete, theme, conditioning });
  const system = energySystemFor({ theme, conditioning });
  const timing = timingFor(system, workoutLengthFor(input.intent.trainingDose));

  return {
    modality,
    purpose: purposeFor({ theme, conditioning }),
    rounds: Array.from({ length: rounds }, (_, index) => {
      const roundNumber = index + 1;
      const plan = roundPlan({ theme, roundNumber, conditioning, modality });
      return {
        roundNumber,
        title: plan.title,
        durationSeconds: timing.durationSeconds,
        restSeconds: timing.restSeconds,
        job: plan.job,
        doThis: plan.doThis,
        intent: plan.job,
        cue: plan.cue,
        doNotAdd: plan.doNotAdd,
        qualityCheck: plan.qualityCheck,
        downshift: plan.downshift
      };
    }),
    rpe: input.intent.progressionIntent === "regress" ? Math.max(3, timing.rpe - 1) : timing.rpe,
    technicalQualityCheckpoint: technicalQualityCheckpoint({ system, modality }),
    stopRule: "Stop or downshift if pain, dizziness, unusual symptoms, uncontrolled fatigue, or the round job breaks twice.",
    progressionRule: progressionRule({ system, modality })
  };
}
