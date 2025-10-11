# Board Layout Accessibility Guarantees

The kanban-style board layout now provides a consistent accessibility baseline across navigation, semantics, and visual affordances.

## Landmark and Navigation Structure
- A persistent "Skip to board content" link lands focus directly on the scrollable canvas, keeping the tab order logical for keyboard and assistive-technology users.
- The scrollable board canvas is exposed as an ARIA `region` labelled by the active breadcrumb so screen readers announce the current board context immediately.
- Inline instructions describe how selecting a card opens the linked item detail panel to the right.

## Interactive Elements and Semantics
- Each work item renders inside a semantic list and exposes `aria-expanded`/`aria-controls` metadata so assistive tech can correlate cards with the details panel.
- Status badges include textual labels and alphanumeric tokens, ensuring status is communicated without relying on color alone.
- Group selectors in the sidebar now render bordered glyphs with the group initial, creating a visible non-color indicator that complements the accent color swatch.

## Visual Indicators and High Contrast
- Focus rings use `focus-visible` styling with ring offsets to remain visible against busy backgrounds while avoiding double outlines with pointer interactions.
- High-contrast mode applies forced-color-safe borders and backgrounds for board cards and the skip link so Windows High Contrast and custom themes remain legible.

## Testing Commitments
- Jest integrates `jest-axe` checks (see `src/components/boards/__tests__/BoardLayout.accessibility.test.tsx`) and a dedicated skip-link assertion to guard against regressions.
- Run `npm test` locally or in CI to execute the accessibility suite alongside existing unit tests.
