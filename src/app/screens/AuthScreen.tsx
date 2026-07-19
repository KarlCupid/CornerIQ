import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthBackgroundShell } from "../components/AuthBackgroundShell";
import { colors, spacing } from "../../design/theme";
import { fontFamilies, typography } from "../../design/typography";

export interface AuthScreenProps {
  loading: boolean;
  error: string | null;
  message?: string | null;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onUpdatePassword?: ((password: string) => Promise<void>) | undefined;
  passwordRecoveryReady?: boolean | undefined;
}

type AuthMode = "sign_in" | "sign_up" | "recovery" | "update_password";

const authModeCopy: Record<AuthMode, { heading: string; subheading: string }> = {
  recovery: {
    heading: "Reset password",
    subheading: "Enter your email and we'll send a reset link if the account exists."
  },
  sign_in: {
    heading: "Sign in",
    subheading: "Access your training plan."
  },
  sign_up: {
    heading: "Create your account",
    subheading: "Create your account to begin setting up CornerIQ."
  },
  update_password: {
    heading: "Set new password",
    subheading: "Choose a new password to finish account recovery."
  }
};

function AuthCard({ children }: React.PropsWithChildren) {
  return <View style={{ gap: 20, width: "100%" }}>{children}</View>;
}

function FieldLabel({ children }: React.PropsWithChildren) {
  return (
    <Text
      style={{
        color: "#F4F7FA",
        fontFamily: fontFamilies.bold,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.9,
        lineHeight: 16,
        textTransform: "uppercase"
      }}
    >
      {children}
    </Text>
  );
}

function AuthTextInput({
  accessibilityLabel,
  autoCapitalize,
  keyboardType,
  onChangeText,
  placeholder,
  secureTextEntry,
  textContentType,
  value
}: {
  accessibilityLabel: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  keyboardType?: "default" | "email-address" | undefined;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean | undefined;
  textContentType?: "emailAddress" | "newPassword" | "password" | undefined;
  value: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      onBlur={() => setFocused(false)}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      placeholder={placeholder}
      placeholderTextColor="#768291"
      secureTextEntry={secureTextEntry}
      selectionColor={colors.blueIQ}
      style={{
        backgroundColor: "#0D1319",
        borderColor: focused ? colors.blueIQ : "#2A3540",
        borderCurve: "continuous",
        borderRadius: 6,
        borderWidth: 1,
        color: colors.canvas,
        fontFamily: fontFamilies.medium,
        fontSize: 16,
        fontWeight: "500",
        minHeight: 58,
        paddingHorizontal: 18,
        paddingVertical: spacing.md
      }}
      textContentType={textContentType}
      value={value}
    />
  );
}

function EmailField({ email, setEmail }: { email: string; setEmail: (value: string) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel>Email</FieldLabel>
      <AuthTextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />
    </View>
  );
}

function PasswordField({
  helper,
  password,
  setPassword,
  signingUp
}: {
  helper: string;
  password: string;
  setPassword: (value: string) => void;
  signingUp: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel>Password</FieldLabel>
      {signingUp ? (
        <Text style={{ ...typography.subtle, color: "rgba(183, 196, 217, 0.9)" }}>
          {helper}
        </Text>
      ) : null}
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#0D1319",
          borderColor: focused ? colors.blueIQ : "#2A3540",
          borderCurve: "continuous",
          borderRadius: 6,
          borderWidth: 1,
          flexDirection: "row",
          minHeight: 58,
          paddingLeft: 18,
          paddingRight: spacing.sm
        }}
      >
        <TextInput
          accessibilityLabel="Password"
          onBlur={() => setFocused(false)}
          onChangeText={setPassword}
          onFocus={() => setFocused(true)}
          placeholder="Password"
          placeholderTextColor="#768291"
          secureTextEntry={!visible}
          selectionColor={colors.blueIQ}
          style={{
            color: colors.canvas,
            flex: 1,
            fontFamily: fontFamilies.medium,
            fontSize: 16,
            fontWeight: "500",
            minHeight: 56,
            paddingVertical: spacing.md
          }}
          textContentType={signingUp ? "newPassword" : "password"}
          value={password}
        />
        <Pressable
          accessibilityLabel={visible ? "Hide secure text" : "Show secure text"}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setVisible((current) => !current)}
          style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}
        >
          <Ionicons color={focused ? colors.blueIQ : "#8B98A8"} name={visible ? "eye-off-outline" : "eye-outline"} size={22} />
        </Pressable>
      </View>
      {!signingUp ? (
        <Text style={{ ...typography.subtle, color: "rgba(183, 196, 217, 0.9)" }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function PrimaryAuthButton({
  disabled,
  label,
  loading,
  onPress
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: disabled ? "rgba(39, 206, 241, 0.28)" : colors.blueIQ,
        borderColor: disabled ? "rgba(39, 206, 241, 0.24)" : "rgba(255, 255, 255, 0.28)",
        borderCurve: "continuous",
        borderRadius: 6,
        borderWidth: 1,
        boxShadow: disabled ? "none" : "0 10px 24px rgba(39, 206, 241, 0.13)",
        justifyContent: "center",
        minHeight: 56,
        opacity: disabled ? 0.72 : pressed ? 0.88 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        width: "100%"
      })}
    >
      <Text
        style={{
          color: disabled ? colors.wrap : "#071015",
          fontFamily: fontFamilies.black,
          fontSize: 16,
          fontWeight: "900",
          lineHeight: 22,
          textAlign: "center"
        }}
      >
        {loading ? "Working..." : label}
      </Text>
    </Pressable>
  );
}

function LinkButton({
  disabled,
  label,
  onPress
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        opacity: disabled ? 0.55 : pressed ? 0.72 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs
      })}
    >
      <Text style={{ color: colors.blueIQ, fontFamily: fontFamilies.bold, fontSize: 15, fontWeight: "700", lineHeight: 21, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function NoticeText({ children, tone }: React.PropsWithChildren<{ tone: "error" | "message" }>) {
  const color = tone === "error" ? colors.redCorner : colors.readyGreen;
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={{
        backgroundColor: `${color}18`,
        borderColor: `${color}55`,
        borderCurve: "continuous",
        borderRadius: 6,
        borderWidth: 1,
        padding: spacing.md
      }}
    >
      <Text selectable style={{ color, fontFamily: fontFamilies.semibold, fontSize: 13, fontWeight: "600", lineHeight: 19 }}>
        {children}
      </Text>
    </View>
  );
}

export function AuthScreen({ loading, error, message, onRequestPasswordReset, onSignIn, onSignUp, onUpdatePassword, passwordRecoveryReady = false }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const effectiveMode: AuthMode = passwordRecoveryReady ? "update_password" : mode;

  const switchMode = (nextMode: AuthMode) => {
    setLocalMessage(null);
    setValidationError(null);
    setMode(nextMode);
  };

  const submit = async (action: (email: string, password: string) => Promise<boolean | void>): Promise<boolean> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setValidationError("Email and password are required.");
      return false;
    }
    setLocalMessage(null);
    setValidationError(null);
    return (await action(trimmedEmail, password)) !== false;
  };

  const submitSignUp = async () => {
    const succeeded = await submit(onSignUp);
    if (!succeeded) {
      return;
    }
    setMode("sign_in");
    setPassword("");
    setValidationError(null);
    setLocalMessage("Account created. Check your email to confirm it, then sign in.");
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

  const submitPasswordUpdate = async () => {
    if (!password) {
      setValidationError("New password is required.");
      return;
    }
    if (!onUpdatePassword) {
      setValidationError("Password update is unavailable.");
      return;
    }
    setValidationError(null);
    await onUpdatePassword(password);
  };

  const visibleError = validationError ?? error;
  const signingUp = effectiveMode === "sign_up";
  const recovering = effectiveMode === "recovery";
  const updatingPassword = effectiveMode === "update_password";
  const copy = authModeCopy[effectiveMode];

  const primaryLabel = updatingPassword ? "Update password" : recovering ? "Send reset email" : signingUp ? "Create account" : "Sign in";
  const primaryAction = updatingPassword
    ? submitPasswordUpdate
    : recovering
      ? submitRecovery
      : signingUp
        ? () => void submitSignUp()
        : () => void submit(onSignIn);

  return (
    <AuthBackgroundShell heading={copy.heading} subheading={copy.subheading}>
      <AuthCard>
        {!updatingPassword ? <EmailField email={email} setEmail={setEmail} /> : null}
        {!recovering ? (
          <PasswordField
            helper={updatingPassword ? "Use a new password you will remember." : signingUp ? "Use a password you will remember." : "Use the password for your existing account."}
            password={password}
            setPassword={setPassword}
            signingUp={signingUp || updatingPassword}
          />
        ) : null}
        {visibleError ? <NoticeText tone="error">{visibleError}</NoticeText> : null}
        {!visibleError && (localMessage ?? message) ? <NoticeText tone="message">{localMessage ?? message}</NoticeText> : null}
        <PrimaryAuthButton disabled={loading} label={primaryLabel} loading={loading} onPress={primaryAction} />
        {signingUp ? (
          <Text style={{ color: "rgba(183, 196, 217, 0.9)", fontSize: 14, fontWeight: "500", lineHeight: 20, textAlign: "center" }}>
            We’ll send a confirmation link to your email.
          </Text>
        ) : null}
        {effectiveMode === "sign_in" ? (
          <View style={{ gap: spacing.xs }}>
            <LinkButton disabled={loading} label="Forgot password?" onPress={() => switchMode("recovery")} />
            <LinkButton disabled={loading} label="New to CornerIQ? Create account" onPress={() => switchMode("sign_up")} />
          </View>
        ) : null}
        {recovering ? <LinkButton disabled={loading} label="Back to sign in" onPress={() => switchMode("sign_in")} /> : null}
      </AuthCard>
      {signingUp ? (
        <LinkButton disabled={loading} label="Already have an account? Sign in" onPress={() => switchMode("sign_in")} />
      ) : null}
    </AuthBackgroundShell>
  );
}
