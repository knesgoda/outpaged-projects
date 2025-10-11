# Advanced Column Enhancements Plan

This document outlines the high-level implementation steps required to deliver the
requested advanced column capabilities across Supabase metadata, the React client,
and the automated test suites. The actual feature work has **not** been implemented.

## 1. Supabase column metadata
- Introduce a `column_type` enum in the `kanban_columns` table to distinguish
  between standard, dependency, formula, rollup, mirror, and connect columns.
- Create companion tables for storing per-type configuration (e.g. dependency
  link targets, formula expressions, rollup aggregation definitions, and mirror
  field mappings) with foreign-key relationships back to `kanban_columns`.
- Provide database views and policies so type-specific data can be efficiently
  fetched alongside the base column records.

## 2. Column manager UI extensions
- Extend the `ColumnManager` modal to surface type selection controls and render
  conditional configuration forms backed by the new Supabase metadata tables.
- Build reusable renderers in `src/components/boards/columns/` that encapsulate
  the visualization logic for dependency chains, mirror selectors, and rollup
  configuration widgets.
- Ensure drag-and-drop ordering and color management remain compatible with
  type-specific options.

## 3. View-specific schemas
- Introduce persisted per-view preferences so that individual views can
  show, hide, and reorder columns without mutating the underlying board schema.
- Update the saved view model to store column visibility and ordering metadata,
  and hydrate these preferences when loading a view.

## 4. Automated testing
- Add unit tests that cover formula evaluation, rollup aggregation behavior, and
  mirror column hydration using representative sample datasets.
- Expand Cypress coverage to validate that per-view visibility toggles behave
  correctly, persisting user choices across reloads.

## Pending work
None of the engineering work described above has been committed. This document
serves as guidance for the future implementation effort.
