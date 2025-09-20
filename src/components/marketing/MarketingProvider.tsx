import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReleases } from "@/components/releases/ReleaseProvider";
import { useOperations } from "@/components/operations/OperationsProvider";
import { useSlack } from "@/components/integrations/SlackProvider";

export type MarketingCampaignStatus =
  | "intake"
  | "plan"
  | "copy_draft"
  | "asset_production"
  | "channel_build"
  | "qa"
  | "scheduled"
  | "live"
  | "wrap";

const MARKETING_FLOW: MarketingCampaignStatus[] = [
  "intake",
  "plan",
  "copy_draft",
  "asset_production",
  "channel_build",
  "qa",
  "scheduled",
  "live",
  "wrap",
];

export interface CampaignAsset {
  id: string;
  name: string;
  type: "design" | "copy" | "video" | "other";
  url: string;
}

export interface QaApproval {
  id: string;
  approver: string;
  role: "marketing_lead" | "reviewer";
  approvedAt: string;
}

export interface CampaignHistoryEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

export interface WrapMetrics {
  performanceSummary: string;
  metricsLink: string;
  recordedAt: string;
  digestSentAt?: string;
}

export interface MarketingCampaign {
  id: string;
  projectId?: string;
  name: string;
  status: MarketingCampaignStatus;
  requiresAssets: boolean;
  linkedAssets: CampaignAsset[];
  linkedReleaseId?: string;
  qaApprovals: QaApproval[];
  goLiveDate?: string;
  systems?: string[];
  pendingState?: MarketingCampaignStatus;
  blockedReason?: string | null;
  history: CampaignHistoryEntry[];
  wrapMetrics?: WrapMetrics;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

interface DesignHandoffPayload {
  designItemId: string;
  title: string;
  summary: string;
  attachments: string[];
  projectId?: string;
}

interface ReleaseHandoffPayload {
  releaseId: string;
  releaseNotes: string;
  campaignName: string;
  projectId?: string;
}

interface MarketingContextValue {
  campaigns: MarketingCampaign[];
  createCampaign: (input: {
    name: string;
    requiresAssets: boolean;
    linkedReleaseId?: string;
    projectId?: string;
    initialStatus?: MarketingCampaignStatus;
  }) => MarketingCampaign;
  linkAsset: (campaignId: string, asset: CampaignAsset) => void;
  requestQaApproval: (campaignId: string, approver: { name: string; role: QaApproval["role"] }) => void;
  setGoLiveDetails: (campaignId: string, details: { goLiveDate: string; systems: string[] }) => void;
  transitionCampaign: (campaignId: string, nextState: MarketingCampaignStatus, actor: string) => void;
  recordWrapMetrics: (
    campaignId: string,
    metrics: { performanceSummary: string; metricsLink: string; sendDigest?: boolean; recipients?: string[] },
    actor: string
  ) => void;
  registerDesignHandoff: (payload: DesignHandoffPayload) => MarketingCampaign;
  registerReleaseHandoff: (payload: ReleaseHandoffPayload) => MarketingCampaign;
  getCampaignById: (campaignId: string) => MarketingCampaign | undefined;
}

const MarketingContext = createContext<MarketingContextValue | null>(null);

const STORAGE_KEY = "marketing_state_v1";

const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function MarketingProvider({ children }: { children: React.ReactNode }) {
  const { getReleaseById, releases } = useReleases();
  const operations = useOperations();
  const slack = useSlack();
  const pendingSideEffects = useRef<Array<() => void>>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as MarketingCampaign[];
      return parsed.map((campaign) => ({
        ...campaign,
        linkedAssets: campaign.linkedAssets ?? [],
        qaApprovals: campaign.qaApprovals ?? [],
        history: campaign.history ?? [],
        attachments: campaign.attachments ?? [],
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const enqueueSideEffect = useCallback((effect: () => void) => {
    pendingSideEffects.current.push(effect);
  }, []);

  useEffect(() => {
    if (pendingSideEffects.current.length === 0) return;
    const effects = pendingSideEffects.current.splice(0, pendingSideEffects.current.length);
    effects.forEach((effect) => effect());
  }, [campaigns]);

  useEffect(() => {
    if (releases.length === 0) return;
    setCampaigns((prev) =>
      prev.map((campaign) => {
        if (!campaign.linkedReleaseId || campaign.pendingState !== "scheduled" || campaign.blockedReason !== "release") {
          return campaign;
        }
        const release = releases.find((item) => item.id === campaign.linkedReleaseId);
        if (release?.state === "released") {
          const now = new Date().toISOString();
          const historyEntry: CampaignHistoryEntry = {
            id: createId(),
            timestamp: now,
            actor: "system",
            action: "Release marked Released - campaign auto-scheduled",
          };
          const updated: MarketingCampaign = {
            ...campaign,
            status: "scheduled",
            pendingState: undefined,
            blockedReason: null,
            history: [...campaign.history, historyEntry],
            updatedAt: now,
          };
          enqueueSideEffect(() => {
            operations.createGoLiveTask({
              campaignId: campaign.id,
              title: campaign.name,
              goLiveDate: campaign.goLiveDate ?? new Date().toISOString(),
              systems: campaign.systems ?? [],
            });
            if (campaign.projectId) {
              slack.postProjectEvent(campaign.projectId, "status_change", campaign.id);
            }
          });
          return updated;
        }
        return campaign;
      })
    );
  }, [releases, operations, slack, enqueueSideEffect]);

  const createCampaignInternal = useCallback(
    ({
      name,
      requiresAssets,
      linkedReleaseId,
      projectId,
      initialStatus,
    }: {
      name: string;
      requiresAssets: boolean;
      linkedReleaseId?: string;
      projectId?: string;
      initialStatus?: MarketingCampaignStatus;
    }) => {
      const now = new Date().toISOString();
      const status = initialStatus ?? "intake";
      const campaign: MarketingCampaign = {
        id: createId(),
        name,
        requiresAssets,
        linkedAssets: [],
        linkedReleaseId,
        qaApprovals: [],
        goLiveDate: undefined,
        systems: undefined,
        pendingState: undefined,
        blockedReason: null,
        attachments: [],
        history: [
          {
            id: createId(),
            timestamp: now,
            actor: "system",
            action: `Campaign created in ${status}`,
          },
        ],
        wrapMetrics: undefined,
        status,
        createdAt: now,
        updatedAt: now,
        projectId,
      };
      setCampaigns((prev) => [...prev, campaign]);
      return campaign;
    },
    []
  );

  const value = useMemo<MarketingContextValue>(() => ({
    campaigns,
    createCampaign: createCampaignInternal,
    linkAsset: (campaignId, asset) => {
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                linkedAssets: campaign.linkedAssets.some((item) => item.id === asset.id)
                  ? campaign.linkedAssets
                  : [...campaign.linkedAssets, asset],
                history: [
                  ...campaign.history,
                  {
                    id: createId(),
                    timestamp: new Date().toISOString(),
                    actor: "system",
                    action: `Linked asset ${asset.name}`,
                  },
                ],
              }
            : campaign
        )
      );
    },
    requestQaApproval: (campaignId, approver) => {
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                qaApprovals: [
                  ...campaign.qaApprovals,
                  {
                    id: createId(),
                    approver: approver.name,
                    role: approver.role,
                    approvedAt: new Date().toISOString(),
                  },
                ],
              }
            : campaign
        )
      );
    },
    setGoLiveDetails: (campaignId, details) => {
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? { ...campaign, goLiveDate: details.goLiveDate, systems: details.systems }
            : campaign
        )
      );
    },
    transitionCampaign: (campaignId, nextState, actor) => {
      setCampaigns((prev) =>
        prev.map((campaign) => {
          if (campaign.id !== campaignId) return campaign;
          if (campaign.status === nextState) return campaign;
          const currentIndex = MARKETING_FLOW.indexOf(campaign.status);
          const nextIndex = MARKETING_FLOW.indexOf(nextState);
          if (nextIndex !== currentIndex + 1) {
            throw new Error("Invalid marketing workflow transition");
          }
          if (nextState === "qa" && campaign.requiresAssets && campaign.linkedAssets.length === 0) {
            throw new Error("Assets must be linked before QA");
          }
          if (nextState === "scheduled") {
            if (campaign.requiresAssets && campaign.linkedAssets.length === 0) {
              throw new Error("At least one design asset is required before scheduling");
            }
            const hasLeadApproval = campaign.qaApprovals.some((approval) => approval.role === "marketing_lead");
            if (!hasLeadApproval) {
              throw new Error("Marketing Lead approval is required before scheduling");
            }
            if (campaign.linkedReleaseId) {
              const release = getReleaseById(campaign.linkedReleaseId);
              if (!release || release.state !== "released") {
                return {
                  ...campaign,
                  pendingState: "scheduled",
                  blockedReason: "release",
                  history: [
                    ...campaign.history,
                    {
                      id: createId(),
                      timestamp: new Date().toISOString(),
                      actor,
                      action: "Scheduling blocked pending release readiness",
                    },
                  ],
                };
              }
            }
            enqueueSideEffect(() => {
              operations.createGoLiveTask({
                campaignId: campaign.id,
                title: campaign.name,
                goLiveDate: campaign.goLiveDate ?? new Date().toISOString(),
                systems: campaign.systems ?? [],
              });
              if (campaign.projectId) {
                slack.postProjectEvent(campaign.projectId, "status_change", campaign.id);
              }
            });
          }
          const now = new Date().toISOString();
          return {
            ...campaign,
            status: nextState,
            pendingState: undefined,
            blockedReason: null,
            updatedAt: now,
            history: [
              ...campaign.history,
              {
                id: createId(),
                timestamp: now,
                actor,
                action: `Moved to ${nextState}`,
              },
            ],
          };
        })
      );
    },
    recordWrapMetrics: (campaignId, metrics, actor) => {
      if (!metrics.performanceSummary.trim() || !metrics.metricsLink.trim()) {
        throw new Error("Wrap metrics require both summary and metrics link");
      }
      setCampaigns((prev) =>
        prev.map((campaign) => {
          if (campaign.id !== campaignId) return campaign;
          if (campaign.status !== "wrap") {
            throw new Error("Campaign must be in wrap state to record metrics");
          }
          const now = new Date().toISOString();
          if (metrics.sendDigest && campaign.projectId) {
            const targetProjectId = campaign.projectId;
            enqueueSideEffect(() => {
              if (targetProjectId) {
                slack.postProjectEvent(targetProjectId, "status_change", campaign.id);
              }
            });
          }
          return {
            ...campaign,
            wrapMetrics: {
              performanceSummary: metrics.performanceSummary,
              metricsLink: metrics.metricsLink,
              recordedAt: now,
              digestSentAt: metrics.sendDigest ? now : undefined,
            },
            history: [
              ...campaign.history,
              {
                id: createId(),
                timestamp: now,
                actor,
                action: "Recorded wrap metrics",
              },
            ],
          };
        })
      );
    },
    registerDesignHandoff: (payload) => {
      const campaign = createCampaignInternal({
        name: payload.title,
        requiresAssets: true,
        projectId: payload.projectId,
        initialStatus: "asset_production",
      });
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                attachments: payload.attachments,
                history: [
                  ...item.history,
                  {
                    id: createId(),
                    timestamp: new Date().toISOString(),
                    actor: "system",
                    action: `Created from design package ${payload.designItemId}`,
                  },
                ],
              }
            : item
        )
      );
      slack.sendDirectMessage("marketing-lead", "assignment", {
        itemId: campaign.id,
        itemTitle: campaign.name,
        status: campaign.status,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        actions: ["open", "approve", "snooze"],
      });
      return campaign;
    },
    registerReleaseHandoff: (payload) => {
      const campaign = createCampaignInternal({
        name: payload.campaignName,
        requiresAssets: false,
        linkedReleaseId: payload.releaseId,
        projectId: payload.projectId,
        initialStatus: "plan",
      });
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                history: [
                  ...item.history,
                  {
                    id: createId(),
                    timestamp: new Date().toISOString(),
                    actor: "system",
                    action: "Created from software release handoff",
                  },
                ],
              }
            : item
        )
      );
      slack.sendDirectMessage("marketing-lead", "mention", {
        itemId: campaign.id,
        itemTitle: campaign.name,
        status: campaign.status,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
        actions: ["open", "approve", "snooze"],
      });
      return campaign;
    },
    getCampaignById: (campaignId) => campaigns.find((campaign) => campaign.id === campaignId),
  }), [campaigns, createCampaignInternal, getReleaseById, operations, slack, enqueueSideEffect]);

  return <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>;
}

export function useMarketing() {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error("useMarketing must be used within a MarketingProvider");
  }
  return context;
}
