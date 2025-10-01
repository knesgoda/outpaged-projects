
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SmartTaskTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export interface SmartTaskTypeOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  hierarchy_level: "initiative" | "epic" | "story" | "task" | "subtask";
  task_type: "story" | "epic" | "initiative" | "task" | "subtask" | "bug" | "feature_request" | "design" | "idea" | "request" | "incident" | "change" | "test" | "risk";
}

export const SMART_TASK_TYPE_OPTIONS: SmartTaskTypeOption[] = [
  {
    id: "initiative",
    label: "Initiative",
    icon: "🎯",
    description: "Large strategic goal or theme",
    hierarchy_level: "initiative",
    task_type: "initiative"
  },
  {
    id: "epic",
    label: "Epic",
    icon: "🚀",
    description: "Large feature or capability",
    hierarchy_level: "epic",
    task_type: "epic"
  },
  {
    id: "story",
    label: "User Story",
    icon: "📖",
    description: "User-focused requirement",
    hierarchy_level: "story",
    task_type: "story"
  },
  {
    id: "task",
    label: "Task",
    icon: "✅",
    description: "General work item",
    hierarchy_level: "task",
    task_type: "task"
  },
  {
    id: "subtask",
    label: "Sub-task",
    icon: "🔸",
    description: "Small piece of work",
    hierarchy_level: "subtask",
    task_type: "subtask"
  },
  {
    id: "bug",
    label: "Bug",
    icon: "🐛",
    description: "Issue to be fixed",
    hierarchy_level: "task",
    task_type: "bug"
  },
  {
    id: "feature_request",
    label: "Feature Request",
    icon: "✨",
    description: "New functionality request",
    hierarchy_level: "task",
    task_type: "feature_request"
  },
  {
    id: "design",
    label: "Design Task",
    icon: "🎨",
    description: "Design or UX work",
    hierarchy_level: "task",
    task_type: "design"
  },
  {
    id: "idea",
    label: "Idea",
    icon: "💡",
    description: "New concept or suggestion",
    hierarchy_level: "task",
    task_type: "idea"
  },
  {
    id: "request",
    label: "Request",
    icon: "📝",
    description: "Feature or service request",
    hierarchy_level: "task",
    task_type: "request"
  },
  {
    id: "incident",
    label: "Incident",
    icon: "🚨",
    description: "Production issue or outage",
    hierarchy_level: "task",
    task_type: "incident"
  },
  {
    id: "change",
    label: "Change",
    icon: "🔄",
    description: "Change request or modification",
    hierarchy_level: "task",
    task_type: "change"
  },
  {
    id: "test",
    label: "Test",
    icon: "🧪",
    description: "Test case or QA task",
    hierarchy_level: "task",
    task_type: "test"
  },
  {
    id: "risk",
    label: "Risk",
    icon: "⚠️",
    description: "Identified risk or concern",
    hierarchy_level: "task",
    task_type: "risk"
  }
];

export function SmartTaskTypeSelector({ value, onChange, label = "Task Type", placeholder = "Select task type..." }: SmartTaskTypeSelectorProps) {
  const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedOption && (
              <div className="flex items-center gap-2">
                <span>{selectedOption.icon}</span>
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[60]">
          {SMART_TASK_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-3 py-1">
                <span className="text-lg">{option.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
