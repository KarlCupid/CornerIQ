import todayHero from "../../../assets/backgrounds/tab-today-hero.png";
import trainHero from "../../../assets/backgrounds/tab-train-hero.png";
import fuelHero from "../../../assets/backgrounds/tab-fuel-hero.png";
import planHero from "../../../assets/backgrounds/tab-plan-hero.png";
import profileHero from "../../../assets/backgrounds/tab-profile-hero.png";
import type { ScreenHeaderProps } from "../../design/components/LuminousScreen";

type TabHeroConfig = Omit<ScreenHeaderProps, "title">;

export const tabHeroHeaders = {
  fuel: {
    accent: "orange",
    eyebrow: "Nutrition",
    heroImage: fuelHero,
    icon: "flame-outline",
    subtitle: "Fuel your body. Fuel your goals."
  },
  plan: {
    accent: "green",
    eyebrow: "Your plan",
    heroImage: planHero,
    icon: "clipboard-outline",
    subtitle: "Map the work. Win the week."
  },
  profile: {
    accent: "neutral",
    eyebrow: "Athlete",
    heroImage: profileHero,
    icon: "person-outline",
    subtitle: "Your journey. Your corner."
  },
  today: {
    accent: "blue",
    eyebrow: "Daily mission",
    heroImage: todayHero,
    icon: "today-outline",
    subtitle: "Stay on track. One day at a time."
  },
  train: {
    accent: "purple",
    eyebrow: "Training",
    heroImage: trainHero,
    icon: "barbell-outline",
    subtitle: "Get better every session."
  }
} satisfies Record<string, TabHeroConfig>;
