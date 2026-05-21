import React from "react";
import { Pressable, Text, View } from "react-native";
import { EngineCard } from "../../design/components/EngineCard";
import { StatusBadge } from "../../design/components/StatusBadge";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";
import { screenStyles } from "../screens/screenStyles";

const betaNoticeItems = [
  "This is a beta.",
  "Not medical advice.",
  "Not a coach replacement.",
  "No emergency support.",
  "Do not use for urgent symptoms.",
  "Do not use to self-clear hard stops.",
  "Wearables are optional.",
  "Manual logs are enough.",
  "Feedback is product feedback and may be reviewed manually.",
  "Avoid entering secrets or emergency details in feedback.",
  "If weight-class or health concerns feel urgent, stop and seek qualified support."
] as const;

export function BetaTesterNoticePanel() {
  const [acknowledged, setAcknowledged] = React.useState(false);

  return (
    <EngineCard>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.cardTitle, color: colors.canvas }}>Beta tester notice</Text>
          <StatusBadge label={acknowledged ? "Acknowledged" : "Review"} tone={acknowledged ? "success" : "caution"} />
        </View>
        <View style={{ gap: spacing.xs }}>
          {betaNoticeItems.map((item) => (
            <Text key={item} style={screenStyles.body}>
              {item}
            </Text>
          ))}
        </View>
        <Pressable
          accessibilityLabel="Acknowledge beta tester notice"
          accessibilityRole="button"
          onPress={() => setAcknowledged(true)}
          style={[screenStyles.quietButton, acknowledged ? { borderColor: colors.readyGreen } : null]}
        >
          <Text style={screenStyles.quietButtonText}>{acknowledged ? "Beta notice acknowledged" : "I understand this beta notice"}</Text>
        </Pressable>
        <Text style={screenStyles.subtle}>This acknowledgement is local to this screen for now and does not block app use.</Text>
      </View>
    </EngineCard>
  );
}
