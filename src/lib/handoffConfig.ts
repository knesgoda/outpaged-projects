export interface HandoffFlowConfig {
  id: string;
  name: string;
  fromTeam: string;
  toTeam: string;
  triggerStatus: string;
  targetStatus: string;
  handoffType: string;
  exitCriteria: Record<string, any>;
  acceptanceChecklist: Array<{
    item: string;
    required: boolean;
  }>;
  assetPackaging: {
    includeAttachments: boolean;
    includeComments: boolean;
    includeRelatedTasks: boolean;
  };
  autoCreateTarget: boolean;
  targetTaskPrefix?: string;
}

// Predefined handoff flows from PRD
export const HANDOFF_FLOWS: HandoffFlowConfig[] = [
  // Design to Software: "Packaged" → "Ready for Dev"
  {
    id: "design-to-software",
    name: "Design to Software",
    fromTeam: "Design",
    toTeam: "Software",
    triggerStatus: "done", // When design is "Packaged/Done"
    targetStatus: "todo", // Creates as "Ready" in Software
    handoffType: "design_to_software",
    exitCriteria: {
      accessibility_check: true,
      license_compliance: true,
      assets_prepared: true,
    },
    acceptanceChecklist: [
      { item: "Design specs reviewed and understood", required: true },
      { item: "All design assets accessible", required: true },
      { item: "Component library updates identified", required: false },
      { item: "Responsive breakpoints defined", required: true },
      { item: "Design system tokens documented", required: true },
    ],
    assetPackaging: {
      includeAttachments: true,
      includeComments: true,
      includeRelatedTasks: true,
    },
    autoCreateTarget: true,
    targetTaskPrefix: "[Design Ready]",
  },
  // Design to Marketing: "Packaged" → "Assets Received"
  {
    id: "design-to-marketing",
    name: "Design to Marketing",
    fromTeam: "Design",
    toTeam: "Marketing",
    triggerStatus: "done",
    targetStatus: "todo",
    handoffType: "design_to_marketing",
    exitCriteria: {
      final_assets_exported: true,
      variant_list_complete: true,
      size_matrix_defined: true,
    },
    acceptanceChecklist: [
      { item: "All marketing assets received", required: true },
      { item: "Asset dimensions verified", required: true },
      { item: "Brand guidelines compliance checked", required: true },
      { item: "Channel-specific variants available", required: true },
    ],
    assetPackaging: {
      includeAttachments: true,
      includeComments: false,
      includeRelatedTasks: false,
    },
    autoCreateTarget: true,
    targetTaskPrefix: "[Assets Ready]",
  },
  // Software to Marketing: "Ready to Release" → "Launch Prep"
  {
    id: "software-to-marketing",
    name: "Software to Marketing",
    fromTeam: "Software",
    toTeam: "Marketing",
    triggerStatus: "done", // Ready to Release
    targetStatus: "todo",
    handoffType: "software_to_marketing",
    exitCriteria: {
      qa_passed: true,
      release_notes_complete: true,
      version_tagged: true,
    },
    acceptanceChecklist: [
      { item: "Release notes reviewed", required: true },
      { item: "Feature documentation available", required: true },
      { item: "Screenshots and demos prepared", required: false },
      { item: "Launch timeline confirmed", required: true },
      { item: "Rollout plan understood", required: true },
    ],
    assetPackaging: {
      includeAttachments: true,
      includeComments: true,
      includeRelatedTasks: true,
    },
    autoCreateTarget: true,
    targetTaskPrefix: "[Launch Prep]",
  },
  // Marketing to Operations: "Scheduled" → "Go Live"
  {
    id: "marketing-to-operations",
    name: "Marketing to Operations",
    fromTeam: "Marketing",
    toTeam: "Operations",
    triggerStatus: "in_review", // Scheduled status
    targetStatus: "todo",
    handoffType: "marketing_to_operations",
    exitCriteria: {
      channels_configured: true,
      tracking_links_ready: true,
      launch_window_confirmed: true,
    },
    acceptanceChecklist: [
      { item: "Infrastructure capacity verified", required: true },
      { item: "Monitoring alerts configured", required: true },
      { item: "Rollback plan documented", required: true },
      { item: "On-call schedule confirmed", required: true },
    ],
    assetPackaging: {
      includeAttachments: true,
      includeComments: true,
      includeRelatedTasks: true,
    },
    autoCreateTarget: true,
    targetTaskPrefix: "[Go Live]",
  },
];

// Helper to find applicable handoff flows for a status change
export function findApplicableHandoffs(
  taskTeam: string,
  newStatus: string
): HandoffFlowConfig[] {
  return HANDOFF_FLOWS.filter(
    (flow) =>
      flow.fromTeam.toLowerCase() === taskTeam.toLowerCase() &&
      flow.triggerStatus === newStatus
  );
}

// Helper to validate exit criteria
export function validateExitCriteria(
  criteria: Record<string, any>,
  taskData: any
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const [key, required] of Object.entries(criteria)) {
    if (required && !taskData[key]) {
      missing.push(key);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
