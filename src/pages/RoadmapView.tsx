import { QuarterlyRoadmap } from "@/components/roadmap/QuarterlyRoadmap";

// Mock data
const mockInitiatives = [
  {
    id: "init-1",
    name: "Customer Portal Redesign",
    team: "Engineering",
    quarter: "Q1 2025",
    health: "green" as const,
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    milestones: [
      { id: "m1", name: "Design Complete", date: "2025-01-31", completed: true },
      { id: "m2", name: "Development Done", date: "2025-02-28", completed: false },
      { id: "m3", name: "Launch", date: "2025-03-15", completed: false },
    ],
    dependencies: [],
  },
  {
    id: "init-2",
    name: "Mobile App Launch",
    team: "Product",
    quarter: "Q2 2025",
    health: "amber" as const,
    startDate: "2025-04-01",
    endDate: "2025-06-30",
    milestones: [
      { id: "m4", name: "Beta Release", date: "2025-05-15", completed: false },
      { id: "m5", name: "Public Launch", date: "2025-06-15", completed: false },
    ],
    dependencies: ["init-1"],
  },
  {
    id: "init-3",
    name: "API v3 Migration",
    team: "Engineering",
    quarter: "Q1 2025",
    health: "red" as const,
    startDate: "2025-01-15",
    endDate: "2025-04-30",
    milestones: [
      { id: "m6", name: "Spec Finalized", date: "2025-02-01", completed: true },
      { id: "m7", name: "Migration Complete", date: "2025-04-15", completed: false },
    ],
    dependencies: [],
  },
  {
    id: "init-4",
    name: "Marketing Automation Platform",
    team: "Marketing",
    quarter: "Q2 2025",
    health: "green" as const,
    startDate: "2025-04-01",
    endDate: "2025-06-30",
    milestones: [
      { id: "m8", name: "Platform Selection", date: "2025-04-30", completed: false },
      { id: "m9", name: "Implementation", date: "2025-05-31", completed: false },
      { id: "m10", name: "Go Live", date: "2025-06-15", completed: false },
    ],
    dependencies: [],
  },
];

export default function RoadmapView() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Strategic Roadmap</h1>
        <p className="text-muted-foreground">
          Track initiatives, milestones, and dependencies across quarters
        </p>
      </div>

      <QuarterlyRoadmap projectId="default-project-id" />
    </div>
  );
}
