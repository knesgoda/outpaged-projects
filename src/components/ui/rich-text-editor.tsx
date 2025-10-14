import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
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
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import CharacterCount from "@tiptap/extension-character-count";
import Blockquote from "@tiptap/extension-blockquote";
import { lowlight } from "lowlight/lib/core";
import {
  mergeAttributes,
  type Extension,
  type JSONContent,
} from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Link2,
  Highlighter,
  Palette,
  Minus,
  Table2,
  Image as ImageIcon,
  Braces,
  Info,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/security";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteRichTextDraft,
  getRichTextDraft,
  isIndexedDbEnabled,
  saveRichTextDraft,
  updateRichTextDraft,
  type RichTextDraftRecord,
} from "@/services/offline";
import { ConflictResolver, type ConflictRecord } from "@/components/offline/ConflictResolver";
import { SlashCommandExtension } from "@/components/rich-text/extensions/slash-command";

CodeBlockLowlight.configure({ lowlight });

const DEFAULT_CLASSES =
  "prose prose-sm max-w-none dark:prose-invert focus:outline-none [&_.rich-text-callout]:not-prose";

type DraftConfig = {
  id: string;
  scope: string;
  entityId: string;
  field?: string;
  classification?: "default" | "no-offline";
  remoteHash?: string | null;
  remoteContent?: {
    html?: string;
    plaintext?: string;
    doc?: JSONContent | null;
  } | null;
  onConflictResolved?: (choice: "local" | "remote") => void;
};

const Callout = Blockquote.extend({
  name: "callout",
  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-callout-variant") ?? "info",
        renderHTML: (attributes) => ({ "data-callout-variant": attributes.variant }),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant ?? "info") as "info" | "warn" | "danger";
    const variantClass =
      variant === "danger"
        ? "border-red-500/80 bg-red-500/5 text-red-900 dark:border-red-400/70 dark:text-red-200"
        : variant === "warn"
          ? "border-amber-500/80 bg-amber-500/10 text-amber-900 dark:border-amber-400/70 dark:text-amber-100"
          : "border-sky-500/80 bg-sky-500/10 text-sky-900 dark:border-sky-400/70 dark:text-sky-100";
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        class: cn(
          "rich-text-callout my-3 rounded-md border-l-4 px-3 py-2 text-sm leading-relaxed shadow-sm",
          variantClass
        ),
        "data-callout-variant": variant,
      }),
      0,
    ];
  },
});

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
  extensions?: Extension[];
  editable?: boolean;
  chips?: Extension[];
  draft?: DraftConfig | null;
  sanitize?: boolean;
  attachments?: {
    onUpload?: (files: File[]) => Promise<string[]>;
    onInsertFromUrl?: (url: string) => Promise<void> | void;
  };
  maxLength?: number;
  showCharacterCount?: boolean;
}

function hashRichText(value: string | JSONContent | null | undefined) {
  const source =
    typeof value === "string" ? value : value ? JSON.stringify(value) : "";
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return hash.toString(16);
}

function extractPlainText(html: string) {
  if (typeof window === "undefined") return html;
  const container = window.document.createElement("div");
  container.innerHTML = html;
  return container.textContent ?? container.innerText ?? html;
}

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
  minHeight = 180,
  extensions,
  editable = true,
  chips,
  draft,
  sanitize = true,
  attachments,
  maxLength,
  showCharacterCount,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const lastValueRef = useRef<string | undefined>(undefined);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [conflict, setConflict] = useState<ConflictRecord | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  const remoteFingerprint = useMemo(() => {
    if (!draft) return undefined;
    if (draft.remoteHash) return draft.remoteHash;
    if (draft.remoteContent?.html) {
      return hashRichText(sanitize ? sanitizeHtml(draft.remoteContent.html) : draft.remoteContent.html);
    }
    if (initialDoc) return hashRichText(initialDoc);
    if (value) return hashRichText(sanitize ? sanitizeHtml(value) : value);
    return undefined;
  }, [draft, initialDoc, value, sanitize]);

  const baseExtensions = useMemo(() => {
    const list: Extension[] = [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
        history: true,
      }),
      TextStyle,
      Color,
      Underline,
      Typography,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noreferrer noopener",
          class: "text-primary underline decoration-muted-foreground/50 hover:decoration-primary",
        },
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
        HTMLAttributes: {
          class: "rounded-md border border-border bg-muted/40 p-3 text-xs font-mono",
        },
      }),
      Dropcursor.configure({ color: "hsl(var(--primary))", width: 2 }),
      Gapcursor,
      HorizontalRule.configure({ HTMLAttributes: { class: "my-6 border-t border-border" } }),
      Image.configure({ inline: true, allowBase64: true }),
      Callout,
      SlashCommandExtension,
    ];

    if (maxLength || showCharacterCount) {
      list.push(
        CharacterCount.configure({
          limit: maxLength,
        })
      );
    }

    if (chips?.length) {
      list.push(...chips);
    }

    if (extensions?.length) {
      list.push(...extensions);
    }

    return list;
  }, [chips, extensions, maxLength, placeholder, showCharacterCount]);

  const editor = useEditor(
    {
      extensions: baseExtensions,
      content: initialDoc ?? (value ? (sanitize ? sanitizeHtml(value) : value) : ""),
      autofocus: false,
      editable: editable && !readOnly,
      editorProps: {
        attributes: {
          class: cn(
            DEFAULT_CLASSES,
            editorClassName,
            !readOnly && "focus-visible:outline-none",
            readOnly && "pointer-events-none"
          ),
          style: `min-height:${minHeight}px;`,
        },
        handleDrop: (_view, event) => {
          if (!editable || readOnly) return false;
          const files = event.dataTransfer?.files;
          if (files && files.length > 0 && attachments?.onUpload) {
            event.preventDefault();
            void handleAttachmentUpload(Array.from(files));
            return true;
          }
          return false;
        },
        handlePaste: (_view, event) => {
          if (!editable || readOnly) return false;
          const files = event.clipboardData?.files;
          if (files && files.length > 0 && attachments?.onUpload) {
            event.preventDefault();
            void handleAttachmentUpload(Array.from(files));
            return true;
          }
          return false;
        },
      },
      onCreate({ editor: next }) {
        onReady?.(next);
      },
      onSelectionUpdate({ editor: next }) {
        onSelectionChange?.(next);
      },
      onUpdate({ editor: next }) {
        const rawHtml = next.getHTML();
        const sanitized = sanitize ? sanitizeHtml(rawHtml) : rawHtml;
        const doc = next.getJSON();
        const text = next.getText();
        if (lastValueRef.current !== sanitized) {
          lastValueRef.current = sanitized;
          onChange?.(sanitized, { doc, text });
          void persistDraft(sanitized, doc, text);
        }
        if (showCharacterCount || maxLength) {
          setCharacterCount(next.storage.characterCount.characters());
        }
      },
    },
    [
      baseExtensions,
      editable,
      readOnly,
      minHeight,
      editorClassName,
      onReady,
      onSelectionChange,
      onChange,
      attachments,
      sanitize,
      showCharacterCount,
      maxLength,
    ]
  );

  const handleAttachmentUpload = useCallback(
    async (files: File[]) => {
      if (!attachments?.onUpload || !editor) return;
      if (!files.length) return;
      try {
        const urls = await attachments.onUpload(files);
        urls.forEach((url) => {
          editor.chain().focus().setImage({ src: url }).run();
        });
      } catch (error) {
        console.error("richtext:upload", error);
        toast({
          title: "Upload failed",
          description: "We couldn't add that file right now. Try again when you're online.",
          variant: "destructive",
        });
      }
    },
    [attachments, editor, toast]
  );

  const persistDraft = useCallback(
    async (html: string, doc: JSONContent, text: string) => {
      if (!draft || draft.classification === "no-offline") return;
      if (!isIndexedDbEnabled()) return;
      if (!draft.id) return;
      const isEmpty = html.replace(/<[^>]+>/g, "").trim().length === 0 && text.trim().length === 0;
      if (isEmpty) {
        await deleteRichTextDraft(draft.id).catch(() => undefined);
        return;
      }
      const record: RichTextDraftRecord = {
        id: draft.id,
        scope: draft.scope,
        entityId: draft.entityId,
        field: draft.field ?? "content",
        classification: draft.classification ?? "default",
        remoteHash: remoteFingerprint ?? null,
        payload: {
          content: html,
          doc,
          plaintext: text,
          json: doc,
          metadata: { variant: "tiptap" },
        },
        updatedAt: Date.now(),
        vectorClock: {},
        conflictPolicy: { strategy: "lww" },
        dependencies: [],
        batchKey: null,
        attempt: 0,
        lastAttemptAt: Date.now(),
      } as RichTextDraftRecord;
      await saveRichTextDraft(record);
    },
    [draft, remoteFingerprint]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly && editable);
  }, [editor, readOnly, editable]);

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

  useEffect(() => {
    if (!editor) return;
    if (typeof value !== "string") return;
    const sanitizedValue = sanitize ? sanitizeHtml(value) : value;
    if (draftRestored) {
      return;
    }
    const current = editor.getHTML();
    if (current !== sanitizedValue) {
      editor.commands.setContent(sanitizedValue || "<p></p>", false);
      lastValueRef.current = sanitizedValue;
    }
  }, [editor, value, sanitize, draftRestored]);

  useEffect(() => {
    if (!editor || !initialDoc) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialDoc)) {
      editor.commands.setContent(initialDoc, false);
      lastValueRef.current = editor.getHTML();
    }
  }, [editor, initialDoc]);

  useEffect(() => {
    if (!editor || !draft || draftRestored || !isIndexedDbEnabled()) return;
    let cancelled = false;
    setIsLoadingDraft(true);
    getRichTextDraft(draft.id)
      .then((record) => {
        if (cancelled || !record) return;
        const remoteHtml = draft.remoteContent?.html ?? value ?? "";
        const remoteMismatch =
          Boolean(remoteFingerprint && record.remoteHash && record.remoteHash !== remoteFingerprint);
        if (remoteMismatch) {
          const detectedAt = record.conflict?.detectedAt ?? Date.now();
          setConflict({
            id: record.id,
            entityType: draft.scope,
            entityId: draft.entityId,
            conflicts: [
              {
                field: draft.field ?? "Description",
                localValue: extractPlainText(record.payload.content ?? ""),
                remoteValue: extractPlainText(remoteHtml),
                lastModifiedLocal: new Date(record.updatedAt).toLocaleString(),
                lastModifiedRemote: new Date(detectedAt).toLocaleString(),
              },
            ],
          });
          setConflictOpen(true);
          void updateRichTextDraft(draft.id, {
            conflict: {
              remoteHash: remoteFingerprint ?? null,
              remoteContent: remoteHtml,
              remotePlaintext: extractPlainText(remoteHtml),
              remoteDoc: draft.remoteContent?.doc ?? null,
              detectedAt,
            },
          }).catch(() => undefined);
          return;
        }
        if (record.payload?.doc) {
          editor.commands.setContent(record.payload.doc, false);
        } else if (record.payload?.content) {
          editor.commands.setContent(record.payload.content, false);
        }
        const html = editor.getHTML();
        lastValueRef.current = html;
        onChange?.(html, { doc: editor.getJSON(), text: editor.getText() });
        setDraftRestored(true);
      })
      .finally(() => setIsLoadingDraft(false))
      .catch((error) => {
        console.error("richtext:draft", error);
        setIsLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft, editor, draftRestored, remoteFingerprint, onChange, value]);

  const resolveConflict = useCallback(
    async (resolution: Record<string, "local" | "remote">) => {
      if (!draft || !editor) return;
      const fieldKey = draft.field ?? "Description";
      const choice = resolution[fieldKey];
      if (!choice) return;
      if (choice === "remote") {
        const remoteHtml = sanitize
          ? sanitizeHtml(draft.remoteContent?.html ?? value ?? "")
          : draft.remoteContent?.html ?? value ?? "";
        if (draft.remoteContent?.doc) {
          editor.commands.setContent(draft.remoteContent.doc, false);
        } else {
          editor.commands.setContent(remoteHtml || "<p></p>", false);
        }
        await deleteRichTextDraft(draft.id).catch(() => undefined);
        lastValueRef.current = editor.getHTML();
        onChange?.(editor.getHTML(), { doc: editor.getJSON(), text: editor.getText() });
      } else {
        await updateRichTextDraft(draft.id, { conflict: null, remoteHash: remoteFingerprint ?? null }).catch(() => undefined);
      }
      draft.onConflictResolved?.(choice);
      setConflict(null);
      setConflictOpen(false);
    },
    [draft, editor, onChange, remoteFingerprint, sanitize, value]
  );

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleInlineCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const toggleHighlight = useCallback(() => editor?.chain().focus().toggleHighlight().run(), [editor]);
  const insertHorizontalRule = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);
  const toggleHeading = useCallback(
    (level: 2 | 3 | 4) => editor?.chain().focus().toggleHeading({ level }).run(),
    [editor]
  );
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleTaskList = useCallback(() => editor?.chain().focus().toggleTaskList().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const insertTable = useCallback(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run(), [editor]);
  const insertCallout = useCallback(
    (variant: "info" | "warn" | "danger") => {
      if (!editor) return;
      const isActive = editor.isActive("callout", { variant });
      if (isActive) {
        editor.chain().focus().toggleNode("paragraph", "paragraph").run();
      } else {
        editor.chain().focus().toggleNode("callout", "paragraph", { variant }).run();
      }
    },
    [editor]
  );
  const insertVariable = useCallback(
    (placeholder: string) => {
      editor?.chain().focus().insertContent(`{{${placeholder}}}`).run();
    },
    [editor]
  );

  const handleInsertImageFromUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    attachments?.onInsertFromUrl?.(url);
  }, [editor, attachments]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl ?? "");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const handleColorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const color = event.target.value;
      editor?.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const toolbar = useMemo(() => {
    if (!editor || readOnly) return null;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border border-border bg-muted/40 px-2 py-1 text-muted-foreground",
          hasFocus ? "border-primary/70" : "border-border"
        )}
      >
        <div className="flex items-center gap-1">
          <FormattingButton active={editor.isActive("bold")} icon={<Bold className="h-4 w-4" />} label="Bold" onClick={toggleBold} />
          <FormattingButton active={editor.isActive("italic")} icon={<Italic className="h-4 w-4" />} label="Italic" onClick={toggleItalic} />
          <FormattingButton
            active={editor.isActive("underline")}
            icon={<UnderlineIcon className="h-4 w-4" />}
            label="Underline"
            onClick={toggleUnderline}
          />
          <FormattingButton
            active={editor.isActive("strike")}
            icon={<Strikethrough className="h-4 w-4" />}
            label="Strikethrough"
            onClick={toggleStrike}
          />
          <FormattingButton
            active={editor.isActive("code")}
            icon={<Code className="h-4 w-4" />}
            label="Inline code"
            onClick={toggleInlineCode}
          />
        </div>
        <Separator orientation="vertical" className="h-4" />
        <ToggleGroup
          type="single"
          className="flex items-center gap-1"
          value={editor.isActive("bulletList") ? "bullet" : editor.isActive("orderedList") ? "ordered" : editor.isActive("taskList") ? "task" : undefined}
        >
          <ToggleGroupItem value="bullet" onClick={(event) => { event.preventDefault(); toggleBulletList(); }} className={cn("h-8 w-8 border border-transparent p-0", editor.isActive("bulletList") && "bg-primary/10 text-primary")}> <List className="h-4 w-4" /> </ToggleGroupItem>
          <ToggleGroupItem value="ordered" onClick={(event) => { event.preventDefault(); toggleOrderedList(); }} className={cn("h-8 w-8 border border-transparent p-0", editor.isActive("orderedList") && "bg-primary/10 text-primary")}> <ListOrdered className="h-4 w-4" /> </ToggleGroupItem>
          <ToggleGroupItem value="task" onClick={(event) => { event.preventDefault(); toggleTaskList(); }} className={cn("h-8 w-8 border border-transparent p-0", editor.isActive("taskList") && "bg-primary/10 text-primary")}> <ListTodo className="h-4 w-4" /> </ToggleGroupItem>
        </ToggleGroup>
        <Separator orientation="vertical" className="h-4" />
        <FormattingButton
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 className="h-4 w-4" />}
          label="Heading 2"
          onClick={() => toggleHeading(2)}
        />
        <FormattingButton
          active={editor.isActive("heading", { level: 3 })}
          icon={<Heading3 className="h-4 w-4" />}
          label="Heading 3"
          onClick={() => toggleHeading(3)}
        />
        <FormattingButton
          active={editor.isActive("heading", { level: 4 })}
          icon={<Heading4 className="h-4 w-4" />}
          label="Heading 4"
          onClick={() => toggleHeading(4)}
        />
        <Separator orientation="vertical" className="h-4" />
        <FormattingButton
          active={editor.isActive("highlight")}
          icon={<Highlighter className="h-4 w-4" />}
          label="Highlight"
          onClick={toggleHighlight}
        />
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", editor.getAttributes("textStyle").color && "bg-primary/10 text-primary")}
                onClick={() => colorInputRef.current?.click()}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Text color</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <input
          ref={colorInputRef}
          type="color"
          className="hidden"
          onChange={handleColorChange}
        />
        <FormattingButton active={editor.isActive("link")} icon={<Link2 className="h-4 w-4" />} label="Link" onClick={handleLink} />
        <FormattingButton active={editor.isActive("blockquote") || editor.isActive("callout")} icon={<Quote className="h-4 w-4" />} label="Quote" onClick={toggleBlockquote} />
        <FormattingButton active={false} icon={<Minus className="h-4 w-4" />} label="Divider" onClick={insertHorizontalRule} />
        <FormattingButton active={editor.isActive("table")} icon={<Table2 className="h-4 w-4" />} label="Table" onClick={insertTable} />
        <FormattingButton
          active={editor.isActive("image")}
          icon={<ImageIcon className="h-4 w-4" />}
          label="Insert image"
          onClick={handleInsertImageFromUrl}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => insertCallout("info")}>
              <Info className="mr-2 h-4 w-4" /> Info callout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertCallout("warn")}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Warning callout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertCallout("danger")}>
              <Flame className="mr-2 h-4 w-4" /> Danger callout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
              <Braces className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => insertVariable("Assignee")}>Insert {"{{Assignee}}"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertVariable("DueDate")}>Insert {"{{DueDate}}"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertVariable("ProjectName")}>Insert {"{{ProjectName}}"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }, [
    editor,
    readOnly,
    hasFocus,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleInlineCode,
    toggleHighlight,
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
    toggleHeading,
    handleColorChange,
    handleLink,
    toggleBlockquote,
    insertHorizontalRule,
    insertTable,
    handleInsertImageFromUrl,
    insertCallout,
    insertVariable,
  ]);

  const isEmpty = !editor?.getText().trim();

  return (
    <div className={cn("space-y-2", className)}>
      {toolbar}
      <div
        className={cn(
          "rounded-md border border-border bg-background p-3 transition-colors",
          hasFocus && "border-primary/70",
          readOnly && "bg-muted/20"
        )}
      >
        {isLoadingDraft ? (
          <div className="text-sm text-muted-foreground">Restoring draft…</div>
        ) : (
          <EditorContent editor={editor} className="rich-text-editor" />
        )}
      </div>
      {(showCharacterCount || maxLength) && (
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          {maxLength ? `${characterCount}/${maxLength} characters` : `${characterCount} characters`}
        </div>
      )}
      {draft && !readOnly && (
        <div className="text-xs text-muted-foreground">
          {draft.classification === "no-offline"
            ? "Offline drafts disabled for this field"
            : isEmpty
              ? "Start typing to save a draft"
              : "Draft saved locally and will sync when you're back online"}
        </div>
      )}
      <ConflictResolver
        open={conflictOpen && Boolean(conflict)}
        onClose={() => setConflictOpen(false)}
        conflict={conflict}
        onResolve={resolveConflict}
      />
    </div>
  );
}

type FormattingButtonProps = {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function FormattingButton({ active, icon, label, onClick }: FormattingButtonProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8", active && "bg-primary/10 text-primary")}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
