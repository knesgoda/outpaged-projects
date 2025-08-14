import React from "react";
import { useSearchParams } from "react-router-dom";
import { AutomationDashboard } from "@/components/automation/AutomationDashboard";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";

const AutomationPage = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");

  if (!projectId) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Automation</h1>
        <ProjectSelector 
          onProjectSelect={(id) => {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('project', id);
            window.location.search = newSearchParams.toString();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <AutomationDashboard projectId={projectId} />
    </div>
  );
};

export default AutomationPage;