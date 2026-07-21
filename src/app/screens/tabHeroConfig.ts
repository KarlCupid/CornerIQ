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
    subtitle: "Your main hub for food and hydration.",
    title: "Fuel Brief"
  },
  plan: {
    accent: "blue",
    eyebrow: "Plan",
    heroImage: planHero,
    heroImageTreatment: "natural",
    subtitle: "An overview of your training schedule.",
    title: "Training Plan"
  },
  profile: {
    accent: "blue",
    eyebrow: "Profile",
    heroImage: profileHero,
    heroImageTreatment: "natural",
    subtitle: "Your profile and app settings.",
    title: "Athlete Profile"
  },
  today: {
    accent: "blue",
    eyebrow: "Today",
    heroImage: todayHero,
    heroImageTreatment: "natural",
    subtitle: "Your day at a glance, with readiness logging up front.",
    title: "Corner Brief"
  },
  train: {
    accent: "blue",
    eyebrow: "Train",
    heroImage: trainHero,
    heroImageTreatment: "natural",
    subtitle: "Your workout for today and the details you need.",
    title: "Session Brief"
  }
} satisfies Record<string, ScreenHeaderProps>;
