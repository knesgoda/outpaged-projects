import fs from "node:fs";

const rawData = `Phase,ID,Title,Description,Acceptance Criteria,Team,Priority
Phase 2,OP-MKT-001,Marketing Workflow States,"As a Marketing user, I want a workflow from Intake → Plan → Copy Draft → Asset Production → Channel Build → QA → Scheduled → Live → Wrap so I can manage campaigns end-to-end.","States are available in sequence; Invalid transitions are blocked; QA requires at least one Marketing Lead approval.",Marketing,P1
Phase 2,OP-MKT-002,Link Campaigns to Design Assets,"As a Marketing user, I want to link my campaign to Design assets so I can ensure creative is finalized before scheduling.","Scheduled requires at least one linked Design asset when asset-dependent; Block transition to Scheduled if no linked asset.",Marketing,P1
Phase 2,OP-MKT-003,Block Scheduling on Release Readiness,"As a Marketing user, I want scheduling to be blocked until the Software Release is Released so go-lives don't misfire.","Transition to Scheduled is blocked when linked Release ≠ Released; Unblock automatically once Release=Released.",Marketing,P1
Phase 2,OP-MKT-004,Campaign Wrap Metrics,"As a Marketing user, I want to complete campaigns with a Wrap state including metrics so performance is recorded.","Wrap requires Performance Summary (text) and Metrics Link (URL); On Wrap, optional digest can be sent.",Marketing,P2
Phase 2,OP-OPS-001,Operations Workflow States,"As an Operations user, I want a workflow Submitted → Triage → Approved → In Progress → Waiting on Vendor → QA/Validation → Done to run Ops tasks.","Triage requires SLA classification (P1–P4); Approved requires named approver; Done requires QA/Validation checked.",Operations,P1
Phase 2,OP-OPS-002,Change Request Fields & Gate,"As an Operations user, I want Change Requests with risk, impact, and backout plan so high-risk work is controlled.","Cannot move to Approved unless Risk, Impact, Backout Plan are filled; Approver and timestamp recorded.",Operations,P1
Phase 2,OP-OPS-003,Vendor Dependency Handling,"As an Operations user, I want to record vendor info and SLA when waiting externally so we can escalate properly.","Waiting on Vendor requires Vendor Name, Contact, SLA Target; Escalation timer visible and counts down.",Operations,P2
Phase 2,OP-HAND-003,Design→Marketing Handoff,"As a Designer, I want moving to Packaged to create a Marketing item in Assets Received so marketing can start.","On status=Packaged, create Marketing item with mapped fields + attachments; Notify Marketing Lead in-app and email.",Design,P1
Phase 2,OP-HAND-004,Software→Marketing Handoff,"As an Engineer, I want Ready to Release to auto-create Marketing Launch Prep so launch tasks begin on time.","On status=Ready to Release, create Marketing item with release notes; Marketing item blocked until Release=Released.",Engineering,P1
Phase 2,OP-HAND-005,Marketing→Ops Handoff,"As a Marketing user, I want moving to Scheduled to create Ops go-live tasks so operations can execute cutover.","On status=Scheduled, create Ops item with Go-Live Date + Systems list; Link back to campaign; Notify Ops channel.",Marketing,P1
Phase 2,OP-SLACK-001,Slack DMs for Mentions/Assignments/Approvals,"As a user, I want Slack DMs for key events so I can act quickly without email.","DM includes item title/ID/status/due date; Buttons: Open/Approve/Snooze; Respects notification preferences.",Platform,P1
Phase 2,OP-SLACK-002,Slack Link Unfurls,"As a user, I want OutPaged links to unfurl in Slack so I can see context at a glance.","Unfurl shows title/ID/status/assignee/due date; If viewer lacks permission, show Restricted.",Platform,P1
Phase 2,OP-SLACK-003,Project→Slack Channel Notifications,"As a Project Lead, I want to configure Slack channel notifications for project events so the team stays aligned.","Configurable events: new items, releases, status changes, SLA breaches; Posts to chosen channel; Audit of deliveries.",Platform,P2
Phase 2,OP-BACK-001,Backlog View with Ranking,"As a user, I want a Backlog list to drag-rank items so prioritization is explicit.","Drag reorder persists project rank; Rank changes recorded in item history.",Frontend,P1
Phase 2,OP-SPRINT-001,Create Sprint & Commit Items,"As a Project Lead, I want to create a sprint window and commit items so the team has a plan.","Sprint has start/end dates; Commitment line visible; Mid-sprint added/removed items flagged in scope-change log.",Frontend,P1
Phase 2,OP-SPRINT-002,Sprint Board with Swimlanes,"As a team member, I want a sprint board with swimlanes so work is organized by Epic or Assignee.","Swimlanes by Epic/Assignee; Dragging cards updates status; Board respects WIP limits.",Frontend,P1
Phase 2,OP-RM-001,Roadmap by Quarter,"As Leadership, I want a quarterly roadmap so I can see initiatives and key milestones.","Swimlanes=Initiatives; Bars colored by health (Green/Amber/Red); Milestones as diamonds with dates.",Frontend,P2
Phase 2,OP-RM-002,Roadmap Filters & Saved Views,"As Leadership, I want to filter Roadmap by Team/Quarter/Health and save views so I can share perspectives.","Filters persist in URL; Saved views shareable; Permission-aware.",Frontend,P2
Phase 2,OP-RM-003,Roadmap Dependencies,"As Leadership, I want to see dependency lines so I understand schedule risk.","Dependency lines in Orange; Hover tooltip shows impact statement (e.g., slip of 7 days impacts X).",Frontend,P2
Phase 3,OP-EST-001,Enable Story Points & Time Estimates,"As a Project Lead, I want items to support points and time so we can plan capacity.","Items accept Story Points (number) and Time Estimate (hours); Fields appear in Table/Board/Backlog; Editable inline.",Frontend,P1
Phase 3,OP-EST-002,Team Capacity per Sprint,"As a Project Lead, I want to set team capacity so sprint commitments are realistic.","Capacity configurable per sprint and per person; Warning when commitment exceeds capacity.",Frontend,P1
Phase 3,OP-EST-003,Velocity Calculation & Forecast,"As a Project Lead, I want past velocity and a forecast so I can plan future sprints.","Velocity chart over last 3–6 sprints; Forecast band for next sprint; Uses completed points only.",Frontend,P1
Phase 3,OP-REL-001,Release Entity & Versions,"As an Engineer, I want Releases with versions so we can track cutlines.","Create Release with semantic version; Link items; Release state (Planning/Ready/Released).",Backend,P1
Phase 3,OP-REL-002,Release Readiness Checklist,"As a Release Manager, I want a readiness checklist so release quality is consistent.","Checklist template per project; Must pass before marking Released; Missing items block transition.",Backend,P1
Phase 3,OP-REL-003,Auto-Generate Release Notes,"As a PM, I want release notes compiled from items so communication is easy.","Release notes page compiles item titles/summaries by type; Export to Markdown; Editable pre-publish.",Frontend,P2
Phase 3,OP-GANTT-001,Timeline/Gantt View,"As a Planner, I want a timeline with dependencies and baselines so I can manage schedules.","Drag tasks to adjust dates; Dependencies create critical path; Baseline vs Actual shows drift.",Frontend,P1
Phase 3,OP-GANTT-002,Date Constraints & Auto-Shift,"As a Planner, I want dependent tasks to auto-shift so changes propagate safely.","Shifting a predecessor moves successors by the same delta; Conflicts flagged with warnings.",Frontend,P2
Phase 3,OP-WORK-001,Workload Heatmap,"As a Manager, I want a workload heatmap so I can balance assignments.","Heatmap by person/team; Highlights over/under capacity; Filters by type/team/date range.",Frontend,P1
Phase 3,OP-NOTIF-001,SLA Alerts (Ops),"As Operations, I want SLA breach alerts so we can respond quickly.","Start/Pause rules by state; Imminent breach and breach events trigger notifications; Escalation policy configurable.",Operations,P1
Phase 3,OP-NOTIF-002,Scheduled Digests,"As a Leader, I want scheduled digests so I stay informed without noise.","Daily/Weekly digests by team/project; Email and Slack channel delivery; Only include items user has access to.",Platform,P2
Phase 3,OP-SEARCH-001,Advanced Query Builder,"As a power user, I want an advanced search builder so I can slice data precisely.","AND/OR groups; Field operators; Save and share queries; Results linkable.",Frontend,P2
Phase 3,OP-REPORT-001,Agile Reports Pack,"As a PM, I want burndown/burnup/CSD/CFD/velocity so we can inspect and adapt.","Burndown and burnup for current sprint; Cumulative Flow Diagram; Control Chart or Aging WIP; Export PNG/CSV.",Frontend,P2
Phase 3,OP-ADMIN-001,Notification Preference Policy Overrides,"As an Admin, I want to set org/project overrides so critical alerts always deliver.","Org/project critical categories bypass quiet hours; Audit of overrides; User UI shows enforced settings.",Admin,P2
Phase 3,OP-SEC-001,Data Retention & Export Controls,"As an Admin, I want retention policies and export controls so we meet compliance.","Per-project retention (e.g., 365 days) with scheduled purge; Export permission gated; Audit log of exports.",Admin,P2
Phase 4,OP-INC-001,Incident Entity & Severity Ladder,"As Operations, I want incidents with severities (Sev1–Sev4) so we can classify and route response.","Create Incident with title/desc/severity/affected services; Default SLA by severity applied; Incident states: Open → Mitigated → Monitoring → Resolved.",Operations,P1
Phase 4,OP-INC-002,On-Call Rotation & Paging,"As Operations, I want on-call schedules and paging so Sev1 alerts reach the right engineer.","Admin can define rotations and time windows; Sev1 creates page to active on-call; Audit log shows who was paged and when.",Operations,P1
Phase 4,OP-INC-003,Incident Workspace (War Room),"As Operations, I want an incident workspace so cross-team collaboration is organized.","On incident Open: create workspace with timeline, tasks, links; Add responders; All actions timestamped in incident timeline.",Operations,P1
Phase 4,OP-INC-004,Postmortem Template & Actions,"As Operations, I want a postmortem template to capture learnings and action items.","On Resolved: prompt to create Postmortem doc; Required fields: impact, root cause, corrective actions; Action items auto-created and linked.",Operations,P1
Phase 4,OP-CHG-001,Change Request Workflow,"As Operations, I want a change workflow (Draft → Review → Approved → Implementing → Validated → Done) with gates.","Risk, Impact, Backout Plan required before Approved; Named approver recorded; Implementing blocked without approved state.",Operations,P1
Phase 4,OP-CHG-002,Change Calendar & Freeze Windows,"As Operations, I want a change calendar and freeze windows to avoid risky deployments.","Calendar shows scheduled changes; Freeze windows block Approved→Implementing unless override by Admin; Conflicts flagged.",Operations,P2
Phase 4,OP-SRV-001,Service Registry & Ownership,"As a Platform Lead, I want a service catalog with owners so incidents map to responsible teams.","Create Service with name, team owner, runbook link, tier; Items can link to Services; Ownership appears on incidents and changes.",Platform,P1
Phase 4,OP-SRV-002,Runbooks & Checklists,"As Engineers, we want runbooks attached to services/incidents for faster resolution.","Attach runbooks (links/files) to Services; Incident shows relevant runbooks; Checklists can be marked complete and logged.",Platform,P2
Phase 4,OP-DEP-001,Dependency Graph View,"As a Planner, I want a dependency graph so I can see cross-item dependencies visually.","Graph nodes = items/epics, edges = depends-on; Zoom, pan, filter by team/status; Clickthrough opens item.",Frontend,P1
Phase 4,OP-DEP-002,Impact Analysis (“What Breaks If This Slips”),"As a PM, I want to know downstream impact when a dependency slips.","Adjusting a date shows impacted items and delay estimate; Critical paths highlighted; Export impact list (CSV).",Frontend,P2
Phase 4,OP-SLA-001,Business Hour Calendars & Escalations,"As Operations, I want SLA timers that respect business hours and escalate on breach.","Define business calendars; SLA pauses on specified states; Near-breach and breach escalate via notifications to on-call and leads.",Operations,P1
Phase 4,OP-SEARCH-002,Saved Searches & Sharing,"As a power user, I want to save and share advanced queries.","Save query with name/visibility; Share link reproduces filters; Permission-aware visibility.",Frontend,P2
Phase 4,OP-OPS-004,Ops Dashboard,"As Leadership, I want an Ops dashboard for MTTA/MTTR, SLA trends, change success rate.","Widgets show MTTA, MTTR, SLA compliance %, change failure rate; Time range filters; Export PNG/CSV.",Frontend,P2
Phase 5,OP-DOC-001,Docs Editor with Templates,"As a PM, I want a docs editor with PRD/RFC templates so specs live with work.","Create doc with rich text, headings, tables; Start from PRD/RFC templates; Autosave; Permission-aware sharing.",Frontend,P1
Phase 5,OP-DOC-002,Status Chips & Field Bindings in Docs,"As a PM, I want live item chips and bound fields inside docs.","Insert item chip showing ID/status/assignee; Bind fields (e.g., due date) to items; Chips update live when items change.",Frontend,P1
Phase 5,OP-DOC-003,Doc Change Tracking & Approvals,"As a Lead, I want tracked changes and approvals on docs.","Track insert/delete with author and timestamp; Request approval from reviewers; Doc cannot be marked Final without required approvals.",Frontend,P1
Phase 5,OP-PORT-001,Portfolio Dashboard & Initiative Health,"As Leadership, I want a portfolio view to track initiative health and progress.","Initiatives with health (G/A/R), progress %, budget vs plan (optional); Drill-down to epics; Save/share views.",Frontend,P1
Phase 5,OP-PORT-002,Dependency Risk Heatmap,"As Leadership, I want a heatmap of cross-team dependency risk.","Grid by team x team shows count/severity of blocking dependencies; Click reveals list; Export CSV.",Frontend,P2
Phase 5,OP-OKR-001,OKRs Linked to Work,"As Leadership, I want OKRs connected to initiatives and items.","Create Objectives and KRs; Link KRs to epics/items; Rollup progress to Objective; Quarterly view and check-ins.",Frontend,P2
Phase 5,OP-IMP-001,CSV Importer Wizard,"As an Admin, I want to import items from CSV with mapping and validation.","Upload CSV; Map columns to fields; Validate and preview; Import in batches with error report.",Admin,P1
Phase 5,OP-IMP-002,Jira Import (Projects/Issues/Sprints),"As an Admin, I want to import from Jira to accelerate migration.","OAuth/API or CSV; Map issue types/fields/statuses; Preserve comments/attachments when possible; Dry-run preview.",Admin,P1
Phase 5,OP-IMP-003,Monday Import (Boards/Groups/Items),"As an Admin, I want to import from Monday boards into projects.","API token; Map columns to fields; Convert groups to statuses or tags; Preview before import.",Admin,P2
Phase 5,OP-EXP-001,Exports & API Tokens,"As a Data Analyst, I want CSV/JSON exports and personal API tokens.","Export current view to CSV/JSON; Create/revoke API tokens; All exports audited.",Platform,P1
Phase 5,OP-DIG-001,Executive Digest v2 (Email/Slack),"As Leadership, I want weekly executive digests with key deltas and risks.","Schedule digest by portfolio/team; Include top risks, slips, releases; Delivered to email and Slack channel; Permission-aware.",Platform,P2
Phase 5,OP-REP-001,Portfolio Reports Pack,"As Leadership, I want printable/exportable portfolio reports.","Generate PDF/PNG for roadmap snapshot, initiative status, dependency risk; Time-stamped and shareable.",Frontend,P2
Phase 6,OP-PERF-001,10k+ Item Performance Hardening,"As a user, I want smooth lists and filters even with 10k+ items.","Virtualized lists; Indexed queries; Sub-second filter on common fields; Performance budget CI checks.",Platform,P1
Phase 6,OP-PERF-002,Query Caching & N+1 Guardrails,"As a Platform engineer, I want caching and safeguards to avoid N+1 and slow queries.","Add server-side caching on heavy endpoints; Query analyzer warnings in CI; Telemetry for slow queries.",Platform,P2
Phase 6,OP-BCK-001,Daily Backups & Project-Level PITR,"As an Admin, I want backups and point-in-time restore for a single project.","Automated daily backups; Request restore of a project to timestamp T; Admin UI to initiate restore; Audit of restores.",Admin,P1
Phase 6,OP-REL-004,Multi-Region Readiness,"As an Admin, I want failover readiness to improve resilience.","Health checks; Replication strategy documented/validated; Runbook for failover drill; Status banner during failover.",Admin,P2
Phase 6,OP-MOB-001,Mobile Apps v1 (iOS/Android) Sign-In & Inbox,"As a user, I want to sign in on mobile and see my notifications/inbox.","Google SSO; Notification list with deep links; Mark read; Push enabled via provider.",Mobile,P1
Phase 6,OP-MOB-002,Quick Approvals & Comments (Mobile),"As a user, I want to approve and comment from my phone.","Approve/Reject on approvals; Comment composer with mentions; Offline queue for pending actions.",Mobile,P1
Phase 6,OP-OFF-001,Offline Create & Comment (Web/Mobile),"As a user, I want to create items and comment offline and have them sync later.","Local queue persists across reload; Automatic retry on reconnect; Conflict resolution prompts.",Platform,P2
Phase 6,OP-ADM-001,Sandbox & Config Promotion,"As an Admin, I want a sandbox and promotion pipeline for workflows/templates.","Create sandbox env; Edit workflows/templates; Promote to prod with diff/approval; Version history retained.",Admin,P1
Phase 6,OP-TEMP-001,Template Governance & Versioning,"As a PMO, I want template versioning and publishing approvals.","Templates have versions, changelog, owners; Publishing requires approval; Projects can pin to specific version.",Admin,P2
Phase 6,OP-SCIM-001,SCIM Provisioning & Deprovisioning,"As an Admin, I want automated user lifecycle with our IdP.","SCIM integration to create/update/deprovision users and teams; Deprovision revokes sessions within 1 minute.",Admin,P2
Phase 6,OP-ANA-001,Operational Metrics & SLO Dashboard,"As Engineering, I want SLO dashboards for API/UI health.","Define SLOs (availability/latency/error rate); Display burn-rate alerts; Export incidents linked to SLO breaches.",Platform,P2`;

function parseCsv(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "\r") {
      continue;
    }

    if (char === '"') {
      const nextChar = text[i + 1];
      if (inQuotes && nextChar === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      current.push(value);
      rows.push(current);
      current = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  return rows;
}

const rows = parseCsv(rawData);
const headers = rows[0];
const records = rows
  .slice(1)
  .filter((row) => row.length === headers.length && row[1] && row[1] !== "ID")
  .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));

const priorityMap = {
  P1: {
    priority: "urgent",
    storyPoints: 8,
    businessValue: 9,
    effort: 8,
  },
  P2: {
    priority: "high",
    storyPoints: 5,
    businessValue: 7,
    effort: 6,
  },
};

function formatDate(index) {
  const baseDate = new Date("2024-05-01T00:00:00Z");
  const date = new Date(baseDate.getTime());
  date.setDate(baseDate.getDate() + index);
  return date.toISOString().split("T")[0];
}

const backlogItems = records.map((record, index) => {
  const phaseTag = record["Phase"].trim();
  const teamTag = record.Team.trim();
  const priorityConfig = priorityMap[record.Priority] ?? priorityMap.P2;

  const acceptanceCriteria = record["Acceptance Criteria"]
    .split(";")
    .map((criterion) => criterion.trim())
    .filter(Boolean);

  return {
    id: record.ID,
    title: record.Title,
    description: record.Description,
    status: "ready",
    priority: priorityConfig.priority,
    storyPoints: priorityConfig.storyPoints,
    tags: [phaseTag, `Team: ${teamTag}`, `Priority: ${record.Priority}`],
    acceptanceCriteria,
    businessValue: priorityConfig.businessValue,
    effort: priorityConfig.effort,
    createdAt: formatDate(index),
    sprintId: phaseTag.toLowerCase().replace(/\s+/g, "-"),
  };
});

function formatBacklog(items) {
  const lines = items.map((item) => {
    const acceptanceLines = item.acceptanceCriteria
      .map((criterion) => `      ${JSON.stringify(criterion)}`)
      .join(",\n");

    const tagLines = item.tags.map((tag) => `      ${JSON.stringify(tag)}`).join(",\n");

    return `  {
    id: ${JSON.stringify(item.id)},
    title: ${JSON.stringify(item.title)},
    description: ${JSON.stringify(item.description)},
    status: ${JSON.stringify(item.status)},
    priority: ${JSON.stringify(item.priority)},
    storyPoints: ${item.storyPoints},
    tags: [
${tagLines}
    ],
    acceptanceCriteria: [
${acceptanceLines}
    ],
    businessValue: ${item.businessValue},
    effort: ${item.effort},
    createdAt: new Date(${JSON.stringify(item.createdAt)}),
    sprintId: ${JSON.stringify(item.sprintId)},
  }`;
  });

  return `export const enterpriseBacklog: BacklogItem[] = [
${lines.join(",\n")}
];`;
}

const formatted = `import { BacklogItem } from "@/types/backlog";

${formatBacklog(backlogItems)}

export default enterpriseBacklog;
`;

fs.writeFileSync("src/data/enterpriseBacklog.ts", formatted);
console.log("Generated enterprise backlog with", backlogItems.length, "items.");
