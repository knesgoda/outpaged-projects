import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Strikethrough } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const lowlight = createLowlight(common);
CodeBlockLowlight.configure({ lowlight });

export interface RichTextEditorProps {
  value?: string;
  initialDoc?: JSONContent | null;
  onChange?: (html: string, context: { doc: JSONContent; text: string }) => void;
  onSelectionChange?: (editor: Editor) => void;
  onReady?: (editor: Editor) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  editorClassName?: string;
  minHeight?: number;
  extensions?: Parameters<typeof useEditor>[0]["extensions"];
  editable?: boolean;
}

const DEFAULT_CLASSES = "prose prose-sm max-w-none dark:prose-invert focus:outline-none";

export function RichTextEditor({
  value,
  initialDoc,
  onChange,
  onSelectionChange,
  onReady,
  placeholder,
  readOnly = false,
  className,
  editorClassName,
  minHeight = 160,
  extensions,
  editable = true,
}: RichTextEditorProps) {
  const lastValueRef = useRef<string | undefined>(value);
  const [hasFocus, setHasFocus] = useState(false);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4],
          },
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Placeholder.configure({
          placeholder: placeholder ?? "Write something…",
          includeChildren: true,
          showOnlyWhenEditable: true,
        }),
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: "text",
        }),
        ...(extensions ?? []),
      ],
      editorProps: {
        attributes: {
          class: cn(DEFAULT_CLASSES, editorClassName, !readOnly && "focus-visible:outline-none"),
          style: `min-height:${minHeight}px;`,
        },
        handlePaste(view, event) {
          if (!editable) return false;
          const text = event.clipboardData?.getData("text/plain") ?? "";
          const rich = event.clipboardData?.getData("text/html");
          if (rich && !text.startsWith("http")) {
            // Allow tiptap to handle HTML paste, but sanitize will occur server-side.
            return false;
          }
          return false;
        },
      },
      editable: editable && !readOnly,
      autofocus: false,
      onUpdate({ editor: nextEditor }) {
        if (!onChange) return;
        const html = nextEditor.getHTML();
        const doc = nextEditor.getJSON();
        if (lastValueRef.current !== html) {
          lastValueRef.current = html;
          onChange(html, { doc, text: nextEditor.getText() });
        }
      },
      onSelectionUpdate({ editor: nextEditor }) {
        onSelectionChange?.(nextEditor);
      },
      content: initialDoc ?? value ?? "",
    },
    [placeholder, extensions, readOnly, editable]
  );

  useEffect(() => {
    if (!editor) return;
    onReady?.(editor);
    if (typeof value === "string" && value !== lastValueRef.current) {
      const current = editor.getHTML();
      if (current !== value) {
        editor.commands.setContent(value || "<p></p>", false);
        lastValueRef.current = value;
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor || !initialDoc) return;
    const current = editor.getJSON();
    const next = JSON.stringify(initialDoc);
    if (JSON.stringify(current) !== next) {
      editor.commands.setContent(initialDoc, false);
    }
  }, [editor, initialDoc]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly && editable);
  }, [editor, readOnly, editable]);

  const runCommand = useCallback(
    (command: () => void) => () => {
      if (!editor) return;
      command();
    },
    [editor]
  );

  const toolbar = useMemo(() => {
    if (!editor || readOnly) return null;
    const buttons = [
          {
            icon: <Bold className="h-4 w-4" />,
            active: editor.isActive("bold"),
            label: "Bold",
            action: () => editor.chain().focus().toggleBold().run(),
          },
      {
        icon: <Italic className="h-4 w-4" />,
        active: editor.isActive("italic"),
        label: "Italic",
        action: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        icon: <Strikethrough className="h-4 w-4" />,
        active: editor.isActive("strike"),
        label: "Strikethrough",
        action: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        icon: <Code className="h-4 w-4" />,
        active: editor.isActive("code"),
        label: "Inline code",
        action: () => editor.chain().focus().toggleCode().run(),
      },
    ];

    const listButtons = [
      {
        value: "bullet",
        icon: <List className="h-4 w-4" />,
        active: editor.isActive("bulletList"),
        action: () => editor.chain().focus().toggleBulletList().run(),
        label: "Bulleted list",
      },
      {
        value: "ordered",
        icon: <ListOrdered className="h-4 w-4" />,
        active: editor.isActive("orderedList"),
        action: () => editor.chain().focus().toggleOrderedList().run(),
        label: "Numbered list",
      },
      {
        value: "task",
        icon: <List className="h-4 w-4" />,
        active: editor.isActive("taskList"),
        action: () => editor.chain().focus().toggleTaskList().run(),
        label: "Task list",
      },
    ];

    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border border-border bg-muted/40 px-2 py-1 text-muted-foreground",
          hasFocus ? "border-primary/70" : "border-border"
        )}
      >
        <div className="flex items-center gap-1">
          {buttons.map((button) => (
            <FormattingButton key={button.label} editor={editor} {...button} />
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <ToggleGroup type="single" className="flex items-center gap-1" value={listButtons.find((b) => b.active)?.value}>
          {listButtons.map((button) => (
            <TooltipProvider key={button.value} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={button.value}
                    className={cn(
                      "h-8 w-8 border border-transparent p-0", 
                      button.active && "bg-primary/10 text-primary"
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      button.action();
                    }}
                  >
                    {button.icon}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">{button.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </ToggleGroup>
        <div className="h-4 w-px bg-border" />
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", editor.isActive("blockquote") && "bg-primary/10 text-primary")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Quote</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", editor.isActive("link") && "bg-primary/10 text-primary")}
                onClick={() => {
                  const previousUrl = editor.getAttributes("link").href;
                  const url = window.prompt("Enter URL", previousUrl ?? "");
                  if (url === null) return;
                  if (url === "") {
                    editor.chain().focus().unsetLink().run();
                    return;
                  }
                  editor.chain().focus().setLink({ href: url }).run();
                }}
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert link</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", editor.isActive("heading", { level: 2 }) && "bg-primary/10 text-primary")}
                onClick={runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              >
                <Heading2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Heading 2</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", editor.isActive("heading", { level: 3 }) && "bg-primary/10 text-primary")}
                onClick={runCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Heading 3</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }, [editor, readOnly, hasFocus, runCommand]);

  useEffect(() => {
    if (!editor) return;
    const handleFocus = () => setHasFocus(true);
    const handleBlur = () => setHasFocus(false);
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);
    return () => {
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/40 text-sm text-muted-foreground",
          className
        )}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {toolbar}
      <div className={cn("rounded-md border border-border bg-background p-3", hasFocus && "border-primary/70")}> 
        <EditorContent editor={editor} className={cn("rich-text-editor", editorClassName)} />
      </div>
    </div>
  );
}

type FormattingButtonProps = {
  editor: Editor;
  icon: ReactNode;
  active: boolean;
  label: string;
  action: () => void;
};

function FormattingButton({ editor, icon, active, label, action }: FormattingButtonProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8", active && "bg-primary/10 text-primary")}
            onClick={() => {
              action();
              editor.chain().focus();
            }}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
