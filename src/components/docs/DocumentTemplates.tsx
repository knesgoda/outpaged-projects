import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileCode, Lightbulb, AlertTriangle, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'prd' | 'rfc' | 'postmortem' | 'roadmap' | 'meeting';
  icon: any;
  content: string;
}

const DOCUMENT_TEMPLATES: Template[] = [
  {
    id: 'prd',
    name: 'Product Requirements Document (PRD)',
    description: 'Comprehensive product specification with goals, features, and success metrics',
    category: 'prd',
    icon: FileText,
    content: `# Product Requirements Document

## Document Control
- **Owner**: [Product Manager Name]
- **Stakeholders**: [List key stakeholders]
- **Version**: v1.0
- **Status**: Draft
- **Last Updated**: ${new Date().toLocaleDateString()}

## 1. Executive Summary
[Brief overview of the product/feature]

## 2. Problem Statement
### User Pain Points
- [Pain point 1]
- [Pain point 2]

### Business Impact
[Describe the business impact of not solving this problem]

## 3. Goals and Objectives
### Primary Goals
1. [Goal 1]
2. [Goal 2]

### Success Metrics
- [Metric 1]: Target [X]
- [Metric 2]: Target [Y]

## 4. User Stories
### As a [user type], I want to [action] so that [benefit]
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## 5. Functional Requirements
### Core Features
**Feature 1: [Name]**
- Description: [Details]
- Priority: [High/Medium/Low]
- Dependencies: [List any dependencies]

## 6. Non-Functional Requirements
- **Performance**: [Requirements]
- **Security**: [Requirements]
- **Scalability**: [Requirements]

## 7. Technical Considerations
- **Architecture**: [Overview]
- **Data Model**: [Overview]
- **APIs**: [List external/internal APIs]

## 8. Design and UX
- **Wireframes**: [Link to designs]
- **User Flow**: [Describe key flows]

## 9. Timeline and Milestones
| Milestone | Target Date | Owner |
|-----------|-------------|-------|
| Design Complete | [Date] | [Name] |
| Dev Complete | [Date] | [Name] |
| Launch | [Date] | [Name] |

## 10. Open Questions
- [ ] Question 1
- [ ] Question 2

## 11. Appendix
[Additional resources, research, links]
`,
  },
  {
    id: 'rfc',
    name: 'Request for Comments (RFC)',
    description: 'Technical design proposal for architecture and implementation decisions',
    category: 'rfc',
    icon: FileCode,
    content: `# RFC: [Title]

## Metadata
- **Author**: [Your Name]
- **Status**: Draft | In Review | Approved | Implemented
- **Created**: ${new Date().toLocaleDateString()}
- **Last Updated**: ${new Date().toLocaleDateString()}
- **Related Tasks**: [Link to tasks]

## Summary
[One paragraph summary of the proposal]

## Motivation
### Problem
[Describe the problem this RFC solves]

### Use Cases
1. [Use case 1]
2. [Use case 2]

## Proposal
### High-Level Design
[Describe the proposed solution at a high level]

### Detailed Design
#### Component 1: [Name]
**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Interfaces:**
\`\`\`typescript
interface Example {
  field: string;
  method(): void;
}
\`\`\`

### Data Flow
\`\`\`
User -> API -> Service -> Database
                  |
                  v
              External API
\`\`\`

## Alternatives Considered
### Alternative 1: [Name]
**Pros:**
- [Pro 1]

**Cons:**
- [Con 1]

**Why not chosen:** [Explanation]

## Implementation Plan
### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 1

## Testing Strategy
- **Unit Tests**: [Approach]
- **Integration Tests**: [Approach]
- **Performance Tests**: [Approach]

## Security Considerations
- [Consideration 1]
- [Consideration 2]

## Monitoring and Observability
- **Metrics**: [List key metrics]
- **Logging**: [Logging strategy]
- **Alerting**: [Alert conditions]

## Rollout Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Open Questions
- [ ] Question 1
- [ ] Question 2

## References
- [Link 1]
- [Link 2]
`,
  },
  {
    id: 'postmortem',
    name: 'Incident Postmortem',
    description: 'Blameless analysis of incidents with timeline and action items',
    category: 'postmortem',
    icon: AlertTriangle,
    content: `# Incident Postmortem

## Incident Summary
- **Incident ID**: INC-[NUMBER]
- **Severity**: [Sev 1 | Sev 2 | Sev 3]
- **Date**: ${new Date().toLocaleDateString()}
- **Duration**: [X hours/minutes]
- **Status**: Resolved
- **Author**: [Your Name]

## Executive Summary
[Brief description of what happened and the impact]

## Impact
- **Users Affected**: [Number/percentage]
- **Services Impacted**: [List services]
- **Revenue Impact**: [$X] (if applicable)
- **Data Loss**: [Yes/No - details]

## Timeline (All times in UTC)
| Time | Event |
|------|-------|
| HH:MM | Initial alert triggered |
| HH:MM | On-call engineer paged |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service fully restored |
| HH:MM | Incident closed |

## Detection
**How was the issue detected?**
- [Monitoring alert | User report | Internal discovery]

**Time to Detection:**
- [X minutes] from incident start to first alert

## Root Cause Analysis
### What Happened
[Detailed technical explanation of the root cause]

### Why It Happened
- **Immediate Cause**: [Direct cause]
- **Contributing Factors**: 
  - [Factor 1]
  - [Factor 2]

### 5 Whys Analysis
1. Why did [initial problem] occur? [Answer]
2. Why did [answer 1] happen? [Answer]
3. Why did [answer 2] happen? [Answer]
4. Why did [answer 3] happen? [Answer]
5. Why did [answer 4] happen? [Root cause]

## Resolution
### What Fixed It
[Describe the fix that was applied]

### Why It Worked
[Explain why this solution resolved the issue]

## What Went Well
- [Something that helped contain or resolve the issue]
- [Good process that was followed]

## What Went Wrong
- [Gap in monitoring]
- [Process that failed]
- [Missing documentation]

## Action Items
| Action Item | Owner | Priority | Due Date | Status |
|-------------|-------|----------|----------|--------|
| [Implement better monitoring] | [Name] | High | [Date] | Open |
| [Update runbook] | [Name] | Medium | [Date] | Open |
| [Add integration tests] | [Name] | High | [Date] | Open |

## Lessons Learned
1. [Key lesson 1]
2. [Key lesson 2]

## Prevention
### Short-term (0-2 weeks)
- [ ] Action 1
- [ ] Action 2

### Medium-term (2-8 weeks)
- [ ] Action 1
- [ ] Action 2

### Long-term (8+ weeks)
- [ ] Action 1
- [ ] Action 2
`,
  },
  {
    id: 'roadmap',
    name: 'Product Roadmap',
    description: 'Quarterly or annual product planning with themes and initiatives',
    category: 'roadmap',
    icon: Rocket,
    content: `# Product Roadmap - [Quarter/Year]

## Strategic Themes
### Theme 1: [Name]
**Vision**: [What we want to achieve]
**Why Now**: [Strategic rationale]
**Success Metrics**:
- [Metric 1]
- [Metric 2]

## Quarterly Breakdown

### Q1: [Jan - Mar]
#### Initiative 1: [Name]
- **Status**: Planning | In Progress | Complete
- **Owner**: [Team/Person]
- **Confidence**: High | Medium | Low
- **Key Deliverables**:
  - [ ] Deliverable 1
  - [ ] Deliverable 2
- **Dependencies**: [List dependencies]
- **Risks**: [List risks]

#### Initiative 2: [Name]
[Same structure as above]

### Q2: [Apr - Jun]
[Initiatives for Q2]

### Q3: [Jul - Sep]
[Initiatives for Q3]

### Q4: [Oct - Dec]
[Initiatives for Q4]

## Feature Prioritization

### Must Have (P0)
| Feature | Quarter | Owner | Status |
|---------|---------|-------|--------|
| [Feature] | Q1 | [Name] | 🟢 On Track |

### Should Have (P1)
| Feature | Quarter | Owner | Status |
|---------|---------|-------|--------|
| [Feature] | Q2 | [Name] | 🟡 At Risk |

### Nice to Have (P2)
| Feature | Quarter | Owner | Status |
|---------|---------|-------|--------|
| [Feature] | Q3 | [Name] | ⚪ Not Started |

## Resource Allocation
| Team | Q1 | Q2 | Q3 | Q4 |
|------|----|----|----|----|
| Engineering | [Focus area] | [Focus area] | [Focus area] | [Focus area] |
| Design | [Focus area] | [Focus area] | [Focus area] | [Focus area] |
| Product | [Focus area] | [Focus area] | [Focus area] | [Focus area] |

## Risks and Assumptions
### Key Assumptions
1. [Assumption 1]
2. [Assumption 2]

### Known Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | High | [Strategy] |

## Success Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]

## Stakeholder Communication
- **Weekly Updates**: [Who, When]
- **Monthly Reviews**: [Who, When]
- **Quarterly Planning**: [Who, When]
`,
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Structured meeting notes with agenda, decisions, and action items',
    category: 'meeting',
    icon: Lightbulb,
    content: `# Meeting Notes - [Meeting Name]

## Meeting Details
- **Date**: ${new Date().toLocaleDateString()}
- **Time**: [Start] - [End]
- **Attendees**: 
  - [Name 1] - [Role]
  - [Name 2] - [Role]
- **Note Taker**: [Name]
- **Meeting Type**: [Planning | Review | Sync | Brainstorm]

## Agenda
1. [Topic 1] - 10 min
2. [Topic 2] - 15 min
3. [Topic 3] - 20 min
4. Action Items Review - 5 min

## Discussion

### Topic 1: [Name]
**Context**: [Background information]

**Key Points**:
- [Point 1]
- [Point 2]

**Decisions**:
- ✅ [Decision 1]
- ✅ [Decision 2]

### Topic 2: [Name]
[Same structure]

## Decisions Made
| Decision | Rationale | Owner |
|----------|-----------|-------|
| [Decision] | [Why] | [Name] |

## Action Items
- [ ] **[Action item 1]** - Owner: [Name] - Due: [Date]
- [ ] **[Action item 2]** - Owner: [Name] - Due: [Date]
- [ ] **[Action item 3]** - Owner: [Name] - Due: [Date]

## Parking Lot
(Topics to discuss later)
- [Topic 1]
- [Topic 2]

## Next Steps
1. [Step 1]
2. [Step 2]

## Next Meeting
- **Date**: [Date]
- **Agenda Items**:
  - [Item 1]
  - [Item 2]
`,
  },
];

export function DocumentTemplates() {
  const { toast } = useToast();

  const createDocument = (template: Template) => {
    // Copy template content to clipboard
    navigator.clipboard.writeText(template.content);
    
    toast({
      title: "Template Copied",
      description: `${template.name} template copied to clipboard. Paste it into your document editor.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Document Templates</h2>
        <p className="text-muted-foreground">
          Professional templates for PRDs, RFCs, postmortems, roadmaps, and meeting notes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {DOCUMENT_TEMPLATES.map((template) => {
          const Icon = template.icon;
          
          return (
            <Card key={template.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5" />
                      {template.name}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => createDocument(template)}
                  className="w-full"
                  variant="secondary"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Copy Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
