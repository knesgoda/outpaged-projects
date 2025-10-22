import type { TaskWithDetails } from "@/types/tasks";

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<TaskWithDetails>;
  checklists?: Array<{ title: string; items: string[] }>;
  category?: string;
}

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Standard bug report template',
    category: 'Engineering',
    template: {
      task_type: 'bug',
      hierarchy_level: 'task',
      priority: 'P2',
      description: `## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior


## Actual Behavior


## Environment
- Browser/OS:
- Version:

## Screenshots/Logs
`,
    },
    checklists: [
      {
        title: 'Bug Investigation',
        items: [
          'Reproduced the issue',
          'Identified root cause',
          'Written test case',
          'Verified fix in staging',
          'Updated documentation',
        ]
      }
    ]
  },
  {
    id: 'feature-story',
    name: 'Feature Story',
    description: 'User story template',
    category: 'Product',
    template: {
      task_type: 'story',
      hierarchy_level: 'story',
      priority: 'P2',
      description: `## User Story
As a [type of user], I want [goal] so that [benefit].

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Technical Notes


## Dependencies

`,
    },
    checklists: [
      {
        title: 'Definition of Done',
        items: [
          'Code reviewed',
          'Tests written',
          'Documentation updated',
          'Deployed to production',
          'Stakeholders notified',
        ]
      }
    ]
  },
  {
    id: 'epic-template',
    name: 'Epic',
    description: 'Large feature or initiative',
    category: 'Product',
    template: {
      task_type: 'epic',
      hierarchy_level: 'epic',
      priority: 'P1',
      description: `## Epic Goal


## Success Metrics


## User Stories


## Out of Scope


## Timeline

`,
    },
    checklists: [
      {
        title: 'Epic Milestones',
        items: [
          'Requirements gathered',
          'Design completed',
          'All stories completed',
          'Integration testing done',
          'Launched to users',
        ]
      }
    ]
  },
  {
    id: 'spike-investigation',
    name: 'Spike / Investigation',
    description: 'Research or proof of concept',
    category: 'Engineering',
    template: {
      task_type: 'task',
      hierarchy_level: 'task',
      priority: 'P2',
      description: `## Investigation Goal


## Questions to Answer
1. 
2. 
3. 

## Approach


## Success Criteria


## Findings
(To be filled in)

## Recommendation
(To be filled in)
`,
    },
    checklists: [
      {
        title: 'Investigation Steps',
        items: [
          'Research completed',
          'Prototype built',
          'Results documented',
          'Recommendation provided',
        ]
      }
    ]
  },
  {
    id: 'incident-response',
    name: 'Incident',
    description: 'Production incident template',
    category: 'Operations',
    template: {
      task_type: 'incident',
      hierarchy_level: 'task',
      priority: 'P0',
      environment: 'prod',
      description: `## Incident Summary


## Impact
- Users affected:
- Services affected:
- Started at:

## Timeline


## Root Cause


## Resolution


## Follow-up Actions

`,
    },
    checklists: [
      {
        title: 'Incident Response',
        items: [
          'Incident detected',
          'Team notified',
          'Mitigation applied',
          'Root cause identified',
          'Post-mortem scheduled',
          'Prevention measures implemented',
        ]
      }
    ]
  },
  {
    id: 'design-task',
    name: 'Design Task',
    description: 'UI/UX design work',
    category: 'Design',
    template: {
      task_type: 'design',
      hierarchy_level: 'task',
      priority: 'P2',
      description: `## Design Brief


## User Need


## Design Constraints


## Deliverables
- [ ] Wireframes
- [ ] High-fidelity mockups
- [ ] Prototype
- [ ] Design specs

## Design Assets
`,
    },
    checklists: [
      {
        title: 'Design Process',
        items: [
          'Research completed',
          'Sketches done',
          'Mockups created',
          'Stakeholder review',
          'Final assets delivered',
        ]
      }
    ]
  },
];

export function getTemplateById(id: string): TaskTemplate | undefined {
  return DEFAULT_TASK_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category?: string): TaskTemplate[] {
  if (!category) return DEFAULT_TASK_TEMPLATES;
  return DEFAULT_TASK_TEMPLATES.filter(t => t.category === category);
}

export function applyTemplate(template: TaskTemplate): Partial<TaskWithDetails> {
  return { ...template.template };
}

export function getTemplateCategories(): string[] {
  const categories = new Set(DEFAULT_TASK_TEMPLATES.map(t => t.category).filter(Boolean));
  return Array.from(categories) as string[];
}
