import { act, renderHook } from "@testing-library/react";
import { SlackProvider, useSlack, type SlackDmMessage } from "../SlackProvider";

describe("SlackProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SlackProvider>{children}</SlackProvider>
  );

  it("sends direct messages when preferences allow", () => {
    const { result } = renderHook(() => useSlack(), { wrapper });

    let messageId: string | null = null;
    act(() => {
      result.current.setUserPreferences("user-1", { dmEnabled: true });
      const message = result.current.sendDirectMessage("user-1", "mention", {
        itemId: "item-123",
        itemTitle: "Release readiness",
        status: "QA",
        dueDate: new Date().toISOString(),
        actions: ["open", "approve", "snooze"],
      });
      messageId = message?.id ?? null;
    });

    expect(messageId).not.toBeNull();
    expect(result.current.dms).toHaveLength(1);
    expect(result.current.dms[0]).toMatchObject({
      itemId: "item-123",
      userId: "user-1",
    });
  });

  it("respects notification preferences for muted types", () => {
    const { result } = renderHook(() => useSlack(), { wrapper });

    let response: SlackDmMessage | null = null;
    act(() => {
      result.current.setUserPreferences("user-1", {
        dmEnabled: true,
        mutedDmTypes: ["assignment"],
      });
    });
    act(() => {
      response = result.current.sendDirectMessage("user-1", "assignment", {
        itemId: "item-123",
        itemTitle: "Ops task",
        status: "In Progress",
        dueDate: new Date().toISOString(),
        actions: ["open", "approve", "snooze"],
      });
    });

    expect(response).toBeNull();
    expect(result.current.dms).toHaveLength(0);
  });

  it("validates required fields when sending a DM", () => {
    const { result } = renderHook(() => useSlack(), { wrapper });

    expect(() =>
      act(() => {
        result.current.sendDirectMessage("user-1", "mention", {
          itemId: "missing-due-date",
          itemTitle: "Broken payload",
          status: "QA",
          // dueDate intentionally omitted
          actions: ["open", "approve", "snooze"],
        });
      })
    ).toThrow("Slack DM payload must include a due date");

    expect(() =>
      act(() => {
        result.current.sendDirectMessage("user-1", "mention", {
          itemId: "missing-action",
          itemTitle: "Broken payload",
          status: "QA",
          dueDate: new Date().toISOString(),
          actions: ["open", "approve"],
        });
      })
    ).toThrow("Slack DM must include actions: snooze");
  });

  it("records project channel deliveries when configured", () => {
    const { result } = renderHook(() => useSlack(), { wrapper });

    act(() => {
      result.current.configureProjectChannel("project-1", {
        channelId: "channel-123",
        events: ["status_change"],
      });
    });

    let auditId: string | null = null;
    act(() => {
      const entry = result.current.postProjectEvent("project-1", "status_change", "item-9");
      auditId = entry?.id ?? null;
    });

    expect(auditId).not.toBeNull();
    expect(result.current.auditLog).toHaveLength(1);
    expect(result.current.auditLog[0]).toMatchObject({
      channelId: "channel-123",
      itemId: "item-9",
    });
  });

  it("generates unfurls and flags restricted viewers", () => {
    const { result } = renderHook(() => useSlack(), { wrapper });

    act(() => {
      result.current.generateUnfurl({
        url: "https://example.com/item/1",
        itemId: "item-1",
        title: "Example item",
        status: "Open",
        viewerHasAccess: false,
      });
    });

    expect(result.current.unfurls).toHaveLength(1);
    expect(result.current.unfurls[0]).toMatchObject({
      url: "https://example.com/item/1",
      restricted: true,
    });
  });
});
