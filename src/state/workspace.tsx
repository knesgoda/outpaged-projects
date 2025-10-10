import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchOrganizations } from "@/services/organizations";
import { fetchSpaces, fetchWorkspaces } from "@/services/workspaces";
import type { OrganizationSummary } from "@/types/organization";
import type { SpaceSummary, WorkspaceSummary } from "@/types/workspace";

const WORKSPACE_STORAGE_KEY = "outpaged.currentWorkspace";
const SPACE_STORAGE_KEY = "outpaged.currentSpace";
const ORGANIZATION_STORAGE_KEY = "outpaged.currentOrganization";

function safeReadStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value && value !== "null" ? value : null;
  } catch (error) {
    console.warn("Failed to read local storage", error);
    return null;
  }
}

function safeWriteStorage(key: string, value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn("Failed to persist local storage", error);
  }
}

export type WorkspaceContextValue = {
  organizations: OrganizationSummary[];
  currentOrganization: OrganizationSummary | null;
  setOrganization: (organizationIdOrSlug: string | null) => void;
  loadingOrganizations: boolean;
  organizationError: Error | null;
  refreshOrganizations: () => Promise<void>;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  setWorkspace: (workspaceIdOrSlug: string | null) => void;
  loadingWorkspaces: boolean;
  workspaceError: Error | null;
  refreshWorkspaces: () => Promise<void>;
  spaces: SpaceSummary[];
  currentSpace: SpaceSummary | null;
  setSpace: (spaceIdOrSlug: string | null) => void;
  loadingSpaces: boolean;
  spaceError: Error | null;
  refreshSpaces: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(() =>
    safeReadStorage(ORGANIZATION_STORAGE_KEY)
  );
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationError, setOrganizationError] = useState<Error | null>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => safeReadStorage(WORKSPACE_STORAGE_KEY));
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<Error | null>(null);

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [spaceId, setSpaceId] = useState<string | null>(() => safeReadStorage(SPACE_STORAGE_KEY));
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [spaceError, setSpaceError] = useState<Error | null>(null);

  const refreshOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const results = await fetchOrganizations();
      setOrganizations(results);
      setOrganizationError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error : new Error("Unable to load organizations. Please try again later.");
      console.error("Failed to load organizations", error);
      setOrganizations([]);
      setOrganizationError(message);
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  useEffect(() => {
    if (loadingOrganizations) {
      return;
    }

    if (organizations.length === 0) {
      if (organizationId !== null) {
        setOrganizationId(null);
        safeWriteStorage(ORGANIZATION_STORAGE_KEY, null);
      }
      return;
    }

    if (!organizationId || !organizations.some((organization) => organization.id === organizationId)) {
      const stored = safeReadStorage(ORGANIZATION_STORAGE_KEY);
      const candidate = stored && organizations.some((organization) => organization.id === stored)
        ? stored
        : organizations[0]?.id ?? null;

      if (candidate && candidate !== organizationId) {
        setOrganizationId(candidate);
        safeWriteStorage(ORGANIZATION_STORAGE_KEY, candidate);
        setWorkspaceId(null);
        safeWriteStorage(WORKSPACE_STORAGE_KEY, null);
        setSpaces([]);
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
      }
    }
  }, [organizations, loadingOrganizations, organizationId]);

  useEffect(() => {
    safeWriteStorage(ORGANIZATION_STORAGE_KEY, organizationId);
  }, [organizationId]);

  const refreshWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const results = await fetchWorkspaces(organizationId);
      setWorkspaces(results);
      setWorkspaceError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error : new Error("Unable to load workspaces. Please try again later.");
      console.error("Failed to load workspaces", error);
      setWorkspaces([]);
      setWorkspaceError(message);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (loadingWorkspaces) {
      return;
    }

    if (workspaces.length === 0) {
      if (workspaceId !== null) {
        setWorkspaceId(null);
        safeWriteStorage(WORKSPACE_STORAGE_KEY, null);
      }
      return;
    }

    if (!workspaceId || !workspaces.some((workspace) => workspace.id === workspaceId)) {
      const stored = safeReadStorage(WORKSPACE_STORAGE_KEY);
      const candidate = stored && workspaces.some((workspace) => workspace.id === stored)
        ? stored
        : workspaces[0]?.id ?? null;

      if (candidate && candidate !== workspaceId) {
        setWorkspaceId(candidate);
        safeWriteStorage(WORKSPACE_STORAGE_KEY, candidate);
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
      }
    }
  }, [workspaces, loadingWorkspaces, workspaceId]);

  useEffect(() => {
    safeWriteStorage(WORKSPACE_STORAGE_KEY, workspaceId);
  }, [workspaceId]);

  const refreshSpaces = useCallback(async () => {
    if (!workspaceId) {
      setSpaces([]);
      setSpaceError(null);
      return;
    }

    setLoadingSpaces(true);
    try {
      const results = await fetchSpaces(workspaceId);
      setSpaces(results);
      setSpaceError(null);
    } catch (error) {
      const message = error instanceof Error ? error : new Error("Unable to load spaces for this workspace.");
      console.error("Failed to load spaces", error);
      setSpaces([]);
      setSpaceError(message);
    } finally {
      setLoadingSpaces(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refreshSpaces();
  }, [refreshSpaces]);

  useEffect(() => {
    if (!workspaceId) {
      if (spaceId !== null) {
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
      }
      return;
    }

    if (spaces.length === 0) {
      if (spaceId !== null) {
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
      }
      return;
    }

    if (!spaceId || !spaces.some((space) => space.id === spaceId)) {
      const stored = safeReadStorage(SPACE_STORAGE_KEY);
      const candidate = stored && spaces.some((space) => space.id === stored)
        ? stored
        : spaces[0]?.id ?? null;

      if (candidate && candidate !== spaceId) {
        setSpaceId(candidate);
        safeWriteStorage(SPACE_STORAGE_KEY, candidate);
      }
    }
  }, [workspaceId, spaces, spaceId]);

  useEffect(() => {
    safeWriteStorage(SPACE_STORAGE_KEY, spaceId);
  }, [spaceId]);

  const setOrganization = useCallback(
    (organizationIdOrSlug: string | null) => {
      if (!organizationIdOrSlug) {
        setOrganizationId(null);
        safeWriteStorage(ORGANIZATION_STORAGE_KEY, null);
        setWorkspaces([]);
        setWorkspaceId(null);
        safeWriteStorage(WORKSPACE_STORAGE_KEY, null);
        setSpaces([]);
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
        return;
      }

      const match = organizations.find(
        (organization) => organization.id === organizationIdOrSlug || organization.slug === organizationIdOrSlug
      );
      const resolved = match?.id ?? organizationIdOrSlug;

      setOrganizationId((previous) => {
        if (previous === resolved) {
          return previous;
        }
        return resolved;
      });
      safeWriteStorage(ORGANIZATION_STORAGE_KEY, resolved);
      setWorkspaceId(null);
      safeWriteStorage(WORKSPACE_STORAGE_KEY, null);
      setSpaces([]);
      setSpaceId(null);
      safeWriteStorage(SPACE_STORAGE_KEY, null);
    },
    [organizations]
  );

  const setWorkspace = useCallback(
    (workspaceIdOrSlug: string | null) => {
      if (!workspaceIdOrSlug) {
        setWorkspaceId(null);
        safeWriteStorage(WORKSPACE_STORAGE_KEY, null);
        setSpaces([]);
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
        return;
      }

      const match = workspaces.find(
        (workspace) => workspace.id === workspaceIdOrSlug || workspace.slug === workspaceIdOrSlug
      );
      const resolved = match?.id ?? workspaceIdOrSlug;

      if (match?.organization_id && match.organization_id !== organizationId) {
        setOrganizationId(match.organization_id);
        safeWriteStorage(ORGANIZATION_STORAGE_KEY, match.organization_id);
      }

      setWorkspaceId((previous) => {
        if (previous === resolved) {
          return previous;
        }
        return resolved;
      });
      safeWriteStorage(WORKSPACE_STORAGE_KEY, resolved);
      setSpaces([]);
      setSpaceId(null);
      safeWriteStorage(SPACE_STORAGE_KEY, null);
    },
    [workspaces, organizationId]
  );

  const setSpace = useCallback(
    (spaceIdOrSlug: string | null) => {
      if (!spaceIdOrSlug) {
        setSpaceId(null);
        safeWriteStorage(SPACE_STORAGE_KEY, null);
        return;
      }

      const match = spaces.find((space) => space.id === spaceIdOrSlug || space.slug === spaceIdOrSlug);
      const resolved = match?.id ?? spaceIdOrSlug;

      setSpaceId(resolved);
      safeWriteStorage(SPACE_STORAGE_KEY, resolved);
    },
    [spaces]
  );

  const currentOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId) ?? null,
    [organizations, organizationId]
  );

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId) ?? null,
    [workspaces, workspaceId]
  );

  const currentSpace = useMemo(() => spaces.find((space) => space.id === spaceId) ?? null, [spaces, spaceId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      organizations,
      currentOrganization,
      setOrganization,
      loadingOrganizations,
      organizationError,
      refreshOrganizations,
      workspaces,
      currentWorkspace,
      setWorkspace,
      loadingWorkspaces,
      workspaceError,
      refreshWorkspaces,
      spaces,
      currentSpace,
      setSpace,
      loadingSpaces,
      spaceError,
      refreshSpaces,
    }),
    [
      organizations,
      currentOrganization,
      setOrganization,
      loadingOrganizations,
      organizationError,
      refreshOrganizations,
      workspaces,
      currentWorkspace,
      setWorkspace,
      loadingWorkspaces,
      workspaceError,
      refreshWorkspaces,
      spaces,
      currentSpace,
      setSpace,
      loadingSpaces,
      spaceError,
      refreshSpaces,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }

  return context;
}
