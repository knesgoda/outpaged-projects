import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    info: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-lg text-center">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              {(typeof process !== "undefined" && process.env?.NODE_ENV === "development") ||
              (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development")
                ? this.state.error.message
                : "Our team has been notified. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {((typeof process !== "undefined" && process.env?.NODE_ENV === "development") ||
              (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development")) &&
            this.state.info?.componentStack ? (
              <pre className="rounded bg-muted p-3 text-left text-xs text-muted-foreground overflow-auto max-h-48">
                {this.state.info.componentStack}
              </pre>
            ) : null}
            <Button onClick={this.handleRetry} variant="default">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const telemetry = useTelemetry();

  return (
    <ErrorBoundary
      onError={(error, info) => {
        telemetry.trackError(error, {
          componentStack: info.componentStack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
