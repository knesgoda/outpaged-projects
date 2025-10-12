// @ts-nocheck
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SearchEntityType =
  | "task"
  | "item"
  | "subitem"
  | "epic"
  | "doc"
  | "doc_version"
  | "wiki"
  | "file"
  | "file_version"
  | "comment"
  | "board"
  | "view"
  | "project"
  | "report"
  | "dashboard"
  | "automation"
  | "calendar"
  | "integration"
  | "audit_log"
  | "admin_object"
  | "user"
  | "team";

export interface SearchIngestionChange {
  entityType: SearchEntityType;
  entityId: string;
  workspaceId: string;
  op: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown> | null;
  previous: Record<string, unknown> | null;
  retryCount?: number;
}

export interface PermissionFootprint {
  allow: string[];
  deny?: string[];
  maskedFields?: Record<string, string>;
  existsSignal: boolean;
}

export interface SearchIndexRecord {
  documentId: string;
  entityType: SearchEntityType;
  entityId: string;
  workspaceId: string;
  version: number;
  tokens: string[];
  vectorEmbedding: number[];
  columnar: Record<string, unknown>;
  inverted: string;
  metadata: Record<string, unknown>;
  relations: string[];
  permissions: PermissionFootprint;
  locales: string[];
  synonyms: string[];
  stems: string[];
  dictionaries: string[];
  indexedAt: string;
}

export interface TokenizationOptions {
  localePriority: string[];
  synonyms: Record<string, string[]>;
  stemmer?: (token: string, locale: string) => string;
  dictionaries: Record<string, string[]>;
}

const DEFAULT_LANGUAGES: string[] = ["en", "es", "fr", "de", "pt", "ja", "ko", "zh"];

const FALLBACK_STEMMER = (token: string) => {
  if (token.length <= 4) return token;
  return token
    .replace(/[.,!?;:]/g, "")
    .replace(/(ing|ed|ies|s)$/u, "")
    .toLowerCase();
};

class MultiLingualTokenizer {
  private cachedSegmenters = new Map<string, Intl.Segmenter>();
  private options: TokenizationOptions;

  constructor(options: TokenizationOptions) {
    this.options = options;
  }

  updateOptions(next: Partial<TokenizationOptions>) {
    this.options = {
      ...this.options,
      ...next,
      synonyms: next.synonyms ?? this.options.synonyms,
      dictionaries: next.dictionaries ?? this.options.dictionaries,
      localePriority: next.localePriority ?? this.options.localePriority,
    };
  }

  tokenize(text: string | null | undefined, locales?: string[]): {
    tokens: string[];
    stems: string[];
    synonyms: string[];
    dictionaries: string[];
  } {
    if (!text) {
      return { tokens: [], stems: [], synonyms: [], dictionaries: [] };
    }

    const targetLocales = locales?.length ? locales : this.options.localePriority;
    const normalized = text.normalize("NFKC");
    const seenTokens = new Set<string>();
    const tokens: string[] = [];
    const stems: string[] = [];
    const synonyms: string[] = [];
    const dictionaries: string[] = [];

    for (const locale of targetLocales) {
      const segmenter = this.getSegmenter(locale);
      for (const { segment, isWordLike } of segmenter.segment(normalized)) {
        if (!isWordLike) continue;
        const token = segment.toLowerCase();
        if (seenTokens.has(token)) continue;
        seenTokens.add(token);
        tokens.push(token);

        const stem = this.options.stemmer?.(token, locale) ?? FALLBACK_STEMMER(token);
        stems.push(stem);

        const localeSynonyms = this.options.synonyms[token] ?? [];
        synonyms.push(...localeSynonyms);

        const orgDictionary = this.options.dictionaries[locale] ?? [];
        if (orgDictionary.includes(token)) {
          dictionaries.push(token);
        }
      }
    }

    return { tokens, stems, synonyms, dictionaries };
  }

  private getSegmenter(locale: string) {
    if (!this.cachedSegmenters.has(locale)) {
      try {
        this.cachedSegmenters.set(locale, new Intl.Segmenter(locale, { granularity: "word" }));
      } catch (_error) {
        this.cachedSegmenters.set(locale, new Intl.Segmenter("en", { granularity: "word" }));
      }
    }
    return this.cachedSegmenters.get(locale)!;
  }
}

interface MetadataSource {
  load(change: SearchIngestionChange): Promise<Record<string, unknown>>;
  loadRelations(change: SearchIngestionChange): Promise<string[]>;
  loadBinaryMetadata?(change: SearchIngestionChange): Promise<Record<string, unknown>>;
}

class MetadataRegistry {
  private sources = new Map<SearchEntityType, MetadataSource>();

  register(type: SearchEntityType, source: MetadataSource) {
    this.sources.set(type, source);
  }

  get(type: SearchEntityType) {
    const source = this.sources.get(type);
    if (!source) {
      throw new Error(`No metadata source registered for ${type}`);
    }
    return source;
  }
}

class PermissionEngine {
  async resolve(change: SearchIngestionChange): Promise<PermissionFootprint> {
    const record = change.record ?? change.previous ?? {};
    const allow = new Set<string>();
    const deny = new Set<string>();
    const maskedFields: Record<string, string> = {};

    const teamIds = ([] as string[]).concat((record.team_ids as string[] | undefined) ?? []);
    const ownerId = record.owner_id as string | undefined;
    const workspaceId = change.workspaceId;

    if (workspaceId) {
      allow.add(`workspace:${workspaceId}`);
    }

    if (ownerId) {
      allow.add(`user:${ownerId}`);
    }

    for (const teamId of teamIds) {
      allow.add(`team:${teamId}`);
    }

    if (record.visibility === "private") {
      deny.add("workspace:all");
    }

    if (record.private_fields && typeof record.private_fields === "object") {
      Object.entries(record.private_fields as Record<string, unknown>).forEach(([field]) => {
        maskedFields[field] = "**redacted**";
      });
    }

    return {
      allow: Array.from(allow),
      deny: deny.size ? Array.from(deny) : undefined,
      maskedFields: Object.keys(maskedFields).length ? maskedFields : undefined,
      existsSignal: change.op !== "DELETE",
    };
  }
}

const VECTOR_DIMENSION = 1536;

const createZeroVector = () => new Array<number>(VECTOR_DIMENSION).fill(0);

const computeEmbedding = async (_input: string): Promise<number[]> => {
  // Placeholder for actual embedding service (OpenAI, Cohere, etc.)
  // The ingestion service keeps the contract so the hybrid index is always populated.
  return createZeroVector();
};

export interface SearchIndexerOptions {
  client?: SupabaseClient;
  pollIntervalMs?: number;
  batchSize?: number;
  tokenizer?: MultiLingualTokenizer;
}

export class SearchIndexer extends EventEmitter {
  private client: SupabaseClient;
  private pollIntervalMs: number;
  private batchSize: number;
  private poller?: NodeJS.Timeout;
  private running = false;
  private readonly tokenizer: MultiLingualTokenizer;
  private readonly metadata = new MetadataRegistry();
  private readonly permissions = new PermissionEngine();

  constructor(options: SearchIndexerOptions = {}) {
    super();
    this.client = options.client ?? supabase;
    this.pollIntervalMs = options.pollIntervalMs ?? 1500;
    this.batchSize = options.batchSize ?? 25;
    this.tokenizer =
      options.tokenizer ??
      new MultiLingualTokenizer({
        localePriority: DEFAULT_LANGUAGES,
        synonyms: {},
        dictionaries: {},
        stemmer: FALLBACK_STEMMER,
      });

    this.bootstrapMetadataSources();
  }

  private bootstrapMetadataSources() {
    const client = this.client;

    const fetchRow = async (change: SearchIngestionChange, entity: SearchEntityType) => {
      return client
        .from(entityMapping(entity).table)
        .select("*")
        .eq("id", change.entityId)
        .maybeSingle();
    };

    const fetchRelations = async (change: SearchIngestionChange) => {
      const mapping = entityMapping(change.entityType);
      if (!mapping.relationQuery) return [];
      const { data } = await client.rpc(mapping.relationQuery, {
        entity_id: change.entityId,
      });
      if (!Array.isArray(data)) return [];
      return data.map((row: { relation: string }) => row.relation).filter(Boolean);
    };

    const fetchBinaryMetadata = async (change: SearchIngestionChange) => {
      const mapping = entityMapping(change.entityType);
      if (!mapping.binaryMetadataQuery) return {};
      const { data } = await client.rpc(mapping.binaryMetadataQuery, {
        entity_id: change.entityId,
      });
      if (!data) return {};
      return data as Record<string, unknown>;
    };

    const recordLoader: MetadataSource = {
      async load(change) {
        if (change.record) {
          return change.record;
        }
        if (change.previous) {
          return change.previous;
        }
        const { data } = await fetchRow(change, change.entityType);
        return data ?? {};
      },
      async loadRelations(change) {
        return fetchRelations(change);
      },
      async loadBinaryMetadata(change) {
        return fetchBinaryMetadata(change);
      },
    };

    const entityMapping = (entity: SearchEntityType) => {
      const base = {
        table: `${entity}s`,
      };
      switch (entity) {
        case "task":
          return {
            ...base,
            table: "tasks",
            relationQuery: "search_relations_for_task",
          };
        case "item":
          return {
            ...base,
            table: "items",
            relationQuery: "search_relations_for_item",
          };
        case "subitem":
          return {
            ...base,
            table: "subitems",
            relationQuery: "search_relations_for_subitem",
          };
        case "epic":
          return { ...base, table: "epics" };
        case "doc":
          return {
            ...base,
            table: "doc_pages",
            relationQuery: "search_relations_for_doc",
            binaryMetadataQuery: "search_binary_metadata_for_doc",
          };
        case "doc_version":
          return {
            ...base,
            table: "doc_versions",
            binaryMetadataQuery: "search_binary_metadata_for_doc_version",
          };
        case "wiki":
          return { ...base, table: "wiki_pages" };
        case "file":
          return {
            ...base,
            table: "project_files",
            binaryMetadataQuery: "search_binary_metadata_for_file",
          };
        case "file_version":
          return {
            ...base,
            table: "file_versions",
            binaryMetadataQuery: "search_binary_metadata_for_file_version",
          };
        case "comment":
          return {
            ...base,
            table: "comments",
            relationQuery: "search_relations_for_comment",
          };
        case "board":
          return { ...base, table: "boards" };
        case "view":
          return { ...base, table: "views" };
        case "project":
          return {
            ...base,
            table: "projects",
            relationQuery: "search_relations_for_project",
          };
        case "report":
          return { ...base, table: "reports" };
        case "dashboard":
          return { ...base, table: "dashboards" };
        case "automation":
          return { ...base, table: "automations" };
        case "calendar":
          return { ...base, table: "calendars" };
        case "integration":
          return { ...base, table: "integrations" };
        case "audit_log":
          return { ...base, table: "audit_logs" };
        case "admin_object":
          return { ...base, table: "admin_objects" };
        case "user":
          return { ...base, table: "profiles" };
        case "team":
          return {
            ...base,
            table: "teams",
            relationQuery: "search_relations_for_team",
          };
        default:
          return base;
      }
    };

    const metadataProxy: MetadataSource = {
      async load(change) {
        return recordLoader.load(change);
      },
      async loadRelations(change) {
        return recordLoader.loadRelations(change);
      },
      async loadBinaryMetadata(change) {
        return recordLoader.loadBinaryMetadata?.(change) ?? {};
      },
    };

    const targetedSources: SearchEntityType[] = [
      "task",
      "item",
      "subitem",
      "epic",
      "doc",
      "doc_version",
      "wiki",
      "file",
      "file_version",
      "comment",
      "board",
      "view",
      "project",
      "report",
      "dashboard",
      "automation",
      "calendar",
      "integration",
      "audit_log",
      "admin_object",
      "user",
      "team",
    ];

    targetedSources.forEach((type) => {
      this.metadata.register(type, metadataProxy);
    });
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.emit("started");
    await this.drainPending();
    this.scheduleNextPoll();
  }

  async stop() {
    this.running = false;
    if (this.poller) {
      clearTimeout(this.poller);
    }
    this.emit("stopped");
  }

  updateDictionaries(payload: Partial<TokenizationOptions>) {
    this.tokenizer.updateOptions(payload);
  }

  private scheduleNextPoll() {
    if (!this.running) return;
    this.poller = setTimeout(() => {
      this.drainPending().finally(() => this.scheduleNextPoll());
    }, this.pollIntervalMs);
  }

  private async drainPending() {
    const { data, error } = await this.client
      .from("search_index_queue")
      .select()
      .lte("next_attempt_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("next_attempt_at", { ascending: true })
      .limit(this.batchSize);

    if (error) {
      this.emit("error", error);
      return;
    }

    if (!data?.length) return;

    for (const job of data) {
      await this.processQueueRow(job).catch(async (processingError) => {
        await this.failJob(job, processingError);
      });
    }
  }

  private async processQueueRow(job: Record<string, any>) {
    const lockResult = await this.client
      .from("search_index_queue")
      .update({
        locked_at: new Date().toISOString(),
        locked_by: "search-indexer",
      })
      .eq("queue_id", job.queue_id)
      .eq("locked_at", job.locked_at)
      .select()
      .maybeSingle();

    if (lockResult.error) {
      this.emit("error", lockResult.error);
      return;
    }

    if (!lockResult.data) {
      // Another worker grabbed it.
      return;
    }

    const change: SearchIngestionChange = {
      entityType: job.entity_type,
      entityId: job.entity_id,
      workspaceId: job.workspace_id,
      op: job.op,
      record: job.record as Record<string, unknown> | null,
      previous: job.previous as Record<string, unknown> | null,
      retryCount: job.attempts,
    };

    const record = await this.buildIndexRecord(change);
    await this.persistRecord(record);
    await this.completeJob(job.queue_id);
  }

  private async buildIndexRecord(change: SearchIngestionChange): Promise<SearchIndexRecord> {
    const metadataSource = this.metadata.get(change.entityType);
    const baseRecord = await metadataSource.load(change);
    const relations = await metadataSource.loadRelations(change);
    const binaryMetadata = (await metadataSource.loadBinaryMetadata?.(change)) ?? {};
    const permissions = await this.permissions.resolve(change);

    const searchableStrings: string[] = [];
    const textFields = ["title", "name", "description", "content", "summary", "body"];

    textFields.forEach((field) => {
      const value = baseRecord[field];
      if (typeof value === "string") {
        searchableStrings.push(value);
      }
    });

    if (binaryMetadata.ocr_text && typeof binaryMetadata.ocr_text === "string") {
      searchableStrings.push(binaryMetadata.ocr_text);
    }

    const combinedText = searchableStrings.join("\n");
    const locales = this.resolveLocales(baseRecord, change);
    const { tokens, stems, synonyms, dictionaries } = this.tokenizer.tokenize(combinedText, locales);

    const vectorEmbedding = await computeEmbedding(combinedText);

    const record: SearchIndexRecord = {
      documentId: randomUUID(),
      entityType: change.entityType,
      entityId: change.entityId,
      workspaceId: change.workspaceId,
      version: (baseRecord.version as number | undefined) ?? Date.now(),
      tokens,
      stems,
      synonyms,
      dictionaries,
      vectorEmbedding,
      columnar: {
        ...baseRecord,
        ...binaryMetadata,
      },
      inverted: combinedText,
      metadata: {
        locales,
        updated_at: baseRecord.updated_at ?? new Date().toISOString(),
        created_at: baseRecord.created_at ?? null,
        permissions,
        breadcrumbs: baseRecord.breadcrumbs ?? relations,
        hierarchy: this.buildHierarchy(baseRecord, relations),
        binaryMetadata,
      },
      relations,
      permissions,
      locales,
      indexedAt: new Date().toISOString(),
    };

    return record;
  }

  private resolveLocales(baseRecord: Record<string, unknown>, change: SearchIngestionChange) {
    const explicit = baseRecord.locale as string | undefined;
    const workspaceDefault = baseRecord.workspace_locale as string | undefined;
    const locales = [explicit, workspaceDefault].filter(Boolean) as string[];
    if (!locales.length) {
      locales.push(...DEFAULT_LANGUAGES);
    }
    return Array.from(new Set(locales));
  }

  private buildHierarchy(baseRecord: Record<string, unknown>, relations: string[]) {
    const breadcrumbs = (baseRecord.breadcrumbs as string[] | undefined) ?? relations;
    return breadcrumbs.map((breadcrumb, index) => ({
      depth: index,
      path: breadcrumb,
    }));
  }

  private async persistRecord(record: SearchIndexRecord) {
    const { error } = await this.client.rpc("search_upsert_index_record", {
      p_document_id: record.documentId,
      p_entity_type: record.entityType,
      p_entity_id: record.entityId,
      p_workspace_id: record.workspaceId,
      p_version: record.version,
      p_tokens: record.tokens,
      p_stems: record.stems,
      p_synonyms: record.synonyms,
      p_dictionaries: record.dictionaries,
      p_vector: record.vectorEmbedding,
      p_columnar: record.columnar,
      p_inverted: record.inverted,
      p_metadata: record.metadata,
      p_relations: record.relations,
      p_permissions: record.permissions,
      p_locales: record.locales,
      p_indexed_at: record.indexedAt,
    });

    if (error) {
      throw error;
    }
  }

  private async completeJob(queueId: number) {
    await this.client
      .from("search_index_queue")
      .delete()
      .eq("queue_id", queueId);
  }

  private async failJob(job: Record<string, any>, error: unknown) {
    const attempts = (job.attempts ?? 0) + 1;
    const retryBackoff = Math.min(60, Math.pow(2, attempts));
    const nextAttempt = new Date(Date.now() + retryBackoff * 1000);

    const { error: updateError } = await this.client
      .from("search_index_queue")
      .update({
        attempts,
        locked_at: null,
        locked_by: null,
        next_attempt_at: nextAttempt.toISOString(),
      })
      .eq("queue_id", job.queue_id);

    if (updateError) {
      this.emit("error", updateError);
    }

    if (attempts >= (job.max_attempts ?? 5)) {
      await this.client.from("search_dead_letters").insert({
        queue_id: job.queue_id,
        entity_type: job.entity_type,
        entity_id: job.entity_id,
        payload: job,
        error: error instanceof Error ? error.message : String(error),
        failed_at: new Date().toISOString(),
      });
      await this.client.from("search_index_queue").delete().eq("queue_id", job.queue_id);
    }
  }

  subscribeToRealtime() {
    return this.client
      .channel("search-ingestion")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "search_index_queue" },
        () => this.drainPending()
      )
      .subscribe();
  }
}

