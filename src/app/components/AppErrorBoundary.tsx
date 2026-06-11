import React, { type ErrorInfo } from "react";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { spacing } from "../../design/theme";
import { SUPPORT_OUTSIDE_APP_COPY, URGENT_SUPPORT_COPY } from "../supportCopy";
import { screenStyles } from "../screens/screenStyles";

export interface AppErrorReportInput {
  componentStack: string | null;
  errorSummary: string;
}

export interface AppErrorBoundaryProps {
  children?: React.ReactNode;
  signedIn?: boolean | undefined;
}

interface AppErrorBoundaryState {
  componentStack: string | null;
  errorSummary: string | null;
  resetVersion: number;
}

const SECRET_TEXT_PATTERN = /(password|token|secret|service[\s_-]?role|authorization|api[\s_-]?key|anon[\s_-]?key)/gi;

function redactSensitiveText(value: string): string {
  return value.replace(SECRET_TEXT_PATTERN, "[redacted]");
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

export function buildAppErrorSummary(error: unknown): string {
  const rawMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const sanitized = redactSensitiveText(firstLine(rawMessage)).slice(0, 220).trim();
  return sanitized || "React tree error";
}

function summarizeComponentStack(errorInfo: ErrorInfo | null): string | null {
  const stack = errorInfo?.componentStack?.trim();
  if (!stack) {
    return null;
  }
  return redactSensitiveText(stack)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" | ")
    .slice(0, 500);
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    componentStack: null,
    errorSummary: null,
    resetVersion: 0
  };

  static getDerivedStateFromError(error: unknown): Partial<AppErrorBoundaryState> {
    return {
      errorSummary: buildAppErrorSummary(error),
    };
  }

  override componentDidCatch(_error: unknown, errorInfo: ErrorInfo) {
    this.setState({ componentStack: summarizeComponentStack(errorInfo) });
  }

  private handleRetry = () => {
    this.setState((state) => ({
      componentStack: null,
      errorSummary: null,
      resetVersion: state.resetVersion + 1
    }));
  };

  override render() {
    if (!this.state.errorSummary) {
      return <React.Fragment key={this.state.resetVersion}>{this.props.children}</React.Fragment>;
    }

    return (
      <View style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg, gap: spacing.lg }]}>
        <StatusBar style="light" />
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={screenStyles.title}>Something went wrong.</Text>
          <Text style={screenStyles.body}>Your data is still protected.</Text>
          <Text style={screenStyles.subtle}>Retry the app shell. {SUPPORT_OUTSIDE_APP_COPY}</Text>
          <Text style={screenStyles.subtle}>{URGENT_SUPPORT_COPY}</Text>
        </View>
        <Pressable accessibilityLabel="Retry app" accessibilityRole="button" onPress={this.handleRetry} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}
