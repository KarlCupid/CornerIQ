import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { colors, spacing } from "../design/theme";

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cornerBlack,
        padding: spacing.xl,
        justifyContent: "center"
      }}
    >
      <StatusBar style="light" />
      <Text style={{ color: colors.canvas, fontSize: 34, fontWeight: "800" }}>CornerIQ</Text>
      <Text style={{ color: colors.wrap, fontSize: 18, marginTop: spacing.sm }}>Boxing prep, fuel & weight</Text>
      <Text style={{ color: colors.blueIQ, fontSize: 15, marginTop: spacing.lg }}>Corner Engine foundation ready.</Text>
    </View>
  );
}
