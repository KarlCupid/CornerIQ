import type { ImageSourcePropType } from "react-native";
import fuelBackground from "../../../assets/backgrounds/screen-fuel-background.png";
import planBackground from "../../../assets/backgrounds/screen-plan-background.png";
import profileBackground from "../../../assets/backgrounds/screen-profile-background.png";
import todayBackground from "../../../assets/backgrounds/screen-today-background.png";
import trainBackground from "../../../assets/backgrounds/screen-train-background.png";
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

export const tabScreenBackgrounds = {
  fuel: fuelBackground,
  plan: planBackground,
  profile: profileBackground,
  today: todayBackground,
  train: trainBackground
} satisfies Record<keyof typeof tabHeroHeaders, ImageSourcePropType>;
