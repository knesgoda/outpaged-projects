import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { PluginKey } from "@tiptap/pm/state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type MentionSuggestionItem = {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string | null;
  meta?: string;
};

export interface MentionExtensionOptions {
  fetchSuggestions: (query: string) => Promise<MentionSuggestionItem[]>;
  onSelect?: (item: MentionSuggestionItem, editor: Editor) => void;
  renderLabel?: (item: MentionSuggestionItem) => string;
}

interface MentionListProps {
  items: MentionSuggestionItem[];
  command: (item: MentionSuggestionItem) => void;
  onClose: () => void;
}
interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList({ items, command, onClose }, ref) {
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
    <div className="max-h-64 w-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
      {items.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">No matches found</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(index)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.avatarUrl ?? undefined} />
                  <AvatarFallback>{item.label[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <div className="font-medium text-foreground">{item.label}</div>
                  {item.description && (
                    <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function createMentionExtension(options: MentionExtensionOptions) {
  return Mention.extend({
    inclusive: false,
    priority: 1000,
    renderHTML({ node }) {
      const label = options.renderLabel?.(node.attrs as MentionSuggestionItem) ?? node.attrs.label;
      return [
        "span",
        { class: "mention-chip inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-primary" },
        `@${label}`,
      ];
    },
  }).configure({
    HTMLAttributes: {
      class: cn(
        "mention-chip inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-primary",
        "cursor-pointer"
      ),
      "data-mention": "true",
    },
    renderLabel({ node }) {
      const label = options.renderLabel?.(node.attrs as MentionSuggestionItem) ?? node.attrs.label;
      return `@${label}`;
    },
    suggestion: {
      pluginKey: new PluginKey("mention-suggestion"),
      char: "@",
      allowSpaces: false,
      items: async ({ query }) => {
        try {
          const suggestions = await options.fetchSuggestions(query);
          return suggestions.slice(0, 20);
        } catch (error) {
          console.error("mention:suggestions", error);
          return [];
        }
      },
      render: () => {
        let component: any = null;
        let popup: TippyInstance[] = [];

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props: {
                items: props.items,
                command: (item) => {
                  props.command({ id: item.id, label: item.label });
                  options.onSelect?.(item, props.editor);
                },
                onClose: () => {
                  popup.forEach((instance) => instance.destroy());
                },
              },
              editor: props.editor,
            } as any);

            if (!props.clientRect) {
              return;
            }

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
              theme: "light-border",
            });
          },
          onUpdate(props) {
            component?.updateProps({
              items: props.items,
              command: (item) => {
                props.command({ id: item.id, label: item.label });
                options.onSelect?.(item, props.editor);
              },
              onClose: () => popup.forEach((instance) => instance.destroy()),
            });

            if (!props.clientRect) {
              return;
            }

            popup.forEach((instance) => {
              instance.setProps({
                getReferenceClientRect: props.clientRect,
              });
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
    },
  });
}
