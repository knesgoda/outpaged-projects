import { useMemo } from "react";
import type { Extension } from "@tiptap/core";
import type { MentionExtensionOptions } from "@/components/rich-text/extensions/mention";
import { createMentionExtension } from "@/components/rich-text/extensions/mention";
import type { CrossReferenceExtensionOptions } from "@/components/rich-text/extensions/xref";
import { createCrossReferenceExtension } from "@/components/rich-text/extensions/xref";
import type { LabelChipOptions } from "@/components/rich-text/extensions/label";
import { createLabelChipExtension } from "@/components/rich-text/extensions/label";
import type { DateChipOptions } from "@/components/rich-text/extensions/date-chip";
import { createDateChipExtension } from "@/components/rich-text/extensions/date-chip";

export interface RichTextChipConfig {
  mentions?: MentionExtensionOptions;
  crossReferences?: CrossReferenceExtensionOptions;
  labels?: LabelChipOptions;
  dates?: DateChipOptions;
}

export function useRichTextChips(config: RichTextChipConfig | null | undefined): Extension[] {
  return useMemo(() => {
    if (!config) return [];
    const extensions: Extension[] = [];
    if (config.mentions) {
      extensions.push(createMentionExtension(config.mentions));
    }
    if (config.crossReferences) {
      extensions.push(createCrossReferenceExtension(config.crossReferences));
    }
    if (config.labels) {
      extensions.push(createLabelChipExtension(config.labels));
    }
    if (config.dates) {
      extensions.push(createDateChipExtension(config.dates));
    }
    return extensions;
  }, [config]);
}
