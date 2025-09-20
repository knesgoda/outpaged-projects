import { BacklogItem } from "@/types/backlog";

export const enterpriseBacklog: BacklogItem[] = [
  {
    id: "OP-MKT-001",
    title: "Marketing Workflow States",
    description: "As a Marketing user, I want a workflow from Intake → Plan → Copy Draft → Asset Production → Channel Build → QA → Scheduled → Live → Wrap so I can manage campaigns end-to-end.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Marketing",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "States are available in sequence",
      "Invalid transitions are blocked",
      "QA requires at least one Marketing Lead approval."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-01"),
    sprintId: "phase-2",
  },
  {
    id: "OP-MKT-002",
    title: "Link Campaigns to Design Assets",
    description: "As a Marketing user, I want to link my campaign to Design assets so I can ensure creative is finalized before scheduling.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Marketing",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Scheduled requires at least one linked Design asset when asset-dependent",
      "Block transition to Scheduled if no linked asset."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-02"),
    sprintId: "phase-2",
  },
  {
    id: "OP-MKT-003",
    title: "Block Scheduling on Release Readiness",
    description: "As a Marketing user, I want scheduling to be blocked until the Software Release is Released so go-lives don't misfire.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Marketing",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Transition to Scheduled is blocked when linked Release ≠ Released",
      "Unblock automatically once Release=Released."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-03"),
    sprintId: "phase-2",
  },
  {
    id: "OP-MKT-004",
    title: "Campaign Wrap Metrics",
    description: "As a Marketing user, I want to complete campaigns with a Wrap state including metrics so performance is recorded.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Marketing",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Wrap requires Performance Summary (text) and Metrics Link (URL)",
      "On Wrap, optional digest can be sent."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-04"),
    sprintId: "phase-2",
  },
  {
    id: "OP-OPS-001",
    title: "Operations Workflow States",
    description: "As an Operations user, I want a workflow Submitted → Triage → Approved → In Progress → Waiting on Vendor → QA/Validation → Done to run Ops tasks.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Triage requires SLA classification (P1–P4)",
      "Approved requires named approver",
      "Done requires QA/Validation checked."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-05"),
    sprintId: "phase-2",
  },
  {
    id: "OP-OPS-002",
    title: "Change Request Fields & Gate",
    description: "As an Operations user, I want Change Requests with risk, impact, and backout plan so high-risk work is controlled.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Cannot move to Approved unless Risk, Impact, Backout Plan are filled",
      "Approver and timestamp recorded."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-06"),
    sprintId: "phase-2",
  },
  {
    id: "OP-OPS-003",
    title: "Vendor Dependency Handling",
    description: "As an Operations user, I want to record vendor info and SLA when waiting externally so we can escalate properly.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Operations",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Waiting on Vendor requires Vendor Name, Contact, SLA Target",
      "Escalation timer visible and counts down."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-07"),
    sprintId: "phase-2",
  },
  {
    id: "OP-HAND-003",
    title: "Design→Marketing Handoff",
    description: "As a Designer, I want moving to Packaged to create a Marketing item in Assets Received so marketing can start.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Design",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "On status=Packaged, create Marketing item with mapped fields + attachments",
      "Notify Marketing Lead in-app and email."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-08"),
    sprintId: "phase-2",
  },
  {
    id: "OP-HAND-004",
    title: "Software→Marketing Handoff",
    description: "As an Engineer, I want Ready to Release to auto-create Marketing Launch Prep so launch tasks begin on time.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Engineering",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "On status=Ready to Release, create Marketing item with release notes",
      "Marketing item blocked until Release=Released."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-09"),
    sprintId: "phase-2",
  },
  {
    id: "OP-HAND-005",
    title: "Marketing→Ops Handoff",
    description: "As a Marketing user, I want moving to Scheduled to create Ops go-live tasks so operations can execute cutover.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Marketing",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "On status=Scheduled, create Ops item with Go-Live Date + Systems list",
      "Link back to campaign",
      "Notify Ops channel."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-10"),
    sprintId: "phase-2",
  },
  {
    id: "OP-SLACK-001",
    title: "Slack DMs for Mentions/Assignments/Approvals",
    description: "As a user, I want Slack DMs for key events so I can act quickly without email.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Platform",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "DM includes item title/ID/status/due date",
      "Buttons: Open/Approve/Snooze",
      "Respects notification preferences."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-11"),
    sprintId: "phase-2",
  },
  {
    id: "OP-SLACK-002",
    title: "Slack Link Unfurls",
    description: "As a user, I want OutPaged links to unfurl in Slack so I can see context at a glance.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Platform",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Unfurl shows title/ID/status/assignee/due date",
      "If viewer lacks permission, show Restricted."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-12"),
    sprintId: "phase-2",
  },
  {
    id: "OP-SLACK-003",
    title: "Project→Slack Channel Notifications",
    description: "As a Project Lead, I want to configure Slack channel notifications for project events so the team stays aligned.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Configurable events: new items, releases, status changes, SLA breaches",
      "Posts to chosen channel",
      "Audit of deliveries."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-13"),
    sprintId: "phase-2",
  },
  {
    id: "OP-BACK-001",
    title: "Backlog View with Ranking",
    description: "As a user, I want a Backlog list to drag-rank items so prioritization is explicit.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Drag reorder persists project rank",
      "Rank changes recorded in item history."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-14"),
    sprintId: "phase-2",
  },
  {
    id: "OP-SPRINT-001",
    title: "Create Sprint & Commit Items",
    description: "As a Project Lead, I want to create a sprint window and commit items so the team has a plan.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Sprint has start/end dates",
      "Commitment line visible",
      "Mid-sprint added/removed items flagged in scope-change log."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-15"),
    sprintId: "phase-2",
  },
  {
    id: "OP-SPRINT-002",
    title: "Sprint Board with Swimlanes",
    description: "As a team member, I want a sprint board with swimlanes so work is organized by Epic or Assignee.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Swimlanes by Epic/Assignee",
      "Dragging cards updates status",
      "Board respects WIP limits."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-16"),
    sprintId: "phase-2",
  },
  {
    id: "OP-RM-001",
    title: "Roadmap by Quarter",
    description: "As Leadership, I want a quarterly roadmap so I can see initiatives and key milestones.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Swimlanes=Initiatives",
      "Bars colored by health (Green/Amber/Red)",
      "Milestones as diamonds with dates."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-17"),
    sprintId: "phase-2",
  },
  {
    id: "OP-RM-002",
    title: "Roadmap Filters & Saved Views",
    description: "As Leadership, I want to filter Roadmap by Team/Quarter/Health and save views so I can share perspectives.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Filters persist in URL",
      "Saved views shareable",
      "Permission-aware."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-18"),
    sprintId: "phase-2",
  },
  {
    id: "OP-RM-003",
    title: "Roadmap Dependencies",
    description: "As Leadership, I want to see dependency lines so I understand schedule risk.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 2",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Dependency lines in Orange",
      "Hover tooltip shows impact statement (e.g., slip of 7 days impacts X)."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-19"),
    sprintId: "phase-2",
  },
  {
    id: "OP-EST-001",
    title: "Enable Story Points & Time Estimates",
    description: "As a Project Lead, I want items to support points and time so we can plan capacity.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Items accept Story Points (number) and Time Estimate (hours)",
      "Fields appear in Table/Board/Backlog",
      "Editable inline."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-20"),
    sprintId: "phase-3",
  },
  {
    id: "OP-EST-002",
    title: "Team Capacity per Sprint",
    description: "As a Project Lead, I want to set team capacity so sprint commitments are realistic.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Capacity configurable per sprint and per person",
      "Warning when commitment exceeds capacity."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-21"),
    sprintId: "phase-3",
  },
  {
    id: "OP-EST-003",
    title: "Velocity Calculation & Forecast",
    description: "As a Project Lead, I want past velocity and a forecast so I can plan future sprints.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Velocity chart over last 3–6 sprints",
      "Forecast band for next sprint",
      "Uses completed points only."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-22"),
    sprintId: "phase-3",
  },
  {
    id: "OP-REL-001",
    title: "Release Entity & Versions",
    description: "As an Engineer, I want Releases with versions so we can track cutlines.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Backend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Create Release with semantic version",
      "Link items",
      "Release state (Planning/Ready/Released)."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-23"),
    sprintId: "phase-3",
  },
  {
    id: "OP-REL-002",
    title: "Release Readiness Checklist",
    description: "As a Release Manager, I want a readiness checklist so release quality is consistent.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Backend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Checklist template per project",
      "Must pass before marking Released",
      "Missing items block transition."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-24"),
    sprintId: "phase-3",
  },
  {
    id: "OP-REL-003",
    title: "Auto-Generate Release Notes",
    description: "As a PM, I want release notes compiled from items so communication is easy.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Release notes page compiles item titles/summaries by type",
      "Export to Markdown",
      "Editable pre-publish."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-25"),
    sprintId: "phase-3",
  },
  {
    id: "OP-GANTT-001",
    title: "Timeline/Gantt View",
    description: "As a Planner, I want a timeline with dependencies and baselines so I can manage schedules.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Drag tasks to adjust dates",
      "Dependencies create critical path",
      "Baseline vs Actual shows drift."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-26"),
    sprintId: "phase-3",
  },
  {
    id: "OP-GANTT-002",
    title: "Date Constraints & Auto-Shift",
    description: "As a Planner, I want dependent tasks to auto-shift so changes propagate safely.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Shifting a predecessor moves successors by the same delta",
      "Conflicts flagged with warnings."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-27"),
    sprintId: "phase-3",
  },
  {
    id: "OP-WORK-001",
    title: "Workload Heatmap",
    description: "As a Manager, I want a workload heatmap so I can balance assignments.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Heatmap by person/team",
      "Highlights over/under capacity",
      "Filters by type/team/date range."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-28"),
    sprintId: "phase-3",
  },
  {
    id: "OP-NOTIF-001",
    title: "SLA Alerts (Ops)",
    description: "As Operations, I want SLA breach alerts so we can respond quickly.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 3",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Start/Pause rules by state",
      "Imminent breach and breach events trigger notifications",
      "Escalation policy configurable."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-05-29"),
    sprintId: "phase-3",
  },
  {
    id: "OP-NOTIF-002",
    title: "Scheduled Digests",
    description: "As a Leader, I want scheduled digests so I stay informed without noise.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Daily/Weekly digests by team/project",
      "Email and Slack channel delivery",
      "Only include items user has access to."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-30"),
    sprintId: "phase-3",
  },
  {
    id: "OP-SEARCH-001",
    title: "Advanced Query Builder",
    description: "As a power user, I want an advanced search builder so I can slice data precisely.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "AND/OR groups",
      "Field operators",
      "Save and share queries",
      "Results linkable."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-05-31"),
    sprintId: "phase-3",
  },
  {
    id: "OP-REPORT-001",
    title: "Agile Reports Pack",
    description: "As a PM, I want burndown/burnup/CSD/CFD/velocity so we can inspect and adapt.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Burndown and burnup for current sprint",
      "Cumulative Flow Diagram",
      "Control Chart or Aging WIP",
      "Export PNG/CSV."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-01"),
    sprintId: "phase-3",
  },
  {
    id: "OP-ADMIN-001",
    title: "Notification Preference Policy Overrides",
    description: "As an Admin, I want to set org/project overrides so critical alerts always deliver.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Org/project critical categories bypass quiet hours",
      "Audit of overrides",
      "User UI shows enforced settings."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-02"),
    sprintId: "phase-3",
  },
  {
    id: "OP-SEC-001",
    title: "Data Retention & Export Controls",
    description: "As an Admin, I want retention policies and export controls so we meet compliance.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 3",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Per-project retention (e.g., 365 days) with scheduled purge",
      "Export permission gated",
      "Audit log of exports."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-03"),
    sprintId: "phase-3",
  },
  {
    id: "OP-INC-001",
    title: "Incident Entity & Severity Ladder",
    description: "As Operations, I want incidents with severities (Sev1–Sev4) so we can classify and route response.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Create Incident with title/desc/severity/affected services",
      "Default SLA by severity applied",
      "Incident states: Open → Mitigated → Monitoring → Resolved."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-04"),
    sprintId: "phase-4",
  },
  {
    id: "OP-INC-002",
    title: "On-Call Rotation & Paging",
    description: "As Operations, I want on-call schedules and paging so Sev1 alerts reach the right engineer.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Admin can define rotations and time windows",
      "Sev1 creates page to active on-call",
      "Audit log shows who was paged and when."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-05"),
    sprintId: "phase-4",
  },
  {
    id: "OP-INC-003",
    title: "Incident Workspace (War Room)",
    description: "As Operations, I want an incident workspace so cross-team collaboration is organized.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "On incident Open: create workspace with timeline, tasks, links",
      "Add responders",
      "All actions timestamped in incident timeline."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-06"),
    sprintId: "phase-4",
  },
  {
    id: "OP-INC-004",
    title: "Postmortem Template & Actions",
    description: "As Operations, I want a postmortem template to capture learnings and action items.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "On Resolved: prompt to create Postmortem doc",
      "Required fields: impact, root cause, corrective actions",
      "Action items auto-created and linked."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-07"),
    sprintId: "phase-4",
  },
  {
    id: "OP-CHG-001",
    title: "Change Request Workflow",
    description: "As Operations, I want a change workflow (Draft → Review → Approved → Implementing → Validated → Done) with gates.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Risk, Impact, Backout Plan required before Approved",
      "Named approver recorded",
      "Implementing blocked without approved state."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-08"),
    sprintId: "phase-4",
  },
  {
    id: "OP-CHG-002",
    title: "Change Calendar & Freeze Windows",
    description: "As Operations, I want a change calendar and freeze windows to avoid risky deployments.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Calendar shows scheduled changes",
      "Freeze windows block Approved→Implementing unless override by Admin",
      "Conflicts flagged."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-09"),
    sprintId: "phase-4",
  },
  {
    id: "OP-SRV-001",
    title: "Service Registry & Ownership",
    description: "As a Platform Lead, I want a service catalog with owners so incidents map to responsible teams.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Platform",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Create Service with name, team owner, runbook link, tier",
      "Items can link to Services",
      "Ownership appears on incidents and changes."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-10"),
    sprintId: "phase-4",
  },
  {
    id: "OP-SRV-002",
    title: "Runbooks & Checklists",
    description: "As Engineers, we want runbooks attached to services/incidents for faster resolution.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 4",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Attach runbooks (links/files) to Services",
      "Incident shows relevant runbooks",
      "Checklists can be marked complete and logged."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-11"),
    sprintId: "phase-4",
  },
  {
    id: "OP-DEP-001",
    title: "Dependency Graph View",
    description: "As a Planner, I want a dependency graph so I can see cross-item dependencies visually.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Graph nodes = items/epics, edges = depends-on",
      "Zoom, pan, filter by team/status",
      "Clickthrough opens item."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-12"),
    sprintId: "phase-4",
  },
  {
    id: "OP-DEP-002",
    title: "Impact Analysis (“What Breaks If This Slips”)",
    description: "As a PM, I want to know downstream impact when a dependency slips.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 4",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Adjusting a date shows impacted items and delay estimate",
      "Critical paths highlighted",
      "Export impact list (CSV)."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-13"),
    sprintId: "phase-4",
  },
  {
    id: "OP-SLA-001",
    title: "Business Hour Calendars & Escalations",
    description: "As Operations, I want SLA timers that respect business hours and escalate on breach.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 4",
      "Team: Operations",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Define business calendars",
      "SLA pauses on specified states",
      "Near-breach and breach escalate via notifications to on-call and leads."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-14"),
    sprintId: "phase-4",
  },
  {
    id: "OP-SEARCH-002",
    title: "Saved Searches & Sharing",
    description: "As a power user, I want to save and share advanced queries.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 4",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Save query with name/visibility",
      "Share link reproduces filters",
      "Permission-aware visibility."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-15"),
    sprintId: "phase-4",
  },
  {
    id: "OP-OPS-004",
    title: "Ops Dashboard",
    description: "As Leadership, I want an Ops dashboard for MTTA/MTTR, SLA trends, change success rate.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 4",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Widgets show MTTA, MTTR, SLA compliance %, change failure rate",
      "Time range filters",
      "Export PNG/CSV."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-16"),
    sprintId: "phase-4",
  },
  {
    id: "OP-DOC-001",
    title: "Docs Editor with Templates",
    description: "As a PM, I want a docs editor with PRD/RFC templates so specs live with work.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Create doc with rich text, headings, tables",
      "Start from PRD/RFC templates",
      "Autosave",
      "Permission-aware sharing."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-17"),
    sprintId: "phase-5",
  },
  {
    id: "OP-DOC-002",
    title: "Status Chips & Field Bindings in Docs",
    description: "As a PM, I want live item chips and bound fields inside docs.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Insert item chip showing ID/status/assignee",
      "Bind fields (e.g., due date) to items",
      "Chips update live when items change."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-18"),
    sprintId: "phase-5",
  },
  {
    id: "OP-DOC-003",
    title: "Doc Change Tracking & Approvals",
    description: "As a Lead, I want tracked changes and approvals on docs.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Track insert/delete with author and timestamp",
      "Request approval from reviewers",
      "Doc cannot be marked Final without required approvals."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-19"),
    sprintId: "phase-5",
  },
  {
    id: "OP-PORT-001",
    title: "Portfolio Dashboard & Initiative Health",
    description: "As Leadership, I want a portfolio view to track initiative health and progress.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Initiatives with health (G/A/R), progress %, budget vs plan (optional)",
      "Drill-down to epics",
      "Save/share views."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-20"),
    sprintId: "phase-5",
  },
  {
    id: "OP-PORT-002",
    title: "Dependency Risk Heatmap",
    description: "As Leadership, I want a heatmap of cross-team dependency risk.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Grid by team x team shows count/severity of blocking dependencies",
      "Click reveals list",
      "Export CSV."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-21"),
    sprintId: "phase-5",
  },
  {
    id: "OP-OKR-001",
    title: "OKRs Linked to Work",
    description: "As Leadership, I want OKRs connected to initiatives and items.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Create Objectives and KRs",
      "Link KRs to epics/items",
      "Rollup progress to Objective",
      "Quarterly view and check-ins."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-22"),
    sprintId: "phase-5",
  },
  {
    id: "OP-IMP-001",
    title: "CSV Importer Wizard",
    description: "As an Admin, I want to import items from CSV with mapping and validation.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Admin",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Upload CSV",
      "Map columns to fields",
      "Validate and preview",
      "Import in batches with error report."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-23"),
    sprintId: "phase-5",
  },
  {
    id: "OP-IMP-002",
    title: "Jira Import (Projects/Issues/Sprints)",
    description: "As an Admin, I want to import from Jira to accelerate migration.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Admin",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "OAuth/API or CSV",
      "Map issue types/fields/statuses",
      "Preserve comments/attachments when possible",
      "Dry-run preview."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-24"),
    sprintId: "phase-5",
  },
  {
    id: "OP-IMP-003",
    title: "Monday Import (Boards/Groups/Items)",
    description: "As an Admin, I want to import from Monday boards into projects.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 5",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "API token",
      "Map columns to fields",
      "Convert groups to statuses or tags",
      "Preview before import."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-25"),
    sprintId: "phase-5",
  },
  {
    id: "OP-EXP-001",
    title: "Exports & API Tokens",
    description: "As a Data Analyst, I want CSV/JSON exports and personal API tokens.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 5",
      "Team: Platform",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Export current view to CSV/JSON",
      "Create/revoke API tokens",
      "All exports audited."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-26"),
    sprintId: "phase-5",
  },
  {
    id: "OP-DIG-001",
    title: "Executive Digest v2 (Email/Slack)",
    description: "As Leadership, I want weekly executive digests with key deltas and risks.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 5",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Schedule digest by portfolio/team",
      "Include top risks, slips, releases",
      "Delivered to email and Slack channel",
      "Permission-aware."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-27"),
    sprintId: "phase-5",
  },
  {
    id: "OP-REP-001",
    title: "Portfolio Reports Pack",
    description: "As Leadership, I want printable/exportable portfolio reports.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 5",
      "Team: Frontend",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Generate PDF/PNG for roadmap snapshot, initiative status, dependency risk",
      "Time-stamped and shareable."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-28"),
    sprintId: "phase-5",
  },
  {
    id: "OP-PERF-001",
    title: "10k+ Item Performance Hardening",
    description: "As a user, I want smooth lists and filters even with 10k+ items.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 6",
      "Team: Platform",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Virtualized lists",
      "Indexed queries",
      "Sub-second filter on common fields",
      "Performance budget CI checks."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-06-29"),
    sprintId: "phase-6",
  },
  {
    id: "OP-PERF-002",
    title: "Query Caching & N+1 Guardrails",
    description: "As a Platform engineer, I want caching and safeguards to avoid N+1 and slow queries.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Add server-side caching on heavy endpoints",
      "Query analyzer warnings in CI",
      "Telemetry for slow queries."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-06-30"),
    sprintId: "phase-6",
  },
  {
    id: "OP-BCK-001",
    title: "Daily Backups & Project-Level PITR",
    description: "As an Admin, I want backups and point-in-time restore for a single project.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 6",
      "Team: Admin",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Automated daily backups",
      "Request restore of a project to timestamp T",
      "Admin UI to initiate restore",
      "Audit of restores."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-07-01"),
    sprintId: "phase-6",
  },
  {
    id: "OP-REL-004",
    title: "Multi-Region Readiness",
    description: "As an Admin, I want failover readiness to improve resilience.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Health checks",
      "Replication strategy documented/validated",
      "Runbook for failover drill",
      "Status banner during failover."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-07-02"),
    sprintId: "phase-6",
  },
  {
    id: "OP-MOB-001",
    title: "Mobile Apps v1 (iOS/Android) Sign-In & Inbox",
    description: "As a user, I want to sign in on mobile and see my notifications/inbox.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 6",
      "Team: Mobile",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Google SSO",
      "Notification list with deep links",
      "Mark read",
      "Push enabled via provider."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-07-03"),
    sprintId: "phase-6",
  },
  {
    id: "OP-MOB-002",
    title: "Quick Approvals & Comments (Mobile)",
    description: "As a user, I want to approve and comment from my phone.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 6",
      "Team: Mobile",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Approve/Reject on approvals",
      "Comment composer with mentions",
      "Offline queue for pending actions."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-07-04"),
    sprintId: "phase-6",
  },
  {
    id: "OP-OFF-001",
    title: "Offline Create & Comment (Web/Mobile)",
    description: "As a user, I want to create items and comment offline and have them sync later.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Local queue persists across reload",
      "Automatic retry on reconnect",
      "Conflict resolution prompts."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-07-05"),
    sprintId: "phase-6",
  },
  {
    id: "OP-ADM-001",
    title: "Sandbox & Config Promotion",
    description: "As an Admin, I want a sandbox and promotion pipeline for workflows/templates.",
    status: "ready",
    priority: "urgent",
    storyPoints: 8,
    tags: [
      "Phase 6",
      "Team: Admin",
      "Priority: P1"
    ],
    acceptanceCriteria: [
      "Create sandbox env",
      "Edit workflows/templates",
      "Promote to prod with diff/approval",
      "Version history retained."
    ],
    businessValue: 9,
    effort: 8,
    createdAt: new Date("2024-07-06"),
    sprintId: "phase-6",
  },
  {
    id: "OP-TEMP-001",
    title: "Template Governance & Versioning",
    description: "As a PMO, I want template versioning and publishing approvals.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Templates have versions, changelog, owners",
      "Publishing requires approval",
      "Projects can pin to specific version."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-07-07"),
    sprintId: "phase-6",
  },
  {
    id: "OP-SCIM-001",
    title: "SCIM Provisioning & Deprovisioning",
    description: "As an Admin, I want automated user lifecycle with our IdP.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Admin",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "SCIM integration to create/update/deprovision users and teams",
      "Deprovision revokes sessions within 1 minute."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-07-08"),
    sprintId: "phase-6",
  },
  {
    id: "OP-ANA-001",
    title: "Operational Metrics & SLO Dashboard",
    description: "As Engineering, I want SLO dashboards for API/UI health.",
    status: "ready",
    priority: "high",
    storyPoints: 5,
    tags: [
      "Phase 6",
      "Team: Platform",
      "Priority: P2"
    ],
    acceptanceCriteria: [
      "Define SLOs (availability/latency/error rate)",
      "Display burn-rate alerts",
      "Export incidents linked to SLO breaches."
    ],
    businessValue: 7,
    effort: 6,
    createdAt: new Date("2024-07-09"),
    sprintId: "phase-6",
  }
];

export default enterpriseBacklog;
