import todayHero from "../../../assets/backgrounds/tab-today-hero-v3.png";
import trainHero from "../../../assets/backgrounds/tab-train-hero.png";
import fuelHero from "../../../assets/backgrounds/tab-fuel-hero.png";
import planHero from "../../../assets/backgrounds/tab-plan-hero.png";
import profileHero from "../../../assets/backgrounds/tab-profile-hero.png";
import type { ScreenHeaderProps } from "../../design/components/LuminousScreen";

export const tabHeroHeaders = {
  fuel: {
    accent: "blue",
    eyebrow: "Fuel",
    heroImage: fuelHero,
    subtitle: "Train normally. Keep food and fluids steady.",
    title: "Fuel Brief"
  },
  plan: {
    accent: "blue",
    eyebrow: "Plan",
    heroImage: planHero,
    subtitle: "Build the week around your boxing.",
    title: "Camp Plan"
  },
  profile: {
    accent: "blue",
    eyebrow: "Profile",
    heroImage: profileHero,
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
    subtitle: "Your boxing session and the work around it.",
    title: "Session Brief"
  }
} satisfies Record<string, ScreenHeaderProps>;
