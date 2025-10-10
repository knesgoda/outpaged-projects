import type { TenantContext } from "../tenant";

export type DomainEventType =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.archived"
  | "tenant.changed"
  | "security.policy-refreshed"
  | "telemetry.event"
  | (string & {});

export interface DomainEvent<TPayload = unknown> {
  id?: string;
  type: DomainEventType;
  payload: TPayload;
  tenant?: TenantContext;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export type DomainEventHandler<TPayload = unknown> = (
  event: Required<DomainEvent<TPayload>>
) => void | Promise<void>;

const generateEventId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

class DomainEventBus {
  private handlers = new Map<DomainEventType | "*", Set<DomainEventHandler>>();

  subscribe<TPayload = unknown>(
    type: DomainEventType | DomainEventType[] | "*",
    handler: DomainEventHandler<TPayload>
  ): () => void {
    const types = Array.isArray(type) ? type : [type];

    for (const currentType of types) {
      if (!this.handlers.has(currentType)) {
        this.handlers.set(currentType, new Set());
      }
      this.handlers.get(currentType)!.add(handler as DomainEventHandler);
    }

    return () => {
      for (const currentType of types) {
        this.handlers.get(currentType)?.delete(handler as DomainEventHandler);
      }
    };
  }

  publish<TPayload = unknown>(event: DomainEvent<TPayload>) {
    const enriched: Required<DomainEvent<TPayload>> = {
      id: event.id ?? generateEventId(),
      timestamp: event.timestamp ?? new Date().toISOString(),
      metadata: event.metadata ?? {},
      tenant: event.tenant,
      type: event.type,
      payload: event.payload,
    };

    const listeners = new Set<DomainEventHandler>([
      ...(this.handlers.get("*") ?? []),
      ...(this.handlers.get(event.type) ?? []),
    ]);

    for (const listener of listeners) {
      try {
        const result = listener(enriched);
        if (result instanceof Promise) {
          void result.catch((error) => {
            console.error("Domain event handler failed", {
              eventType: event.type,
              eventId: enriched.id,
              error,
            });
          });
        }
      } catch (error) {
        console.error("Domain event handler threw", {
          eventType: event.type,
          eventId: enriched.id,
          error,
        });
      }
    }
  }
}

export const domainEventBus = new DomainEventBus();
export type DomainEventBusInstance = DomainEventBus;
