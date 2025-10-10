import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { DomainTelemetry } from "@/domain/client";
import { domainEventBus } from "@/domain/events/domainEventBus";
import { useTenant } from "@/domain/tenant";

interface TelemetryContextValue extends DomainTelemetry {
  measure<T>(name: string, fn: () => Promise<T> | T, metadata?: Record<string, unknown>): Promise<T>;
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const tenant = useTenant();

  const isTestEnv =
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
    (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test");

  const track = useCallback<DomainTelemetry["track"]>((event, payload = {}) => {
    const entry = {
      ...payload,
      tenant,
      event,
      timestamp: new Date().toISOString(),
    };
    if (!isTestEnv) {
      console.debug("[Telemetry]", entry);
    }
    domainEventBus.publish({
      type: "telemetry.event",
      payload: entry,
      tenant,
    });
  }, [tenant, isTestEnv]);

  const trackError = useCallback<DomainTelemetry["trackError"]>((error, context = {}) => {
    console.error("[Telemetry:error]", error, { context, tenant });
    domainEventBus.publish({
      type: "telemetry.event",
      payload: { kind: "error", error, context, tenant },
      tenant,
    });
  }, [tenant]);

  const measure = useCallback<TelemetryContextValue["measure"]>(async (name, fn, metadata = {}) => {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const result = await fn();
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      track("telemetry.event", {
        name,
        durationMs: end - start,
        ...metadata,
      });
      return result;
    } catch (error) {
      trackError(error, { name, ...metadata });
      throw error;
    }
  }, [track, trackError]);

  const value = useMemo<TelemetryContextValue>(() => ({
    track,
    trackError,
    measure,
  }), [measure, track, trackError]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within TelemetryProvider");
  }
  return context;
}
