import React from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, spacing } from "../../design/theme";
import { screenStyles } from "./screenStyles";

export interface AuthScreenProps {
  loading: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthScreen({ loading, error, onSignIn, onSignUp }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg }]}>
      <StatusBar style="light" />
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.title}>CornerIQ</Text>
          <Text style={screenStyles.body}>Sign in to load your boxer prep state.</Text>
        </View>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.wrap}
          style={screenStyles.input}
          textContentType="emailAddress"
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.wrap}
          secureTextEntry
          style={screenStyles.input}
          textContentType="password"
          value={password}
        />
        {error ? <Text style={[screenStyles.body, { color: colors.amberCaution }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => onSignIn(email.trim(), password)} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>{loading ? "Working..." : "Sign in"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => onSignUp(email.trim(), password)} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>Sign up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
