import { act, renderHook } from "@testing-library/react";
import { SlackProvider } from "@/components/integrations/SlackProvider";
import { OperationsProvider, useOperations } from "../OperationsProvider";

describe("OperationsProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SlackProvider>
      <OperationsProvider>{children}</OperationsProvider>
    </SlackProvider>
  );

  it("creates go-live execution tasks linked to campaigns", () => {
    const { result } = renderHook(() => useOperations(), { wrapper });

    act(() => {
      result.current.createGoLiveTask({
        campaignId: "OP-MKT-001",
        title: "Campaign Launch",
        goLiveDate: "2024-05-01T10:00:00.000Z",
        systems: ["crm", "web"],
      });
    });

    expect(result.current.opsTasks).toHaveLength(1);
    expect(result.current.opsTasks[0]).toMatchObject({
      type: "go_live",
      relatedCampaignId: "OP-MKT-001",
      goLiveDate: "2024-05-01T10:00:00.000Z",
      systems: ["crm", "web"],
    });
    expect(result.current.opsTasks[0].history[0]).toMatchObject({
      action: "Task created",
    });
  });
});
