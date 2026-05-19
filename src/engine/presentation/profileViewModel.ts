import type { PerformanceState, ProfileViewModel } from "../core/types";

export function buildProfileViewModel(state: PerformanceState): ProfileViewModel {
  return {
    title: "Boxer profile",
    summary: `${state.athlete.boxingLevel.replaceAll("_", " ")} - ${state.athlete.amateurOrPro}`,
    privacyNotes: [
      "Cycle and medical data are private and consent-based.",
      "Wearable data is optional and source-tagged.",
      "Generated plans are reproducible from canonical records."
    ]
  };
}
