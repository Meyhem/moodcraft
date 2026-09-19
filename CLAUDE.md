# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Moodcraft is a private, offline, single-person mood and medication tracking app. It is
**descriptive, not prescriptive**: it states what the recorded data shows and never
recommends a dose, a gap, or a course of action. Its central question is narrower than
"does this medication work" — it's "how does the spacing between doses change how well a
dose works?" See [`domain-spec-moodcraft.md`](domain-spec-moodcraft.md) for the full domain
spec (glossary, business rules R-01…R-20, edge cases) — read it before touching
`src/domain/` or `src/analysis/`, since those two directories are direct implementations of
that spec's rules and every business decision there traces back to it.

The visual language lives in [`design-system/`](design-system/) as standalone HTML files —
open them directly in a browser. [`docs/design-parity.md`](docs/design-parity.md) records
the last full parity pass between those references and the implemented components; when
adding UI, check the matching reference file first rather than inventing new styling, and
use the tokens in `src/styles/tokens.css` — never raw hex values in a `.module.css` file
(`src/guards.test.ts` enforces this).

## Commands

```bash
npm run dev         # start Vite dev server at http://localhost:5173/moodcraft/ (/ redirects there)
npm test             # run the full test suite once (vitest run)
npm run test:watch   # run tests in watch mode
npm run typecheck    # tsc -b (project references — a bare `tsc --noEmit` at the root checks nothing, root tsconfig.json has "files": [])
npm run build        # tsc -b && vite build
npm run preview       # preview the production build
```

Run a single test file: `npx vitest run src/analysis/threshold.test.ts`
Run a single test by name: `npx vitest run -t "test name substring"`

There is no separate lint script.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages
(https://meyhem.github.io/moodcraft/) on every push to `main`. It runs `npm test` before
`npm run build`, so a failing test blocks the deploy. Two consequences of living under a
repo subpath: `vite.config.ts` sets `base: '/moodcraft/'` (applied in dev and preview too,
so all three modes agree) and `main.tsx` passes `import.meta.env.BASE_URL` as the
`BrowserRouter` basename. Pages has no SPA rewrite rule, so the workflow copies
`index.html` to `404.html` — a deep link like `/moodcraft/trends` is served that copy and
the router resolves it client-side. Nothing about the deploy changes the privacy model: the
build is static files only and all data stays in the visitor's own IndexedDB.

## Workflow

Work directly on `main` — do not create feature branches for routine work. After completing
a feature or fix (implementation + passing tests), commit the change and push straight to
`origin main` automatically, without waiting to be asked — this is standing authorization
for routine commits and pushes on this repo. Still stop and confirm before any destructive
or history-rewriting git operation (force-push, reset --hard, amending a pushed commit,
etc.).

## Architecture

### Layering

```
src/domain/    — pure types and constants: Item definitions, date arithmetic. No I/O.
src/analysis/  — pure analysis engine over domain types. No React, no I/O. See below.
src/data/      — IndexedDB repositories (idb) + migrations + JSON export/import. The only I/O layer.
src/state/     — React context (AppDataProvider) and hooks bridging data + analysis to UI.
src/ui/        — generic presentational primitives (Button, Card, Chip, SegmentedScore, …).
src/components/— domain-specific composed components (DateNavigator, TrendChart, ItemRow, …).
src/screens/   — routed top-level screens (TodayScreen, TrendsScreen, LibraryScreen).
```

Dependencies only flow downward through this list — `analysis/` never imports from `data/`
or React, `domain/` never imports from anywhere else in `src/`.

### Analysis engine (`src/analysis/`)

A pure-function pipeline, `runAnalysis(input, window)` in `run.ts`, orchestrating:
`computeBaseline` → `withGaps`/`responseWindow` → `computeOutcomes` (uses `isConfounded`
from `confounders.ts`) → `findResetThreshold`/`dosePreviousEffect` → `buildStatements`.
Always import from `src/analysis/index.ts` (the barrel), not the individual files — that's
the boundary the UI is meant to depend on. Key facts baked into the spec and worth knowing
before changing this code:

- Composite score = mean of the 13 items; **5 is worst**, so "improvement" is always a
  *decrease*.
- Baseline is *measured*, never assumed — it's the mean over recorded days strictly before
  the first-ever intake. No baseline ⇒ only dose-spacing patterns can be described, never
  improvement.
- The response window is the intake day plus the following 2 days.
- The reset threshold (the gap length after which sensitivity is considered restored) is
  *learned* by searching `THRESHOLD_CANDIDATES`, not hardcoded.
- Missing days are gaps, never bridged and never treated as zero — `TrendChart`'s
  `segmentPolylines` draws one `<polyline>` per run of consecutive recorded days so the
  chart never implies data that isn't there.
- Statements are built by `buildStatements` and are marked `thin` when sample size is
  below `THIN_SAMPLE` — thin data is always shown, never hidden.

### Data layer (`src/data/`)

`db.ts` defines the `MoodcraftDB` idb schema (`dayRecords` keyed by date, `intakes` keyed by
`[medicationId, date]`, `medications`, `settings`) and `openDb()`, which replays the
`MIGRATIONS` array in `migrations.ts` from `oldVersion` forward. **Migrations are
append-only** — never edit a shipped migration; add a new one and bump what
`SCHEMA_VERSION` resolves to (the last entry's `version`). `dayRecords.ts`, `intakes.ts`,
`medications.ts` are thin repositories over these stores; `exportImport.ts` builds/restores
the manual JSON export. `restoreExport` **merges** — a day or dose whose key is also in the
file is replaced by the file's, everything else on the device is left alone — and it reads
and validates the whole file before writing anything, so a malformed record writes nothing
at all. Both directions are reachable from the Library screen (`ExportAction`/`ImportAction`).

There is no network code anywhere in the app by design — `src/guards.test.ts` scans every
source file for `fetch`/`XMLHttpRequest`/`WebSocket`/URLs and fails the build if any
appear, plus scans for prescriptive copy, notification APIs, and time-of-day capture (the
app is day-granularity only, never records a time).

### State (`src/state/`)

`AppDataProvider`/`useAppData()` is the single source of app state — it loads all repos on
mount and exposes them plus mutation functions (`saveDayRecord`, `saveIntake`,
`addMedication`, `setAnalysisTarget`, `exportData`, …). Every mutation **writes to the
repository, then reloads from it** — never optimistic-only — so the UI always reflects what
was actually persisted. `useAnalysis(window)` memoizes a `runAnalysis()` call over the
current app data.

### Testing

Vitest + `@testing-library/react`, jsdom, `globals: true` (test files never import
`test`/`expect`/`vi` — they're ambient). `fake-indexeddb/auto` is loaded in
`src/test/setup.ts`, so `src/data/` tests run against a real (fake) IndexedDB rather than
mocks — tests that touch the db call `closeDb()`/`await deleteDb()` in `afterEach` to reset
state between tests. `src/test/factories.ts` has `makeScores`/`makeDayRecord`/
`makeIntake`/`makeMedication` builders for constructing domain fixtures.

`src/styles/tokens.test.ts` is a parity test that regex-parses
`design-system/foundations/colors.html` and `src/styles/tokens.css` and fails if their
token values diverge — colors.html is the source of truth for that file.
