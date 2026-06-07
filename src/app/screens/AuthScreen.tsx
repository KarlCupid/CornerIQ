import React from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, spacing } from "../../design/theme";
import { screenStyles } from "./screenStyles";

export interface AuthScreenProps {
  loading: boolean;
  error: string | null;
  message?: string | null;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthScreen({ loading, error, message, onRequestPasswordReset, onSignIn, onSignUp }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up" | "recovery">("sign_in");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (action: (email: string, password: string) => Promise<void>) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setValidationError("Email and password are required.");
      return;
    }
    setValidationError(null);
    await action(trimmedEmail, password);
  };

  const submitRecovery = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError("Email is required before requesting a password reset.");
      return;
    }
    setValidationError(null);
    await onRequestPasswordReset(trimmedEmail);
  };

  const visibleError = validationError ?? error;
  const signingUp = mode === "sign_up";
  const recovering = mode === "recovery";

  return (
    <KeyboardAvoidingView
      accessibilityLabel="Authentication screen"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg }]}
      testID="auth-screen"
    >
      <StatusBar style="light" />
      <View style={{ alignSelf: "center", gap: spacing.lg, maxWidth: 520, width: "100%" }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={screenStyles.title}>CornerIQ</Text>
          <Text style={screenStyles.body}>
            {recovering
              ? "Request a Supabase password reset email. If your account exists, the reset happens outside this app."
              : signingUp
                ? "Create an account. After sign-up, check your email to confirm before signing in."
                : "Already have an account? Sign in to load your boxer prep state."}
          </Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.wrap}
            style={screenStyles.input}
            textContentType="emailAddress"
            value={email}
          />
        </View>
        {!recovering ? <View style={{ gap: spacing.xs }}>
          <Text style={screenStyles.fieldLabel}>Password</Text>
          <Text style={screenStyles.subtle}>{signingUp ? "Use a password you will remember." : "Enter the password for your existing account."}</Text>
          <TextInput
            accessibilityLabel="Password"
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.wrap}
            secureTextEntry
            style={screenStyles.input}
            textContentType="password"
            value={password}
          />
        </View> : null}
        {visibleError ? <Text style={[screenStyles.body, { color: colors.redCorner }]}>{visibleError}</Text> : null}
        {!visibleError && message ? <Text style={[screenStyles.body, { color: colors.blueIQ }]}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void (recovering ? submitRecovery() : submit(signingUp ? onSignUp : onSignIn))} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>{loading ? "Working..." : recovering ? "Send reset email" : signingUp ? "Create account" : "Sign in"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => setMode(signingUp ? "sign_in" : "sign_up")} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{signingUp ? "Already have an account? Sign in." : "New here? Create account."}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => setMode(recovering ? "sign_in" : "recovery")} style={screenStyles.quietButton}>
          <Text style={screenStyles.quietButtonText}>{recovering ? "Back to sign in." : "Forgot password? Request reset."}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
