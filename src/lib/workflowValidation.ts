import { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskType = Database["public"]["Enums"]["task_type"];
type TaskHierarchyLevel = Database["public"]["Enums"]["task_hierarchy_level"];

export interface WorkflowRule {
  id: string;
  projectId: string;
  itemType: TaskType | TaskHierarchyLevel;
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  requiredFields: string[];
  requiresApproval: boolean;
  approvalRoles?: string[];
  validationMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  requiresApproval: boolean;
  approvalRoles: string[];
  message?: string;
}

// Default workflow rules based on PRD
export const DEFAULT_WORKFLOW_RULES: Record<string, WorkflowRule[]> = {
  design: [
    {
      id: "design-finalized-check",
      projectId: "*",
      itemType: "task",
      toStatus: "done",
      requiredFields: ["accessibility_check", "license_compliance", "asset_list"],
      requiresApproval: false,
      validationMessage: "Design must have accessibility check, license compliance, and asset list before finalizing"
    },
  ],
  software: [
    {
      id: "software-ready-ui-check",
      projectId: "*",
      itemType: "story",
      toStatus: "todo",
      requiredFields: ["linked_designs"],
      requiresApproval: false,
      validationMessage: "UI Stories must have linked designs before moving to Ready"
    },
    {
      id: "software-review-pr",
      projectId: "*",
      itemType: "task",
      toStatus: "in_review",
      requiredFields: ["pr_link"],
      requiresApproval: false,
      validationMessage: "Tasks must have a PR link before moving to In Review"
    },
    {
      id: "software-qa-tests",
      projectId: "*",
      itemType: "task",
      toStatus: "in_review",
      requiredFields: ["test_cases", "test_results"],
      requiresApproval: false,
      validationMessage: "Tasks must have test cases and results before QA"
    },
    {
      id: "software-released-version",
      projectId: "*",
      itemType: "task",
      toStatus: "done",
      requiredFields: ["version_tag", "release_notes"],
      requiresApproval: false,
      validationMessage: "Tasks must have version tag and release notes before releasing"
    },
  ],
  marketing: [
    {
      id: "marketing-scheduled-release",
      projectId: "*",
      itemType: "task",
      toStatus: "in_review",
      requiredFields: ["release_window", "channels"],
      requiresApproval: false,
      validationMessage: "Marketing tasks must have release window and channels before scheduling"
    },
    {
      id: "marketing-live-tracking",
      projectId: "*",
      itemType: "task",
      toStatus: "done",
      requiredFields: ["tracking_links", "pixel_verification"],
      requiresApproval: false,
      validationMessage: "Marketing tasks must have tracking links and pixel verification before going live"
    },
  ],
  operations: [
    {
      id: "ops-change-approval",
      projectId: "*",
      itemType: "task",
      toStatus: "in_progress",
      requiredFields: ["risk_level", "backout_plan"],
      requiresApproval: true,
      approvalRoles: ["super_admin", "team_lead"],
      validationMessage: "Change requests require risk level, backout plan, and approval"
    },
  ],
};

export function getWorkflowRules(
  projectId: string,
  team?: string
): WorkflowRule[] {
  // In a real implementation, this would fetch from database
  // For now, return default rules based on team
  if (!team) return [];
  
  const teamLower = team.toLowerCase();
  return DEFAULT_WORKFLOW_RULES[teamLower] || [];
}

export function validateStatusTransition(
  taskData: any,
  toStatus: TaskStatus,
  projectId: string,
  team?: string
): ValidationResult {
  const rules = getWorkflowRules(projectId, team);
  
  // Find applicable rules
  const applicableRules = rules.filter(
    (rule) =>
      (rule.projectId === "*" || rule.projectId === projectId) &&
      rule.toStatus === toStatus &&
      (!rule.itemType || rule.itemType === taskData.hierarchy_level || rule.itemType === taskData.task_type)
  );

  if (applicableRules.length === 0) {
    return {
      isValid: true,
      missingFields: [],
      requiresApproval: false,
      approvalRoles: [],
    };
  }

  const missingFields: string[] = [];
  let requiresApproval = false;
  const approvalRoles: string[] = [];
  const messages: string[] = [];

  for (const rule of applicableRules) {
    // Check required fields
    for (const field of rule.requiredFields) {
      if (!taskData[field] && !taskData.custom_fields?.[field]) {
        missingFields.push(field);
      }
    }

    // Check approval requirements
    if (rule.requiresApproval) {
      requiresApproval = true;
      if (rule.approvalRoles) {
        approvalRoles.push(...rule.approvalRoles);
      }
    }

    if (rule.validationMessage) {
      messages.push(rule.validationMessage);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields: [...new Set(missingFields)],
    requiresApproval,
    approvalRoles: [...new Set(approvalRoles)],
    message: messages.join(". "),
  };
}

export function getRequiredFieldsForStatus(
  toStatus: TaskStatus,
  projectId: string,
  team?: string,
  itemType?: TaskType | TaskHierarchyLevel
): string[] {
  const rules = getWorkflowRules(projectId, team);
  
  const requiredFields = new Set<string>();
  
  for (const rule of rules) {
    if (
      rule.toStatus === toStatus &&
      (!itemType || !rule.itemType || rule.itemType === itemType)
    ) {
      rule.requiredFields.forEach((field) => requiredFields.add(field));
    }
  }
  
  return Array.from(requiredFields);
}
