import React from "react";
import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

function useInterTightFonts() {
  React.useEffect(() => {
    const runtime = globalThis as { __DEV__?: boolean; process?: { env?: { NODE_ENV?: string } } };
    if (typeof runtime.__DEV__ !== "boolean") {
      const nodeEnv = runtime.process?.env?.NODE_ENV;
      runtime.__DEV__ = nodeEnv === "development" || nodeEnv === "test";
    }
    if (runtime.process?.env?.NODE_ENV === "test") {
      return;
    }

    void Promise.all([
      import("expo-font"),
      import("@expo-google-fonts/inter-tight/400Regular"),
      import("@expo-google-fonts/inter-tight/500Medium"),
      import("@expo-google-fonts/inter-tight/600SemiBold"),
      import("@expo-google-fonts/inter-tight/700Bold"),
      import("@expo-google-fonts/inter-tight/800ExtraBold"),
      import("@expo-google-fonts/inter-tight/900Black")
    ])
      .then(([{ loadAsync }, regular, medium, semibold, bold, extraBold, black]) => loadAsync({
        InterTight_400Regular: regular.InterTight_400Regular,
        InterTight_500Medium: medium.InterTight_500Medium,
        InterTight_600SemiBold: semibold.InterTight_600SemiBold,
        InterTight_700Bold: bold.InterTight_700Bold,
        InterTight_800ExtraBold: extraBold.InterTight_800ExtraBold,
        InterTight_900Black: black.InterTight_900Black
      }))
      .catch(() => undefined);
  }, []);
}

export function AppProviders({ children }: PropsWithChildren) {
  useInterTightFonts();

  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
