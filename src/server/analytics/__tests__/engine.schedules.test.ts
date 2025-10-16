import { AnalyticsEngine } from "@/server/analytics/engine";
import type { ScheduledReport } from "@/server/analytics/types";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {},
  supabaseConfigured: false,
}));

describe("AnalyticsEngine schedules", () => {
  let engine: AnalyticsEngine;

  const sampleSchedule: ScheduledReport = {
    id: "weekly-health",
    reportId: "team-health",
    cron: "0 13 * * 1",
    recipients: ["analytics@example.com"],
    channel: "email",
    lastRunAt: undefined,
    nextRunAt: undefined,
  };

  beforeEach(() => {
    engine = new AnalyticsEngine();
  });

  it("persists scheduled reports in memory when Supabase is unavailable", async () => {
    const created = await engine.schedule(sampleSchedule);

    expect(created).toMatchObject({
      id: sampleSchedule.id,
      reportId: sampleSchedule.reportId,
      cron: sampleSchedule.cron,
      channel: sampleSchedule.channel,
      recipients: sampleSchedule.recipients,
      lastRunAt: null,
      nextRunAt: null,
    });

    const schedules = await engine.listSchedules();
    expect(schedules).toEqual([created]);
  });

  it("removes schedules from the in-memory store", async () => {
    await engine.schedule(sampleSchedule);
    await engine.deleteSchedule(sampleSchedule.id);

    const schedules = await engine.listSchedules();
    expect(schedules).toHaveLength(0);
  });
});
