export type ShortcutDescriptor = {
  keys: string[];
  description: string;
};

export type ShortcutSection = {
  id: string;
  title: string;
  shortcuts: ShortcutDescriptor[];
};

export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    id: "navigation",
    title: "Navigation",
    shortcuts: [
      { keys: ["F1"], description: "Open help center" },
      { keys: ["?"], description: "Open shortcuts" },
      { keys: ["G", "H"], description: "Go to home" },
      { keys: ["G", "P"], description: "Go to projects" },
      { keys: ["G", "I"], description: "Open inbox" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    shortcuts: [
      { keys: ["T", "N"], description: "New task" },
      { keys: ["T", "A"], description: "Assign task" },
      { keys: ["T", "S"], description: "Change task status" },
      { keys: ["T", "D"], description: "Add due date" },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration",
    shortcuts: [
      { keys: ["M"], description: "Add comment" },
      { keys: ["Shift", "M"], description: "Mention teammate" },
      { keys: ["Ctrl", "Enter"], description: "Send update" },
    ],
  },
  {
    id: "views",
    title: "Views",
    shortcuts: [
      { keys: ["/"], description: "Focus global search" },
      { keys: ["B"], description: "Open boards" },
      { keys: ["C"], description: "Open calendar" },
      { keys: ["R"], description: "Refresh data" },
    ],
  },
];
