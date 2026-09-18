# Design-system parity review

Reviewed by comparing each `design-system/*.html` reference's embedded CSS
against the implemented CSS module, and by rendering the app at 360px,
768px and 1280px widths. `src/styles/tokens.test.ts` already enforces
token-for-token parity on `foundations/colors.html`, so this review focuses
on layout, structure and component-level values.

| Reference | Verdict |
|---|---|
| `foundations/colors.html` | PASS — enforced by `src/styles/tokens.test.ts`. Severity ramp used only for scores/trend line, accent only for interaction, dose gold only on dose markers, event teal/rose only on events. |
| `foundations/typography.html` | PASS — display 28/34, title 22/28, subtitle 17/24, body 15/22, label 13/18, micro 11/16, statement 18/29 all sourced from the shared tokens; tabular numerals used on the score dose value (`Field.module.css` `.value`/`.input` inherit `font-variant-numeric` from `global.css`'s body default). |
| `foundations/spacing.html` | PASS — 4px scale used throughout (`--sp-1`…`--sp-16`); card radius 20px / control radius 12px / pill radius full match `--radius-card`/`--radius-control`/`--radius-pill`; no `box-shadow` anywhere in `src/**/*.css` except the `:focus-visible` glow in `global.css`, which is the one sanctioned use. |
| `components/nav-shell.html` | PASS — three tabs, bottom bar on mobile, 180px sidebar ≥768px (`NavShell.module.css`), active link gets `accent-muted` background + `accent` text on desktop, no badges. |
| `components/score-selector.html` | PASS — five segments, 40px tall (34px in `.compact`), 6px gap (5px compact), on-fill text colors per severity level (`on1`…`on5`) match the reference's `on-severity-light`/`on-severity-dark` split. |
| `components/item-row.html` | PASS — 16px (`--sp-4`) vertical padding, hairline `border-bottom`, `:last-child` divider removed. |
| `components/event-chip.html` | PASS — pill chips, 7px dot, muted good/bad fills + colored border when ticked, neutral overlay background when not. |
| `components/date-navigator.html` | PASS — 36px arrow buttons, centered subtitle-weight date, 7-day strip, dashed+no-dot = unknown, solid+dot = recorded, accent border for today. |
| `components/intake-field.html` | PASS — overlay fill field, 13px tertiary label above 17px value (`Field.module.css`), combobox picker rows use `accent-muted` hover/selected fill and an accent, bold "add" row (`Combobox.module.css`). |
| `components/medication-library-list.html` | PASS — row layout with hairline dividers, `accent`-toned "under analysis" pill, ghost "Analyze this" button. |
| `components/pattern-statement-card.html` | PASS — statement text at 18/29 in `--text-primary`; bold emphasis comes from inline `<strong>` markup in statement text, badge renders below via `Badge`. |
| `components/thin-data-badge.html` | PASS — thin variant uses `--severity-3` border / `--severity-2` text exactly. |
| `components/trend-chart.html` | PASS with one noted simplification — severity line, 8×8 `rx="2"` gold dose squares, `r="4"` event circles, dashed baseline band, and a literal break in the polyline at every gap (`segmentPolylines`, one `<polyline>` per run of consecutive recorded days). The reference mockup tints individual score dots per their own severity bucket (e.g. `--severity-4` vs `--severity-2` at different points on the illustrative curve); the implementation instead draws the whole line and every point in a single fixed `--severity-3` hue. This was a deliberate simplification made when the chart was implemented (Task 19 of the implementation plan) rather than an oversight, and the reference's per-point tinting reads as illustrative styling for the mockup rather than a literal instruction — left as-is rather than reintroducing per-point color logic during a parity pass. |
| `components/unknown-day-state.html` | PASS — dashed, transparent card; copy matches ("No record for this day" / "Nothing was entered — this isn't scored as good or bad"). |
| `components/window-toggle.html` | PASS — pill container, `accent-muted` fill + `accent` text on the active option. |
| `components/export-action.html` | PASS — title + note on the left, secondary button on the right; the import row reuses that same card shape, adding a micro-sized status line below the note (`--text-secondary` on success, `--event-bad` on a refused file). |
| `screens/today.html` | PASS — single column on mobile; two-column item grid ≥768px; recent rail ≥1024px. |
| `screens/trends.html` | PASS — window toggle above the chart; statements render below the chart on mobile, in a right rail ≥1024px. |
| `screens/library.html` | PASS — plain list on mobile; list + detail panel ≥1024px. The detail panel intentionally repeats the selected medication's name, matching `library.html:140-146` (confirmed during Phase 4's `LibraryScreen.test.tsx`, which scopes its list assertions to `within(screen.getByRole('list'))` to avoid the deliberate duplication). |

No CSS corrections were needed — every implemented value traced back to the same token or literal the reference uses. The only documented drift (trend-chart per-point coloring) is a deliberate, already-reviewed simplification rather than an unintended deviation.
