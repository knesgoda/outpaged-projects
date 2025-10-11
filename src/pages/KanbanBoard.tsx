import { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalAuth } from "@/hooks/useOptionalAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { enqueueAutomationEvent } from "@/services/automations";
import { queueAutomationForTaskMovement } from "@/pages/kanban/automationEvents";
import { tasksWithDetails } from "@/services/tasksService";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedKanbanColumn, Column } from "@/components/kanban/EnhancedKanbanColumn";
import { TaskCard, Task } from "@/components/kanban/TaskCard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { BulkOperations } from "@/components/kanban/BulkOperations";
import { TaskTemplates } from "@/components/kanban/TaskTemplates";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";
import { BoardFilterPanel } from "@/features/boards/filters/BoardFilterPanel";
import {
  DEFAULT_FILTER_DEFINITION,
  type BoardFilterDefinition,
} from "@/features/boards/filters/types";
import { cloneDefinition } from "@/features/boards/filters/BoardFilterBuilder";
import { matchesBoardFilter } from "@/features/boards/filters/evaluate";
import { saveBoardFilters, loadBoardFilters } from "@/services/boards/filterService";
import { BoardSettings } from "@/components/kanban/BoardSettings";
import { StatsPanel } from "@/components/kanban/StatsPanel";
import { Plus, ArrowLeft, Settings, Layers, BarChart3, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterChip } from "@/components/outpaged/FilterChip";
import { StatusChip } from "@/components/outpaged/StatusChip";
import { enableOutpagedBrand } from "@/lib/featureFlags";
import { normalizeColumnMetadata, type KanbanColumnType } from "@/types/boardColumns";
import {
  evaluateWipGuard,
  evaluateDefinitionChecklists,
  isDefinitionOfReadyMet,
  isDefinitionOfDoneMet,
  evaluateDependencyPolicy,
  type ChecklistItemEvaluation,
} from "@/features/boards/guards";
import { WipOverrideDialog } from "@/components/kanban/WipOverrideDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DESIGN_FILTERS = [
  { label: "All work", count: 18 },
  { label: "Design", count: 9 },
  { label: "Research", count: 4 },
  { label: "Marketing", count: 3 },
];

const DESIGN_COLUMNS = [
  {
    title: "To Do",
    cards: [
      {
        title: "Logo concepts",
        description: "Explore updated brand mark",
        tags: ["Brand"],
        thumbnail: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent)) 60%, hsl(var(--chip-neutral)) 100%)",
      },
      {
        title: "Wireframing",
        description: "Dashboard empty states",
        tags: ["UX"],
        thumbnail: "linear-gradient(135deg, hsl(var(--chip-accent)) 0%, hsl(var(--accent)) 70%, hsl(var(--chip-neutral)) 100%)",
      },
    ],
  },
  {
    title: "In Progress",
    wip: "WIP (3)",
    cards: [
      {
        title: "UX research recap",
        description: "Synthesis for sprint",
        tags: ["Research"],
        thumbnail: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--chip-accent)) 55%, hsl(var(--chip-neutral)) 100%)",
      },
      {
        title: "New landing page",
        description: "Hero module concept",
        tags: ["Marketing"],
        thumbnail: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--chip-accent)) 60%, hsl(var(--chip-neutral)) 100%)",
      },
    ],
  },
  {
    title: "In Review",
    cards: [
      {
        title: "Library UI polish",
        description: "Component audit",
        tags: ["Design"],
        thumbnail: "linear-gradient(135deg, hsl(var(--chip-neutral)) 0%, hsl(var(--chip-accent)) 60%, hsl(var(--accent)) 100%)",
      },
      {
        title: "Icons refresh",
        description: "Duotone icon set",
        tags: ["System"],
        thumbnail: "linear-gradient(135deg, hsl(var(--chip-accent)) 0%, hsl(var(--primary)) 60%, hsl(var(--chip-neutral)) 100%)",
      },
    ],
  },
  {
    title: "Completed",
    cards: [
      {
        title: "Design system docs",
        description: "Tokens v2",
        tags: ["Docs"],
        thumbnail: "linear-gradient(135deg, hsl(var(--chip-neutral)) 0%, hsl(var(--chip-accent)) 55%, hsl(var(--chip-neutral)) 100%)",
      },
      {
        title: "Design redux",
        description: "Archive patterns",
        tags: ["Ops"],
        thumbnail: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--chip-neutral)) 70%, hsl(var(--chip-neutral)) 100%)",
      },
    ],
  },
];

const SOFTWARE_COLUMNS = [
  {
    title: "Backlog",
    cards: [
      { title: "User authentication", status: { label: "Story", variant: "neutral" as const } },
      { title: "Database migrations", status: { label: "Tech", variant: "neutral" as const } },
    ],
  },
  {
    title: "Ready",
    cards: [{ title: "Image cropping", status: { label: "Ready", variant: "accent" as const } }],
  },
  {
    title: "In Progress",
    wip: "WIP (2)",
    cards: [
      { title: "Landing page mockups", status: { label: "High", variant: "warning" as const } },
      { title: "Mobile responsiveness", status: { label: "In Review", variant: "accent" as const } },
    ],
  },
  {
    title: "In Review",
    cards: [{ title: "Library UI polish", status: { label: "Review", variant: "accent" as const } }],
  },
  {
    title: "QA",
    cards: [{ title: "Search functionality", status: { label: "QA", variant: "info" as const } }],
  },
  {
    title: "Done",
    cards: [{ title: "Bug fixes", status: { label: "Done", variant: "success" as const } }],
  },
];

function OutpagedKanbanBoard() {
  const [activeFilter, setActiveFilter] = useState<string>(DESIGN_FILTERS[0].label);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
            Boards
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Design Board</h1>
        </div>
        <Button className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow-soft hover:bg-accent/90">
          New card
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {DESIGN_FILTERS.map((filter) => (
          <FilterChip
            key={filter.label}
            active={activeFilter === filter.label}
            count={filter.count}
            onClick={() => setActiveFilter(filter.label)}
          >
            {filter.label}
          </FilterChip>
        ))}
      </div>

      <Tabs defaultValue="design" className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-2 rounded-full bg-[hsl(var(--chip-neutral))]/40 p-1">
          <TabsTrigger
            value="design"
            className="rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-soft"
          >
            Design
          </TabsTrigger>
          <TabsTrigger
            value="software"
            className="rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-soft"
          >
            Software
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DESIGN_COLUMNS.map((column) => (
              <div key={column.title} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    {column.title}
                  </h2>
                  {column.wip && <StatusChip variant="accent">{column.wip}</StatusChip>}
                </div>
                <div className="space-y-3">
                  {column.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] p-4 shadow-soft"
                    >
                      <div className="mb-3 overflow-hidden rounded-2xl">
                        <div className="aspect-video" style={{ background: card.thumbnail }} />
                      </div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{card.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{card.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.tags.map((tag) => (
                          <StatusChip key={tag} variant="neutral">
                            {tag}
                          </StatusChip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="software">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {SOFTWARE_COLUMNS.map((column) => (
              <div key={column.title} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    {column.title}
                  </h2>
                  {column.wip && <StatusChip variant="accent">{column.wip}</StatusChip>}
                </div>
                <div className="space-y-3">
                  {column.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] p-4 shadow-soft"
                    >
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{card.title}</p>
                      {card.status && (
                        <div className="mt-3">
                          <StatusChip variant={card.status.variant}>{card.status.label}</StatusChip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color?: string;
  wip_limit?: number;
  is_default: boolean;
  project_id: string;
  column_type: KanbanColumnType;
  metadata: Record<string, unknown> | null;
}

interface Swimlane {
  id: string;
  name: string;
  position: number;
  color: string;
  is_default: boolean;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface PendingOverrideState {
  task: Task;
  targetColumnId: string;
  targetSwimlaneId: string | null;
  fromColumnId: string | null;
  newStatus: string;
  reason: "column" | "lane" | null;
  limit: number | null;
  requireReason: boolean;
}

interface ChecklistDialogState {
  type: "ready" | "done";
  items: ChecklistItemEvaluation[];
  task: Task;
  targetColumnName: string;
}

interface DependencyDialogState {
  task: Task;
  reason: string;
}

function LegacyKanbanBoard() {
  const { user } = useOptionalAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task | null;
    columnId?: string;
    swimlaneId?: string;
  }>({ isOpen: false });
  const [detailViewTask, setDetailViewTask] = useState<Task | null>(null);
  const [availableAssignees, setAvailableAssignees] = useState<Array<{ id: string; name: string; avatar?: string | null }>>([]);
  const [availableSprints, setAvailableSprints] = useState<Array<{ id: string; name: string }>>([]);
  const [availableLabels, setAvailableLabels] = useState<Array<{ id: string; label: string; color?: string | null }>>([]);
  const [showSwimlanes, setShowSwimlanes] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState<{ columnId: string; swimlaneId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'compact' | 'list'>('standard');
  const [pendingOverride, setPendingOverride] = useState<PendingOverrideState | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [checklistDialog, setChecklistDialog] = useState<ChecklistDialogState | null>(null);
  const [dependencyDialog, setDependencyDialog] = useState<DependencyDialogState | null>(null);

  const activeBoardId = currentProjectId ?? "legacy-board";
  const activeViewId = "kanban-default";
  
  const [filterDefinition, setFilterDefinition] = useState<BoardFilterDefinition>(
    cloneDefinition(DEFAULT_FILTER_DEFINITION)
  );
  const [filterLoaded, setFilterLoaded] = useState(false);

  // Real-time updates for tasks
  useRealtime({
    table: 'tasks',
    onInsert: (payload) => {
      toast({
        title: "New Task Created",
        description: `"${payload.new.title}" was added to the board`,
      });
      fetchTasks();
    },
    onUpdate: (payload) => {
      toast({
        title: "Task Updated", 
        description: `"${payload.new.title}" was modified`,
      });
      fetchTasks();
    },
    onDelete: (payload) => {
      toast({
        title: "Task Deleted",
        description: "A task was removed from the board",
        variant: "destructive",
      });
      fetchTasks();
    },
  });

  useEffect(() => {
    if (currentProjectId) {
      fetchTasks();
      fetchProjectMembers();
      fetchSwimlanes();
      fetchSprints();
    }
  }, [currentProjectId]);

  useEffect(() => {
    let mounted = true;
    async function loadFilters() {
      if (!activeBoardId || !activeViewId) return;
      try {
        const definition = await loadBoardFilters(activeBoardId, activeViewId);
        if (!mounted) return;
        if (definition) {
          setFilterDefinition(definition);
        }
        setFilterLoaded(true);
      } catch (error) {
        console.error("Failed to load board filters", error);
        setFilterLoaded(true);
      }
    }
    loadFilters();
    return () => {
      mounted = false;
    };
  }, [activeBoardId, activeViewId]);

  useEffect(() => {
    if (!filterLoaded) return;
    if (!activeBoardId || !activeViewId) return;

    async function persistFilters() {
      try {
        await saveBoardFilters(activeBoardId, activeViewId, filterDefinition);
      } catch (error) {
        console.error("Failed to save board filters", error);
      }
    }

    persistFilters();
  }, [filterDefinition, filterLoaded, activeBoardId, activeViewId]);

  const handleProjectSelect = (projectId: string, project: Project) => {
    setSelectedProject(project);
    setCurrentProjectId(projectId);
    setLoading(true);
  };

  const fetchProjectMembers = async () => {
    if (!currentProjectId) return;

    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!project_members_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', currentProjectId);

      if (error) throw error;

      const assignees = members?.map(member => ({
        id: member.user_id,
        name: (member as any).profiles?.full_name || 'Unknown User',
        avatar: (member as any).profiles?.avatar_url || null,
      })) || [];

      setAvailableAssignees(assignees);
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const fetchSwimlanes = async () => {
    if (!currentProjectId) return;

    try {
      const { data: swimlanesData, error } = await supabase
        .from('swimlanes')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('position');

      if (error) throw error;
      setSwimlanes(swimlanesData || []);
    } catch (error) {
      console.error('Error fetching swimlanes:', error);
    }
  };

  const fetchSprints = async () => {
    if (!currentProjectId) return;

    try {
      const { data: sprintData, error } = await supabase
        .from('sprints')
        .select('id, name')
        .eq('project_id', currentProjectId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setAvailableSprints(sprintData || []);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      if (!currentProjectId) {
        setColumns([]);
        setLoading(false);
        return;
      }

      // Fetch custom columns for the project
      const { data: kanbanColumns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('position');

      if (columnsError) throw columnsError;

      // If no custom columns exist, create default ones
      if (!kanbanColumns || kanbanColumns.length === 0) {
        await createDefaultColumns(currentProjectId);
        return fetchTasks(); // Retry after creating defaults
      }

      const detailedTasks = await tasksWithDetails(currentProjectId);
      const tasksForBoard = detailedTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        hierarchy_level: task.hierarchy_level,
        task_type: task.task_type,
        parent_id: task.parent_id,
        project_id: task.project_id,
        swimlane_id: task.swimlane_id,
        assignees: task.assignees,
        dueDate: task.due_date
          ? new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          : undefined,
        due_date: task.due_date,
        start_date: task.start_date,
        end_date: task.end_date,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        tags: task.tagNames,
        tagDetails: task.tags,
        comments: task.commentCount,
        comment_count: task.commentCount,
        attachments: task.attachmentCount,
        attachment_count: task.attachmentCount,
        files: task.files,
        links: task.links,
        relations: task.relations,
        subitems: task.subitems,
        rollup: task.rollup,
        project: task.project,
        ticket_number: task.ticket_number,
        projectName: task.project?.name,
        story_points: task.story_points,
        blocked: task.blocked || false,
        blocking_reason: task.blocking_reason,
        externalLinks: task.externalLinks,
      }));

      const labelMap = new Map<string, { id: string; label: string; color?: string | null }>();
      for (const task of tasksForBoard) {
        const tagDetails = task.tagDetails ?? [];
        for (const tag of tagDetails) {
          if (!labelMap.has(tag.id)) {
            labelMap.set(tag.id, {
              id: tag.id,
              label: tag.label,
              color: tag.color,
            });
          }
        }
      }
      setAvailableLabels(Array.from(labelMap.values()));

      // Get status mappings for all columns
      const { data: statusMappings } = await supabase
        .from('task_status_mappings')
        .select('*')
        .eq('project_id', currentProjectId);

      // Map tasks to columns based on status and custom column mappings
      const newColumns = kanbanColumns.map(col => {
        // Find the status mapping for this column
        const mapping = statusMappings?.find(m => m.column_id === col.id);

        const columnTasks = tasksForBoard.filter(task => {
          // Handle both custom status mappings and standard statuses
          if (mapping) {
            const targetStatus = mapping.status_value;
            // Create a comprehensive mapping for status matching
            const statusMappings = {
              'to_do': ['todo', 'to_do'],
              'todo': ['todo', 'to_do'],
              'in_progress': ['in_progress', 'doing'],
              'blocked': ['blocked'],
              'waiting': ['waiting'],
              'review': ['in_review', 'review', 'testing'],
              'in_review': ['in_review', 'review', 'testing'],
              'done': ['done', 'complete', 'completed']
            };
            
            const validStatuses = statusMappings[targetStatus] || [targetStatus];
            return validStatuses.includes(task.status);
          } else {
            // Fallback to standard status mapping if no custom mapping exists
            const standardMapping = {
              'to do': ['todo', 'to_do'],
              'todo': ['todo', 'to_do'],
              'in progress': ['in_progress', 'doing'],
              'blocked': ['blocked'],
              'waiting': ['waiting'],
              'review': ['in_review', 'review', 'testing'],
              'in review': ['in_review', 'review', 'testing'],
              'done': ['done', 'complete', 'completed']
            };
            const validStatuses = standardMapping[col.name.toLowerCase()] || [col.name.toLowerCase().replace(/ /g, '_')];
            return validStatuses.includes(task.status);
          }
        });

        const normalized = normalizeColumnMetadata(col.column_type, col.metadata ?? {});
        const metadata = {
          ...normalized,
          wip: {
            ...normalized.wip,
            columnLimit:
              normalized.wip.columnLimit ??
              (typeof col.wip_limit === "number" ? col.wip_limit : null),
          },
        };

        return {
          id: col.id,
          title: col.name,
          tasks: columnTasks,
          color: col.color || '#6b7280',
          limit: metadata.wip.columnLimit ?? undefined,
          metadata,
          columnType: col.column_type,
        };
      });

      setColumns(newColumns);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultColumns = async (projectId: string) => {
    const defaultColumns = [
      { name: 'To Do', position: 1, color: '#6b7280' },
      { name: 'In Progress', position: 2, color: '#3b82f6' },
      { name: 'Review', position: 3, color: '#f59e0b' },
      { name: 'Done', position: 4, color: '#10b981' }
    ];

    const { error } = await supabase
      .from('kanban_columns')
      .insert(
        defaultColumns.map(col => ({
          project_id: projectId,
          name: col.name,
          position: col.position,
          color: col.color,
          is_default: true,
          column_type: 'status',
          metadata: {}
        }))
      );

    if (error) {
      console.error('Error creating default columns:', error);
      throw error;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );

  const attemptTaskMove = async ({
    task,
    targetColumn,
    newStatus,
    targetSwimlaneId,
    fromColumn,
    bypassWip = false,
    overrideNote,
  }: {
    task: Task;
    targetColumn: Column;
    newStatus: string;
    targetSwimlaneId: string | null;
    fromColumn?: Column;
    bypassWip?: boolean;
    overrideNote?: string;
  }): Promise<boolean> => {
    if (!user) return false;

    if (task.blocked && newStatus !== 'todo' && newStatus !== 'blocked') {
      toast({
        title: "Task is blocked",
        description: `Cannot move blocked task to ${newStatus}. Please unblock the task first.`,
        variant: "destructive",
      });
      return false;
    }

    const targetState = columns.find(col => col.id === targetColumn.id);
    if (!targetState) return false;

    const laneId = targetSwimlaneId ?? task.swimlane_id ?? null;

    if (!bypassWip) {
      const totalInColumn = targetState.tasks.filter(t => t.id !== task.id).length + 1;
      const totalInLane = targetState.tasks
        .filter(t => (t.swimlane_id ?? null) === laneId && t.id !== task.id)
        .length + 1;

      const wipResult = evaluateWipGuard({
        metadata: targetState.metadata,
        totalInColumn,
        totalInLane,
        laneId,
      });

      if (wipResult.status === "blocked") {
        toast({
          title: "WIP limit reached",
          description:
            wipResult.reason === "lane"
              ? `Lane limit of ${wipResult.limit ?? 0} reached for ${targetColumn.title}.`
              : `Column limit of ${wipResult.limit ?? 0} reached for ${targetColumn.title}.`,
          variant: "destructive",
        });
        return false;
      }

      if (wipResult.status === "override") {
        setPendingOverride({
          task,
          targetColumnId: targetColumn.id,
          targetSwimlaneId: laneId,
          fromColumnId: fromColumn?.id ?? null,
          newStatus,
          reason: wipResult.reason,
          limit: wipResult.limit,
          requireReason: targetState.metadata?.blockerPolicies.requireReasonForOverride ?? false,
        });
        setOverrideReason("");

        if (currentProjectId) {
          try {
            await enqueueAutomationEvent({
              projectId: currentProjectId,
              type: "task.wip_override_requested",
              taskId: task.id,
              actorId: user.id,
              context: {
                targetColumnId: targetColumn.id,
                reason: wipResult.reason,
                limit: wipResult.limit,
              },
            });
          } catch (automationError) {
            console.warn("Failed to enqueue override request event", automationError);
          }
        }

        toast({
          title: "WIP limit exceeded",
          description: "An override is required before this move can complete.",
        });
        return false;
      }
    }

    const dependencyPolicy = evaluateDependencyPolicy(targetState.metadata, task);
    if (dependencyPolicy.blocked && newStatus !== 'blocked') {
      setDependencyDialog({ task, reason: dependencyPolicy.reason ?? "Resolve linked dependencies before progressing." });
      if (currentProjectId) {
        try {
          await enqueueAutomationEvent({
            projectId: currentProjectId,
            type: "task.dependency_wait",
            taskId: task.id,
            actorId: user.id,
            context: {
              targetColumnId: targetColumn.id,
              reason: dependencyPolicy.reason ?? undefined,
            },
          });
        } catch (automationError) {
          console.warn("Failed to enqueue dependency wait event", automationError);
        }
      }
      return false;
    }

    const checklistEvaluation = evaluateDefinitionChecklists(targetState.metadata, task);
    if (newStatus === 'in_progress' && !isDefinitionOfReadyMet(checklistEvaluation)) {
      setChecklistDialog({
        type: 'ready',
        items: checklistEvaluation.ready,
        task,
        targetColumnName: targetColumn.title,
      });
      if (currentProjectId) {
        try {
          await enqueueAutomationEvent({
            projectId: currentProjectId,
            type: "task.definition_ready_blocked",
            taskId: task.id,
            actorId: user.id,
            context: { targetColumnId: targetColumn.id },
          });
        } catch (automationError) {
          console.warn("Failed to enqueue Definition of Ready event", automationError);
        }
      }
      return false;
    }

    if (newStatus === 'done' && !isDefinitionOfDoneMet(checklistEvaluation)) {
      setChecklistDialog({
        type: 'done',
        items: checklistEvaluation.done,
        task,
        targetColumnName: targetColumn.title,
      });
      if (currentProjectId) {
        try {
          await enqueueAutomationEvent({
            projectId: currentProjectId,
            type: "task.definition_done_blocked",
            taskId: task.id,
            actorId: user.id,
            context: { targetColumnId: targetColumn.id },
          });
        } catch (automationError) {
          console.warn("Failed to enqueue Definition of Done event", automationError);
        }
      }
      return false;
    }

    const shouldMarkBlocked = newStatus === 'blocked' || dependencyPolicy.blocked;
    const nextBlockingReason = shouldMarkBlocked
      ? dependencyPolicy.reason ?? task.blocking_reason ?? 'Blocked pending dependency clearance.'
      : null;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus as any,
          swimlane_id: laneId,
          blocked: shouldMarkBlocked,
          blocking_reason: shouldMarkBlocked ? nextBlockingReason : null,
        })
        .eq('id', task.id);

      if (error) throw error;

      const updatedTask: Task = {
        ...task,
        status: newStatus,
        swimlane_id: laneId ?? undefined,
        blocked: shouldMarkBlocked,
        blocking_reason: shouldMarkBlocked ? nextBlockingReason ?? undefined : null,
      };

      setColumns((current) =>
        current.map((col) => {
          if (col.id === (fromColumn?.id ?? targetColumn.id)) {
            return {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== task.id),
            };
          }
          if (col.id === targetColumn.id) {
            const otherTasks = col.tasks.filter((t) => t.id !== task.id);
            return {
              ...col,
              tasks: [...otherTasks, updatedTask],
            };
          }
          return col;
        })
      );

      if (currentProjectId) {
        const context = {
          fromColumnId: fromColumn?.id ?? null,
          toColumnId: targetColumn.id,
          fromStatus: task.status,
          toStatus: newStatus,
          override: bypassWip,
        };

        try {
          await queueAutomationForTaskMovement({
            projectId: currentProjectId,
            taskId: task.id,
            userId: user.id,
            context,
          });

          await enqueueAutomationEvent({
            projectId: currentProjectId,
            type: "task.status_changed",
            taskId: task.id,
            actorId: user.id,
            context: {
              ...context,
              swimlaneId: laneId,
              overrideReason: overrideNote,
            },
          });
        } catch (automationError) {
          console.warn("Failed to enqueue automation event", automationError);
        }
      }

      toast({
        title: "Success",
        description: "Task moved successfully",
      });

      setPendingOverride(null);
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'column') {
      // Column drag started - don't set activeTask
      return;
    }
    
    const task = findTask(active.id as string);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering (admin only)
    if (activeData?.type === 'column' && overData?.type === 'column' && isAdmin) {
      const activeColumnId = activeData.column.id;
      const overColumnId = overData.column.id;
      
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex !== overColumnIndex) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
        setColumns(newColumns);
        
        // Update positions in database
        try {
          const updates = newColumns.map((col, index) => ({
            id: col.id,
            position: index + 1
          }));
          
          for (const update of updates) {
            await supabase
              .from('kanban_columns')
              .update({ position: update.position })
              .eq('id', update.id);
          }
          
          toast({
            title: "Success",
            description: "Column order updated successfully",
          });
        } catch (error) {
          console.error('Error updating column positions:', error);
          toast({
            title: "Error",
            description: "Failed to update column order",
            variant: "destructive",
          });
          // Revert the change
          await fetchTasks();
        }
      }
      return;
    }

    // Handle column reordering when dragging over another column (not having specific overData.type)
    if (activeData?.type === 'column' && !overData?.type && isAdmin) {
      const activeColumnId = activeData.column.id;
      const overColumnId = overId.replace('column-', '');
      
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex !== overColumnIndex && overColumnIndex !== -1) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
        setColumns(newColumns);
        
        // Update positions in database
        try {
          const updates = newColumns.map((col, index) => ({
            id: col.id,
            position: index + 1
          }));
          
          for (const update of updates) {
            await supabase
              .from('kanban_columns')
              .update({ position: update.position })
              .eq('id', update.id);
          }
          
          toast({
            title: "Success",
            description: "Column order updated successfully",
          });
        } catch (error) {
          console.error('Error updating column positions:', error);
          toast({
            title: "Error",
            description: "Failed to update column order",
            variant: "destructive",
          });
          // Revert the change
          await fetchTasks();
        }
      }
      return;
    }

    // Handle task movement between columns
    const activeTask = findTask(activeId);
    const { columnId: targetColumnId, swimlaneId: dropSwimlaneId } = parseDropTarget(over);
    const overColumn = findColumnById(targetColumnId);

    if (!activeTask || !user || !overColumn) return;

    const newStatus = await getStatusFromColumn(overColumn);
    const fromColumn = columns.find((col) => col.tasks.some((task) => task.id === activeId));
    const laneId = dropSwimlaneId ?? activeTask.swimlane_id ?? null;

    if (activeTask.status === newStatus && (laneId ?? null) === (activeTask.swimlane_id ?? null)) {
      return;
    }

    await attemptTaskMove({
      task: activeTask,
      targetColumn: overColumn,
      newStatus,
      targetSwimlaneId: laneId,
      fromColumn,
    });
  };

  const getTasksBySwimlane = (swimlaneId: string) => {
    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => task.swimlane_id === swimlaneId)
    }));
  };

  const getTasksWithoutSwimlane = () => {
    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => !task.swimlane_id)
    }));
  };

  const handleAddTask = (columnId: string, swimlaneId?: string) => {
    setTaskDialog({ isOpen: true, columnId, swimlaneId });
  };

  const handleEditTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
  };

  const handleViewTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setColumns((columns) =>
        columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        }))
      );

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleOverrideConfirm = async () => {
    if (!pendingOverride) return;
    const targetColumn = findColumnById(pendingOverride.targetColumnId);
    const fromColumn = findColumnById(pendingOverride.fromColumnId);

    if (!targetColumn) {
      toast({
        title: "Override failed",
        description: "The target column is no longer available.",
        variant: "destructive",
      });
      setPendingOverride(null);
      return;
    }

    const moved = await attemptTaskMove({
      task: pendingOverride.task,
      targetColumn,
      newStatus: pendingOverride.newStatus,
      targetSwimlaneId: pendingOverride.targetSwimlaneId,
      fromColumn,
      bypassWip: true,
      overrideNote: overrideReason || undefined,
    });
    if (moved) {
      setOverrideReason("");
    }
  };

  const handleOverrideCancel = () => {
    setPendingOverride(null);
    setOverrideReason("");
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!currentProjectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

    try {
      if (taskDialog.task) {
        // Update existing task
        // Handle assignees for existing tasks
        if (taskData.assignees) {
          // Remove all existing assignees
          await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskDialog.task.id);

          // Add new assignees
          if (taskData.assignees.length > 0) {
            const assigneeInserts = taskData.assignees.map(assignee => ({
              task_id: taskDialog.task.id,
              user_id: assignee.id,
              assigned_by: user?.id
            }));

            await supabase
              .from('task_assignees')
              .insert(assigneeInserts);
          }
        }

        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            hierarchy_level: (taskData as any).hierarchy_level,
            task_type: (taskData as any).task_type,
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
            status: (taskData as any).status,
            swimlane_id: taskDialog.swimlaneId || null,
            blocked: (taskData as any).blocked || false,
            blocking_reason: (taskData as any).blocking_reason || null,
          })
          .eq('id', taskDialog.task.id);

        if (error) throw error;

        if (currentProjectId && taskDialog.task) {
          const nextStatus = ((taskData as any).status ?? taskDialog.task.status) as string;
          const context = {
            fromStatus: taskDialog.task.status,
            toStatus: nextStatus,
            projectId: currentProjectId,
          };
          try {
            await enqueueAutomationEvent({
              projectId: currentProjectId,
              type: "task.updated",
              taskId: taskDialog.task.id,
              actorId: user?.id ?? undefined,
              context: {
                ...context,
                fields: Object.keys(taskData ?? {}),
              },
            });
            if (nextStatus !== taskDialog.task.status) {
              await enqueueAutomationEvent({
                projectId: currentProjectId,
                type: "task.status_changed",
                taskId: taskDialog.task.id,
                actorId: user?.id ?? undefined,
                context,
              });
            }
          } catch (automationError) {
            console.warn("Failed to enqueue automation event", automationError);
          }
        }

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const statusFromColumn = taskDialog.columnId ? await getStatusFromColumnId(taskDialog.columnId) : 'todo';
        
        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            title: taskData.title!,
            description: taskData.description,
            priority: taskData.priority!,
            hierarchy_level: (taskData as any).hierarchy_level || 'task',
            task_type: (taskData as any).task_type || 'feature_request',
            parent_id: (taskData as any).parent_id || null,
            status: statusFromColumn as "todo" | "in_progress" | "in_review" | "done",
            project_id: currentProjectId,
            reporter_id: user?.id,
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
            swimlane_id: taskDialog.swimlaneId || null,
            blocked: false,
            blocking_reason: null,
          })
          .select()
          .single();

        if (error) throw error;

        // Add assignees for new task
        if (taskData.assignees && taskData.assignees.length > 0 && newTask) {
          const assigneeInserts = taskData.assignees.map(assignee => ({
            task_id: newTask.id,
            user_id: assignee.id,
            assigned_by: user?.id
          }));

          const { error: assigneeError } = await supabase
            .from('task_assignees')
            .insert(assigneeInserts);

          if (assigneeError) {
            console.error('Error adding assignees:', assigneeError);
            toast({
              title: "Warning",
              description: "Task created but failed to add assignees",
              variant: "destructive",
            });
          }
        }

        if (currentProjectId && newTask) {
          try {
            await enqueueAutomationEvent({
              projectId: currentProjectId,
              type: "task.created",
              taskId: newTask.id,
              actorId: user?.id ?? undefined,
              context: {
                status: newTask.status,
                columnId: taskDialog.columnId ?? null,
              },
            });
          } catch (automationError) {
            console.warn("Failed to enqueue automation event", automationError);
          }
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      // Refresh tasks
      await fetchTasks();
      setTaskDialog({ isOpen: false });
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const getStatusFromColumnId = async (columnId: string): Promise<string> => {
    const column = columns.find(col => col.id === columnId);
    return column ? await getStatusFromColumn(column) : 'todo';
  };

  const getStatusFromColumn = async (column: Column): Promise<string> => {
    if (!currentProjectId) return 'todo';
    
    // Check if we have a status mapping for this column
    const { data: mapping } = await supabase
      .from('task_status_mappings')
      .select('status_value')
      .eq('project_id', currentProjectId)
      .eq('column_id', column.id)
      .maybeSingle();
    
    return mapping?.status_value || column.title.toLowerCase().replace(' ', '_');
  };

  const findTask = (id: string): Task | undefined => {
    for (const column of columns) {
      const task = column.tasks.find((task) => task.id === id);
      if (task) return task;
    }
  };

  const findColumnById = (id: string | null): Column | undefined => {
    if (!id) return undefined;
    return columns.find((col) => col.id === id);
  };

  const parseDropTarget = (
    over: DragEndEvent["over"]
  ): { columnId: string | null; swimlaneId: string | null } => {
    if (!over) return { columnId: null, swimlaneId: null };
    const data = over.data.current as { columnId?: string; swimlaneId?: string | null } | undefined;
    if (data?.columnId) {
      return { columnId: data.columnId, swimlaneId: data.swimlaneId ?? null };
    }

    const rawId = String(over.id ?? "");
    if (rawId.startsWith("legacy-")) {
      return { columnId: rawId.replace("legacy-", ""), swimlaneId: null };
    }

    if (rawId.includes("::")) {
      const [columnPart, lanePart] = rawId.split("::");
      return {
        columnId: columnPart ?? null,
        swimlaneId: lanePart
          ? lanePart === "__unassigned__"
            ? null
            : lanePart
          : null,
      };
    }

    return { columnId: rawId || null, swimlaneId: null };
  };

  const addNewColumn = async () => {
    if (!user || !currentProjectId) {
      toast({
        title: "Error",
        description: "You must be logged in to add columns",
        variant: "destructive",
      });
      return;
    }

    const newColumnName = prompt("Enter column name:");
    if (!newColumnName?.trim()) return;

    try {
      // Get the next position
      const maxPosition = Math.max(...columns.map(col => parseInt(col.id) || 0), 0);
      
      const { error } = await supabase
        .from('kanban_columns')
        .insert({
          project_id: currentProjectId,
          name: newColumnName.trim(),
          position: maxPosition + 1,
          color: '#6b7280',
          is_default: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column added successfully",
      });

      // Refresh the board
      await fetchTasks();
    } catch (error) {
      console.error('Error adding column:', error);
      toast({
        title: "Error", 
        description: "Failed to add column",
        variant: "destructive",
      });
    }
  };

  const filteredColumns = columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      const filterItem = {
        search: `${task.title ?? ""} ${task.description ?? ""}`,
        assignee: (task.assignees ?? []).map((assignee: any) => assignee.id ?? assignee),
        priority: task.priority,
        status: task.status,
        hierarchy: task.hierarchy_level,
        taskType: task.task_type,
        dueDate: task.due_date ?? task.dueDate ?? null,
        tag: task.tags ?? task.tagDetails ?? [],
        label: task.tagNames ?? task.tags ?? [],
      } as Record<string, unknown>;

      if (!filterLoaded) {
        return true;
      }

      return matchesBoardFilter(filterDefinition, filterItem, {
        currentUserId: user?.id ?? null,
      });
    }),
  }));

  const overrideColumn = pendingOverride
    ? findColumnById(pendingOverride.targetColumnId)
    : undefined;
  const dialogColumn = taskDialog.columnId
    ? findColumnById(taskDialog.columnId)
    : taskDialog.task
    ? columns.find((col) => col.tasks.some((task) => task.id === taskDialog.task?.id))
    : undefined;

  // Show project selector if no project is selected
  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <ProjectSelector
          selectedProjectId={currentProjectId || undefined}
          onProjectSelect={handleProjectSelect}
          onCreateProject={() => {
            // TODO: Implement project creation dialog
            toast({
              title: "Coming Soon",
              description: "Project creation from Kanban board will be available soon",
            });
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Title Header - Move to top */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProject(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-foreground">
            {selectedProject.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kanban Board - Drag and drop tasks to manage your workflow
          </p>
        </div>
      </div>

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'standard' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('standard')}
            >
              Standard
            </Button>
            <Button 
              variant={viewMode === 'compact' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('compact')}
            >
              Compact
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSwimlanes(!showSwimlanes)}
          >
            <Layers className="w-4 h-4 mr-2" />
            {showSwimlanes ? 'Hide' : 'Show'} Swimlanes
          </Button>
          <TaskTemplates projectId={currentProjectId!} onTaskCreated={fetchTasks} />
          <BoardSettings projectId={currentProjectId!} onUpdate={fetchTasks} />
          <StatsPanel tasks={filteredColumns.flatMap(col => col.tasks)}>
            <Button variant="outline" className="w-full sm:w-auto">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Statistics</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          </StatsPanel>
          <Button variant="outline" onClick={addNewColumn} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Column</span>
            <span className="sm:hidden">Column</span>
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto"
            onClick={() => setTaskDialog({ isOpen: true, columnId: columns[0]?.id })}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </div>
      </div>

      <BoardFilterPanel
        definition={filterDefinition}
        onChange={setFilterDefinition}
        boardId={activeBoardId}
        viewId={activeViewId}
        canManageSharing={Boolean(isAdmin)}
        onReset={() => setFilterDefinition(cloneDefinition(DEFAULT_FILTER_DEFINITION))}
      />

      {/* Bulk Operations */}
      <BulkOperations
        selectedTasks={selectedTasks}
        onSelectionChange={setSelectedTasks}
        tasks={filteredColumns.flatMap(col => col.tasks)}
        onOperationComplete={fetchTasks}
        availableAssignees={availableAssignees}
        availableColumns={columns}
        availableSwimlanes={swimlanes}
        availableSprints={availableSprints}
        availableLabels={availableLabels}
        availableWatchers={availableAssignees}
      />

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6 snap-x snap-mandatory">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {showSwimlanes && swimlanes.length > 0 ? (
            // Swimlanes view
            <div className="space-y-8">
              {swimlanes.map((swimlane) => (
                <div key={swimlane.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: swimlane.color }}
                    />
                    <h3 className="text-lg font-semibold">{swimlane.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {getTasksBySwimlane(swimlane.id).reduce((acc, col) => acc + col.tasks.length, 0)} tasks
                    </Badge>
                  </div>
                  <div className="flex gap-6 min-w-fit">
                    {getTasksBySwimlane(swimlane.id).map((column) => (
                      <EnhancedKanbanColumn
                        key={column.id}
                        column={column}
                        onAddTask={(columnId) => handleAddTask(columnId, swimlane.id)}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                        onViewTask={handleViewTask}
                        isDraggable={isAdmin}
                        viewMode={viewMode}
                        selectedTasks={selectedTasks}
                        onTaskSelectionChange={setSelectedTasks}
                        showQuickAdd={showQuickAdd}
                        onShowQuickAdd={setShowQuickAdd}
                        onQuickTaskCreated={fetchTasks}
                        swimlaneId={swimlane.id}
                        projectId={currentProjectId || ""}
                        availableAssignees={availableAssignees}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Tasks without swimlane */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <div className="w-4 h-4 rounded border-2 border-muted-foreground bg-muted" />
                  <h3 className="text-lg font-semibold">No Swimlane</h3>
                  <Badge variant="secondary" className="text-xs">
                    {getTasksWithoutSwimlane().reduce((acc, col) => acc + col.tasks.length, 0)} tasks
                  </Badge>
                </div>
                <div className="flex gap-6 min-w-fit">
                  {getTasksWithoutSwimlane().map((column) => (
                    <EnhancedKanbanColumn
                      key={column.id}
                      column={column}
                      onAddTask={handleAddTask}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onViewTask={handleViewTask}
                      isDraggable={isAdmin}
                      viewMode={viewMode}
                      selectedTasks={selectedTasks}
                      onTaskSelectionChange={setSelectedTasks}
                      showQuickAdd={showQuickAdd}
                      onShowQuickAdd={setShowQuickAdd}
                      onQuickTaskCreated={fetchTasks}
                      projectId={currentProjectId || ""}
                      availableAssignees={availableAssignees}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Standard view
            <SortableContext 
              items={columns.map(col => `column-${col.id}`)}
              strategy={horizontalListSortingStrategy}
              disabled={!isAdmin}
            >
              <div className="flex gap-6 min-w-fit">
                {filteredColumns.map((column) => (
                  <EnhancedKanbanColumn
                    key={column.id}
                    column={column}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onViewTask={handleViewTask}
                    isDraggable={isAdmin}
                    viewMode={viewMode}
                    selectedTasks={selectedTasks}
                    onTaskSelectionChange={setSelectedTasks}
                    showQuickAdd={showQuickAdd}
                    onShowQuickAdd={setShowQuickAdd}
                    onQuickTaskCreated={fetchTasks}
                    projectId={currentProjectId || ""}
                    availableAssignees={availableAssignees}
                  />
                ))}
              </div>
            </SortableContext>
          )}
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} compact={viewMode === 'compact'} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <WipOverrideDialog
        open={!!pendingOverride}
        pending={pendingOverride ? {
          task: pendingOverride.task,
          reason: pendingOverride.reason,
          limit: pendingOverride.limit,
          requireReason: pendingOverride.requireReason,
        } : null}
        columnName={overrideColumn?.title}
        reason={overrideReason}
        onReasonChange={(value) => setOverrideReason(value)}
        onConfirm={handleOverrideConfirm}
        onCancel={handleOverrideCancel}
      />

      <AlertDialog open={!!checklistDialog} onOpenChange={(open) => !open && setChecklistDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {checklistDialog?.type === 'ready'
                ? 'Definition of Ready requirements not met'
                : 'Definition of Done requirements not met'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Complete the checklist items before moving "{checklistDialog?.task.title}" into
              {' '}
              {checklistDialog?.targetColumnName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            {checklistDialog?.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                {item.satisfied ? (
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.helpText ? (
                    <p className="text-xs text-muted-foreground">{item.helpText}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChecklistDialog(null)}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (checklistDialog) {
                  handleViewTask(checklistDialog.task);
                }
                setChecklistDialog(null);
              }}
            >
              Review task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!dependencyDialog} onOpenChange={(open) => !open && setDependencyDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dependencies must be cleared</AlertDialogTitle>
            <AlertDialogDescription>
              {dependencyDialog?.reason ?? 'Resolve linked blockers before continuing.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDependencyDialog(null)}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dependencyDialog) {
                  handleViewTask(dependencyDialog.task);
                }
                setDependencyDialog(null);
              }}
            >
              Inspect dependencies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Task Dialog - handles both creating and editing tasks */}
      <TaskDialog
        task={taskDialog.task}
        isOpen={taskDialog.isOpen}
        onClose={() => setTaskDialog({ isOpen: false })}
        onSave={handleSaveTask}
        columnId={taskDialog.columnId}
        projectId={currentProjectId || undefined}
        columnMetadata={dialogColumn?.metadata}
      />
    </div>
  );
}

export default function KanbanBoard() {
  if (enableOutpagedBrand) {
    return <OutpagedKanbanBoard />;
  }

  return <LegacyKanbanBoard />;
}
