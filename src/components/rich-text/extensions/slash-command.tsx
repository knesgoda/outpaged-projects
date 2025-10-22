import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from "react";

export type SlashCommandItem = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action: (editor: Editor) => void;
};

export interface SlashCommandExtensionOptions {
  commands?: SlashCommandItem[];
}

interface SlashMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  onClose: () => void;
}

interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const DEFAULT_COMMANDS: SlashCommandItem[] = [
  {
    id: "heading-2",
    title: "Heading",
    description: "Medium section heading",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "bullet-list",
    title: "Bulleted list",
    description: "Create a bulleted list",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    title: "Numbered list",
    description: "Create a numbered list",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    title: "Checklist",
    description: "Track subtasks",
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Call attention to a quote",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Insert a horizontal rule",
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "code-block",
    title: "Code block",
    description: "Share code with syntax highlighting",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu({ items, command, onClose }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    command(item);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = (selectedIndex - 1 + items.length) % Math.max(items.length, 1);
      setSelectedIndex(next);
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (selectedIndex + 1) % Math.max(items.length, 1);
      setSelectedIndex(next);
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectItem(selectedIndex);
      return true;
    }
    return false;
  };

  useImperativeHandle(ref, () => ({ onKeyDown: handleKeyDown }), [handleKeyDown]);

  return (
    <div className="w-64 rounded-md border border-border bg-popover shadow-lg">
      <ul className="divide-y divide-border/60">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => selectItem(index)}
              className={cn(
                "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="font-medium text-foreground">{item.title}</span>
              {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const SlashCommandExtension = Extension.create<SlashCommandExtensionOptions>({
  name: "slash-command",
  addOptions() {
    return {
      commands: DEFAULT_COMMANDS,
    } satisfies SlashCommandExtensionOptions;
  },
  addProseMirrorPlugins() {
    const commands = this.options.commands ?? DEFAULT_COMMANDS;

    return [
      Suggestion({
        pluginKey: new PluginKey("slash-command-suggestion"),
        editor: this.editor as any,
        char: "/",
        allowSpaces: true,
        startOfLine: true,
        items: ({ query }) => {
          const search = query.toLowerCase();
          return commands
            .filter((item) => item.title.toLowerCase().includes(search))
            .slice(0, 10);
        },
        command: ({ editor, props, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange({ from: range.from, to: range.to })
            .run();
          props.action(editor);
        },
        render: () => {
          let component: ReactRenderer<SlashMenuProps> | null = null;
          let popup: TippyInstance[] = [];

          return {
            onStart: (props) => {
            component = new ReactRenderer(SlashMenu, {
              props: {
                items: props.items as SlashCommandItem[],
                command: (item) => props.command(item),
                onClose: () => popup.forEach((instance) => instance.destroy()),
              },
              editor: props.editor,
            }) as any;

              if (!props.clientRect) {
                return;
              }

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                trigger: "manual",
                interactive: true,
                placement: "bottom-start",
                theme: "light-border",
              });
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items as SlashCommandItem[],
                command: (item) => props.command(item),
                onClose: () => popup.forEach((instance) => instance.destroy()),
              });
              if (!props.clientRect) {
                return;
              }
              popup.forEach((instance) => {
                instance.setProps({ getReferenceClientRect: props.clientRect });
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup.forEach((instance) => instance.hide());
                return true;
              }
              const ref = component?.ref as any;
              return ref?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              popup.forEach((instance) => instance.destroy());
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
