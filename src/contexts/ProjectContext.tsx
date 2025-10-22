import { createContext, useContext, type ReactNode } from "react";

export interface ProjectContextValue {
  project: {
    id: string;
    code?: string | null;
    name: string;
    description?: string | null;
  };
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ 
  value, 
  children 
}: { 
  value: ProjectContextValue; 
  children: ReactNode;
}) {
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
