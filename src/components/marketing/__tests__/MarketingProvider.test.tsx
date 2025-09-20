import { act, renderHook } from "@testing-library/react";
import { SlackProvider } from "@/components/integrations/SlackProvider";
import { ReleaseProvider, useReleases } from "@/components/releases/ReleaseProvider";
import { OperationsProvider, useOperations } from "@/components/operations/OperationsProvider";
import { MarketingProvider, useMarketing, type MarketingCampaignStatus } from "../MarketingProvider";

describe("MarketingProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SlackProvider>
      <ReleaseProvider>
        <OperationsProvider>
          <MarketingProvider>{children}</MarketingProvider>
        </OperationsProvider>
      </ReleaseProvider>
    </SlackProvider>
  );

  const useContextValues = () => {
    const marketing = useMarketing();
    const releases = useReleases();
    const operations = useOperations();
    return { marketing, releases, operations };
  };

  const advanceWorkflow = (
    marketing: ReturnType<typeof useMarketing>,
    campaignId: string,
    steps: MarketingCampaignStatus[],
    actor: string
  ) => {
    steps.forEach((state) => {
      act(() => {
        marketing.transitionCampaign(campaignId, state, actor);
      });
    });
  };

  it("requires marketing lead approval before scheduling", () => {
    const { result } = renderHook(useContextValues, { wrapper });

    let campaignId = "";
    act(() => {
      const campaign = result.current.marketing.createCampaign({
        name: "Campaign A",
        requiresAssets: true,
      });
      campaignId = campaign.id;
      result.current.marketing.linkAsset(campaignId, {
        id: "asset-1",
        name: "Hero",
        type: "design",
        url: "https://example.com/asset",
      });
    });

    advanceWorkflow(
      result.current.marketing,
      campaignId,
      ["plan", "copy_draft", "asset_production", "channel_build", "qa"],
      "planner"
    );

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      act(() => {
        result.current.marketing.transitionCampaign(campaignId, "scheduled", "planner");
      })
    ).toThrow("Marketing Lead approval is required before scheduling");

    consoleErrorSpy.mockRestore();
  });

  it("blocks scheduling until the linked release is marked released", () => {
    const { result } = renderHook(useContextValues, { wrapper });

    let releaseId = "";
    act(() => {
      const release = result.current.releases.createRelease({
        name: "Q4 Launch",
        version: "1.0.0",
        checklistTemplate: ["QA sign-off"],
      });
      releaseId = release.id;
    });

    let campaignId = "";
    act(() => {
      const campaign = result.current.marketing.createCampaign({
        name: "Launch Campaign",
        requiresAssets: false,
        linkedReleaseId: releaseId,
        projectId: "project-123",
      });
      campaignId = campaign.id;
    });

    advanceWorkflow(
      result.current.marketing,
      campaignId,
      ["plan", "copy_draft", "asset_production", "channel_build", "qa"],
      "owner"
    );

    act(() => {
      result.current.marketing.requestQaApproval(campaignId, {
        name: "Marketing Lead",
        role: "marketing_lead",
      });
    });

    act(() => {
      result.current.marketing.transitionCampaign(campaignId, "scheduled", "owner");
    });

    let campaign = result.current.marketing.getCampaignById(campaignId);
    expect(campaign).toBeDefined();
    expect(campaign?.status).toBe("qa");
    expect(campaign?.pendingState).toBe("scheduled");
    expect(campaign?.blockedReason).toBe("release");
    expect(result.current.operations.opsTasks).toHaveLength(0);

    const release = result.current.releases.getReleaseById(releaseId);
    expect(release).toBeDefined();

    act(() => {
      if (release?.checklist[0]) {
        result.current.releases.toggleChecklistItem(releaseId, release.checklist[0].id, "release-manager");
      }
      result.current.releases.transitionRelease(releaseId, "ready");
      result.current.releases.transitionRelease(releaseId, "released");
    });

    campaign = result.current.marketing.getCampaignById(campaignId);
    expect(campaign?.status).toBe("scheduled");
    expect(campaign?.pendingState).toBeUndefined();
    expect(campaign?.blockedReason).toBeNull();

    expect(result.current.operations.opsTasks).toHaveLength(1);
    expect(result.current.operations.opsTasks[0]).toMatchObject({
      type: "go_live",
      relatedCampaignId: campaignId,
    });
  });
});
