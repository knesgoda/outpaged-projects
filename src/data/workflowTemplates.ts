/**
 * Pre-built workflow templates for different teams
 */

export interface WorkflowTemplateDefinition {
  name: string;
  description: string;
  category: 'design' | 'software' | 'marketing' | 'operations';
  states: {
    name: string;
    description?: string;
    category: 'draft' | 'todo' | 'in_progress' | 'in_review' | 'on_hold' | 'done';
    color: string;
    requiredFields?: string[];
    requiresApproval?: boolean;
    approvalRoles?: string[];
  }[];
  transitions: {
    from: string;
    to: string;
    conditions?: Record<string, any>;
    postActions?: Array<{
      type: string;
      config: Record<string, any>;
    }>;
  }[];
}

export const DESIGN_WORKFLOW: WorkflowTemplateDefinition = {
  name: 'Design Workflow',
  description: 'Complete design process from intake to handoff',
  category: 'design',
  states: [
    {
      name: 'Intake',
      category: 'draft',
      color: '#6b7280',
      description: 'Initial design request received',
    },
    {
      name: 'Brief Approved',
      category: 'todo',
      color: '#3b82f6',
      requiredFields: ['brief', 'objectives', 'target_audience'],
    },
    {
      name: 'Concepts',
      category: 'in_progress',
      color: '#f59e0b',
      description: 'Creating initial design concepts',
    },
    {
      name: 'Internal Review',
      category: 'in_review',
      color: '#8b5cf6',
      requiresApproval: true,
      approvalRoles: ['designer', 'design_lead'],
    },
    {
      name: 'Revisions',
      category: 'in_progress',
      color: '#f59e0b',
    },
    {
      name: 'Final Review',
      category: 'in_review',
      color: '#8b5cf6',
      requiresApproval: true,
      requiredFields: ['accessibility_check', 'license_compliance'],
    },
    {
      name: 'Finalized',
      category: 'done',
      color: '#10b981',
      requiredFields: ['asset_list', 'design_specs'],
    },
    {
      name: 'Packaged',
      category: 'done',
      color: '#10b981',
      description: 'Ready for handoff with all assets',
    },
    {
      name: 'Handoff Complete',
      category: 'done',
      color: '#10b981',
    },
  ],
  transitions: [
    { from: 'Intake', to: 'Brief Approved' },
    { from: 'Brief Approved', to: 'Concepts' },
    { from: 'Concepts', to: 'Internal Review' },
    { from: 'Internal Review', to: 'Revisions' },
    { from: 'Internal Review', to: 'Final Review' },
    { from: 'Revisions', to: 'Internal Review' },
    { from: 'Final Review', to: 'Finalized' },
    { from: 'Finalized', to: 'Packaged' },
    { 
      from: 'Packaged', 
      to: 'Handoff Complete',
      postActions: [
        {
          type: 'create_handoff',
          config: { 
            to_team: 'software',
            include_assets: true,
          },
        },
      ],
    },
  ],
};

export const SOFTWARE_WORKFLOW: WorkflowTemplateDefinition = {
  name: 'Software Development Workflow',
  description: 'Agile development workflow with review gates',
  category: 'software',
  states: [
    {
      name: 'Backlog',
      category: 'draft',
      color: '#6b7280',
    },
    {
      name: 'Ready',
      category: 'todo',
      color: '#3b82f6',
      requiredFields: ['story_points', 'acceptance_criteria'],
    },
    {
      name: 'In Progress',
      category: 'in_progress',
      color: '#f59e0b',
      requiredFields: ['assignee'],
    },
    {
      name: 'In Review',
      category: 'in_review',
      color: '#8b5cf6',
      requiredFields: ['pr_link'],
    },
    {
      name: 'QA',
      category: 'in_review',
      color: '#8b5cf6',
      requiredFields: ['test_cases', 'test_results'],
    },
    {
      name: 'Ready to Release',
      category: 'done',
      color: '#10b981',
      requiredFields: ['version_tag', 'release_notes'],
    },
    {
      name: 'Released',
      category: 'done',
      color: '#10b981',
    },
    {
      name: 'Post Release',
      category: 'done',
      color: '#10b981',
    },
  ],
  transitions: [
    { from: 'Backlog', to: 'Ready' },
    { from: 'Ready', to: 'In Progress' },
    { from: 'In Progress', to: 'In Review' },
    { from: 'In Review', to: 'In Progress' },
    { from: 'In Review', to: 'QA' },
    { from: 'QA', to: 'In Progress' },
    { from: 'QA', to: 'Ready to Release' },
    { 
      from: 'Ready to Release', 
      to: 'Released',
      postActions: [
        {
          type: 'create_handoff',
          config: { 
            to_team: 'marketing',
            include_release_notes: true,
          },
        },
      ],
    },
    { from: 'Released', to: 'Post Release' },
  ],
};

export const MARKETING_WORKFLOW: WorkflowTemplateDefinition = {
  name: 'Marketing Campaign Workflow',
  description: 'End-to-end marketing campaign management',
  category: 'marketing',
  states: [
    {
      name: 'Intake',
      category: 'draft',
      color: '#6b7280',
    },
    {
      name: 'Plan',
      category: 'todo',
      color: '#3b82f6',
      requiredFields: ['campaign_objectives', 'target_audience', 'budget'],
    },
    {
      name: 'Copy Draft',
      category: 'in_progress',
      color: '#f59e0b',
    },
    {
      name: 'Asset Production',
      category: 'in_progress',
      color: '#f59e0b',
    },
    {
      name: 'Channel Build',
      category: 'in_progress',
      color: '#f59e0b',
      description: 'Building email, social, ads, etc.',
    },
    {
      name: 'QA',
      category: 'in_review',
      color: '#8b5cf6',
      requiredFields: ['preview_links', 'qa_checklist'],
    },
    {
      name: 'Scheduled',
      category: 'done',
      color: '#10b981',
      requiredFields: ['release_window', 'channels'],
    },
    {
      name: 'Live',
      category: 'done',
      color: '#10b981',
      requiredFields: ['tracking_links', 'pixel_verification'],
    },
    {
      name: 'Wrap',
      category: 'done',
      color: '#10b981',
      requiredFields: ['performance_summary', 'dashboard_links'],
    },
  ],
  transitions: [
    { from: 'Intake', to: 'Plan' },
    { from: 'Plan', to: 'Copy Draft' },
    { from: 'Copy Draft', to: 'Asset Production' },
    { from: 'Asset Production', to: 'Channel Build' },
    { from: 'Channel Build', to: 'QA' },
    { from: 'QA', to: 'Channel Build' },
    { from: 'QA', to: 'Scheduled' },
    { 
      from: 'Scheduled', 
      to: 'Live',
      postActions: [
        {
          type: 'notify_channel',
          config: { 
            channel: 'launches',
            message: 'Campaign is now live',
          },
        },
      ],
    },
    { from: 'Live', to: 'Wrap' },
  ],
};

export const OPERATIONS_WORKFLOW: WorkflowTemplateDefinition = {
  name: 'Operations Request Workflow',
  description: 'Handle operations requests, changes, and incidents',
  category: 'operations',
  states: [
    {
      name: 'Request Submitted',
      category: 'draft',
      color: '#6b7280',
    },
    {
      name: 'Triage',
      category: 'todo',
      color: '#3b82f6',
      requiredFields: ['priority', 'request_type'],
    },
    {
      name: 'Approved',
      category: 'todo',
      color: '#3b82f6',
      requiresApproval: true,
      requiredFields: ['risk_level', 'backout_plan'],
    },
    {
      name: 'In Progress',
      category: 'in_progress',
      color: '#f59e0b',
      requiredFields: ['assignee', 'start_time'],
    },
    {
      name: 'Waiting on Vendor',
      category: 'on_hold',
      color: '#ef4444',
    },
    {
      name: 'Blocked',
      category: 'on_hold',
      color: '#ef4444',
      requiredFields: ['blocking_reason'],
    },
    {
      name: 'QA / Validation',
      category: 'in_review',
      color: '#8b5cf6',
      requiredFields: ['validation_checklist'],
    },
    {
      name: 'Done',
      category: 'done',
      color: '#10b981',
      requiredFields: ['completion_notes'],
    },
  ],
  transitions: [
    { from: 'Request Submitted', to: 'Triage' },
    { from: 'Triage', to: 'Approved' },
    { from: 'Approved', to: 'In Progress' },
    { from: 'In Progress', to: 'Waiting on Vendor' },
    { from: 'In Progress', to: 'Blocked' },
    { from: 'Waiting on Vendor', to: 'In Progress' },
    { from: 'Blocked', to: 'In Progress' },
    { from: 'In Progress', to: 'QA / Validation' },
    { from: 'QA / Validation', to: 'In Progress' },
    { from: 'QA / Validation', to: 'Done' },
  ],
};

export const WORKFLOW_TEMPLATES = [
  DESIGN_WORKFLOW,
  SOFTWARE_WORKFLOW,
  MARKETING_WORKFLOW,
  OPERATIONS_WORKFLOW,
];
