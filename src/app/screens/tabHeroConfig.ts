import todayHero from "../../../assets/backgrounds/tab-today-hero.png";
import trainHero from "../../../assets/backgrounds/tab-train-hero.png";
import fuelHero from "../../../assets/backgrounds/tab-fuel-hero.png";
import planHero from "../../../assets/backgrounds/tab-plan-hero.png";
import profileHero from "../../../assets/backgrounds/tab-profile-hero.png";
import type { ScreenHeaderProps } from "../../design/components/LuminousScreen";

export const tabHeroHeaders = {
  fuel: {
    accent: "orange",
    eyebrow: "Fuel",
    heroImage: fuelHero,
    icon: "flame-outline",
    title: "Fuel Your Fight"
  },
  plan: {
    accent: "green",
    eyebrow: "Plan",
    heroImage: planHero,
    icon: "clipboard-outline",
    title: "Plan Your Path"
  },
  profile: {
    accent: "neutral",
    eyebrow: "Profile",
    heroImage: profileHero,
    icon: "person-outline",
    title: "Your Journey, Your Legacy."
  },
  today: {
    accent: "blue",
    eyebrow: "Today",
    heroImage: todayHero,
    icon: "today-outline",
    title: "Ready to Own Your Day"
  },
  train: {
    accent: "purple",
    eyebrow: "Train",
    heroImage: trainHero,
    icon: "barbell-outline",
    title: "Push Your Limits"
  }
} satisfies Record<string, ScreenHeaderProps>;
