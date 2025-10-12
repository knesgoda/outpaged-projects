// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapSupabaseError } from "@/services/errors";
import type { BoardFilterDefinition } from "@/features/boards/filters/types";

const TABLE = "board_filter_expressions" satisfies keyof Database["public"]["Tables"];

type Row = Database["public"]["Tables"][typeof TABLE]["Row"];
type Insert = Database["public"]["Tables"][typeof TABLE]["Insert"];

interface PersistedBoardFilterDefinition extends BoardFilterDefinition {
  version: number;
}

const CURRENT_VERSION = 1;

function buildPayload(
  boardId: string,
  viewId: string,
  definition: BoardFilterDefinition
): Insert {
  return {
    board_id: boardId,
    view_id: viewId,
    expression: {
      version: CURRENT_VERSION,
      definition,
    } as Row["expression"],
    metadata: {},
    type: "query",
  } satisfies Insert;
}

export async function saveBoardFilters(
  boardId: string,
  viewId: string,
  definition: BoardFilterDefinition
): Promise<void> {
  const payload = buildPayload(boardId, viewId, definition);
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "board_id,view_id" });

  if (error) {
    throw mapSupabaseError(error, "Unable to persist board filters.");
  }
}

function parseDefinition(expression: Row["expression"] | null): BoardFilterDefinition | null {
  if (!expression) return null;

  const payload = expression as unknown;
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if ("definition" in (payload as any)) {
    const definition = (payload as any).definition;
    if (definition && typeof definition === "object" && "root" in definition) {
      return definition as BoardFilterDefinition;
    }
  }

  if ("root" in (payload as any)) {
    return payload as BoardFilterDefinition;
  }

  return null;
}

export async function loadBoardFilters(boardId: string, viewId: string): Promise<BoardFilterDefinition | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("expression")
    .eq("board_id", boardId)
    .eq("view_id", viewId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw mapSupabaseError(error, "Unable to load board filters.");
  }

  if (!data) {
    return null;
  }

  return parseDefinition(data.expression ?? null);
}
