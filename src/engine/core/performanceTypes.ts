import type { AthleteProfile, AthleteJourney } from "../athlete/types";
import type { BodyMassState } from "../bodyMass/types";
import type { Confidence, ISODateString, ISODateTimeString } from "./sharedTypes";
import type { CycleState } from "../cycle/types";
import type { DecisionTrace } from "./traceTypes";
import type { EngineViewModels } from "../presentation/types";
import type { FightOpportunity, TournamentDetails, TournamentStrategy, WeighInContext } from "../fight/types";
import type { HydrationState, NutritionState } from "../nutrition/types";
import type { PhaseState } from "../phase/phaseTypes";
import type { ReadinessState } from "../readiness/types";
import type { SafetyState } from "../safety/types";
import type { TrainingState } from "../training/types";
import type { WearableState } from "../wearable/types";

export interface PerformanceState {
  athlete: AthleteProfile;
  phase: PhaseState;
  objective: string;
  fightContext: FightOpportunity | null;
  weighInContext: WeighInContext;
  tournamentContext: TournamentDetails | null;
  tournamentStrategy: TournamentStrategy;
  bodyMass: BodyMassState;
  nutrition: NutritionState;
  hydration: HydrationState;
  cycle: CycleState;
  training: TrainingState;
  readiness: ReadinessState;
  wearable: WearableState;
  safety: SafetyState;
  confidence: Confidence;
  decisionTrace: readonly DecisionTrace[];
  viewModels: EngineViewModels;
  engineVersion: string;
  outputHash: string;
  generatedAt: ISODateTimeString;
  snapshotGeneratedAt?: ISODateTimeString | undefined;
  asOfDate: ISODateString;
}

export interface ResolvePerformanceStateInput {
  journey: AthleteJourney;
  asOfDate: ISODateString;
  generatedAt?: ISODateTimeString;
}
