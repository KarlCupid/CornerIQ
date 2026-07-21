import todayHero from "../../../assets/backgrounds/tab-today-hero-v3.png";
import trainHero from "../../../assets/backgrounds/tab-train-hero-v2.png";
import fuelHero from "../../../assets/backgrounds/tab-fuel-hero-v2.png";
import planHero from "../../../assets/backgrounds/tab-plan-hero-v2.png";
import profileHero from "../../../assets/backgrounds/tab-profile-hero-v2.png";
import type { ScreenHeaderProps } from "../../design/components/LuminousScreen";

export const tabHeroHeaders = {
  fuel: {
    accent: "blue",
    eyebrow: "Fuel",
    heroImage: fuelHero,
    heroImageTreatment: "natural",
    subtitle: "Train normally. Keep food and fluids steady.",
    title: "Fuel Brief"
  },
  plan: {
    accent: "blue",
    eyebrow: "Plan",
    heroImage: planHero,
    heroImageTreatment: "natural",
    subtitle: "Build the week around your boxing.",
    title: "Camp Plan"
  },
  profile: {
    accent: "blue",
    eyebrow: "Profile",
    heroImage: profileHero,
    heroImageTreatment: "natural",
    subtitle: "Your setup, schedule, and controls.",
    title: "Athlete Profile"
  },
  today: {
    accent: "blue",
    eyebrow: "Today",
    heroImage: todayHero,
    heroImageTreatment: "natural",
    subtitle: "A quick check-in before it points you into the day.",
    title: "Corner Brief"
  },
  train: {
    accent: "blue",
    eyebrow: "Train",
    heroImage: trainHero,
    heroImageTreatment: "natural",
    subtitle: "Your boxing session and the work around it.",
    title: "Session Brief"
  }
} satisfies Record<string, ScreenHeaderProps>;
