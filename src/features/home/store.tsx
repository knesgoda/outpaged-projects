import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  type HomeAction,
  type HomePageDefinition,
  type HomeState,
  type HomeUserPreferences,
  type HomeUserState,
  type HomeWorkspaceDefaults,
} from "./types";
import {
  DEFAULT_WORKSPACE_HOME,
  createDefaultUserHome,
  createInitialHomeState,
} from "./defaults";
import {
  clearPersistedUserHome,
  loadPersistedUserHome,
  useHomeUserPersistence,
} from "./persistence";

const HomeStateContext = createContext<HomeState | undefined>(undefined);
const HomeActionsContext = createContext<HomeActions | undefined>(undefined);

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case "setActivePage": {
      return {
        ...state,
        userHome: {
          ...state.userHome,
          preferences: {
            ...state.userHome.preferences,
            activePageId: action.pageId,
          },
        },
      };
    }
    case "upsertUserPage": {
      const pages = state.userHome.pages.some((page) => page.id === action.page.id)
        ? state.userHome.pages.map((page) => (page.id === action.page.id ? action.page : page))
        : [...state.userHome.pages, action.page];

      return {
        ...state,
        userHome: {
          ...state.userHome,
          pages,
        },
      };
    }
    case "removeUserPage": {
      const pages = state.userHome.pages.filter((page) => page.id !== action.pageId);
      const activePageId =
        state.userHome.preferences.activePageId === action.pageId && pages.length > 0
          ? pages[0].id
          : state.userHome.preferences.activePageId;

      return {
        ...state,
        userHome: {
          ...state.userHome,
          pages,
          preferences: {
            ...state.userHome.preferences,
            activePageId,
          },
        },
      };
    }
    case "resetUserHome": {
      return {
        ...state,
        userHome: createDefaultUserHome(state.workspaceDefaults),
      };
    }
    case "patchUserPreferences": {
      return {
        ...state,
        userHome: {
          ...state.userHome,
          preferences: {
            ...state.userHome.preferences,
            ...action.patch,
          },
        },
      };
    }
    case "hydrateWorkspaceDefaults": {
      return createInitialHomeState(action.defaults, state.userHome);
    }
    case "syncUserState": {
      return {
        ...state,
        userHome: action.userHome,
        status: "idle",
        error: null,
      };
    }
    default:
      return state;
  }
}

export interface HomeProviderProps {
  children: ReactNode;
  workspaceDefaults?: HomeWorkspaceDefaults;
  initialUserHome?: HomeUserState | null;
}

export interface HomeActions {
  setActivePage: (pageId: string) => void;
  upsertUserPage: (page: HomePageDefinition) => void;
  removeUserPage: (pageId: string) => void;
  patchUserPreferences: (patch: Partial<HomeUserPreferences>) => void;
  resetUserHome: () => void;
  overwriteUserState: (userHome: HomeUserState) => void;
  updateWorkspaceDefaults: (defaults: HomeWorkspaceDefaults) => void;
  clearUserPersistence: () => void;
}

export function HomeProvider({
  children,
  workspaceDefaults = DEFAULT_WORKSPACE_HOME,
  initialUserHome,
}: HomeProviderProps) {
  const [state, dispatch] = useReducer(
    homeReducer,
    {
      workspaceDefaults,
      initialUserHome,
    },
    (payload) => {
      const persistedUserHome = payload.initialUserHome ?? loadPersistedUserHome();
      return createInitialHomeState(payload.workspaceDefaults, persistedUserHome);
    },
  );

  useHomeUserPersistence(state.userHome);

  useEffect(() => {
    if (state.workspaceDefaults.version !== workspaceDefaults.version) {
      dispatch({ type: "hydrateWorkspaceDefaults", defaults: workspaceDefaults });
    }
  }, [workspaceDefaults, state.workspaceDefaults.version]);

  useEffect(() => {
    if (initialUserHome) {
      dispatch({ type: "syncUserState", userHome: initialUserHome });
    }
  }, [initialUserHome]);

  const actions = useMemo<HomeActions>(() => ({
    setActivePage: (pageId) => dispatch({ type: "setActivePage", pageId }),
    upsertUserPage: (page) => dispatch({ type: "upsertUserPage", page }),
    removeUserPage: (pageId) => dispatch({ type: "removeUserPage", pageId }),
    patchUserPreferences: (patch) => dispatch({ type: "patchUserPreferences", patch }),
    resetUserHome: () => dispatch({ type: "resetUserHome" }),
    overwriteUserState: (userHome) => dispatch({ type: "syncUserState", userHome }),
    updateWorkspaceDefaults: (defaults) =>
      dispatch({ type: "hydrateWorkspaceDefaults", defaults }),
    clearUserPersistence: () => clearPersistedUserHome(),
  }), []);

  const stateValue = useMemo(() => state, [state]);

  return (
    <HomeStateContext.Provider value={stateValue}>
      <HomeActionsContext.Provider value={actions}>{children}</HomeActionsContext.Provider>
    </HomeStateContext.Provider>
  );
}

export function useHomeState(): HomeState {
  const context = useContext(HomeStateContext);
  if (!context) {
    throw new Error("useHomeState must be used within a HomeProvider");
  }
  return context;
}

export function useHomeActions(): HomeActions {
  const context = useContext(HomeActionsContext);
  if (!context) {
    throw new Error("useHomeActions must be used within a HomeProvider");
  }
  return context;
}

export { homeReducer };
