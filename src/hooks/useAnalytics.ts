import { useCallback } from "react";
import { analyticsEngine } from "@/server/analytics/engine";
import type {
  AutomationDefinition,
  DashboardDefinition,
  ReportExecutionResult,
  ReportQuery,
  ScheduledReport,
} from "@/server/analytics/types";

export const useAnalytics = () => {
  const runReport = useCallback(async (query: ReportQuery) => {
    return analyticsEngine.run(query);
  }, []);

  const scheduleReport = useCallback(async (schedule: ScheduledReport) => {
    return analyticsEngine.schedule(schedule);
  }, []);

  const listDashboards = useCallback(async () => {
    return analyticsEngine.listDashboards();
  }, []);

  const upsertAutomation = useCallback(async (automation: AutomationDefinition) => {
    return analyticsEngine.upsertAutomation(automation);
  }, []);

  return {
    runReport,
    scheduleReport,
    listDashboards,
    upsertAutomation,
  };
};

export type {
  AutomationDefinition,
  DashboardDefinition,
  ReportExecutionResult,
  ReportQuery,
  ScheduledReport,
} from "@/server/analytics/types";
