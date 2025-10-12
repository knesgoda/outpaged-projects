import { Fragment } from "react";
import { HomeProvider, useHomeActions, useHomeState } from "@/features/home/store";
import type { HomePageDefinition } from "@/features/home/types";
import { PageTemplate } from "./PageTemplate";

function ActiveHomePageSummary({ page }: { page: HomePageDefinition | undefined }) {
  const tileCount = page?.tiles.length ?? 0;
  const breakpointCount = Object.keys(page?.layouts ?? {}).length;

  if (!page) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        No active Home page selected yet. Use upcoming customization tools to configure your ideal
        workspace overview.
      </div>
    );
  }

  return (
    <Fragment>
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Page overview
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Name</dt>
            <dd className="mt-1 text-sm font-medium">{page.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Tiles</dt>
            <dd className="mt-1 text-sm font-medium">{tileCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Layouts</dt>
            <dd className="mt-1 text-sm font-medium">{breakpointCount}</dd>
          </div>
        </dl>
        {page.description ? (
          <p className="mt-4 text-sm text-muted-foreground">{page.description}</p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Default tiles
        </h2>
        <ul className="mt-3 space-y-2">
          {page.tiles.map((tile) => (
            <li key={tile.id} className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{tile.title ?? tile.definitionId}</div>
              {tile.description ? (
                <p className="text-xs text-muted-foreground">{tile.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming customization
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This technical preview wires up the data models and persistence required for the Home
          canvas. Editing tools, tile catalog, and responsive layout controls will build on this
          foundation in subsequent milestones.
        </p>
      </div>
    </Fragment>
  );
}

function HomeStatePreview() {
  const { workspaceDefaults, userHome } = useHomeState();
  const { resetUserHome } = useHomeActions();

  const activePage = userHome.pages.find(
    (page) => page.id === userHome.preferences.activePageId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Home configuration</h2>
          <p className="text-sm text-muted-foreground">
            Workspace defaults version {workspaceDefaults.version} &bull; last synced {" "}
            {new Date(userHome.lastSyncedAt ?? workspaceDefaults.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          onClick={resetUserHome}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
        >
          Reset to workspace defaults
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ActiveHomePageSummary page={activePage} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <HomeProvider>
      <PageTemplate
        title="Home"
        description="Your personalized snapshot of projects, updates, and priorities across the workspace."
      >
        <HomeStatePreview />
      </PageTemplate>
    </HomeProvider>
  );
}
