import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthBackgroundShell } from "../components/AuthBackgroundShell";
import { glassStyles } from "../../design/glass";
import { colors, spacing } from "../../design/theme";
import { typography } from "../../design/typography";

export interface AuthScreenProps {
  loading: boolean;
  error: string | null;
  message?: string | null;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

type AuthMode = "sign_in" | "sign_up" | "recovery";

const authModeCopy: Record<AuthMode, { heading: string; subheading: string }> = {
  recovery: {
    heading: "Reset password",
    subheading: "Enter your email and we'll send a reset link if the account exists."
  },
  sign_in: {
    heading: "Welcome back",
    subheading: "Sign in to load your boxer prep state."
  },
  sign_up: {
    heading: "Create your account",
    subheading: "Start building your boxer prep state."
  }
};

function AuthCard({ children }: React.PropsWithChildren) {
  return (
    <View
      style={{
        ...glassStyles.cardDeep,
        backgroundColor: "rgba(6, 13, 28, 0.72)",
        borderColor: "rgba(217, 228, 244, 0.24)",
        borderRadius: 8,
        gap: spacing.lg,
        overflow: "hidden",
        padding: spacing.xl,
        width: "100%"
      }}
    >
      <View style={{ backgroundColor: "rgba(39, 206, 241, 0.28)", height: 1, left: 0, position: "absolute", right: 0, top: 0 }} />
      {children}
    </View>
  );
}

function FieldLabel({ children }: React.PropsWithChildren) {
  return (
    <Text style={{ color: colors.canvas, fontSize: 17, fontWeight: "700", lineHeight: 23 }}>
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
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(139, 163, 198, 0.9)"
      secureTextEntry={secureTextEntry}
      style={{
        backgroundColor: "rgba(2, 7, 17, 0.48)",
        borderColor: "rgba(217, 228, 244, 0.30)",
        borderRadius: 6,
        borderWidth: 1,
        color: colors.canvas,
        fontSize: 18,
        fontWeight: "500",
        minHeight: 58,
        paddingHorizontal: spacing.lg,
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
          backgroundColor: "rgba(2, 7, 17, 0.48)",
          borderColor: "rgba(217, 228, 244, 0.30)",
          borderRadius: 6,
          borderWidth: 1,
          flexDirection: "row",
          minHeight: 58,
          paddingLeft: spacing.lg,
          paddingRight: spacing.sm
        }}
      >
        <TextInput
          accessibilityLabel="Password"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="rgba(139, 163, 198, 0.9)"
          secureTextEntry={!visible}
          style={{
            color: colors.canvas,
            flex: 1,
            fontSize: 18,
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
          <Ionicons color="rgba(183, 196, 217, 0.95)" name={visible ? "eye-off-outline" : "eye-outline"} size={26} />
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
      style={{
        alignItems: "center",
        backgroundColor: disabled ? "rgba(39, 206, 241, 0.42)" : "#079DFF",
        borderColor: "rgba(255, 255, 255, 0.32)",
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 58,
        opacity: disabled ? 0.78 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        width: "100%"
      }}
    >
      <Text style={{ color: colors.canvas, fontSize: 18, fontWeight: "800", lineHeight: 24, textAlign: "center" }}>
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
      style={{ alignItems: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
    >
      <Text style={{ color: colors.blueIQ, fontSize: 16, fontWeight: "700", lineHeight: 22, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuietAuthButton({
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
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        ...glassStyles.control,
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderColor: "rgba(217, 228, 244, 0.22)",
        borderRadius: 6,
        justifyContent: "center",
        minHeight: 56,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        width: "100%"
      }}
    >
      <Text style={{ color: "rgba(183, 196, 217, 0.96)", fontSize: 16, fontWeight: "600", lineHeight: 22, textAlign: "center" }}>
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
        borderRadius: 8,
        borderWidth: 1,
        padding: spacing.md
      }}
    >
      <Text selectable style={{ color, fontSize: 13, fontWeight: "700", lineHeight: 19 }}>
        {children}
      </Text>
    </View>
  );
}

function SignUpStepper() {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", width: "100%" }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.035)",
          borderColor: "rgba(217, 228, 244, 0.62)",
          borderRadius: 7,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 42,
          paddingHorizontal: spacing.md
        }}
      >
        <View style={{ backgroundColor: colors.blueIQ, borderRadius: 8, height: 16, width: 16 }} />
        <Text style={{ color: colors.canvas, fontSize: 15, fontWeight: "700", lineHeight: 20 }}>Account</Text>
      </View>
      <View style={{ backgroundColor: colors.blueIQ, height: 1, width: 32 }} />
      <StepDot label="Confirm email" />
      <View style={{ backgroundColor: "rgba(139, 163, 198, 0.58)", height: 1, width: 32 }} />
      <StepDot label="Build profile" />
    </View>
  );
}

function StepDot({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 42 }}>
      <View style={{ borderColor: "rgba(139, 163, 198, 0.76)", borderRadius: 12, borderWidth: 2, height: 24, width: 24 }} />
      <Text style={{ color: "rgba(183, 196, 217, 0.74)", fontSize: 15, fontWeight: "600", lineHeight: 20 }}>{label}</Text>
    </View>
  );
}

function SignUpInfoNote() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderColor: "rgba(217, 228, 244, 0.26)",
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        padding: spacing.md
      }}
    >
      <Ionicons color={colors.blueIQ} name="information-circle-outline" size={30} />
      <Text style={{ color: "rgba(183, 196, 217, 0.94)", flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 21 }}>
        After sign-up, check your email to confirm before signing in.
      </Text>
    </View>
  );
}

function TrustPills() {
  const items = [
    { color: colors.redCorner, label: "Readiness" },
    { color: "#159CFF", label: "Training" },
    { color: "#2EDDE3", label: "Fuel" }
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center", width: "100%" }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.035)",
            borderColor: "rgba(217, 228, 244, 0.18)",
            borderRadius: 6,
            borderWidth: 1,
            flexDirection: "row",
            gap: spacing.sm,
            minHeight: 44,
            minWidth: 112,
            paddingHorizontal: spacing.md
          }}
        >
          <View style={{ backgroundColor: item.color, borderRadius: 7, height: 14, width: 14 }} />
          <Text style={{ color: "rgba(217, 228, 244, 0.86)", fontSize: 15, fontWeight: "600", lineHeight: 20 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SignUpFooter() {
  return (
    <Text
      style={{
        color: "rgba(183, 196, 217, 0.82)",
        fontSize: 16,
        fontWeight: "500",
        lineHeight: 23,
        maxWidth: 360,
        textAlign: "center"
      }}
    >
      CornerIQ keeps training, readiness, and fuel context connected.
    </Text>
  );
}

export function AuthScreen({ loading, error, message, onRequestPasswordReset, onSignIn, onSignUp }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [validationError, setValidationError] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setValidationError(null);
    setMode(nextMode);
  };

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
  const copy = authModeCopy[mode];

  const primaryLabel = recovering ? "Send reset email" : signingUp ? "Create account" : "Sign in";
  const primaryAction = recovering ? submitRecovery : () => void submit(signingUp ? onSignUp : onSignIn);

  return (
    <AuthBackgroundShell
      footer={
        signingUp ? (
          <SignUpFooter />
        ) : mode === "sign_in" ? (
          <TrustPills />
        ) : null
      }
      heading={copy.heading}
      subheading={copy.subheading}
    >
      {signingUp ? <SignUpStepper /> : null}
      <AuthCard>
        <EmailField email={email} setEmail={setEmail} />
        {!recovering ? (
          <PasswordField
            helper={signingUp ? "Use a password you will remember." : "Use the password for your existing account."}
            password={password}
            setPassword={setPassword}
            signingUp={signingUp}
          />
        ) : null}
        {visibleError ? <NoticeText tone="error">{visibleError}</NoticeText> : null}
        {!visibleError && message ? <NoticeText tone="message">{message}</NoticeText> : null}
        <PrimaryAuthButton disabled={loading} label={primaryLabel} loading={loading} onPress={primaryAction} />
        {signingUp ? <SignUpInfoNote /> : null}
        {mode === "sign_in" ? (
          <>
            <LinkButton disabled={loading} label="Forgot password?" onPress={() => switchMode("recovery")} />
            <QuietAuthButton disabled={loading} label="New here? Create account" onPress={() => switchMode("sign_up")} />
          </>
        ) : null}
        {recovering ? <QuietAuthButton disabled={loading} label="Back to sign in" onPress={() => switchMode("sign_in")} /> : null}
      </AuthCard>
      {signingUp ? (
        <LinkButton disabled={loading} label="Already have an account? Sign in." onPress={() => switchMode("sign_in")} />
      ) : null}
    </AuthBackgroundShell>
  );
}
