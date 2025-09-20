# Contributing

## Frontend patterns

- When working with `@xyflow/react`, import `ReactFlow` as a named value export and keep `Node`/`Edge` as type-only imports. This avoids the bundler misidentifying them as runtime dependencies and keeps the Vite build stable.
