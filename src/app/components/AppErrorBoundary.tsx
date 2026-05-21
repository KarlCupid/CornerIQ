import React, { type ErrorInfo } from "react";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { SubmitBetaFeedbackResult } from "../../services/feedback/submitBetaFeedback";
import { colors, spacing } from "../../design/theme";
import { screenStyles } from "../screens/screenStyles";

export interface AppErrorReportInput {
  componentStack: string | null;
  errorSummary: string;
}

export interface AppErrorBoundaryProps {
  children?: React.ReactNode;
  onReportIssue?: ((input: AppErrorReportInput) => Promise<SubmitBetaFeedbackResult>) | undefined;
  signedIn?: boolean | undefined;
}

interface AppErrorBoundaryState {
  componentStack: string | null;
  errorSummary: string | null;
  reporting: boolean;
  reportMessage: string | null;
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
    reporting: false,
    reportMessage: null,
    resetVersion: 0
  };

  static getDerivedStateFromError(error: unknown): Partial<AppErrorBoundaryState> {
    return {
      errorSummary: buildAppErrorSummary(error),
      reportMessage: null
    };
  }

  override componentDidCatch(_error: unknown, errorInfo: ErrorInfo) {
    this.setState({ componentStack: summarizeComponentStack(errorInfo) });
  }

  private handleRetry = () => {
    this.setState((state) => ({
      componentStack: null,
      errorSummary: null,
      reporting: false,
      reportMessage: null,
      resetVersion: state.resetVersion + 1
    }));
  };

  private handleReportIssue = async () => {
    if (!this.state.errorSummary) {
      return;
    }
    if (!this.props.signedIn || !this.props.onReportIssue) {
      this.setState({ reportMessage: "Sign in is required before sending an issue report." });
      return;
    }
    this.setState({ reporting: true, reportMessage: null });
    try {
      const result = await this.props.onReportIssue({
        componentStack: this.state.componentStack,
        errorSummary: this.state.errorSummary
      });
      this.setState({ reportMessage: result.message });
    } catch {
      this.setState({ reportMessage: "Issue report could not be sent. Your data is still protected." });
    } finally {
      this.setState({ reporting: false });
    }
  };

  override render() {
    if (!this.state.errorSummary) {
      return <React.Fragment key={this.state.resetVersion}>{this.props.children}</React.Fragment>;
    }

    const canReport = Boolean(this.props.signedIn && this.props.onReportIssue);
    return (
      <View style={[screenStyles.screen, { justifyContent: "center", padding: spacing.lg, gap: spacing.lg }]}>
        <StatusBar style="light" />
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={screenStyles.title}>Something went wrong.</Text>
          <Text style={screenStyles.body}>Your data is still protected.</Text>
          <Text style={screenStyles.subtle}>Retry the app shell. If it happens again, send a privacy-safe issue report from this screen.</Text>
        </View>
        <Pressable accessibilityLabel="Retry app" accessibilityRole="button" onPress={this.handleRetry} style={screenStyles.button}>
          <Text style={screenStyles.buttonText}>Retry</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={canReport ? "Report this issue" : "Report this issue after sign-in"}
          accessibilityRole="button"
          accessibilityState={{ disabled: this.state.reporting || !canReport }}
          disabled={this.state.reporting || !canReport}
          onPress={() => void this.handleReportIssue()}
          style={[screenStyles.quietButton, !canReport || this.state.reporting ? { borderColor: colors.panelRaised } : null]}
        >
          <Text style={[screenStyles.quietButtonText, !canReport || this.state.reporting ? { color: colors.wrap } : null]}>
            {this.state.reporting ? "Sending issue report" : canReport ? "Report this issue" : "Sign in to report issue"}
          </Text>
        </Pressable>
        {!canReport ? <Text style={screenStyles.subtle}>Sign in is required to report this issue. No report was submitted.</Text> : null}
        {this.state.reportMessage ? <Text accessibilityRole="alert" style={screenStyles.subtle}>{this.state.reportMessage}</Text> : null}
      </View>
    );
  }
}
