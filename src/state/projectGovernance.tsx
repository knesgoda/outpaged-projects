import { createContext, useContext, type ReactNode } from "react";
import { useProjectGovernance, type ProjectGovernanceState } from "@/hooks/useProjectGovernance";

const ProjectGovernanceContext = createContext<ProjectGovernanceState | null>(null);

export function ProjectGovernanceProvider({ projectId, children }: { projectId?: string; children: ReactNode }) {
  const value = useProjectGovernance(projectId);
  return <ProjectGovernanceContext.Provider value={value}>{children}</ProjectGovernanceContext.Provider>;
}

export function useProjectGovernanceContext() {
  const context = useContext(ProjectGovernanceContext);
  if (!context) {
    throw new Error("useProjectGovernanceContext must be used within a ProjectGovernanceProvider");
  }
  return context;
}
