import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  useWorkflows,
  type WorkflowState,
  type WorkflowDefinitionDraft,
} from '@/hooks/useWorkflows';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Loader2 } from 'lucide-react';

const stateCategories = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'todo', label: 'To Do', color: '#3b82f6' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { value: 'on_hold', label: 'On Hold', color: '#ef4444' },
  { value: 'done', label: 'Done', color: '#10b981' },
];

const getCategoryColor = (category: WorkflowState['state_category']) =>
  stateCategories.find((item) => item.value === category)?.color ?? '#6b7280';

interface StateFormState {
  name: string;
  description: string;
  state_category: WorkflowState['state_category'];
  color: string;
  required_fields: string[];
  requires_approval: boolean;
  approval_roles: string[];
  position: { x: number; y: number };
}

interface TransitionFormState {
  validators: string[];
  screen: string;
  postFunctions: string[];
  approvals: string[];
}

const parseListInput = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const sanitizeList = (values: string[]) => values.map((value) => value.trim()).filter((value) => value.length > 0);

interface VisualWorkflowBuilderProps {
  templateId?: string;
  onSave?: () => void;
}

export function VisualWorkflowBuilder({ templateId, onSave }: VisualWorkflowBuilderProps) {
  const [nodes, setNodes, internalOnNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, internalOnEdgesChange] = useEdgesState<Edge>([]);
  const [stateMetadata, setStateMetadata] = useState<Record<string, StateFormState>>({});
  const [transitionMetadata, setTransitionMetadata] = useState<Record<string, TransitionFormState>>({});
  const [newStateName, setNewStateName] = useState('');
  const [newStateCategory, setNewStateCategory] = useState<WorkflowState['state_category']>('todo');
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const {
    templates,
    createWorkflowState,
    fetchWorkflowStates,
    fetchWorkflowTransitions,
    fetchWorkflowDrafts,
    fetchWorkflowVersions,
    drafts,
    versions,
    saveWorkflowDraft,
    publishWorkflowVersion,
    rollbackWorkflowVersion,
  } = useWorkflows();

  const { toast } = useToast();

  const formatTimestamp = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const loadWorkflowStates = useCallback(
    async (tmplId: string) => {
      const [statesList, transitionsList] = await Promise.all([
        fetchWorkflowStates(tmplId),
        fetchWorkflowTransitions(tmplId),
      ]);

      const stateMap: Record<string, StateFormState> = {};
      const flowNodes: Node[] = statesList.map((state, index) => {
        const position = { x: (index % 4) * 250, y: Math.floor(index / 4) * 150 };
        const color = state.color || getCategoryColor(state.state_category);

        stateMap[state.id] = {
          name: state.name,
          description: state.description ?? '',
          state_category: state.state_category,
          color,
          required_fields: state.required_fields ?? [],
          requires_approval: state.requires_approval ?? false,
          approval_roles: state.approval_roles ?? [],
          position,
        };

        return {
          id: state.id,
          type: 'default',
          position,
          data: { label: state.name },
          style: {
            background: color,
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '8px',
            padding: '10px',
          },
        } as Node;
      });

      const transitionMap: Record<string, TransitionFormState> = {};
      const flowEdges: Edge[] = transitionsList.map((transition) => {
        transitionMap[transition.id] = {
          validators: transition.validators ?? [],
          screen: transition.transition_screen ?? '',
          postFunctions: (transition.post_actions ?? []).map((action) => action.type),
          approvals: transition.approvals ?? [],
        };

        return {
          id: transition.id,
          source: transition.from_state_id,
          target: transition.to_state_id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        } as Edge;
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      setStateMetadata(stateMap);
      setTransitionMetadata(transitionMap);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      await Promise.all([fetchWorkflowDrafts(tmplId), fetchWorkflowVersions(tmplId)]);
    },
    [
      fetchWorkflowStates,
      fetchWorkflowTransitions,
      fetchWorkflowDrafts,
      fetchWorkflowVersions,
      setEdges,
      setNodes,
    ]
  );

  useEffect(() => {
    if (selectedTemplate) {
      loadWorkflowStates(selectedTemplate);
    } else {
      setNodes([]);
      setEdges([]);
      setStateMetadata({});
      setTransitionMetadata({});
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedDraftId(null);
      setSelectedVersionId(null);
    }
  }, [selectedTemplate, loadWorkflowStates, setEdges, setNodes]);

  useEffect(() => {
    if (!drafts.length) {
      setSelectedDraftId(null);
      return;
    }

    if (!selectedDraftId || !drafts.some((draft) => draft.id === selectedDraftId)) {
      setSelectedDraftId(drafts[0].id);
    }
  }, [drafts, selectedDraftId]);

  useEffect(() => {
    if (!versions.length) {
      setSelectedVersionId(null);
      return;
    }

    if (!selectedVersionId || !versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      internalOnNodesChange(changes);
      setStateMetadata((prev) => {
        const next = { ...prev };
        changes.forEach((change) => {
          if (!next[change.id]) return;
          if (change.type === 'position') {
            const position = change.position ?? change.positionAbsolute;
            if (position) {
              next[change.id] = {
                ...next[change.id],
                position: { x: position.x, y: position.y },
              };
            }
          }
        });
        return next;
      });
    },
    [internalOnNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      internalOnEdgesChange(changes);
      const removedIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id)
        .filter((id): id is string => Boolean(id));

      if (removedIds.length > 0) {
        setTransitionMetadata((prev) => {
          const next = { ...prev };
          removedIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });

        setSelectedEdgeId((current) => (current && removedIds.includes(current) ? null : current));
      }
    },
    [internalOnEdgesChange]
  );

  const updateStateMetadata = useCallback((stateId: string, updates: Partial<StateFormState>) => {
    setStateMetadata((prev) => {
      const existing = prev[stateId];
      const base: StateFormState =
        existing ?? {
          name: '',
          description: '',
          state_category: 'todo',
          color: getCategoryColor('todo'),
          required_fields: [],
          requires_approval: false,
          approval_roles: [],
          position: { x: 0, y: 0 },
        };

      return {
        ...prev,
        [stateId]: {
          ...base,
          ...updates,
        },
      };
    });
  }, []);

  const updateTransitionMetadata = useCallback((edgeId: string, updates: Partial<TransitionFormState>) => {
    setTransitionMetadata((prev) => {
      const existing = prev[edgeId] ?? {
        validators: [],
        screen: '',
        postFunctions: [],
        approvals: [],
      };

      return {
        ...prev,
        [edgeId]: {
          ...existing,
          ...updates,
        },
      };
    });
  }, []);

  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const edgeId = `edge-${params.source}-${params.target}-${Math.random().toString(36).slice(2, 8)}`;
      const newEdge: Edge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      updateTransitionMetadata(edgeId, {
        validators: [],
        screen: '',
        postFunctions: [],
        approvals: [],
      });
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
    },
    [setEdges, updateTransitionMetadata]
  );

  const addState = async () => {
    if (!newStateName.trim() || !selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a template and enter a state name',
        variant: 'destructive',
      });
      return;
    }

    const categoryColor = getCategoryColor(newStateCategory);

    const newState = await createWorkflowState({
      workflow_template_id: selectedTemplate,
      name: newStateName,
      state_category: newStateCategory,
      position: nodes.length,
      color: categoryColor,
      required_fields: [],
      requires_approval: false,
      approval_roles: [],
    });

    if (newState) {
      const position = { x: (nodes.length % 4) * 250, y: Math.floor(nodes.length / 4) * 150 };
      const newNode: Node = {
        id: newState.id,
        type: 'default',
        position,
        data: { label: newState.name },
        style: {
          background: categoryColor,
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '8px',
          padding: '10px',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setStateMetadata((prev) => ({
        ...prev,
        [newState.id]: {
          name: newState.name,
          description: newState.description ?? '',
          state_category: newState.state_category,
          color: categoryColor,
          required_fields: newState.required_fields ?? [],
          requires_approval: newState.requires_approval ?? false,
          approval_roles: newState.approval_roles ?? [],
          position,
        },
      }));
      setSelectedNodeId(newState.id);
      setNewStateName('');

      toast({
        title: 'Success',
        description: 'State added successfully',
      });
    }
  };

  const handleStateNameChange = (value: string) => {
    if (!selectedNodeId) return;
    updateStateMetadata(selectedNodeId, { name: value });
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId ? { ...node, data: { ...node.data, label: value } } : node
      )
    );
  };

  const handleStateCategoryChange = (value: string) => {
    if (!selectedNodeId) return;
    const category = value as WorkflowState['state_category'];
    const color = getCategoryColor(category);
    updateStateMetadata(selectedNodeId, { state_category: category, color });
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeId
          ? { ...node, style: { ...(node.style ?? {}), background: color } }
          : node
      )
    );
  };

  const handleStateDescriptionChange = (value: string) => {
    if (!selectedNodeId) return;
    updateStateMetadata(selectedNodeId, { description: value });
  };

  const handleRequiredFieldsChange = (value: string) => {
    if (!selectedNodeId) return;
    updateStateMetadata(selectedNodeId, { required_fields: parseListInput(value) });
  };

  const handleRequiresApprovalChange = (checked: boolean | 'indeterminate') => {
    if (!selectedNodeId) return;
    updateStateMetadata(selectedNodeId, { requires_approval: checked === true });
  };

  const handleApprovalRolesChange = (value: string) => {
    if (!selectedNodeId) return;
    updateStateMetadata(selectedNodeId, { approval_roles: parseListInput(value) });
  };

  const handleTransitionScreenChange = (value: string) => {
    if (!selectedEdgeId) return;
    updateTransitionMetadata(selectedEdgeId, { screen: value });
  };

  const handleTransitionValidatorsChange = (value: string) => {
    if (!selectedEdgeId) return;
    updateTransitionMetadata(selectedEdgeId, { validators: parseListInput(value) });
  };

  const handleTransitionPostFunctionsChange = (value: string) => {
    if (!selectedEdgeId) return;
    updateTransitionMetadata(selectedEdgeId, { postFunctions: parseListInput(value) });
  };

  const handleTransitionApprovalsChange = (value: string) => {
    if (!selectedEdgeId) return;
    updateTransitionMetadata(selectedEdgeId, { approvals: parseListInput(value) });
  };

  const handleSaveDraft = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a template first',
        variant: 'destructive',
      });
      return;
    }

    setSavingDraft(true);

    try {
      const definition: WorkflowDefinitionDraft = {
        states: nodes.map((node) => {
          const metadata = stateMetadata[node.id];
          const stateName = metadata?.name ?? (typeof node.data?.label === 'string' ? node.data.label : '');
          const position = metadata?.position ?? node.position ?? { x: 0, y: 0 };

          return {
            id: node.id,
            name: stateName,
            description: metadata?.description ?? '',
            state_category: metadata?.state_category ?? 'todo',
            color: metadata?.color ?? getCategoryColor('todo'),
            required_fields: sanitizeList(metadata?.required_fields ?? []),
            requires_approval: metadata?.requires_approval ?? false,
            approval_roles: sanitizeList(metadata?.approval_roles ?? []),
            position,
          };
        }),
        transitions: edges.map((edge) => {
          const metadata = transitionMetadata[edge.id] ?? {
            validators: [],
            screen: '',
            postFunctions: [],
            approvals: [],
          };

          return {
            id: edge.id,
            from_state_id: edge.source,
            to_state_id: edge.target,
            validators: sanitizeList(metadata.validators ?? []),
            transition_screen: metadata.screen ? metadata.screen.trim() : null,
            post_functions: sanitizeList(metadata.postFunctions ?? []),
            approvals: sanitizeList(metadata.approvals ?? []),
          };
        }),
      };

      const draft = await saveWorkflowDraft(
        selectedTemplate,
        definition,
        selectedDraftId ? { draftId: selectedDraftId } : undefined
      );

      if (draft) {
        setSelectedDraftId(draft.id);
        if (onSave) {
          onSave();
        }
      }
    } catch (error) {
      console.error('Error saving workflow draft', error);
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a template first',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDraftId) {
      toast({
        title: 'No draft selected',
        description: 'Choose a draft to publish',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);

    try {
      await publishWorkflowVersion(selectedTemplate, selectedDraftId);
      await loadWorkflowStates(selectedTemplate);
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error publishing workflow version', error);
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a template first',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedVersionId) {
      toast({
        title: 'No version selected',
        description: 'Choose a published version to roll back to',
        variant: 'destructive',
      });
      return;
    }

    setRollingBack(true);

    try {
      await rollbackWorkflowVersion(selectedTemplate, selectedVersionId);
      await loadWorkflowStates(selectedTemplate);
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error rolling back workflow version', error);
    } finally {
      setRollingBack(false);
    }
  };

  const selectedState = selectedNodeId ? stateMetadata[selectedNodeId] : undefined;
  const selectedTransition = selectedEdgeId ? transitionMetadata[selectedEdgeId] : undefined;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Visual Workflow Builder</CardTitle>
        <CardDescription>
          Drag states to position them and connect them to define transitions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="template">Workflow Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state-name">New State Name</Label>
            <Input
              id="state-name"
              placeholder="e.g., In Review"
              value={newStateName}
              onChange={(e) => setNewStateName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={newStateCategory}
              onValueChange={(value: string) => setNewStateCategory(value as WorkflowState['state_category'])}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stateCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={addState} className="flex-1" disabled={!selectedTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Add State
            </Button>
            <Button
              onClick={handleSaveDraft}
              variant="secondary"
              disabled={savingDraft || !selectedTemplate}
            >
              {savingDraft ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="h-[500px] rounded-lg border bg-muted/20">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onNodeClick={(_, node) => {
                  setSelectedNodeId(node.id);
                  setSelectedEdgeId(null);
                }}
                onEdgeClick={(_, edge) => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                fitView
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>

            <div className="flex flex-wrap gap-2">
              {stateCategories.map((category) => (
                <div key={category.value} className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ background: category.color }}
                  />
                  <span className="text-sm">{category.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="draft-select">Drafts</Label>
                  <Select value={selectedDraftId ?? ''} onValueChange={setSelectedDraftId}>
                    <SelectTrigger id="draft-select">
                      <SelectValue placeholder="Select draft" />
                    </SelectTrigger>
                    <SelectContent>
                      {drafts.length === 0 ? (
                        <SelectItem value="__no-drafts" disabled>
                          No drafts available
                        </SelectItem>
                      ) : (
                        drafts.map((draft) => (
                          <SelectItem key={draft.id} value={draft.id}>
                            Draft {draft.version ?? '—'} • {formatTimestamp(draft.updated_at)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version-select">Published versions</Label>
                  <Select value={selectedVersionId ?? ''} onValueChange={setSelectedVersionId}>
                    <SelectTrigger id="version-select">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.length === 0 ? (
                        <SelectItem value="__no-versions" disabled>
                          No versions available
                        </SelectItem>
                      ) : (
                        versions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            v{version.version} • {formatTimestamp(version.published_at)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handlePublish}
                  disabled={!selectedDraftId || publishing || !selectedTemplate}
                >
                  {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {publishing ? 'Publishing…' : 'Publish draft'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRollback}
                  disabled={!selectedVersionId || rollingBack || !selectedTemplate}
                >
                  {rollingBack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {rollingBack ? 'Rolling back…' : 'Rollback version'}
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold">State details</h3>
              {selectedState ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="state-name-edit">Name</Label>
                    <Input
                      id="state-name-edit"
                      value={selectedState.name}
                      onChange={(e) => handleStateNameChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state-category-edit">Category</Label>
                    <Select
                      value={selectedState.state_category}
                      onValueChange={handleStateCategoryChange}
                    >
                      <SelectTrigger id="state-category-edit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stateCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state-description">Description</Label>
                    <Textarea
                      id="state-description"
                      value={selectedState.description}
                      onChange={(e) => handleStateDescriptionChange(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state-required-fields">Required fields</Label>
                    <Input
                      id="state-required-fields"
                      value={selectedState.required_fields.join(', ')}
                      onChange={(e) => handleRequiredFieldsChange(e.target.value)}
                      placeholder="field_a, field_b"
                    />
                    <p className="text-xs text-muted-foreground">Comma separated</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="state-requires-approval"
                      checked={selectedState.requires_approval}
                      onCheckedChange={handleRequiresApprovalChange}
                    />
                    <Label htmlFor="state-requires-approval" className="font-normal">
                      Requires approval
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state-approval-roles">Approval roles</Label>
                    <Input
                      id="state-approval-roles"
                      value={selectedState.approval_roles.join(', ')}
                      onChange={(e) => handleApprovalRolesChange(e.target.value)}
                      placeholder="role_a, role_b"
                    />
                    <p className="text-xs text-muted-foreground">Comma separated role keys</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a state to edit its metadata.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold">Transition details</h3>
              {selectedTransition ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="transition-validators">Validators</Label>
                    <Input
                      id="transition-validators"
                      value={selectedTransition.validators.join(', ')}
                      onChange={(e) => handleTransitionValidatorsChange(e.target.value)}
                      placeholder="validator_a, validator_b"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transition-screen">Transition screen</Label>
                    <Input
                      id="transition-screen"
                      value={selectedTransition.screen}
                      onChange={(e) => handleTransitionScreenChange(e.target.value)}
                      placeholder="Screen identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transition-post-functions">Post-functions</Label>
                    <Input
                      id="transition-post-functions"
                      value={selectedTransition.postFunctions.join(', ')}
                      onChange={(e) => handleTransitionPostFunctionsChange(e.target.value)}
                      placeholder="post_function_a, post_function_b"
                    />
                    <p className="text-xs text-muted-foreground">Comma separated function keys</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transition-approvals">Approvals</Label>
                    <Input
                      id="transition-approvals"
                      value={selectedTransition.approvals.join(', ')}
                      onChange={(e) => handleTransitionApprovalsChange(e.target.value)}
                      placeholder="role_a, role_b"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a transition edge to configure validators, screens, and post-functions.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
