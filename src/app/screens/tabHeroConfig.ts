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
    icon: "restaurant-outline",
    title: "Fuel Brief"
  },
  plan: {
    accent: "green",
    eyebrow: "Plan",
    heroImage: planHero,
    icon: "calendar-outline",
    title: "Camp Plan"
  },
  profile: {
    accent: "neutral",
    eyebrow: "Profile",
    heroImage: profileHero,
    icon: "person-outline",
    title: "Athlete Profile"
  },
  today: {
    accent: "blue",
    eyebrow: "Today",
    heroImage: todayHero,
    icon: "calendar-outline",
    title: "Corner Brief"
  },
  train: {
    accent: "purple",
    eyebrow: "Train",
    heroImage: trainHero,
    icon: "document-text-outline",
    title: "Session Brief"
  }
} satisfies Record<string, ScreenHeaderProps>;
