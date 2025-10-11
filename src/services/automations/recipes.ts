import type { AutomationRecipeDefinition } from "@/types";

export const PREBUILT_AUTOMATION_RECIPES: AutomationRecipeDefinition[] = [
  {
    slug: "assign-on-status-change",
    name: "Assign when status changes",
    description: "Automatically assign owners when a card enters a specific status.",
    trigger: {
      type: "task.status_changed",
      label: "When the status changes",
      configSchema: [
        {
          name: "to",
          label: "Target status",
          type: "select",
          description: "Run this automation when the task moves into this status.",
          options: [
            { label: "Todo", value: "todo" },
            { label: "In progress", value: "in_progress" },
            { label: "In review", value: "in_review" },
            { label: "Done", value: "done" },
          ],
          required: true,
        },
      ],
    },
    actions: [
      {
        type: "assign",
        label: "Assign to",
        description: "Assign the task to one or more teammates.",
        configSchema: [
          {
            name: "assigneeIds",
            label: "Assignees",
            type: "user",
            description: "Choose who should be assigned when the trigger matches.",
            required: true,
          },
        ],
      },
    ],
    category: "Recommended",
  },
  {
    slug: "slack-notify-on-move",
    name: "Notify Slack on movement",
    description: "Send a Slack message when a card is moved to a different column.",
    trigger: {
      type: "task.moved",
      label: "When the card is moved",
      configSchema: [
        {
          name: "from",
          label: "From column",
          type: "select",
          description: "Optional column to filter when the move starts.",
          options: [],
        },
        {
          name: "to",
          label: "To column",
          type: "select",
          description: "Optional column to filter when the move ends.",
          options: [],
        },
      ],
    },
    actions: [
      {
        type: "slack",
        label: "Send Slack message",
        description: "Post into a Slack channel using a webhook URL.",
        configSchema: [
          {
            name: "webhookUrl",
            label: "Slack webhook URL",
            type: "url",
            placeholder: "https://hooks.slack.com/services/...",
            description: "The incoming webhook configured in Slack.",
            required: true,
          },
          {
            name: "message",
            label: "Message template",
            type: "textarea",
            description:
              "Supports variables like {task.title}, {fromColumn}, {toColumn}, and {assigneeNames}.",
          },
        ],
      },
    ],
    category: "Notifications",
  },
  {
    slug: "webhook-on-create",
    name: "Call webhook when created",
    description: "Notify external systems via webhook when a task is created.",
    trigger: {
      type: "task.created",
      label: "When a task is created",
      configSchema: [],
    },
    actions: [
      {
        type: "webhook",
        label: "Send webhook",
        description: "POST to an external service.",
        configSchema: [
          {
            name: "url",
            label: "Request URL",
            type: "url",
            required: true,
            placeholder: "https://example.com/webhook",
          },
          {
            name: "method",
            label: "HTTP method",
            type: "select",
            options: [
              { label: "POST", value: "POST" },
              { label: "PUT", value: "PUT" },
              { label: "PATCH", value: "PATCH" },
            ],
            required: true,
          },
        ],
      },
    ],
    category: "Integrations",
  },
  {
    slug: "start-timer-on-progress",
    name: "Start timer on in-progress",
    description: "Start a timer when a card enters in-progress.",
    trigger: {
      type: "task.status_changed",
      label: "When the status changes",
      configSchema: [
        {
          name: "to",
          label: "New status",
          type: "select",
          options: [
            { label: "In progress", value: "in_progress" },
            { label: "In review", value: "in_review" },
          ],
          required: true,
        },
      ],
    },
    actions: [
      {
        type: "timer",
        label: "Start timer",
        description: "Automatically start the effort timer for the assignee.",
        configSchema: [
          {
            name: "duration",
            label: "Reminder duration (minutes)",
            type: "number",
            description: "Optional reminder to check-in once the timer runs this long.",
          },
        ],
      },
    ],
    category: "Timers",
  },
];

export function getPrebuiltAutomationRecipes(): AutomationRecipeDefinition[] {
  return [...PREBUILT_AUTOMATION_RECIPES];
}

export function findPrebuiltRecipe(slug: string): AutomationRecipeDefinition | undefined {
  return PREBUILT_AUTOMATION_RECIPES.find((recipe) => recipe.slug === slug);
}
