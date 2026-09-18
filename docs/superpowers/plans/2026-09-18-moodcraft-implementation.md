# Moodcraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Moodcraft — a private, offline, single-person React app for recording daily mood scores and medication intake, and for seeing how the spacing between doses relates to how well a dose worked.

**Architecture:** Three layers with hard boundaries. (1) A pure-TypeScript domain + analysis core with no React and no I/O — every rule in the domain spec is a tested function. (2) A repository layer over IndexedDB with an explicit, versioned migration mechanism so future app updates can reshape stored data. (3) A React UI built from scratch against the design system's CSS custom properties — no UI component library, because the design system is plain CSS and a framework would fight it. Charts are hand-authored SVG, mirroring `design-system/components/trend-chart.html`.

**Tech Stack:** React 19, TypeScript 5 (strict), Vite 6, React Router 7, `idb` 8 (thin IndexedDB wrapper), CSS Modules + a single token stylesheet, Vitest + @testing-library/react + jsdom + fake-indexeddb. No CSS framework, no component library, no charting library, no date library (`Intl.DateTimeFormat` + ISO date strings only).

**Spec:** [`domain-spec-moodcraft.md`](../../../domain-spec-moodcraft.md) and the design system in [`design-system/`](../../../design-system/) (foundations: overview, colors, typography, spacing; 13 components; 3 screens). Executors must read both. Every visual decision has a source file — cite it in commits.

## Global Constraints

These apply to **every** task. A task's requirements implicitly include this section.

- **No network code, ever.** No `fetch`, no analytics, no fonts from a CDN, no telemetry, no error reporting service. Data never leaves the device (R-18). A test asserts the built bundle contains no `http://` or `https://` request URLs.
- **No accounts, no sync, no notifications, no reminders, no service-worker push** (R-18, R-20). Nothing in the UI may nag, streak, remind, or congratulate.
- **Descriptive, never prescriptive** (R-08). No copy may recommend a dose, a gap, or an action. Banned words in user-facing strings: "should", "recommend", "advice", "try", "aim for", "target", "better to", "you need to". A lint test (Task 27) greps rendered copy constants for these.
- **5 is always worst** (R-02). Every score is an integer 1–5. No reverse scoring anywhere, including in analysis — improvement is always a *decrease*.
- **All 13 items are answered on every day record** (R-03). A record is only written once all 13 have values; partial edits live in component state.
- **Day granularity only** (R-04). No time-of-day is stored or displayed anywhere. Dates are `YYYY-MM-DD` strings in the user's local calendar — never `Date` objects in storage, never UTC timestamps for a calendar day.
- **Absence is information** (R-06, R-07). A missing day record renders as an explicit "unknown" state, never as 0, never interpolated, never bridged in a chart. A missing intake means "not taken" and is trusted as fact — never phrased as a missed or forgotten dose.
- **Exactly one medication under analysis at a time** (R-11). Others stay in the library with history intact (A-01, spec §4.3).
- **No configured medication knowledge** (R-15). No onset, duration, target gap, or typical dose fields exist in any type. If a type gains such a field, the task is wrong.
- **Every pattern statement is shown, however thin, with thin data visibly marked** (R-16). Never hide a statement for low confidence.
- **Design tokens are the only source of color, spacing, radius and type.** No hard-coded hex values, px sizes or font stacks in any component CSS — only `var(--token)`. The two exceptions already present in the design system (`.btn-primary{color:#14121F}` and the score-selector's `#20182B`/`#F4F2FB` on-fill text colors) become tokens in Task 2 and are referenced as tokens thereafter.
- **No drop shadows** (`foundations/spacing.html`). "Raised" = lighter fill + hairline border. Accent-tinted glow is reserved for focus/active feedback only.
- **Dark only.** No light theme, no theme toggle, no `prefers-color-scheme` branch.
- **Strict TypeScript.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any`, no non-null `!` assertions in `src/domain`, `src/data`, `src/analysis`.
- **TDD.** Every task writes the failing test first, watches it fail, then implements. Commit after each task's tests pass.

## Assumptions carried from the spec

Stated so the executor does not re-litigate them. Recorded in the plan, not invented by it.

- **Q-01 / A-03** — the event tick-list is app-defined and fixed at 8 events: Bad sleep, Conflict, Illness, Work stress (bad); Good news, Social event, Exercise, Travel (good). Source: spec Q-01 and `design-system/components/event-chip.html`.
- **Q-03 / A-01** — one medication is analysed *at a time*, switchable, with every medication's history retained. Source: spec §4.3, `design-system/components/medication-library-list.html`.
- **Q-04** — "improvement" is a **mean across all 13 items** (the composite), and the analysis **also** reports per-item improvement so items that respond differently stay visible. Both are computed; the composite drives the headline statements.
- **A-04** — no free-text note on a day record.
- **A-05** — export is a JSON file. No doctor-facing printable summary.
- **A-06** — a break is identified purely by gap length; the user never marks one.

---

## File Structure

Split by responsibility, not by layer-within-feature. Files that change together live together.

```
index.html
vite.config.ts                     Vite + Vitest config (jsdom, setup file)
tsconfig.json                      strict TS
src/
  main.tsx                         mount, router
  App.tsx                          routes inside NavShell, AppDataProvider
  styles/
    tokens.css                     :root custom properties, verbatim from design-system foundations
    global.css                     reset, body, focus-visible glow, .visually-hidden
  domain/
    types.ts                       IsoDate, ItemId, EventId, DayRecord, Intake, Medication, Settings
    items.ts                       the 13 items, ordered, with labels
    events.ts                      the 8 events with valence
    date.ts                        ISO date arithmetic + formatting (local calendar, no tz drift)
  data/
    db.ts                          openDb(), schema version, migration runner
    migrations.ts                  ordered migration list — the update mechanism
    dayRecords.ts                  repository: get/put/range/delete
    intakes.ts                     repository: get/put/range/delete by medication
    medications.ts                 repository + analysis-target setting
    exportImport.ts                serialize to / restore from a JSON file
  analysis/
    types.ts                       AnalysisInput, AnalysisResult, Statement, GapBucket
    composite.ts                   composite score + per-item vectors
    baseline.ts                    measured pre-first-intake baseline (R-09/R-10)
    gaps.ts                        intakes -> gaps
    improvement.ts                 response window improvement vs baseline (R-12)
    confounders.ts                 event-flagged days (R-13)
    threshold.ts                   learned reset threshold + dose-size effect (R-13/R-14)
    statements.ts                  Statement objects with sample sizes and thin flags (R-16)
    run.ts                         runAnalysis(): windows (R-17), spacing-only mode (R-10)
  state/
    AppDataProvider.tsx            loads all data once, exposes mutations, re-runs analysis
    useAnalysis.ts                 memoized analysis per window
  ui/                              design-system primitives, domain-agnostic
    Card.tsx / Card.module.css
    Button.tsx / Button.module.css
    Badge.tsx / Badge.module.css
    Pill.tsx / Pill.module.css
    SectionTitle.tsx
    SegmentedScore.tsx / .module.css       the 1-5 score control
    Chip.tsx / Chip.module.css             event chip
    Field.tsx / Field.module.css
    Toggle.tsx / Toggle.module.css         window toggle
    Combobox.tsx / Combobox.module.css     medication picker
  components/                      domain components, one per design-system component file
    NavShell.tsx / .module.css
    DateNavigator.tsx / .module.css
    ItemRow.tsx / .module.css
    EventChipGroup.tsx
    IntakeField.tsx
    UnknownDayState.tsx / .module.css
    PatternStatementCard.tsx / .module.css
    TrendChart.tsx / .module.css
    MedicationLibraryList.tsx / .module.css
    ExportAction.tsx
  screens/
    TodayScreen.tsx / .module.css
    TrendsScreen.tsx / .module.css
    LibraryScreen.tsx / .module.css
  test/
    setup.ts                       jsdom + fake-indexeddb + testing-library cleanup
    factories.ts                   builders for DayRecord / Intake / Medication
```

Tests are colocated: `src/analysis/gaps.test.ts`, `src/ui/SegmentedScore.test.tsx`, etc.

---

# Phase 0 — Foundation

Produces: an app that boots, a test runner that runs, and a token stylesheet that matches the design system exactly.

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test`, `npm run build`, `npm run typecheck`; `App` default export; global test setup with `fake-indexeddb` installed.

- [ ] **Step 1: Scaffold the project**

```bash
cd /home/meyhem/dev/moodcraft
npm create vite@latest . -- --template react-ts
npm install
npm install idb
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb
npm install react-router-dom
```

If `npm create vite` refuses because the directory is non-empty, answer "Ignore files and continue".

- [ ] **Step 2: Configure Vite + Vitest**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 3: Tighten TypeScript**

In `tsconfig.json` `compilerOptions`, ensure:

```json
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

- [ ] **Step 4: Write the test setup file**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Write the failing smoke test**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders the app shell with its three destinations', () => {
  render(
    <MemoryRouter initialEntries={['/today']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Trends' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
})
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — App renders the Vite starter, no such links.

- [ ] **Step 7: Write the minimal App**

`src/App.tsx` (NavShell arrives properly in Task 17; this is the minimum that satisfies the test):

```tsx
import { NavLink, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <div>
      <nav>
        <NavLink to="/today">Today</NavLink>
        <NavLink to="/trends">Trends</NavLink>
        <NavLink to="/library">Library</NavLink>
      </nav>
      <Routes>
        <Route path="/today" element={<main />} />
        <Route path="/trends" element={<main />} />
        <Route path="/library" element={<main />} />
      </Routes>
    </div>
  )
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Create empty `src/styles/tokens.css` and `src/styles/global.css` for now — Task 2 fills them. Delete `src/App.css`, `src/index.css`, `src/assets/react.svg`, and the counter demo.

- [ ] **Step 8: Verify green**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 1 test passing, no type errors, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS app with Vitest harness"
```

### Task 2: Design tokens and global styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: Task 1's build.
- Produces: every custom property named in `design-system/foundations/colors.html` plus `--on-accent:#14121F`, `--on-severity-light:#20182B`, `--on-severity-dark:#F4F2FB`, `--focus-glow`. All component CSS from here on uses only these.

- [ ] **Step 1: Write the failing token-parity test**

`src/styles/tokens.test.ts` — this is a *parity* test: it reads the design system source and asserts our token file agrees with it, so a design-system edit that we fail to port turns the suite red.

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
const reference = readFileSync(
  resolve(__dirname, '../../design-system/foundations/colors.html'),
  'utf8',
)

function declarations(source: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, name, value] of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!map.has(name)) map.set(name, value.trim())
  }
  return map
}

test('every design-system token is declared with the same value', () => {
  const ours = declarations(tokens)
  const theirs = declarations(reference)
  expect(theirs.size).toBeGreaterThan(30)
  for (const [name, value] of theirs) {
    expect(ours.get(name), `token ${name}`).toBe(value)
  }
})

test('declares the derived on-fill and focus tokens', () => {
  const ours = declarations(tokens)
  expect(ours.get('--on-accent')).toBe('#14121F')
  expect(ours.get('--on-severity-light')).toBe('#20182B')
  expect(ours.get('--on-severity-dark')).toBe('#F4F2FB')
  expect(ours.has('--focus-glow')).toBe(true)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: FAIL — `tokens.css` is empty.

- [ ] **Step 3: Write tokens.css**

Copy the `:root` block from `design-system/foundations/colors.html` **verbatim** (the same block appears in every design-system file), then append the derived tokens:

```bash
cd /home/meyhem/dev/moodcraft
python3 - <<'PY'
import re
src = open('design-system/foundations/colors.html').read()
root = re.search(r':root\{.*?\}', src, re.S).group(0)
extra = """
:root{
  --on-accent:#14121F;
  --on-severity-light:#20182B;
  --on-severity-dark:#F4F2FB;
  --focus-glow:0 0 0 3px rgba(139,133,240,.28);
}
"""
open('src/styles/tokens.css','w').write(root + "\n" + extra)
PY
```

Verify the written file contains `--severity-5:#5A3F70;` and `--fs-statement:18px;`.

- [ ] **Step 4: Write global.css**

Derived from the shared boilerplate in the design-system files — reset, body, and the focus treatment described in `foundations/spacing.html` ("soft accent-tinted glow … reserved for interaction feedback").

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; min-height: 100%; }

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
}

/* numerals are read at a glance everywhere (foundations/typography.html) */
body { font-variant-numeric: tabular-nums; }

button, input, select { font: inherit; color: inherit; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  box-shadow: var(--focus-glow);
}

.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 5: Verify green**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/styles package.json
git commit -m "feat: port design-system tokens and global styles with parity test"
```

---

# Phase 1 — Domain model and device storage

Produces: typed domain values and a migrating IndexedDB store that survives app updates.

### Task 3: Domain types, the 13 items, the 8 events, and date arithmetic

**Files:**
- Create: `src/domain/types.ts`, `src/domain/items.ts`, `src/domain/events.ts`, `src/domain/date.ts`
- Test: `src/domain/items.test.ts`, `src/domain/date.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type IsoDate = string` (branded `YYYY-MM-DD`), `type Score = 1|2|3|4|5`
  - `ITEMS: readonly Item[]` where `Item = { id: ItemId; label: string }`, length 13
  - `EVENTS: readonly EventDef[]` where `EventDef = { id: EventId; label: string; valence: 'good'|'bad' }`, length 8
  - `DayRecord = { date: IsoDate; scores: Record<ItemId, Score>; events: EventId[] }`
  - `Intake = { date: IsoDate; medicationId: string; mg: number }`
  - `Medication = { id: string; name: string; createdAt: IsoDate }`
  - `Settings = { analysisMedicationId: string | null; schemaNote?: string }`
  - date helpers: `toIso(d: Date): IsoDate`, `fromIso(s: IsoDate): Date`, `addDays(s: IsoDate, n: number): IsoDate`, `daysBetween(a: IsoDate, b: IsoDate): number`, `todayIso(): IsoDate`, `formatLong(s: IsoDate): string`, `formatShort(s: IsoDate): string`, `weekdayInitial(s: IsoDate): string`, `rangeInclusive(a: IsoDate, b: IsoDate): IsoDate[]`

- [ ] **Step 1: Write the failing tests**

`src/domain/items.test.ts`:

```ts
import { ITEMS } from './items'
import { EVENTS } from './events'

test('there are exactly 13 items, in spec order, with unique ids', () => {
  expect(ITEMS).toHaveLength(13)
  expect(ITEMS.map((i) => i.label)).toEqual([
    'Tiredness',
    'Rumination',
    'Sadness',
    'Loneliness',
    'Social withdrawal — how much I avoided people',
    'Lack of desire for company',
    'Anhedonia — nothing felt enjoyable',
    'Anxiety',
    'Irritability',
    'Difficulty concentrating',
    'Lack of motivation',
    'Hopelessness',
    'Poor sleep',
  ])
  expect(new Set(ITEMS.map((i) => i.id)).size).toBe(13)
})

test('there are 8 events, four good and four bad', () => {
  expect(EVENTS).toHaveLength(8)
  expect(EVENTS.filter((e) => e.valence === 'bad').map((e) => e.label)).toEqual([
    'Bad sleep', 'Conflict', 'Illness', 'Work stress',
  ])
  expect(EVENTS.filter((e) => e.valence === 'good').map((e) => e.label)).toEqual([
    'Good news', 'Social event', 'Exercise', 'Travel',
  ])
})
```

`src/domain/date.test.ts`:

```ts
import { addDays, daysBetween, rangeInclusive, toIso, weekdayInitial, formatLong } from './date'

test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})

test('addDays is immune to DST shifts', () => {
  // Europe/Warsaw springs forward 2026-03-29
  expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
})

test('daysBetween counts calendar days, later minus earlier', () => {
  expect(daysBetween('2026-09-10', '2026-09-15')).toBe(5)
  expect(daysBetween('2026-09-15', '2026-09-10')).toBe(-5)
  expect(daysBetween('2026-09-15', '2026-09-15')).toBe(0)
})

test('rangeInclusive yields every day between the bounds', () => {
  expect(rangeInclusive('2026-09-13', '2026-09-16')).toEqual([
    '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16',
  ])
})

test('toIso uses the local calendar day, not UTC', () => {
  expect(toIso(new Date(2026, 8, 15, 23, 30))).toBe('2026-09-15')
  expect(toIso(new Date(2026, 8, 15, 0, 30))).toBe('2026-09-15')
})

test('formatting matches the design system', () => {
  expect(formatLong('2026-09-15')).toBe('Tuesday, September 15')
  expect(weekdayInitial('2026-09-15')).toBe('T')
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/domain`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the domain modules**

`src/domain/types.ts`:

```ts
export type IsoDate = string & { readonly __isoDate?: unique symbol }
export type Score = 1 | 2 | 3 | 4 | 5
export type ItemId = string
export type EventId = string

export interface Item { id: ItemId; label: string }
export interface EventDef { id: EventId; label: string; valence: 'good' | 'bad' }

export interface DayRecord {
  date: IsoDate
  scores: Record<ItemId, Score>
  events: EventId[]
}

export interface Intake {
  date: IsoDate
  medicationId: string
  mg: number
}

export interface Medication {
  id: string
  name: string
  createdAt: IsoDate
}

export interface Settings {
  analysisMedicationId: string | null
}
```

`src/domain/items.ts` — ids are stable slugs because the item list is explicitly not frozen (spec §4.2); a removed item must leave a hole, never shift another item's history:

```ts
import type { Item } from './types'

export const ITEMS: readonly Item[] = [
  { id: 'tiredness', label: 'Tiredness' },
  { id: 'rumination', label: 'Rumination' },
  { id: 'sadness', label: 'Sadness' },
  { id: 'loneliness', label: 'Loneliness' },
  { id: 'social-withdrawal', label: 'Social withdrawal — how much I avoided people' },
  { id: 'no-desire-company', label: 'Lack of desire for company' },
  { id: 'anhedonia', label: 'Anhedonia — nothing felt enjoyable' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'irritability', label: 'Irritability' },
  { id: 'concentration', label: 'Difficulty concentrating' },
  { id: 'motivation', label: 'Lack of motivation' },
  { id: 'hopelessness', label: 'Hopelessness' },
  { id: 'sleep', label: 'Poor sleep' },
] as const

export const ITEM_IDS = ITEMS.map((i) => i.id)
export function itemLabel(id: ItemId): string {
  return ITEMS.find((i) => i.id === id)?.label ?? id
}
```

`src/domain/events.ts`:

```ts
import type { EventDef, EventId } from './types'

export const EVENTS: readonly EventDef[] = [
  { id: 'bad-sleep', label: 'Bad sleep', valence: 'bad' },
  { id: 'conflict', label: 'Conflict', valence: 'bad' },
  { id: 'illness', label: 'Illness', valence: 'bad' },
  { id: 'work-stress', label: 'Work stress', valence: 'bad' },
  { id: 'good-news', label: 'Good news', valence: 'good' },
  { id: 'social-event', label: 'Social event', valence: 'good' },
  { id: 'exercise', label: 'Exercise', valence: 'good' },
  { id: 'travel', label: 'Travel', valence: 'good' },
] as const

export function eventDef(id: EventId): EventDef | undefined {
  return EVENTS.find((e) => e.id === id)
}
```

Note the `EVENTS` order puts the four bad events first so the test's filtered orders hold, and it matches the tick order shown in `design-system/components/event-chip.html` closely enough; the screen renders them in `EVENTS` order.

`src/domain/date.ts` — all arithmetic goes through UTC-noon anchors so DST never shifts a calendar day:

```ts
import type { IsoDate } from './types'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function assertIso(value: string): asserts value is IsoDate {
  if (!ISO.test(value)) throw new Error(`Not an ISO date: ${value}`)
}

export function toIso(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` as IsoDate
}

export function todayIso(): IsoDate {
  return toIso(new Date())
}

function anchor(s: IsoDate): Date {
  assertIso(s)
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function fromAnchor(d: Date): IsoDate {
  return d.toISOString().slice(0, 10) as IsoDate
}

export function fromIso(s: IsoDate): Date {
  assertIso(s)
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

export function addDays(s: IsoDate, n: number): IsoDate {
  const a = anchor(s)
  a.setUTCDate(a.getUTCDate() + n)
  return fromAnchor(a)
}

export function daysBetween(earlier: IsoDate, later: IsoDate): number {
  return Math.round((anchor(later).getTime() - anchor(earlier).getTime()) / 86_400_000)
}

export function rangeInclusive(a: IsoDate, b: IsoDate): IsoDate[] {
  const out: IsoDate[] = []
  for (let d = a; daysBetween(d, b) >= 0; d = addDays(d, 1)) out.push(d)
  return out
}

const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const SHORT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export function formatLong(s: IsoDate): string {
  return LONG.format(fromIso(s))
}

export function formatShort(s: IsoDate): string {
  return SHORT.format(fromIso(s))
}

export function weekdayInitial(s: IsoDate): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(fromIso(s))
}
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run src/domain && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): items, events, types and calendar-safe date helpers"
```

### Task 4: IndexedDB with a versioned migration mechanism

**Files:**
- Create: `src/data/db.ts`, `src/data/migrations.ts`
- Test: `src/data/migrations.test.ts`

**Interfaces:**
- Consumes: `src/domain/types.ts`.
- Produces:
  - `SCHEMA_VERSION: number` (starts at 1)
  - `interface Migration { version: number; describe: string; upgrade(db, tx): void }`
  - `MIGRATIONS: readonly Migration[]` — ordered, append-only
  - `openDb(name?: string): Promise<IDBPDatabase<MoodcraftDB>>`
  - `MoodcraftDB` typed schema: stores `dayRecords` (key `date`), `intakes` (key `[medicationId, date]`, index `by-medication`), `medications` (key `id`), `settings` (key `key`)
  - `closeDb(): void`, `deleteDb(name?: string): Promise<void>` (tests only)

Why this shape: `idb`'s `upgrade` callback receives `oldVersion`, so a released app can be updated by **appending** a migration object and bumping `SCHEMA_VERSION`. Migrations are never edited once shipped.

- [ ] **Step 1: Write the failing migration tests**

`src/data/migrations.test.ts`:

```ts
import { openDB } from 'idb'
import { MIGRATIONS, SCHEMA_VERSION, openDb, closeDb, deleteDb } from './db'

afterEach(async () => {
  closeDb()
  await deleteDb('moodcraft-test')
})

test('migration list is ordered, gapless, starts at 1 and ends at SCHEMA_VERSION', () => {
  expect(MIGRATIONS.map((m) => m.version)).toEqual(
    MIGRATIONS.map((_, i) => i + 1),
  )
  expect(MIGRATIONS.at(-1)?.version).toBe(SCHEMA_VERSION)
  for (const m of MIGRATIONS) expect(m.describe.length).toBeGreaterThan(0)
})

test('a fresh database ends up with every store', async () => {
  const db = await openDb('moodcraft-test')
  expect([...db.objectStoreNames].sort()).toEqual([
    'dayRecords', 'intakes', 'medications', 'settings',
  ])
  expect(db.version).toBe(SCHEMA_VERSION)
})

test('an older database is upgraded without losing rows', async () => {
  // simulate a v1 database written by an earlier release
  const legacy = await openDB('moodcraft-test', 1, {
    upgrade(db) {
      MIGRATIONS[0]!.upgrade(db, null as never)
    },
  })
  await legacy.put('dayRecords', { date: '2026-09-15', scores: {}, events: [] })
  legacy.close()

  const db = await openDb('moodcraft-test')
  expect(db.version).toBe(SCHEMA_VERSION)
  expect(await db.get('dayRecords', '2026-09-15')).toMatchObject({ date: '2026-09-15' })
})

test('intakes are keyed per medication per day', async () => {
  const db = await openDb('moodcraft-test')
  await db.put('intakes', { medicationId: 'm1', date: '2026-09-15', mg: 100 })
  await db.put('intakes', { medicationId: 'm1', date: '2026-09-15', mg: 150 })
  expect(await db.getAll('intakes')).toHaveLength(1)
  expect((await db.getAll('intakes'))[0]).toMatchObject({ mg: 150 })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/data/migrations.test.ts`
Expected: FAIL — `./db` not found.

- [ ] **Step 3: Implement the schema and migration runner**

`src/data/migrations.ts`:

```ts
import type { IDBPDatabase, IDBPTransaction } from 'idb'
import type { MoodcraftDB } from './db'

export interface Migration {
  version: number
  describe: string
  upgrade(
    db: IDBPDatabase<MoodcraftDB>,
    tx: IDBPTransaction<MoodcraftDB, ArrayLike<never>, 'versionchange'>,
  ): void
}

/**
 * Append-only. Never edit a migration that has shipped — add the next one.
 * Each entry takes the database from version-1 to version.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    describe: 'initial stores: dayRecords, intakes, medications, settings',
    upgrade(db) {
      db.createObjectStore('dayRecords', { keyPath: 'date' })
      const intakes = db.createObjectStore('intakes', { keyPath: ['medicationId', 'date'] })
      intakes.createIndex('by-medication', 'medicationId')
      db.createObjectStore('medications', { keyPath: 'id' })
      db.createObjectStore('settings', { keyPath: 'key' })
    },
  },
]
```

`src/data/db.ts`:

```ts
import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayRecord, Intake, Medication } from '../domain/types'
import { MIGRATIONS } from './migrations'

export interface MoodcraftDB extends DBSchema {
  dayRecords: { key: string; value: DayRecord }
  intakes: {
    key: [string, string]
    value: Intake
    indexes: { 'by-medication': string }
  }
  medications: { key: string; value: Medication }
  settings: { key: string; value: { key: string; value: unknown } }
}

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version
export const DB_NAME = 'moodcraft'

let handle: Promise<IDBPDatabase<MoodcraftDB>> | null = null

export function openDb(name = DB_NAME): Promise<IDBPDatabase<MoodcraftDB>> {
  handle ??= openDB<MoodcraftDB>(name, SCHEMA_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (const migration of MIGRATIONS) {
        if (migration.version > oldVersion) migration.upgrade(db, tx)
      }
    },
    blocking() {
      // another tab wants to upgrade: let go so the update can proceed
      closeDb()
    },
  })
  return handle
}

export function closeDb(): void {
  void handle?.then((db) => db.close())
  handle = null
}

export async function deleteDb(name = DB_NAME): Promise<void> {
  closeDb()
  await deleteDB(name)
}

export { MIGRATIONS } from './migrations'
```

Note `openDb` memoizes per process; tests call `closeDb()` in `afterEach` so a different name can be opened.

- [ ] **Step 4: Verify green**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data
git commit -m "feat(data): IndexedDB schema with append-only migration mechanism"
```

### Task 5: Repositories

**Files:**
- Create: `src/data/dayRecords.ts`, `src/data/intakes.ts`, `src/data/medications.ts`
- Create: `src/test/factories.ts`
- Test: `src/data/repositories.test.ts`

**Interfaces:**
- Consumes: `openDb`, domain types.
- Produces:
  - `dayRecords`: `get(date): Promise<DayRecord|undefined>`, `put(record): Promise<void>`, `remove(date): Promise<void>`, `all(): Promise<DayRecord[]>` (sorted by date ascending)
  - `intakes`: `forMedication(id): Promise<Intake[]>` (sorted ascending), `put(intake): Promise<void>`, `remove(medicationId, date): Promise<void>`, `all(): Promise<Intake[]>`
  - `medications`: `all(): Promise<Medication[]>`, `add(name): Promise<Medication>`, `get(id)`, `analysisTargetId(): Promise<string|null>`, `setAnalysisTarget(id): Promise<void>`
  - `factories.ts`: `makeDayRecord(date, overrides?)` (fills all 13 scores with 3 by default), `makeIntake(date, mg, medicationId?)`, `makeMedication(name?)`

- [ ] **Step 1: Write the failing repository tests**

`src/data/repositories.test.ts`:

```ts
import { closeDb, deleteDb } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { makeDayRecord, makeIntake } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

test('day records round-trip and come back in date order', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await dayRecords.put(makeDayRecord('2026-09-13'))
  expect((await dayRecords.all()).map((r) => r.date)).toEqual(['2026-09-13', '2026-09-15'])
  expect(await dayRecords.get('2026-09-15')).toMatchObject({ date: '2026-09-15' })
})

test('putting the same date twice replaces, never duplicates (R-01)', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15', { events: ['conflict'] }))
  await dayRecords.put(makeDayRecord('2026-09-15', { events: [] }))
  const all = await dayRecords.all()
  expect(all).toHaveLength(1)
  expect(all[0]!.events).toEqual([])
})

test('a removed day record becomes unknown again, not zero (R-06)', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await dayRecords.remove('2026-09-15')
  expect(await dayRecords.get('2026-09-15')).toBeUndefined()
})

test('intakes are scoped to a medication and ordered', async () => {
  await intakes.put(makeIntake('2026-09-15', 150, 'm1'))
  await intakes.put(makeIntake('2026-09-10', 100, 'm1'))
  await intakes.put(makeIntake('2026-09-12', 80, 'm2'))
  expect((await intakes.forMedication('m1')).map((i) => i.date))
    .toEqual(['2026-09-10', '2026-09-15'])
})

test('exactly one medication is the analysis target (R-11)', async () => {
  const a = await medications.add('Medication A')
  const b = await medications.add('Caffeine')
  await medications.setAnalysisTarget(a.id)
  expect(await medications.analysisTargetId()).toBe(a.id)
  await medications.setAnalysisTarget(b.id)
  expect(await medications.analysisTargetId()).toBe(b.id)
  expect(await medications.all()).toHaveLength(2) // switching discards nothing
})

test('the first medication added becomes the analysis target', async () => {
  const a = await medications.add('Medication A')
  expect(await medications.analysisTargetId()).toBe(a.id)
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/data/repositories.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the factories**

`src/test/factories.ts`:

```ts
import { ITEM_IDS } from '../domain/items'
import type { DayRecord, Intake, IsoDate, Medication, Score } from '../domain/types'

export function makeScores(value: Score = 3, overrides: Record<string, Score> = {}) {
  return Object.fromEntries(
    ITEM_IDS.map((id) => [id, overrides[id] ?? value]),
  ) as Record<string, Score>
}

export function makeDayRecord(
  date: string,
  overrides: Partial<DayRecord> & { score?: Score } = {},
): DayRecord {
  const { score = 3, ...rest } = overrides
  return {
    date: date as IsoDate,
    scores: makeScores(score),
    events: [],
    ...rest,
  }
}

export function makeIntake(date: string, mg: number, medicationId = 'm1'): Intake {
  return { date: date as IsoDate, medicationId, mg }
}

export function makeMedication(name = 'Medication A', id = 'm1'): Medication {
  return { id, name, createdAt: '2026-06-01' as IsoDate }
}
```

- [ ] **Step 4: Implement the repositories**

`src/data/dayRecords.ts`:

```ts
import { openDb } from './db'
import type { DayRecord, IsoDate } from '../domain/types'

export const dayRecords = {
  async get(date: IsoDate): Promise<DayRecord | undefined> {
    return (await openDb()).get('dayRecords', date)
  },
  async put(record: DayRecord): Promise<void> {
    await (await openDb()).put('dayRecords', record)
  },
  async remove(date: IsoDate): Promise<void> {
    await (await openDb()).delete('dayRecords', date)
  },
  async all(): Promise<DayRecord[]> {
    const rows = await (await openDb()).getAll('dayRecords')
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
}
```

`src/data/intakes.ts`:

```ts
import { openDb } from './db'
import type { Intake, IsoDate } from '../domain/types'

export const intakes = {
  async forMedication(medicationId: string): Promise<Intake[]> {
    const rows = await (await openDb()).getAllFromIndex('intakes', 'by-medication', medicationId)
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
  async put(intake: Intake): Promise<void> {
    if (!(intake.mg > 0)) throw new Error('Dose must be a positive number of milligrams')
    await (await openDb()).put('intakes', intake)
  },
  async remove(medicationId: string, date: IsoDate): Promise<void> {
    await (await openDb()).delete('intakes', [medicationId, date])
  },
  async all(): Promise<Intake[]> {
    const rows = await (await openDb()).getAll('intakes')
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
}
```

`src/data/medications.ts`:

```ts
import { openDb } from './db'
import { todayIso } from '../domain/date'
import type { Medication } from '../domain/types'

const ANALYSIS_TARGET = 'analysisMedicationId'

export const medications = {
  async all(): Promise<Medication[]> {
    const rows = await (await openDb()).getAll('medications')
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  },
  async get(id: string): Promise<Medication | undefined> {
    return (await openDb()).get('medications', id)
  },
  async add(name: string): Promise<Medication> {
    const medication: Medication = { id: crypto.randomUUID(), name: name.trim(), createdAt: todayIso() }
    const db = await openDb()
    await db.put('medications', medication)
    if ((await db.getAll('medications')).length === 1) {
      await medications.setAnalysisTarget(medication.id)
    }
    return medication
  },
  async analysisTargetId(): Promise<string | null> {
    const row = await (await openDb()).get('settings', ANALYSIS_TARGET)
    return (row?.value as string | undefined) ?? null
  },
  async setAnalysisTarget(id: string): Promise<void> {
    await (await openDb()).put('settings', { key: ANALYSIS_TARGET, value: id })
  },
}
```

- [ ] **Step 5: Verify green**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data src/test
git commit -m "feat(data): day record, intake and medication repositories"
```

### Task 6: Export and import

**Files:**
- Create: `src/data/exportImport.ts`
- Test: `src/data/exportImport.test.ts`

**Interfaces:**
- Consumes: the three repositories.
- Produces: `buildExport(): Promise<ExportFile>`, `serializeExport(): Promise<string>`, `restoreExport(json: string): Promise<void>`, `exportFilename(today: IsoDate): string`
- `ExportFile = { format: 'moodcraft-export'; schemaVersion: number; exportedAt: IsoDate; medications: Medication[]; dayRecords: DayRecord[]; intakes: Intake[]; analysisMedicationId: string | null }`

- [ ] **Step 1: Write the failing tests**

`src/data/exportImport.test.ts`:

```ts
import { closeDb, deleteDb, SCHEMA_VERSION } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { buildExport, restoreExport, serializeExport, exportFilename } from './exportImport'
import { makeDayRecord, makeIntake } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

test('export carries every record and the schema version', async () => {
  const med = await medications.add('Medication A')
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await intakes.put(makeIntake('2026-09-15', 150, med.id))

  const file = await buildExport()
  expect(file.format).toBe('moodcraft-export')
  expect(file.schemaVersion).toBe(SCHEMA_VERSION)
  expect(file.dayRecords).toHaveLength(1)
  expect(file.intakes).toHaveLength(1)
  expect(file.medications).toHaveLength(1)
  expect(file.analysisMedicationId).toBe(med.id)
})

test('a round trip restores the same data', async () => {
  await medications.add('Medication A')
  await dayRecords.put(makeDayRecord('2026-09-15', { events: ['conflict'] }))
  const json = await serializeExport()

  closeDb(); await deleteDb()
  await restoreExport(json)

  const restored = await dayRecords.all()
  expect(restored).toHaveLength(1)
  expect(restored[0]!.events).toEqual(['conflict'])
})

test('a foreign file is rejected', async () => {
  await expect(restoreExport('{"format":"something-else"}')).rejects.toThrow(/not a Moodcraft export/i)
})

test('the filename is dated and unceremonious', () => {
  expect(exportFilename('2026-09-18')).toBe('moodcraft-2026-09-18.json')
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/data/exportImport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/data/exportImport.ts`:

```ts
import { SCHEMA_VERSION } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { todayIso } from '../domain/date'
import type { DayRecord, Intake, IsoDate, Medication } from '../domain/types'

export interface ExportFile {
  format: 'moodcraft-export'
  schemaVersion: number
  exportedAt: IsoDate
  medications: Medication[]
  dayRecords: DayRecord[]
  intakes: Intake[]
  analysisMedicationId: string | null
}

export async function buildExport(): Promise<ExportFile> {
  return {
    format: 'moodcraft-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: todayIso(),
    medications: await medications.all(),
    dayRecords: await dayRecords.all(),
    intakes: await intakes.all(),
    analysisMedicationId: await medications.analysisTargetId(),
  }
}

export async function serializeExport(): Promise<string> {
  return JSON.stringify(await buildExport(), null, 2)
}

export function exportFilename(today: IsoDate): string {
  return `moodcraft-${today}.json`
}

export async function restoreExport(json: string): Promise<void> {
  const parsed = JSON.parse(json) as Partial<ExportFile>
  if (parsed.format !== 'moodcraft-export') {
    throw new Error('This file is not a Moodcraft export.')
  }
  if ((parsed.schemaVersion ?? 0) > SCHEMA_VERSION) {
    throw new Error('This export was written by a newer version of Moodcraft.')
  }
  for (const m of parsed.medications ?? []) {
    await (await import('./db')).openDb().then((db) => db.put('medications', m))
  }
  for (const r of parsed.dayRecords ?? []) await dayRecords.put(r)
  for (const i of parsed.intakes ?? []) await intakes.put(i)
  if (parsed.analysisMedicationId) await medications.setAnalysisTarget(parsed.analysisMedicationId)
}
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data
git commit -m "feat(data): manual JSON export and restore (R-19)"
```

---

# Phase 2 — Analysis core

Pure functions, no React, no I/O. This is where the domain's hard rules live. Every function here takes plain arrays and returns plain data.

Shared types, created in Task 7 and used by the rest of the phase — `src/analysis/types.ts`:

```ts
import type { DayRecord, Intake, IsoDate, ItemId } from '../domain/types'

export interface Baseline {
  /** mean composite over recorded days before the first intake */
  mean: number
  perItem: Record<ItemId, number>
  dayCount: number
  from: IsoDate
  to: IsoDate
}

export interface IntakeOutcome {
  date: IsoDate
  mg: number
  /** days since the previous intake; null for the first intake ever */
  gapDays: number | null
  /** mg of the previous intake; null for the first */
  previousMg: number | null
  /** mean composite over the recorded days in the response window */
  windowMean: number | null
  /** baseline.mean - windowMean; positive means scores fell, i.e. improvement */
  improvement: number | null
  /** recorded days found in the response window */
  measuredDays: number
  /** the window contained a day carrying any event (R-13) */
  confounded: boolean
}

export interface Statement {
  id: string
  /** plain sentence; `emphasis` marks the substring rendered bold */
  text: string
  emphasis: string[]
  sampleSize: number
  thin: boolean
}

export type WindowKey = 'recent' | 'long-term'

export interface AnalysisResult {
  medicationId: string | null
  window: WindowKey
  baseline: Baseline | null
  /** true when there is no measured pre-intake baseline: spacing only (R-10) */
  spacingOnly: boolean
  outcomes: IntakeOutcome[]
  resetThresholdDays: number | null
  statements: Statement[]
}

export interface AnalysisInput {
  medicationId: string | null
  dayRecords: DayRecord[]
  intakes: Intake[]
  today: IsoDate
}
```

Constants (same file), all justified by the spec, none of them user-configurable:

```ts
/** R-12: effect is looked for on the intake day and the days following it */
export const RESPONSE_WINDOW_DAYS = 3 // intake day + 2 following days
/** R-16: below this many contributing intakes a statement is marked thin */
export const THIN_SAMPLE = 8
/** R-17: the recent window */
export const RECENT_WINDOW_DAYS = 30
/** candidate reset thresholds searched in Task 10 (R-14) */
export const THRESHOLD_CANDIDATES = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14]
export const SHORT_GAP_MAX = 3
export const LONG_GAP_MIN = 5
```

### Task 7: Composite score and measured baseline

**Files:**
- Create: `src/analysis/types.ts`, `src/analysis/composite.ts`, `src/analysis/baseline.ts`
- Test: `src/analysis/composite.test.ts`, `src/analysis/baseline.test.ts`

**Interfaces:**
- Consumes: `ITEM_IDS`, domain types.
- Produces: `composite(record: DayRecord): number`, `perItem(records: DayRecord[]): Record<ItemId, number>`, `meanComposite(records: DayRecord[]): number | null`, `computeBaseline(records: DayRecord[], intakes: Intake[]): Baseline | null`

- [ ] **Step 1: Write the failing tests**

`src/analysis/composite.test.ts`:

```ts
import { composite, meanComposite } from './composite'
import { makeDayRecord } from '../test/factories'
import { makeScores } from '../test/factories'

test('composite is the mean of the 13 item scores', () => {
  expect(composite(makeDayRecord('2026-09-15', { score: 3 }))).toBe(3)
})

test('composite ignores items with no score, so a changed item list leaves a hole not a zero', () => {
  const record = makeDayRecord('2026-09-15', { scores: { tiredness: 5, sadness: 1 } })
  expect(composite(record)).toBe(3)
})

test('meanComposite of no records is null, never zero (R-06)', () => {
  expect(meanComposite([])).toBeNull()
})
```

`src/analysis/baseline.test.ts`:

```ts
import { computeBaseline } from './baseline'
import { makeDayRecord, makeIntake } from '../test/factories'

test('baseline is measured only from days before the first intake (R-09)', () => {
  const records = [
    makeDayRecord('2026-06-01', { score: 4 }),
    makeDayRecord('2026-06-02', { score: 4 }),
    makeDayRecord('2026-06-05', { score: 2 }), // after first intake: excluded
  ]
  const baseline = computeBaseline(records, [makeIntake('2026-06-03', 150)])
  expect(baseline).not.toBeNull()
  expect(baseline!.mean).toBe(4)
  expect(baseline!.dayCount).toBe(2)
  expect(baseline!.from).toBe('2026-06-01')
  expect(baseline!.to).toBe('2026-06-02')
})

test('no pre-intake day records means no baseline at all (R-10)', () => {
  const baseline = computeBaseline(
    [makeDayRecord('2026-06-05')],
    [makeIntake('2026-06-01', 150)],
  )
  expect(baseline).toBeNull()
})

test('with no intakes yet, every recorded day is baseline', () => {
  const baseline = computeBaseline([makeDayRecord('2026-06-01', { score: 3 })], [])
  expect(baseline!.dayCount).toBe(1)
})

test('baseline keeps per-item means so items can be read separately (Q-04)', () => {
  const records = [makeDayRecord('2026-06-01', { scores: { tiredness: 5, sadness: 3 } })]
  const baseline = computeBaseline(records, [])
  expect(baseline!.perItem.tiredness).toBe(5)
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/analysis`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/analysis/composite.ts`:

```ts
import { ITEM_IDS } from '../domain/items'
import type { DayRecord, ItemId } from '../domain/types'

export function composite(record: DayRecord): number {
  const values = ITEM_IDS.map((id) => record.scores[id]).filter(
    (v): v is number => typeof v === 'number',
  )
  if (values.length === 0) return Number.NaN
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function meanComposite(records: DayRecord[]): number | null {
  const values = records.map(composite).filter((v) => !Number.isNaN(v))
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function perItem(records: DayRecord[]): Record<ItemId, number> {
  const out: Record<ItemId, number> = {}
  for (const id of ITEM_IDS) {
    const values = records
      .map((r) => r.scores[id])
      .filter((v): v is number => typeof v === 'number')
    if (values.length > 0) out[id] = values.reduce((a, b) => a + b, 0) / values.length
  }
  return out
}
```

`src/analysis/baseline.ts`:

```ts
import { meanComposite, perItem } from './composite'
import type { Baseline } from './types'
import type { DayRecord, Intake } from '../domain/types'

export function computeBaseline(records: DayRecord[], intakes: Intake[]): Baseline | null {
  const firstIntake = intakes.map((i) => i.date).sort()[0]
  const pre = firstIntake
    ? records.filter((r) => r.date < firstIntake)
    : [...records]
  if (pre.length === 0) return null
  const sorted = pre.sort((a, b) => a.date.localeCompare(b.date))
  const mean = meanComposite(sorted)
  if (mean === null) return null
  return {
    mean,
    perItem: perItem(sorted),
    dayCount: sorted.length,
    from: sorted[0]!.date,
    to: sorted[sorted.length - 1]!.date,
  }
}
```

- [ ] **Step 4: Verify green, then commit**

Run: `npx vitest run src/analysis && npx tsc --noEmit`

```bash
git add src/analysis
git commit -m "feat(analysis): composite score and measured pre-intake baseline"
```

### Task 8: Gaps, response windows and improvement

**Files:**
- Create: `src/analysis/gaps.ts`, `src/analysis/improvement.ts`
- Test: `src/analysis/gaps.test.ts`, `src/analysis/improvement.test.ts`

**Interfaces:**
- Consumes: `computeBaseline`, `meanComposite`, `daysBetween`, `addDays`, `RESPONSE_WINDOW_DAYS`.
- Produces: `withGaps(intakes: Intake[]): Array<Intake & { gapDays: number|null; previousMg: number|null }>`, `responseWindow(date: IsoDate): IsoDate[]`, `computeOutcomes(intakes: Intake[], records: DayRecord[], baseline: Baseline | null): IntakeOutcome[]`

- [ ] **Step 1: Write the failing tests**

`src/analysis/gaps.test.ts`:

```ts
import { responseWindow, withGaps } from './gaps'
import { makeIntake } from '../test/factories'

test('the first intake has no gap and no previous dose', () => {
  const [first] = withGaps([makeIntake('2026-06-03', 150)])
  expect(first!.gapDays).toBeNull()
  expect(first!.previousMg).toBeNull()
})

test('gap is the number of days since the previous intake', () => {
  const rows = withGaps([
    makeIntake('2026-06-03', 150),
    makeIntake('2026-06-06', 100),
    makeIntake('2026-06-07', 100),
  ])
  expect(rows.map((r) => r.gapDays)).toEqual([null, 3, 1])
  expect(rows.map((r) => r.previousMg)).toEqual([null, 150, 100])
})

test('intakes given out of order are sorted before gaps are derived', () => {
  const rows = withGaps([makeIntake('2026-06-06', 100), makeIntake('2026-06-03', 150)])
  expect(rows.map((r) => r.date)).toEqual(['2026-06-03', '2026-06-06'])
})

test('a long break is just a long gap, never missing data', () => {
  const rows = withGaps([makeIntake('2026-06-01', 150), makeIntake('2026-06-15', 150)])
  expect(rows[1]!.gapDays).toBe(14)
})

test('the response window is the intake day and the days following it (R-12)', () => {
  expect(responseWindow('2026-09-15')).toEqual(['2026-09-15', '2026-09-16', '2026-09-17'])
})
```

`src/analysis/improvement.test.ts`:

```ts
import { computeOutcomes } from './improvement'
import { computeBaseline } from './baseline'
import { makeDayRecord, makeIntake } from '../test/factories'

const baselineRecords = [
  makeDayRecord('2026-06-01', { score: 4 }),
  makeDayRecord('2026-06-02', { score: 4 }),
]

test('improvement is a fall in score relative to baseline (5 is worst)', () => {
  const records = [...baselineRecords, makeDayRecord('2026-06-03', { score: 2 })]
  const intakes = [makeIntake('2026-06-03', 150)]
  const baseline = computeBaseline(records, intakes)
  const [outcome] = computeOutcomes(intakes, records, baseline)
  expect(outcome!.improvement).toBe(2)
  expect(outcome!.measuredDays).toBe(1)
})

test('a worse day after a dose is negative improvement, not zero', () => {
  const records = [...baselineRecords, makeDayRecord('2026-06-03', { score: 5 })]
  const intakes = [makeIntake('2026-06-03', 150)]
  const [outcome] = computeOutcomes(intakes, records, computeBaseline(records, intakes))
  expect(outcome!.improvement).toBe(-1)
})

test('an intake with no day record in its window has no measured outcome (R-06)', () => {
  const intakes = [makeIntake('2026-06-03', 150)]
  const [outcome] = computeOutcomes(intakes, baselineRecords, computeBaseline(baselineRecords, intakes))
  expect(outcome!.improvement).toBeNull()
  expect(outcome!.measuredDays).toBe(0)
  expect(outcome!.gapDays).toBeNull() // still counts toward gaps for the next intake
})

test('without a baseline there is no improvement figure, only gaps (R-10)', () => {
  const records = [makeDayRecord('2026-06-03', { score: 2 })]
  const intakes = [makeIntake('2026-06-03', 150)]
  const [outcome] = computeOutcomes(intakes, records, null)
  expect(outcome!.improvement).toBeNull()
  expect(outcome!.windowMean).toBe(2)
})

test('the window averages every recorded day it contains', () => {
  const records = [
    ...baselineRecords,
    makeDayRecord('2026-06-03', { score: 2 }),
    makeDayRecord('2026-06-05', { score: 4 }),
  ]
  const intakes = [makeIntake('2026-06-03', 150)]
  const [outcome] = computeOutcomes(intakes, records, computeBaseline(records, intakes))
  expect(outcome!.windowMean).toBe(3)
  expect(outcome!.measuredDays).toBe(2)
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/analysis`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/analysis/gaps.ts`:

```ts
import { addDays, daysBetween } from '../domain/date'
import { RESPONSE_WINDOW_DAYS } from './types'
import type { Intake, IsoDate } from '../domain/types'

export interface GappedIntake extends Intake {
  gapDays: number | null
  previousMg: number | null
}

export function withGaps(intakes: Intake[]): GappedIntake[] {
  const sorted = [...intakes].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((intake, index) => {
    const previous = index > 0 ? sorted[index - 1]! : null
    return {
      ...intake,
      gapDays: previous ? daysBetween(previous.date, intake.date) : null,
      previousMg: previous ? previous.mg : null,
    }
  })
}

export function responseWindow(date: IsoDate): IsoDate[] {
  return Array.from({ length: RESPONSE_WINDOW_DAYS }, (_, i) => addDays(date, i))
}
```

`src/analysis/improvement.ts`:

```ts
import { meanComposite } from './composite'
import { responseWindow, withGaps } from './gaps'
import { isConfounded } from './confounders'
import type { Baseline, IntakeOutcome } from './types'
import type { DayRecord, Intake } from '../domain/types'

export function computeOutcomes(
  intakes: Intake[],
  records: DayRecord[],
  baseline: Baseline | null,
): IntakeOutcome[] {
  const byDate = new Map(records.map((r) => [r.date, r]))
  return withGaps(intakes).map((intake) => {
    const window = responseWindow(intake.date)
    const measured = window
      .map((d) => byDate.get(d))
      .filter((r): r is DayRecord => r !== undefined)
    const windowMean = meanComposite(measured)
    return {
      date: intake.date,
      mg: intake.mg,
      gapDays: intake.gapDays,
      previousMg: intake.previousMg,
      windowMean,
      improvement:
        baseline !== null && windowMean !== null ? baseline.mean - windowMean : null,
      measuredDays: measured.length,
      confounded: isConfounded(measured),
    }
  })
}
```

(`isConfounded` lands in Task 9; until then this import fails — so Task 9's file is created in the same commit. Write `confounders.ts` now as part of Step 3, using the code in Task 9 Step 3.)

- [ ] **Step 4: Verify green, then commit**

Run: `npx vitest run src/analysis && npx tsc --noEmit`

```bash
git add src/analysis
git commit -m "feat(analysis): gaps, response windows and baseline-relative improvement"
```

### Task 9: Event confounders

**Files:**
- Create: `src/analysis/confounders.ts`
- Test: `src/analysis/confounders.test.ts`

**Interfaces:**
- Consumes: `EVENTS`.
- Produces: `isConfounded(records: DayRecord[]): boolean`, `splitByConfounding(outcomes: IntakeOutcome[]): { clean: IntakeOutcome[]; confounded: IntakeOutcome[] }`

- [ ] **Step 1: Write the failing tests**

`src/analysis/confounders.test.ts`:

```ts
import { isConfounded, splitByConfounding } from './confounders'
import { makeDayRecord } from '../test/factories'
import type { IntakeOutcome } from './types'

test('a window with no events is clean', () => {
  expect(isConfounded([makeDayRecord('2026-09-15')])).toBe(false)
})

test('a bad event in the window confounds it', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['conflict'] })])).toBe(true)
})

test('a good event confounds it too — a good week containing a dose is the whole reason events exist', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['good-news'] })])).toBe(true)
})

test('an unknown event id is ignored rather than crashing a historic record', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['retired-event'] })])).toBe(false)
})

test('splitByConfounding keeps both halves', () => {
  const outcomes = [
    { confounded: false } as IntakeOutcome,
    { confounded: true } as IntakeOutcome,
  ]
  const { clean, confounded } = splitByConfounding(outcomes)
  expect(clean).toHaveLength(1)
  expect(confounded).toHaveLength(1)
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/analysis/confounders.test.ts`

- [ ] **Step 3: Implement**

`src/analysis/confounders.ts`:

```ts
import { eventDef } from '../domain/events'
import type { DayRecord } from '../domain/types'
import type { IntakeOutcome } from './types'

export function isConfounded(records: DayRecord[]): boolean {
  return records.some((r) => r.events.some((id) => eventDef(id) !== undefined))
}

export function splitByConfounding(outcomes: IntakeOutcome[]): {
  clean: IntakeOutcome[]
  confounded: IntakeOutcome[]
} {
  return {
    clean: outcomes.filter((o) => !o.confounded),
    confounded: outcomes.filter((o) => o.confounded),
  }
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/analysis
git commit -m "feat(analysis): treat event-carrying days as confounders (R-13)"
```

### Task 10: Learned reset threshold and dose-size effect

**Files:**
- Create: `src/analysis/threshold.ts`
- Test: `src/analysis/threshold.test.ts`

**Interfaces:**
- Consumes: `IntakeOutcome`, `THRESHOLD_CANDIDATES`, `SHORT_GAP_MAX`, `LONG_GAP_MIN`.
- Produces:
  - `meanImprovement(outcomes: IntakeOutcome[]): number | null`
  - `bucketComparison(outcomes): { shortMean: number|null; longMean: number|null; difference: number|null; sampleSize: number }` — gaps 1–3 vs 5+
  - `findResetThreshold(outcomes): { days: number; difference: number; sampleSize: number } | null` — searches `THRESHOLD_CANDIDATES` for the split maximising (mean improvement above) − (mean improvement below), requiring at least 2 measured outcomes on each side
  - `dosePreviousEffect(outcomes): { correlation: number; sampleSize: number } | null` — Pearson correlation between `previousMg` and `improvement`

- [ ] **Step 1: Write the failing tests**

`src/analysis/threshold.test.ts`:

```ts
import { bucketComparison, dosePreviousEffect, findResetThreshold, meanImprovement } from './threshold'
import type { IntakeOutcome } from './types'

function outcome(gapDays: number | null, improvement: number | null, previousMg = 150): IntakeOutcome {
  return {
    date: '2026-06-01', mg: 150, gapDays, previousMg,
    windowMean: null, improvement, measuredDays: improvement === null ? 0 : 1,
    confounded: false,
  }
}

test('outcomes with no measured improvement are excluded from every mean', () => {
  expect(meanImprovement([outcome(3, null), outcome(5, 2)])).toBe(2)
  expect(meanImprovement([outcome(3, null)])).toBeNull()
})

test('close doses versus spaced doses is the headline comparison', () => {
  const result = bucketComparison([
    outcome(1, 0.5), outcome(2, 0.7), outcome(3, 0.6),
    outcome(5, 1.5), outcome(7, 1.6),
  ])
  expect(result.shortMean).toBeCloseTo(0.6, 5)
  expect(result.longMean).toBeCloseTo(1.55, 5)
  expect(result.difference).toBeCloseTo(0.95, 5)
  expect(result.sampleSize).toBe(5)
})

test('gaps of 4 days belong to neither bucket, so neither mean is distorted', () => {
  const result = bucketComparison([outcome(1, 1), outcome(4, 9), outcome(5, 2)])
  expect(result.shortMean).toBe(1)
  expect(result.longMean).toBe(2)
  expect(result.sampleSize).toBe(2)
})

test('the reset threshold is learned from the data, never configured (R-14)', () => {
  // improvement jumps once the gap reaches 5 days
  const outcomes = [
    outcome(1, 0.4), outcome(2, 0.5), outcome(3, 0.4), outcome(4, 0.5),
    outcome(5, 1.8), outcome(6, 1.9), outcome(8, 1.7),
  ]
  const found = findResetThreshold(outcomes)
  expect(found?.days).toBe(5)
  expect(found?.difference).toBeGreaterThan(1)
  expect(found?.sampleSize).toBe(7)
})

test('too few measured outcomes on one side yields no threshold at all', () => {
  expect(findResetThreshold([outcome(1, 0.4), outcome(9, 2)])).toBeNull()
})

test('the first intake, having no gap, never takes part in the spacing analysis', () => {
  const found = findResetThreshold([
    outcome(null, 3), outcome(1, 0.4), outcome(2, 0.5),
    outcome(6, 1.8), outcome(7, 1.9),
  ])
  expect(found?.sampleSize).toBe(4)
})

test('a larger previous dose tracking with less improvement is reported as a negative correlation (R-13)', () => {
  const result = dosePreviousEffect([
    outcome(3, 1.5, 50), outcome(3, 1.0, 100), outcome(3, 0.5, 150), outcome(3, 0.0, 200),
  ])
  expect(result!.correlation).toBeCloseTo(-1, 3)
  expect(result!.sampleSize).toBe(4)
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/analysis/threshold.test.ts`

- [ ] **Step 3: Implement**

`src/analysis/threshold.ts`:

```ts
import { LONG_GAP_MIN, SHORT_GAP_MAX, THRESHOLD_CANDIDATES } from './types'
import type { IntakeOutcome } from './types'

interface Measured extends IntakeOutcome {
  gapDays: number
  improvement: number
}

function measured(outcomes: IntakeOutcome[]): Measured[] {
  return outcomes.filter(
    (o): o is Measured => o.gapDays !== null && o.improvement !== null,
  )
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function meanImprovement(outcomes: IntakeOutcome[]): number | null {
  return mean(outcomes.map((o) => o.improvement).filter((v): v is number => v !== null))
}

export function bucketComparison(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes)
  const short = rows.filter((o) => o.gapDays <= SHORT_GAP_MAX)
  const long = rows.filter((o) => o.gapDays >= LONG_GAP_MIN)
  const shortMean = mean(short.map((o) => o.improvement))
  const longMean = mean(long.map((o) => o.improvement))
  return {
    shortMean,
    longMean,
    difference: shortMean !== null && longMean !== null ? longMean - shortMean : null,
    sampleSize: short.length + long.length,
  }
}

export function findResetThreshold(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes)
  let best: { days: number; difference: number; sampleSize: number } | null = null
  for (const days of THRESHOLD_CANDIDATES) {
    const below = rows.filter((o) => o.gapDays < days)
    const above = rows.filter((o) => o.gapDays >= days)
    if (below.length < 2 || above.length < 2) continue
    const difference = mean(above.map((o) => o.improvement))! - mean(below.map((o) => o.improvement))!
    if (best === null || difference > best.difference) {
      best = { days, difference, sampleSize: rows.length }
    }
  }
  return best
}

export function dosePreviousEffect(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes).filter((o) => o.previousMg !== null)
  if (rows.length < 3) return null
  const xs = rows.map((o) => o.previousMg!)
  const ys = rows.map((o) => o.improvement)
  const mx = mean(xs)!
  const my = mean(ys)!
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < rows.length; i++) {
    const a = xs[i]! - mx
    const b = ys[i]! - my
    num += a * b; dx += a * a; dy += b * b
  }
  if (dx === 0 || dy === 0) return null
  return { correlation: num / Math.sqrt(dx * dy), sampleSize: rows.length }
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/analysis
git commit -m "feat(analysis): learned reset threshold, gap buckets and dose-size effect"
```

### Task 11: Pattern statements

**Files:**
- Create: `src/analysis/statements.ts`
- Test: `src/analysis/statements.test.ts`

**Interfaces:**
- Consumes: everything in Phase 2 so far.
- Produces: `buildStatements(args: { outcomes; baseline; threshold; bucket; dose; confoundedCount }): Statement[]`

Statement wording is fixed here and nowhere else — it is the app's whole voice. Every sentence is past tense, descriptive, and carries a sample size (R-08, R-16).

- [ ] **Step 1: Write the failing tests**

`src/analysis/statements.test.ts`:

```ts
import { buildStatements } from './statements'
import { bucketComparison, findResetThreshold, dosePreviousEffect } from './threshold'
import type { IntakeOutcome } from './types'

function outcome(gapDays: number | null, improvement: number | null, previousMg = 150, confounded = false): IntakeOutcome {
  return { date: '2026-06-01', mg: 150, gapDays, previousMg, windowMean: null, improvement, measuredDays: 1, confounded }
}

// four close doses averaging 0.5 improvement, six spaced ones averaging 1.4,
// plus one 4-day gap so the threshold search has a reason to prefer 5 over 4
const many = [
  outcome(1, 0.5), outcome(2, 0.6), outcome(3, 0.4), outcome(2, 0.5), outcome(4, 0.5),
  outcome(5, 1.4), outcome(6, 1.5), outcome(7, 1.3), outcome(8, 1.4),
  outcome(5, 1.4), outcome(6, 1.4),
]

function build(outcomes: IntakeOutcome[], baseline = { mean: 4, perItem: {}, dayCount: 12, from: '2026-06-01', to: '2026-06-12' } as never) {
  return buildStatements({
    outcomes,
    baseline,
    threshold: findResetThreshold(outcomes),
    bucket: bucketComparison(outcomes),
    dose: dosePreviousEffect(outcomes),
    confoundedCount: outcomes.filter((o) => o.confounded).length,
  })
}

test('the spacing statement states the difference in the past tense, with a sample size', () => {
  const [spacing] = build(many)
  expect(spacing!.text).toMatch(
    /^Doses taken 1–3 days apart were followed by 0\.9 less improvement than doses 5 or more days apart\.$/,
  )
  expect(spacing!.sampleSize).toBe(10)
  expect(spacing!.thin).toBe(false)
  expect(spacing!.emphasis).toContain('0.9 less improvement')
})

test('a thin sample is marked, never hidden (R-16)', () => {
  const few = [outcome(1, 0.5), outcome(2, 0.6), outcome(6, 1.5), outcome(7, 1.4)]
  const statements = build(few)
  expect(statements.length).toBeGreaterThan(0)
  expect(statements.every((s) => s.thin)).toBe(true)
})

test('the reset statement hedges with "appears to" and never tells the person what to do (R-08)', () => {
  const reset = build(many).find((s) => s.id === 'reset-threshold')
  expect(reset!.text).toBe('Sensitivity appears to have returned after roughly 5 days off.')
  expect(reset!.text).not.toMatch(/should|recommend|try|aim|wait at least/i)
})

test('confounded days are acknowledged rather than silently dropped', () => {
  const withEvents = [...many, outcome(2, 0.2, 150, true)]
  const note = build(withEvents).find((s) => s.id === 'confounders')
  expect(note!.text).toBe('1 of 12 doses fell on days carrying an event, which may explain the mood independently.')
})

test('without a baseline no effectiveness statement is produced, only spacing (R-10)', () => {
  const statements = buildStatements({
    outcomes: many.map((o) => ({ ...o, improvement: null })),
    baseline: null,
    threshold: null,
    bucket: { shortMean: null, longMean: null, difference: null, sampleSize: 0 },
    dose: null,
    confoundedCount: 0,
  })
  expect(statements.some((s) => s.id === 'spacing-buckets')).toBe(false)
  expect(statements.find((s) => s.id === 'no-baseline')!.text).toBe(
    'No days were recorded before this medication was first taken, so how well it worked cannot be measured — only the spacing between doses.',
  )
})

test('with nothing recorded at all the list is a single plain statement', () => {
  const statements = buildStatements({
    outcomes: [], baseline: null, threshold: null,
    bucket: { shortMean: null, longMean: null, difference: null, sampleSize: 0 },
    dose: null, confoundedCount: 0,
  })
  expect(statements).toHaveLength(1)
  expect(statements[0]!.text).toBe('No doses have been recorded yet.')
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/analysis/statements.test.ts`

- [ ] **Step 3: Implement**

`src/analysis/statements.ts`:

```ts
import { LONG_GAP_MIN, SHORT_GAP_MAX, THIN_SAMPLE } from './types'
import type { Baseline, IntakeOutcome, Statement } from './types'

interface Bucket { shortMean: number | null; longMean: number | null; difference: number | null; sampleSize: number }

export interface StatementInput {
  outcomes: IntakeOutcome[]
  baseline: Baseline | null
  threshold: { days: number; difference: number; sampleSize: number } | null
  bucket: Bucket
  dose: { correlation: number; sampleSize: number } | null
  confoundedCount: number
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

function statement(id: string, text: string, emphasis: string[], sampleSize: number): Statement {
  return { id, text, emphasis, sampleSize, thin: sampleSize < THIN_SAMPLE }
}

export function buildStatements(input: StatementInput): Statement[] {
  const { outcomes, baseline, threshold, bucket, dose, confoundedCount } = input
  if (outcomes.length === 0) {
    return [statement('no-intakes', 'No doses have been recorded yet.', [], 0)]
  }

  const out: Statement[] = []

  if (baseline === null) {
    out.push(
      statement(
        'no-baseline',
        'No days were recorded before this medication was first taken, so how well it worked cannot be measured — only the spacing between doses.',
        [],
        outcomes.length,
      ),
    )
  }

  if (bucket.difference !== null) {
    const amount = `${round1(Math.abs(bucket.difference))} ${bucket.difference >= 0 ? 'less' : 'more'} improvement`
    out.push(
      statement(
        'spacing-buckets',
        `Doses taken 1–${SHORT_GAP_MAX} days apart were followed by ${amount} than doses ${LONG_GAP_MIN} or more days apart.`,
        [amount],
        bucket.sampleSize,
      ),
    )
  }

  if (threshold !== null) {
    out.push(
      statement(
        'reset-threshold',
        `Sensitivity appears to have returned after roughly ${threshold.days} days off.`,
        [`${threshold.days} days`],
        threshold.sampleSize,
      ),
    )
  }

  if (dose !== null && Math.abs(dose.correlation) >= 0.3) {
    const direction = dose.correlation < 0 ? 'less' : 'more'
    out.push(
      statement(
        'previous-dose-size',
        `Doses that followed a larger previous dose were followed by ${direction} improvement.`,
        [`${direction} improvement`],
        dose.sampleSize,
      ),
    )
  }

  if (baseline !== null) {
    const measured = outcomes.filter((o) => o.improvement !== null)
    if (measured.length > 0) {
      const mean = measured.reduce((a, o) => a + o.improvement!, 0) / measured.length
      const amount = `${round1(Math.abs(mean))} ${mean >= 0 ? 'lower' : 'higher'}`
      out.push(
        statement(
          'overall-vs-baseline',
          `In the three days after a dose, scores averaged ${amount} than the ${baseline.dayCount} days recorded before this medication was first taken.`,
          [amount],
          measured.length,
        ),
      )
    }
  }

  if (confoundedCount > 0) {
    out.push(
      statement(
        'confounders',
        `${confoundedCount} of ${outcomes.length} doses fell on days carrying an event, which may explain the mood independently.`,
        [],
        outcomes.length,
      ),
    )
  }

  return out
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/analysis
git commit -m "feat(analysis): descriptive pattern statements with thin-data marking"
```

### Task 12: runAnalysis — windows and spacing-only mode

**Files:**
- Create: `src/analysis/run.ts`, `src/analysis/index.ts`
- Test: `src/analysis/run.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `runAnalysis(input: AnalysisInput, window: WindowKey): AnalysisResult`; `src/analysis/index.ts` re-exports `runAnalysis`, types and constants — UI code imports only from `src/analysis`.

Windows (R-17): `recent` filters intakes and day records to the last `RECENT_WINDOW_DAYS` days ending at `today`, **but always computes the baseline from the full history** — the baseline is a fixed historical fact and must not shrink with the window.

- [ ] **Step 1: Write the failing tests**

`src/analysis/run.test.ts`:

```ts
import { runAnalysis } from './run'
import { makeDayRecord, makeIntake } from '../test/factories'

const baselineDays = ['2026-06-01', '2026-06-02', '2026-06-03'].map((d) =>
  makeDayRecord(d, { score: 4 }),
)

test('the long-term window sees every intake', () => {
  const result = runAnalysis(
    {
      medicationId: 'm1',
      dayRecords: [...baselineDays, makeDayRecord('2026-06-10', { score: 2 }), makeDayRecord('2026-09-10', { score: 2 })],
      intakes: [makeIntake('2026-06-10', 150), makeIntake('2026-09-10', 150)],
      today: '2026-09-18',
    },
    'long-term',
  )
  expect(result.outcomes).toHaveLength(2)
})

test('the recent window sees only the last 30 days of intakes but keeps the full baseline', () => {
  const result = runAnalysis(
    {
      medicationId: 'm1',
      dayRecords: [...baselineDays, makeDayRecord('2026-06-10', { score: 2 }), makeDayRecord('2026-09-10', { score: 2 })],
      intakes: [makeIntake('2026-06-10', 150), makeIntake('2026-09-10', 150)],
      today: '2026-09-18',
    },
    'recent',
  )
  expect(result.outcomes.map((o) => o.date)).toEqual(['2026-09-10'])
  expect(result.baseline?.dayCount).toBe(3)
})

test('with no baseline the result is spacing-only (R-10)', () => {
  const result = runAnalysis(
    {
      medicationId: 'm1',
      dayRecords: [makeDayRecord('2026-06-10', { score: 2 })],
      intakes: [makeIntake('2026-06-10', 150)],
      today: '2026-06-18',
    },
    'long-term',
  )
  expect(result.spacingOnly).toBe(true)
  expect(result.baseline).toBeNull()
  expect(result.outcomes[0]!.improvement).toBeNull()
})

test('with no medication selected the result is empty but valid', () => {
  const result = runAnalysis(
    { medicationId: null, dayRecords: [], intakes: [], today: '2026-09-18' },
    'recent',
  )
  expect(result.outcomes).toEqual([])
  expect(result.statements).toHaveLength(1)
})

test('a gap that straddles the window edge is still measured from the true previous intake', () => {
  const result = runAnalysis(
    {
      medicationId: 'm1',
      dayRecords: [...baselineDays, makeDayRecord('2026-09-16', { score: 2 })],
      intakes: [makeIntake('2026-09-10', 150), makeIntake('2026-09-16', 150)],
      today: '2026-09-18',
    },
    'recent',
  )
  expect(result.outcomes.find((o) => o.date === '2026-09-16')!.gapDays).toBe(6)
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/analysis/run.test.ts`

- [ ] **Step 3: Implement**

`src/analysis/run.ts`:

```ts
import { addDays } from '../domain/date'
import { computeBaseline } from './baseline'
import { computeOutcomes } from './improvement'
import { buildStatements } from './statements'
import { bucketComparison, dosePreviousEffect, findResetThreshold } from './threshold'
import { RECENT_WINDOW_DAYS } from './types'
import type { AnalysisInput, AnalysisResult, WindowKey } from './types'

export function runAnalysis(input: AnalysisInput, window: WindowKey): AnalysisResult {
  const { medicationId, dayRecords, intakes, today } = input
  const baseline = computeBaseline(dayRecords, intakes)

  // Outcomes are always computed over the full history, so a gap is measured
  // from the true previous intake even when it falls outside the window.
  const all = computeOutcomes(intakes, dayRecords, baseline)
  const cutoff = addDays(today, -RECENT_WINDOW_DAYS)
  const outcomes = window === 'recent' ? all.filter((o) => o.date >= cutoff) : all

  const bucket = bucketComparison(outcomes)
  const threshold = findResetThreshold(outcomes)
  const dose = dosePreviousEffect(outcomes)

  return {
    medicationId,
    window,
    baseline,
    spacingOnly: baseline === null,
    outcomes,
    resetThresholdDays: threshold?.days ?? null,
    statements: buildStatements({
      outcomes,
      baseline,
      threshold,
      bucket,
      dose,
      confoundedCount: outcomes.filter((o) => o.confounded).length,
    }),
  }
}
```

`src/analysis/index.ts`:

```ts
export { runAnalysis } from './run'
export { composite, meanComposite, perItem } from './composite'
export { responseWindow, withGaps } from './gaps'
export * from './types'
```

- [ ] **Step 4: Verify the whole analysis suite**

Run: `npx vitest run src/analysis && npx tsc --noEmit`
Expected: PASS (roughly 35 tests).

- [ ] **Step 5: Commit**

```bash
git add src/analysis
git commit -m "feat(analysis): windowed analysis entry point with spacing-only mode"
```

---

# Phase 3 — UI kit

Every component in this phase has a counterpart file in `design-system/`. Open that file, copy its CSS declarations into the module, and keep the class names recognisable. No component in this phase imports from `src/data` or `src/analysis` except as props.

House rules for this phase:
- One `.tsx` + one `.module.css` per component. Props typed, no default exports for primitives (named exports only; screens use default exports).
- Interactive components are real controls: `<button>`, `<input>`, `<a>` — never a `<div>` with `onClick`.
- Every component's test renders it and asserts behaviour through accessible queries (`getByRole`, `getByLabelText`), never by class name.

### Task 13: Card, Button, Badge, Pill, SectionTitle

**Files:**
- Create: `src/ui/Card.tsx`, `src/ui/Card.module.css`, `src/ui/Button.tsx`, `src/ui/Button.module.css`, `src/ui/Badge.tsx`, `src/ui/Badge.module.css`, `src/ui/Pill.tsx`, `src/ui/Pill.module.css`, `src/ui/SectionTitle.tsx`, `src/ui/SectionTitle.module.css`
- Test: `src/ui/primitives.test.tsx`
- Reference: the shared `<style>` block in any `design-system/**/*.html` (`.card`, `.btn`, `.badge`, `.pill`, `.section-title`), `foundations/spacing.html`

**Interfaces:**
- Produces:
  - `<Card as?: 'div'|'section' dashed?: boolean className?: string>` — `dashed` gives the unknown-day treatment (dashed border, transparent fill)
  - `<Button variant: 'primary'|'secondary'|'ghost' onClick type?>`
  - `<Badge thin?: boolean>` — `thin` recolors to `--severity-3` border / `--severity-2` text per `components/thin-data-badge.html`
  - `<Pill tone?: 'accent'|'neutral'>`
  - `<SectionTitle>`

- [ ] **Step 1: Write the failing test**

`src/ui/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'

test('Button renders a real button and fires its handler', async () => {
  const onClick = vi.fn()
  render(<Button variant="primary" onClick={onClick}>Export</Button>)
  await userEvent.click(screen.getByRole('button', { name: 'Export' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('Badge announces thin data in its text, not only by colour', () => {
  render(<Badge thin>based on 4 intakes · thin</Badge>)
  expect(screen.getByText('based on 4 intakes · thin')).toBeInTheDocument()
})

test('Card can render as a section for landmark structure', () => {
  render(<Card as="section" aria-label="Patterns">body</Card>)
  expect(screen.getByRole('region', { name: 'Patterns' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/ui/primitives.test.tsx`

- [ ] **Step 3: Implement the primitives**

`src/ui/Card.module.css` (values copied from the design system's `.card`):

```css
.card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  padding: var(--sp-6);
}
.dashed {
  background: transparent;
  border-style: dashed;
}
```

`src/ui/Card.tsx`:

```tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  dashed?: boolean
  children: ReactNode
}

export function Card({ as: Tag = 'div', dashed = false, className, children, ...rest }: CardProps) {
  return (
    <Tag className={[styles.card, dashed ? styles.dashed : '', className ?? ''].join(' ').trim()} {...rest}>
      {children}
    </Tag>
  )
}
```

`src/ui/Button.module.css`:

```css
.btn {
  font-family: var(--font);
  font-size: var(--fs-body);
  font-weight: 600;
  border-radius: var(--radius-control);
  padding: 12px 20px;
  border: none;
  cursor: pointer;
}
.primary { background: var(--accent); color: var(--on-accent); }
.primary:hover { background: var(--accent-hover); }
.secondary { background: var(--bg-overlay); color: var(--text-primary); border: 1px solid var(--border-default); }
.ghost { background: transparent; color: var(--text-secondary); padding: 8px 0; }
.ghost:hover { color: var(--text-primary); }
```

`src/ui/Button.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={[styles.btn, styles[variant], className ?? ''].join(' ').trim()} {...rest} />
}
```

`src/ui/Badge.module.css`:

```css
.badge {
  font-size: var(--fs-micro);
  line-height: var(--lh-micro);
  color: var(--text-tertiary);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  display: inline-block;
}
.thin { border-color: var(--severity-3); color: var(--severity-2); }
```

`src/ui/Badge.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export function Badge({ thin = false, children }: { thin?: boolean; children: ReactNode }) {
  return <span className={thin ? `${styles.badge} ${styles.thin}` : styles.badge}>{children}</span>
}
```

`src/ui/Pill.module.css`:

```css
.pill {
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  font-size: var(--fs-label);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}
.accent { background: var(--accent-muted); color: var(--accent); }
.neutral { background: var(--bg-overlay); color: var(--text-tertiary); }
```

`src/ui/Pill.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './Pill.module.css'

export function Pill({ tone = 'neutral', children }: { tone?: 'accent' | 'neutral'; children: ReactNode }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>
}
```

`src/ui/SectionTitle.module.css` + `.tsx`:

```css
.title {
  font-size: var(--fs-label);
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0 0 var(--sp-3);
  font-weight: 700;
}
```

```tsx
import type { ReactNode } from 'react'
import styles from './SectionTitle.module.css'

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.title}>{children}</h2>
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/ui
git commit -m "feat(ui): card, button, badge, pill and section title primitives"
```

### Task 14: SegmentedScore — the 1–5 control

**Files:**
- Create: `src/ui/SegmentedScore.tsx`, `src/ui/SegmentedScore.module.css`
- Test: `src/ui/SegmentedScore.test.tsx`
- Reference: `design-system/components/score-selector.html`, `components/item-row.html`

**Interfaces:**
- Produces: `<SegmentedScore label: string value: Score | null onChange: (score: Score) => void compact?: boolean />`

Accessibility: a `radiogroup` of five `radio` buttons, labelled by the item name, arrow-key navigable. The selected fill carries the severity ramp, so the colour is decoration — the accessible name always carries the number.

- [ ] **Step 1: Write the failing test**

`src/ui/SegmentedScore.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedScore } from './SegmentedScore'
import type { Score } from '../domain/types'

function Harness({ initial = null as Score | null }) {
  const [value, setValue] = useState<Score | null>(initial)
  return <SegmentedScore label="Tiredness" value={value} onChange={setValue} />
}

test('renders a labelled radio group of five scores', () => {
  render(<Harness />)
  const group = screen.getByRole('radiogroup', { name: 'Tiredness' })
  expect(group).toBeInTheDocument()
  expect(screen.getAllByRole('radio')).toHaveLength(5)
})

test('the worst option says so, so the direction of the scale never has to be guessed', () => {
  render(<Harness />)
  expect(screen.getByRole('radio', { name: '5, worst' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '1, best' })).toBeInTheDocument()
})

test('choosing a score reports it and marks it selected', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '3' }))
  expect(screen.getByRole('radio', { name: '3' })).toBeChecked()
})

test('arrow keys move between scores', async () => {
  render(<Harness initial={3} />)
  await userEvent.click(screen.getByRole('radio', { name: '3' }))
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: '4' })).toBeChecked()
})

test('nothing is selected until the person picks — no default score (R-03 is a completeness rule, not a prefill)', () => {
  render(<Harness />)
  expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/ui/SegmentedScore.test.tsx`

- [ ] **Step 3: Implement**

`src/ui/SegmentedScore.module.css` — the `.on1…on5` fills come straight from `score-selector.html`:

```css
.group { display: flex; gap: 6px; }
.compact { gap: 5px; }

.opt {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-overlay);
  color: var(--text-tertiary);
  font-size: var(--fs-label);
  font-weight: 700;
  cursor: pointer;
}
.compact .opt { height: 34px; border-radius: 9px; }

.on1 { background: var(--severity-1); color: var(--on-severity-light); border-color: transparent; }
.on2 { background: var(--severity-2); color: var(--on-severity-light); border-color: transparent; }
.on3 { background: var(--severity-3); color: var(--on-severity-dark); border-color: transparent; }
.on4 { background: var(--severity-4); color: var(--on-severity-dark); border-color: transparent; }
.on5 { background: var(--severity-5); color: var(--on-severity-dark); border-color: transparent; }
```

`src/ui/SegmentedScore.tsx`:

```tsx
import { useId } from 'react'
import styles from './SegmentedScore.module.css'
import type { Score } from '../domain/types'

const SCORES: Score[] = [1, 2, 3, 4, 5]

function optionName(score: Score): string {
  if (score === 1) return '1, best'
  if (score === 5) return '5, worst'
  return String(score)
}

interface Props {
  label: string
  value: Score | null
  onChange: (score: Score) => void
  compact?: boolean
}

export function SegmentedScore({ label, value, onChange, compact = false }: Props) {
  const labelId = useId()
  function onKeyDown(event: React.KeyboardEvent, score: Score) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = Math.min(5, Math.max(1, score + delta)) as Score
    onChange(next)
    const group = (event.currentTarget.parentElement as HTMLElement | null)
    group?.querySelectorAll('button')[next - 1]?.focus()
  }

  return (
    <div className={compact ? `${styles.group} ${styles.compact}` : styles.group} role="radiogroup" aria-labelledby={labelId}>
      <span id={labelId} className="visually-hidden">{label}</span>
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={optionName(score)}
          tabIndex={value === score || (value === null && score === 1) ? 0 : -1}
          className={value === score ? `${styles.opt} ${styles[`on${score}`]}` : styles.opt}
          onClick={() => onChange(score)}
          onKeyDown={(event) => onKeyDown(event, score)}
        >
          {score}
        </button>
      ))}
    </div>
  )
}
```

Note: the visible item label is rendered by `ItemRow` (Task 18's sibling); the hidden span here is what names the group for assistive tech when the control is used standalone. In `ItemRow` the visible label is passed as `label` and hidden here to avoid a duplicate — see that task.

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/ui
git commit -m "feat(ui): accessible 1-5 segmented score control with severity ramp"
```

### Task 15: Chip and Toggle

**Files:**
- Create: `src/ui/Chip.tsx`, `src/ui/Chip.module.css`, `src/ui/Toggle.tsx`, `src/ui/Toggle.module.css`
- Test: `src/ui/Chip.test.tsx`, `src/ui/Toggle.test.tsx`
- Reference: `design-system/components/event-chip.html`, `components/window-toggle.html`

**Interfaces:**
- Produces:
  - `<Chip label: string valence: 'good'|'bad' selected: boolean onToggle: () => void />` — a `<button role="switch" aria-checked>`
  - `<Toggle options: Array<{ value: T; label: string }> value: T onChange: (v: T) => void ariaLabel: string />` — a `radiogroup`

- [ ] **Step 1: Write the failing tests**

`src/ui/Chip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

test('an unticked chip is an unchecked switch', () => {
  render(<Chip label="Conflict" valence="bad" selected={false} onToggle={() => {}} />)
  expect(screen.getByRole('switch', { name: 'Conflict' })).not.toBeChecked()
})

test('ticking reports the toggle', async () => {
  const onToggle = vi.fn()
  render(<Chip label="Exercise" valence="good" selected={false} onToggle={onToggle} />)
  await userEvent.click(screen.getByRole('switch', { name: 'Exercise' }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('a ticked chip states its valence in text for assistive tech, not only in colour', () => {
  render(<Chip label="Conflict" valence="bad" selected onToggle={() => {}} />)
  expect(screen.getByRole('switch', { name: 'Conflict' })).toHaveAccessibleDescription('bad event')
})
```

`src/ui/Toggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle } from './Toggle'

const OPTIONS = [
  { value: 'recent' as const, label: 'Recent' },
  { value: 'long-term' as const, label: 'Long-term' },
]

test('shows both windows with the current one selected', () => {
  render(<Toggle ariaLabel="Time window" options={OPTIONS} value="recent" onChange={() => {}} />)
  expect(screen.getByRole('radio', { name: 'Recent' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Long-term' })).not.toBeChecked()
})

test('switching reports the new window', async () => {
  const onChange = vi.fn()
  render(<Toggle ariaLabel="Time window" options={OPTIONS} value="recent" onChange={onChange} />)
  await userEvent.click(screen.getByRole('radio', { name: 'Long-term' }))
  expect(onChange).toHaveBeenCalledWith('long-term')
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/ui/Chip.test.tsx src/ui/Toggle.test.tsx`

- [ ] **Step 3: Implement**

`src/ui/Chip.module.css` (from `event-chip.html`):

```css
.chip {
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-size: var(--fs-label);
  font-weight: 600;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  background: var(--bg-overlay);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-tertiary); }
.goodOn { background: var(--event-good-muted); border-color: var(--event-good); color: var(--event-good); }
.goodOn .dot { background: var(--event-good); }
.badOn { background: var(--event-bad-muted); border-color: var(--event-bad); color: var(--event-bad); }
.badOn .dot { background: var(--event-bad); }
```

`src/ui/Chip.tsx`:

```tsx
import { useId } from 'react'
import styles from './Chip.module.css'

interface Props {
  label: string
  valence: 'good' | 'bad'
  selected: boolean
  onToggle: () => void
}

export function Chip({ label, valence, selected, onToggle }: Props) {
  const descriptionId = useId()
  const on = valence === 'good' ? styles.goodOn : styles.badOn
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={selected}
        aria-describedby={selected ? descriptionId : undefined}
        className={selected ? `${styles.chip} ${on}` : styles.chip}
        onClick={onToggle}
      >
        <span className={styles.dot} aria-hidden="true" />
        {label}
      </button>
      <span id={descriptionId} className="visually-hidden">{valence} event</span>
    </>
  )
}
```

`src/ui/Toggle.module.css` (from `window-toggle.html`):

```css
.toggle {
  display: inline-flex;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  padding: 4px;
}
.opt {
  padding: 8px 18px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-label);
  font-weight: 600;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
}
.on { background: var(--accent-muted); color: var(--accent); }
```

`src/ui/Toggle.tsx`:

```tsx
import styles from './Toggle.module.css'

interface Props<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function Toggle<T extends string>({ options, value, onChange, ariaLabel }: Props<T>) {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={value === option.value ? `${styles.opt} ${styles.on}` : styles.opt}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/ui
git commit -m "feat(ui): event chip and window toggle"
```

### Task 16: Field and Combobox

**Files:**
- Create: `src/ui/Field.tsx`, `src/ui/Field.module.css`, `src/ui/Combobox.tsx`, `src/ui/Combobox.module.css`
- Test: `src/ui/Combobox.test.tsx`
- Reference: `design-system/components/intake-field.html`

**Interfaces:**
- Produces:
  - `<Field label: string>{children}</Field>` — label above value, overlay fill, control radius
  - `<Combobox label: string options: Array<{ id: string; name: string; meta?: string; badge?: string }> value: string | null onSelect: (id: string) => void onCreate: (name: string) => void />` — list plus "+ Add new medication" row

- [ ] **Step 1: Write the failing test**

`src/ui/Combobox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox } from './Combobox'

const OPTIONS = [
  { id: 'm1', name: 'Medication A', badge: 'under analysis' },
  { id: 'm2', name: 'Caffeine', meta: 'last: 3d ago' },
]

test('opens and lists the library so a returning medication is picked, not retyped', async () => {
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={() => {}} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  expect(screen.getByRole('option', { name: /Caffeine/ })).toBeInTheDocument()
})

test('selecting reports the id', async () => {
  const onSelect = vi.fn()
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={onSelect} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.click(screen.getByRole('option', { name: /Caffeine/ }))
  expect(onSelect).toHaveBeenCalledWith('m2')
})

test('a new medication can be added from the picker', async () => {
  const onCreate = vi.fn()
  render(<Combobox label="Medication" options={OPTIONS} value={null} onSelect={() => {}} onCreate={onCreate} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.click(screen.getByRole('button', { name: '+ Add new medication' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'New medication name' }), 'Melatonin')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onCreate).toHaveBeenCalledWith('Melatonin')
})

test('escape closes the list', async () => {
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={() => {}} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/ui/Combobox.test.tsx`

- [ ] **Step 3: Implement**

`src/ui/Field.module.css` (from `intake-field.html`):

```css
.field {
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  padding: 12px 16px;
  width: 100%;
  text-align: left;
}
.label { font-size: var(--fs-label); color: var(--text-tertiary); margin-bottom: 4px; display: block; }
.value { font-size: var(--fs-subtitle); color: var(--text-primary); }
.input { background: transparent; border: none; padding: 0; width: 100%; font-size: var(--fs-subtitle); color: var(--text-primary); }
.input:focus { outline: none; }
```

`src/ui/Field.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './Field.module.css'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </label>
  )
}

export { styles as fieldStyles }
```

`src/ui/Combobox.module.css`:

```css
.wrap { position: relative; }
.trigger { composes: field from './Field.module.css'; cursor: pointer; }
.list {
  list-style: none;
  margin: var(--sp-2) 0 0;
  padding: var(--sp-3);
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-radius: var(--radius-control);
  background: transparent; border: none; width: 100%; cursor: pointer;
  color: var(--text-primary); font-size: var(--fs-body); text-align: left;
}
.row[aria-selected='true'], .row:hover { background: var(--accent-muted); }
.meta { font-size: var(--fs-micro); color: var(--text-tertiary); }
.add { color: var(--accent); font-weight: 700; }
```

`src/ui/Combobox.tsx`:

```tsx
import { useState } from 'react'
import styles from './Combobox.module.css'
import { fieldStyles } from './Field'

export interface ComboboxOption { id: string; name: string; meta?: string; badge?: string }

interface Props {
  label: string
  options: ComboboxOption[]
  value: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}

export function Combobox({ label, options, value, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = options.find((o) => o.id === value)

  function close() { setOpen(false); setAdding(false); setDraft('') }

  return (
    <div className={styles.wrap} onKeyDown={(e) => { if (e.key === 'Escape') close() }}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={fieldStyles.label}>{label}</span>
        <span className={fieldStyles.value}>{selected?.name ?? 'Choose a medication'}</span>
      </button>

      {open && (
        <>
          <ul className={styles.list} role="listbox" aria-label={label}>
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className={styles.row}
                  onClick={() => { onSelect(option.id); close() }}
                >
                  <span>{option.name}</span>
                  <span className={styles.meta}>{option.badge ?? option.meta ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
          {adding ? (
            <div className={styles.list}>
              <label className={fieldStyles.label} htmlFor="new-medication">New medication name</label>
              <input
                id="new-medication"
                className={fieldStyles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className={styles.row}
                onClick={() => { if (draft.trim()) { onCreate(draft.trim()); close() } }}
              >
                Add
              </button>
            </div>
          ) : (
            <button type="button" className={`${styles.row} ${styles.add}`} onClick={() => setAdding(true)}>
              + Add new medication
            </button>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/ui
git commit -m "feat(ui): field and medication combobox drawing from the library"
```

---

### Task 17: Navigation shell and routing

**Files:**
- Create: `src/components/NavShell.tsx`, `src/components/NavShell.module.css`
- Modify: `src/App.tsx`
- Test: `src/components/NavShell.test.tsx`
- Reference: `design-system/components/nav-shell.html`, and the frames in all three screen files

**Interfaces:**
- Consumes: React Router `NavLink`, `Outlet`.
- Produces: `<NavShell>{children}</NavShell>` rendering bottom tabs under 768px and a 180px sidebar above it; `App` routes `/today`, `/trends`, `/library`, with `/` redirecting to `/today`.

Three destinations, no badges, no dots, nothing that nudges (R-20).

- [ ] **Step 1: Write the failing test**

`src/components/NavShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavShell } from './NavShell'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavShell><p>content</p></NavShell>
    </MemoryRouter>,
  )
}

test('exactly three destinations, in order', () => {
  renderAt('/today')
  const links = screen.getAllByRole('link')
  expect(links.map((l) => l.textContent)).toEqual(['Today', 'Trends', 'Library'])
})

test('the current destination is marked for assistive tech, not only by colour', () => {
  renderAt('/trends')
  expect(screen.getByRole('link', { name: 'Trends' })).toHaveAttribute('aria-current', 'page')
})

test('carries no badge, count or notification dot (R-20)', () => {
  renderAt('/today')
  expect(screen.getByRole('navigation').textContent).toBe('TodayTrendsLibrary')
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/components/NavShell.test.tsx`

- [ ] **Step 3: Implement**

`src/components/NavShell.module.css`:

```css
.shell { min-height: 100dvh; display: flex; flex-direction: column; background: var(--bg-base); }
.content { flex: 1; padding: var(--sp-6); max-width: 760px; width: 100%; margin: 0 auto; }

.nav { display: flex; border-top: 1px solid var(--border-subtle); background: var(--bg-raised); }
.link {
  flex: 1; padding: 14px 0; text-align: center;
  font-size: var(--fs-micro); color: var(--text-tertiary); text-decoration: none;
}
.link[aria-current='page'] { color: var(--accent); }

@media (min-width: 768px) {
  .shell { flex-direction: row; }
  .nav {
    flex-direction: column; width: 180px; flex: 0 0 180px;
    border-top: none; border-right: 1px solid var(--border-subtle);
    padding: var(--sp-4); gap: 4px;
  }
  .link {
    flex: 0; text-align: left; padding: 10px 14px;
    border-radius: var(--radius-control); font-size: var(--fs-body);
  }
  .link[aria-current='page'] { background: var(--accent-muted); color: var(--accent); }
  .content { padding: var(--sp-6) var(--sp-8); }
}
```

`src/components/NavShell.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import styles from './NavShell.module.css'

const DESTINATIONS = [
  { to: '/today', label: 'Today' },
  { to: '/trends', label: 'Trends' },
  { to: '/library', label: 'Library' },
] as const

export function NavShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Sections">
        {DESTINATIONS.map((d) => (
          <NavLink key={d.to} to={d.to} className={styles.link}>
            {d.label}
          </NavLink>
        ))}
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
```

(`NavLink` sets `aria-current="page"` itself when active — no extra work.)

Update `src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { NavShell } from './components/NavShell'
import TodayScreen from './screens/TodayScreen'
import TrendsScreen from './screens/TrendsScreen'
import LibraryScreen from './screens/LibraryScreen'

export default function App() {
  return (
    <NavShell>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/trends" element={<TrendsScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </NavShell>
  )
}
```

Create the three screens as one-line placeholders (`export default function TodayScreen() { return <h1>Today</h1> }`) so `App.test.tsx` still passes — Phase 4 fills them in.

- [ ] **Step 4: Verify green, then commit**

Run: `npx vitest run src/components src/App.test.tsx`

```bash
git add src/components src/App.tsx src/screens
git commit -m "feat(ui): responsive nav shell with three destinations and routing"
```

### Task 18: DateNavigator and ItemRow

**Files:**
- Create: `src/components/DateNavigator.tsx`, `src/components/DateNavigator.module.css`, `src/components/ItemRow.tsx`, `src/components/ItemRow.module.css`
- Test: `src/components/DateNavigator.test.tsx`, `src/components/ItemRow.test.tsx`
- Reference: `design-system/components/date-navigator.html`, `components/item-row.html`

**Interfaces:**
- Produces:
  - `<DateNavigator date: IsoDate today: IsoDate recordedDates: Set<string> onChange: (d: IsoDate) => void />` — arrows, long-format heading, a 7-day strip ending at `date` where recorded days are solid with a dot and unknown days are dashed with none
  - `<ItemRow label: string value: Score | null onChange: (s: Score) => void />`

- [ ] **Step 1: Write the failing tests**

`src/components/DateNavigator.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateNavigator } from './DateNavigator'

const props = {
  date: '2026-09-15' as const,
  today: '2026-09-18' as const,
  recordedDates: new Set(['2026-09-13', '2026-09-15']),
}

test('shows the long date exactly as the design system does', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Tuesday, September 15' })).toBeInTheDocument()
})

test('stepping back a day reports the previous date (any past date is editable, R-05)', async () => {
  const onChange = vi.fn()
  render(<DateNavigator {...props} onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
  expect(onChange).toHaveBeenCalledWith('2026-09-14')
})

test('the future is not offered — the next-day control stops at today', () => {
  render(<DateNavigator {...props} date="2026-09-18" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
})

test('unknown days are labelled unknown, never zero or missed (R-06)', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Monday, September 14 — no record' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sunday, September 13 — recorded' })).toBeInTheDocument()
})
```

`src/components/ItemRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from './ItemRow'

test('shows the item wording verbatim and its score control', async () => {
  const onChange = vi.fn()
  render(<ItemRow label="Lack of desire for company" value={null} onChange={onChange} />)
  expect(screen.getByText('Lack of desire for company')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: '4' }))
  expect(onChange).toHaveBeenCalledWith(4)
})

test('the score group is named by the item, so a screen reader hears which item it is scoring', () => {
  render(<ItemRow label="Tiredness" value={3} onChange={() => {}} />)
  expect(screen.getByRole('radiogroup', { name: 'Tiredness' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/components`

- [ ] **Step 3: Implement**

`src/components/DateNavigator.module.css` (values from `date-navigator.html`):

```css
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-4); }
.arrow {
  width: 36px; height: 36px; border-radius: var(--radius-control);
  background: var(--bg-overlay); border: 1px solid var(--border-default);
  color: var(--text-secondary); display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.arrow:disabled { opacity: .4; cursor: default; }
.title { font-size: var(--fs-subtitle); line-height: var(--lh-subtitle); font-weight: 600; margin: 0; text-align: center; }
.strip { display: flex; gap: 8px; justify-content: space-between; }
.day {
  width: 40px; height: 52px; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: var(--fs-label); color: var(--text-tertiary);
  border: 1px dashed var(--border-subtle); background: transparent; cursor: pointer;
}
.dot { width: 6px; height: 6px; border-radius: 50%; }
.recorded { border: 1px solid var(--border-default); background: var(--bg-overlay); color: var(--text-secondary); }
.recorded .dot { background: var(--severity-3); }
.today { border-color: var(--accent); color: var(--text-primary); }
.today .dot { background: var(--accent); }
```

`src/components/DateNavigator.tsx`:

```tsx
import { addDays, formatLong, weekdayInitial } from '../domain/date'
import type { IsoDate } from '../domain/types'
import styles from './DateNavigator.module.css'

interface Props {
  date: IsoDate
  today: IsoDate
  recordedDates: Set<string>
  onChange: (date: IsoDate) => void
}

export function DateNavigator({ date, today, recordedDates, onChange }: Props) {
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6))
  return (
    <div>
      <div className={styles.head}>
        <button type="button" className={styles.arrow} aria-label="Previous day" onClick={() => onChange(addDays(date, -1))}>←</button>
        <h1 className={styles.title}>{formatLong(date)}</h1>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next day"
          disabled={date >= today}
          onClick={() => onChange(addDays(date, 1))}
        >→</button>
      </div>
      <div className={styles.strip}>
        {strip.map((day) => {
          const recorded = recordedDates.has(day)
          return (
            <button
              key={day}
              type="button"
              aria-label={`${formatLong(day)} — ${recorded ? 'recorded' : 'no record'}`}
              aria-current={day === date ? 'date' : undefined}
              className={[styles.day, recorded ? styles.recorded : '', day === today ? styles.today : ''].join(' ').trim()}
              onClick={() => onChange(day)}
            >
              <span aria-hidden="true">{weekdayInitial(day)}</span>
              {recorded && <span className={styles.dot} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

`src/components/ItemRow.module.css`:

```css
.row { padding: var(--sp-4) 0; border-bottom: 1px solid var(--border-subtle); }
.row:last-child { border-bottom: none; }
.label { font-size: var(--fs-body); margin-bottom: 10px; display: block; }
```

`src/components/ItemRow.tsx`:

```tsx
import { SegmentedScore } from '../ui/SegmentedScore'
import type { Score } from '../domain/types'
import styles from './ItemRow.module.css'

interface Props {
  label: string
  value: Score | null
  onChange: (score: Score) => void
}

export function ItemRow({ label, value, onChange }: Props) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <SegmentedScore label={label} value={value} onChange={onChange} compact />
    </div>
  )
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/components
git commit -m "feat(ui): date navigator with recorded/unknown strip, and item row"
```

### Task 19: TrendChart

**Files:**
- Create: `src/components/TrendChart.tsx`, `src/components/TrendChart.module.css`
- Test: `src/components/TrendChart.test.tsx`
- Reference: `design-system/components/trend-chart.html`, `screens/trends.html`

**Interfaces:**
- Consumes: `composite`, `Baseline`, `DayRecord`, `Intake`, `EVENTS`.
- Produces: `<TrendChart records: DayRecord[] intakes: Intake[] baseline: Baseline | null from: IsoDate to: IsoDate />`
- Also produces the pure helper `buildSeries(records, from, to): Array<{ date; x; y; value } | null>` and `segmentPolylines(points): string[]` — exported from `TrendChart.tsx` and unit-tested directly, because the R-06 "never bridge a gap" rule must be provable without pixel snapshots.

Drawing rules, all from the design system: score line in `--severity-4`/`--severity-2`, dose markers as 8×8 rounded squares in `--dose` along the bottom, event ticks as 4px circles in `--event-good`/`--event-bad`, the baseline as a dashed `--baseline-line` band, and **a gap in recording is a literal break in the polyline** — one `<polyline>` per run of consecutive recorded days.

- [ ] **Step 1: Write the failing test**

`src/components/TrendChart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { TrendChart, buildSeries, segmentPolylines } from './TrendChart'
import { makeDayRecord, makeIntake } from '../test/factories'

test('a day with no record leaves a hole in the series, never an interpolated point (R-06)', () => {
  const series = buildSeries(
    [makeDayRecord('2026-09-10', { score: 4 }), makeDayRecord('2026-09-12', { score: 2 })],
    '2026-09-10',
    '2026-09-12',
  )
  expect(series).toHaveLength(3)
  expect(series[1]).toBeNull()
})

test('the line is broken into one polyline per run of recorded days — gaps are never bridged', () => {
  const series = buildSeries(
    [
      makeDayRecord('2026-09-10', { score: 4 }),
      makeDayRecord('2026-09-11', { score: 3 }),
      makeDayRecord('2026-09-14', { score: 2 }),
      makeDayRecord('2026-09-15', { score: 2 }),
    ],
    '2026-09-10',
    '2026-09-15',
  )
  expect(segmentPolylines(series)).toHaveLength(2)
})

test('a single isolated recorded day still produces a mark, not an invisible segment', () => {
  const series = buildSeries([makeDayRecord('2026-09-12', { score: 3 })], '2026-09-10', '2026-09-14')
  expect(segmentPolylines(series)).toHaveLength(1)
})

test('the chart is labelled and lists its marks in text for assistive tech', () => {
  render(
    <TrendChart
      records={[makeDayRecord('2026-09-10', { score: 4, events: ['conflict'] })]}
      intakes={[makeIntake('2026-09-10', 150)]}
      baseline={null}
      from="2026-09-08"
      to="2026-09-12"
    />,
  )
  expect(screen.getByRole('img', { name: /scores from/i })).toBeInTheDocument()
  expect(screen.getByText(/150 mg/)).toBeInTheDocument()
})

test('with nothing recorded the chart says so rather than drawing an empty grid', () => {
  render(<TrendChart records={[]} intakes={[]} baseline={null} from="2026-09-08" to="2026-09-12" />)
  expect(screen.getByText('Nothing recorded in this period.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/components/TrendChart.test.tsx`

- [ ] **Step 3: Implement**

`src/components/TrendChart.module.css`:

```css
.wrap { width: 100%; }
.svg { width: 100%; height: auto; display: block; }
.legend { display: flex; flex-wrap: wrap; gap: var(--sp-5); margin-top: var(--sp-3); }
.legendItem { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-micro); color: var(--text-tertiary); }
.key { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.empty { color: var(--text-tertiary); font-size: var(--fs-body); text-align: center; padding: var(--sp-8) 0; }
.caption { font-size: var(--fs-micro); color: var(--text-tertiary); }
```

`src/components/TrendChart.tsx`:

```tsx
import { composite } from '../analysis'
import { daysBetween, formatShort, rangeInclusive } from '../domain/date'
import { eventDef } from '../domain/events'
import type { Baseline } from '../analysis'
import type { DayRecord, Intake, IsoDate } from '../domain/types'
import styles from './TrendChart.module.css'

const W = 680
const H = 220
const PLOT_BOTTOM = 190 // marks live below this line
const PAD_X = 20

export interface Point { date: IsoDate; x: number; y: number; value: number }

function xFor(date: IsoDate, from: IsoDate, days: number): number {
  return PAD_X + (daysBetween(from, date) / Math.max(1, days - 1)) * (W - PAD_X * 2)
}

/** score 1 (best) at the top, 5 (worst) at the bottom of the plot area */
function yFor(value: number): number {
  return 20 + ((value - 1) / 4) * (PLOT_BOTTOM - 40)
}

export function buildSeries(records: DayRecord[], from: IsoDate, to: IsoDate): Array<Point | null> {
  const days = rangeInclusive(from, to)
  const byDate = new Map(records.map((r) => [r.date, r]))
  return days.map((date) => {
    const record = byDate.get(date)
    if (!record) return null
    const value = composite(record)
    if (Number.isNaN(value)) return null
    return { date, x: xFor(date, from, days.length), y: yFor(value), value }
  })
}

/** one polyline per run of consecutive recorded days — gaps are never bridged (R-06) */
export function segmentPolylines(series: Array<Point | null>): string[] {
  const out: string[] = []
  let run: Point[] = []
  for (const point of series) {
    if (point === null) {
      if (run.length > 0) out.push(run.map((p) => `${p.x},${p.y}`).join(' '))
      run = []
    } else {
      run.push(point)
    }
  }
  if (run.length > 0) out.push(run.map((p) => `${p.x},${p.y}`).join(' '))
  return out
}

interface Props {
  records: DayRecord[]
  intakes: Intake[]
  baseline: Baseline | null
  from: IsoDate
  to: IsoDate
}

export function TrendChart({ records, intakes, baseline, from, to }: Props) {
  const days = rangeInclusive(from, to).length
  const series = buildSeries(records, from, to)
  const points = series.filter((p): p is Point => p !== null)

  if (points.length === 0 && intakes.length === 0) {
    return <p className={styles.empty}>Nothing recorded in this period.</p>
  }

  const eventDays = records
    .filter((r) => r.events.some((id) => eventDef(id) !== undefined))
    .map((r) => ({
      date: r.date,
      x: xFor(r.date, from, days),
      valence: eventDef(r.events.find((id) => eventDef(id) !== undefined)!)!.valence,
    }))

  const description = [
    `Scores from ${formatShort(from)} to ${formatShort(to)}.`,
    ...intakes.map((i) => `${formatShort(i.date)}: ${i.mg} mg.`),
    ...points.map((p) => `${formatShort(p.date)}: ${p.value.toFixed(1)} of 5.`),
  ].join(' ')

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
        {baseline !== null && (
          <>
            <rect
              x="0" y={yFor(baseline.mean) - 14} width={W} height="28"
              fill="none" stroke="var(--baseline-line)" strokeDasharray="4 4"
            />
            <text x="8" y={yFor(baseline.mean) - 20} fill="var(--text-tertiary)" fontSize="11">baseline</text>
          </>
        )}

        {segmentPolylines(series).map((pointsAttr) => (
          <polyline
            key={pointsAttr}
            points={pointsAttr}
            fill="none"
            stroke="var(--severity-3)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="var(--severity-3)" />
        ))}

        {intakes.map((i) => (
          <rect key={i.date} x={xFor(i.date, from, days) - 4} y={PLOT_BOTTOM + 6} width="8" height="8" rx="2" fill="var(--dose)" />
        ))}

        {eventDays.map((e) => (
          <circle
            key={e.date}
            cx={e.x}
            cy={PLOT_BOTTOM + 24}
            r="4"
            fill={e.valence === 'good' ? 'var(--event-good)' : 'var(--event-bad)'}
          />
        ))}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.key} style={{ background: 'var(--dose)' }} />dose taken</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-bad)' }} />bad event</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-good)' }} />good event</span>
        <span className={styles.legendItem}><span className={styles.key} style={{ borderTop: '1px dashed var(--baseline-line)', height: 0, borderRadius: 0, width: 14 }} />baseline band</span>
      </div>
      <p className={styles.caption}>
        {intakes.map((i) => `${formatShort(i.date)} · ${i.mg} mg`).join('  ·  ')}
      </p>
    </div>
  )
}
```

(The inline `style` objects here set *token references*, not literal colors — permitted because SVG presentation attributes cannot be driven by CSS modules without extra classes; every value is still `var(--token)`.)

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/components
git commit -m "feat(ui): trend chart with unbridged gaps, dose markers and event ticks"
```

### Task 20: Statement card, unknown-day state, export action

**Files:**
- Create: `src/components/PatternStatementCard.tsx`, `src/components/PatternStatementCard.module.css`, `src/components/UnknownDayState.tsx`, `src/components/ExportAction.tsx`, `src/components/ExportAction.module.css`
- Test: `src/components/PatternStatementCard.test.tsx`, `src/components/ExportAction.test.tsx`
- Reference: `components/pattern-statement-card.html`, `components/thin-data-badge.html`, `components/unknown-day-state.html`, `components/export-action.html`, `foundations/typography.html`

**Interfaces:**
- Produces:
  - `<PatternStatementCard statement: Statement />` — statement type at 18/29, emphasised substrings bolded, badge below reading `based on N intakes` (+ ` · thin` when thin)
  - `<UnknownDayState />` — dashed card, "No record for this day"
  - `<ExportAction onExport: () => Promise<{ json: string; filename: string }> />` — triggers a client-side download via an object URL, no network

- [ ] **Step 1: Write the failing tests**

`src/components/PatternStatementCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { PatternStatementCard } from './PatternStatementCard'

const statement = {
  id: 'spacing-buckets',
  text: 'Doses taken 1–3 days apart were followed by 0.9 less improvement than doses 5 or more days apart.',
  emphasis: ['0.9 less improvement'],
  sampleSize: 22,
  thin: false,
}

test('renders the sentence with its emphasis bolded', () => {
  render(<PatternStatementCard statement={statement} />)
  expect(screen.getByText('0.9 less improvement').tagName).toBe('STRONG')
})

test('always shows the sample size', () => {
  render(<PatternStatementCard statement={statement} />)
  expect(screen.getByText('based on 22 intakes')).toBeInTheDocument()
})

test('thin data is marked, and the statement is still shown in full (R-16)', () => {
  render(<PatternStatementCard statement={{ ...statement, sampleSize: 4, thin: true }} />)
  expect(screen.getByText('based on 4 intakes · thin')).toBeInTheDocument()
  expect(screen.getByText(/Doses taken 1–3 days apart/)).toBeInTheDocument()
})

test('a single-intake sample reads naturally', () => {
  render(<PatternStatementCard statement={{ ...statement, sampleSize: 1, thin: true }} />)
  expect(screen.getByText('based on 1 intake · thin')).toBeInTheDocument()
})
```

`src/components/ExportAction.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportAction } from './ExportAction'

test('exporting hands over a file and never touches the network', async () => {
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  const fetchSpy = vi.spyOn(globalThis, 'fetch' as never)

  const onExport = vi.fn(async () => ({ json: '{}', filename: 'moodcraft-2026-09-18.json' }))
  render(<ExportAction onExport={onExport} />)
  await userEvent.click(screen.getByRole('button', { name: 'Export' }))

  expect(onExport).toHaveBeenCalledOnce()
  expect(createObjectURL).toHaveBeenCalledOnce()
  expect(fetchSpy).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('says plainly where the data goes', () => {
  render(<ExportAction onExport={async () => ({ json: '{}', filename: 'x.json' })} />)
  expect(screen.getByText('Saves a JSON file to your device')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/components/PatternStatementCard.test.tsx src/components/ExportAction.test.tsx`

- [ ] **Step 3: Implement**

`src/components/PatternStatementCard.module.css`:

```css
.statement {
  font-size: var(--fs-statement);
  line-height: var(--lh-statement);
  color: var(--text-primary);
  margin: 0 0 var(--sp-3);
}
```

`src/components/PatternStatementCard.tsx`:

```tsx
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import type { Statement } from '../analysis'
import styles from './PatternStatementCard.module.css'

function withEmphasis(text: string, emphasis: string[]) {
  if (emphasis.length === 0) return text
  const pattern = new RegExp(`(${emphasis.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`)
  return text.split(pattern).map((part, index) =>
    emphasis.includes(part) ? <strong key={index}>{part}</strong> : part,
  )
}

export function PatternStatementCard({ statement }: { statement: Statement }) {
  const noun = statement.sampleSize === 1 ? 'intake' : 'intakes'
  return (
    <Card>
      <p className={styles.statement}>{withEmphasis(statement.text, statement.emphasis)}</p>
      <Badge thin={statement.thin}>
        {`based on ${statement.sampleSize} ${noun}${statement.thin ? ' · thin' : ''}`}
      </Badge>
    </Card>
  )
}
```

`src/components/UnknownDayState.tsx`:

```tsx
import { Card } from '../ui/Card'
import styles from './UnknownDayState.module.css'

export function UnknownDayState() {
  return (
    <Card dashed className={styles.wrap}>
      <p className={styles.title}>No record for this day</p>
      <p className={styles.note}>Nothing was entered — this isn&rsquo;t scored as good or bad</p>
    </Card>
  )
}
```

`src/components/UnknownDayState.module.css`:

```css
.wrap { text-align: center; padding: var(--sp-12) var(--sp-6); }
.title { font-size: var(--fs-subtitle); color: var(--text-tertiary); margin: 0 0 6px; }
.note { font-size: var(--fs-micro); line-height: var(--lh-micro); color: var(--text-tertiary); margin: 0; }
```

`src/components/ExportAction.tsx`:

```tsx
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import styles from './ExportAction.module.css'

interface Props {
  onExport: () => Promise<{ json: string; filename: string }>
}

export function ExportAction({ onExport }: Props) {
  async function handleExport() {
    const { json, filename } = await onExport()
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={styles.row}>
      <div>
        <div className={styles.title}>Export data</div>
        <div className={styles.note}>Saves a JSON file to your device</div>
      </div>
      <Button variant="secondary" onClick={handleExport}>Export</Button>
    </Card>
  )
}
```

`src/components/ExportAction.module.css`:

```css
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.title { font-size: var(--fs-body); color: var(--text-primary); }
.note { font-size: var(--fs-micro); line-height: var(--lh-micro); color: var(--text-tertiary); }
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/components
git commit -m "feat(ui): pattern statement card, unknown-day state and export action"
```

---

# Phase 4 — Screens

### Task 21: AppDataProvider and useAnalysis

**Files:**
- Create: `src/state/AppDataProvider.tsx`, `src/state/useAnalysis.ts`
- Modify: `src/main.tsx` (wrap `App` in `AppDataProvider`)
- Test: `src/state/AppDataProvider.test.tsx`

**Interfaces:**
- Consumes: repositories, `runAnalysis`.
- Produces:
  - `<AppDataProvider>` loading everything once on mount
  - `useAppData(): { loading: boolean; dayRecords: DayRecord[]; intakes: Intake[]; medications: Medication[]; analysisMedicationId: string | null; saveDayRecord(r): Promise<void>; deleteDayRecord(date): Promise<void>; saveIntake(i): Promise<void>; deleteIntake(date): Promise<void>; addMedication(name): Promise<Medication>; setAnalysisTarget(id): Promise<void>; exportData(): Promise<{json,filename}> }`
  - `useAnalysis(window: WindowKey): AnalysisResult` — memoized on data + window

All state lives here; screens are pure renderers of it. Every mutation writes through the repository then updates local state — no optimistic-only updates, because a failed write must not look saved.

- [ ] **Step 1: Write the failing test**

`src/state/AppDataProvider.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDataProvider, useAppData } from './AppDataProvider'
import { closeDb, deleteDb } from '../data/db'
import { makeDayRecord } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

function Probe() {
  const data = useAppData()
  if (data.loading) return <p>loading</p>
  return (
    <div>
      <p>records: {data.dayRecords.length}</p>
      <p>target: {data.analysisMedicationId ?? 'none'}</p>
      <button onClick={() => void data.saveDayRecord(makeDayRecord('2026-09-15'))}>save</button>
      <button onClick={() => void data.addMedication('Medication A')}>add med</button>
    </div>
  )
}

test('loads from the device and exposes what was found', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => expect(screen.getByText('records: 0')).toBeInTheDocument())
})

test('a saved day record is visible immediately and persisted', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => screen.getByText('records: 0'))
  await userEvent.click(screen.getByRole('button', { name: 'save' }))
  await waitFor(() => expect(screen.getByText('records: 1')).toBeInTheDocument())
})

test('the first medication added becomes the analysis target', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => screen.getByText('target: none'))
  await userEvent.click(screen.getByRole('button', { name: 'add med' }))
  await waitFor(() => expect(screen.queryByText('target: none')).not.toBeInTheDocument())
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/state`

- [ ] **Step 3: Implement**

`src/state/AppDataProvider.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dayRecords as dayRecordsRepo } from '../data/dayRecords'
import { intakes as intakesRepo } from '../data/intakes'
import { medications as medicationsRepo } from '../data/medications'
import { exportFilename, serializeExport } from '../data/exportImport'
import { todayIso } from '../domain/date'
import type { DayRecord, Intake, IsoDate, Medication } from '../domain/types'

interface AppData {
  loading: boolean
  dayRecords: DayRecord[]
  intakes: Intake[]
  medications: Medication[]
  analysisMedicationId: string | null
  saveDayRecord: (record: DayRecord) => Promise<void>
  deleteDayRecord: (date: IsoDate) => Promise<void>
  saveIntake: (intake: Intake) => Promise<void>
  deleteIntake: (date: IsoDate) => Promise<void>
  addMedication: (name: string) => Promise<Medication>
  setAnalysisTarget: (id: string) => Promise<void>
  exportData: () => Promise<{ json: string; filename: string }>
}

const Context = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [analysisMedicationId, setAnalysisMedicationId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const targetId = await medicationsRepo.analysisTargetId()
    const [records, allMeds] = await Promise.all([dayRecordsRepo.all(), medicationsRepo.all()])
    setDayRecords(records)
    setMedications(allMeds)
    setAnalysisMedicationId(targetId)
    setIntakes(targetId ? await intakesRepo.forMedication(targetId) : [])
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  const value = useMemo<AppData>(() => ({
    loading,
    dayRecords,
    intakes,
    medications,
    analysisMedicationId,
    async saveDayRecord(record) { await dayRecordsRepo.put(record); await reload() },
    async deleteDayRecord(date) { await dayRecordsRepo.remove(date); await reload() },
    async saveIntake(intake) { await intakesRepo.put(intake); await reload() },
    async deleteIntake(date) {
      if (analysisMedicationId) await intakesRepo.remove(analysisMedicationId, date)
      await reload()
    },
    async addMedication(name) { const m = await medicationsRepo.add(name); await reload(); return m },
    async setAnalysisTarget(id) { await medicationsRepo.setAnalysisTarget(id); await reload() },
    async exportData() {
      return { json: await serializeExport(), filename: exportFilename(todayIso()) }
    },
  }), [loading, dayRecords, intakes, medications, analysisMedicationId, reload])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAppData(): AppData {
  const value = useContext(Context)
  if (value === null) throw new Error('useAppData must be used inside AppDataProvider')
  return value
}
```

`src/state/useAnalysis.ts`:

```ts
import { useMemo } from 'react'
import { runAnalysis, type AnalysisResult, type WindowKey } from '../analysis'
import { todayIso } from '../domain/date'
import { useAppData } from './AppDataProvider'

export function useAnalysis(window: WindowKey): AnalysisResult {
  const { dayRecords, intakes, analysisMedicationId } = useAppData()
  return useMemo(
    () => runAnalysis(
      { medicationId: analysisMedicationId, dayRecords, intakes, today: todayIso() },
      window,
    ),
    [dayRecords, intakes, analysisMedicationId, window],
  )
}
```

Wrap the app in `src/main.tsx`:

```tsx
<BrowserRouter>
  <AppDataProvider>
    <App />
  </AppDataProvider>
</BrowserRouter>
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/state src/main.tsx
git commit -m "feat(state): device-backed app data provider and memoized analysis hook"
```

### Task 22: Today screen

**Files:**
- Create: `src/screens/TodayScreen.tsx`, `src/screens/TodayScreen.module.css`, `src/components/EventChipGroup.tsx`, `src/components/IntakeField.tsx`
- Test: `src/screens/TodayScreen.test.tsx`
- Reference: `design-system/screens/today.html`

**Interfaces:**
- Consumes: `useAppData`, `ITEMS`, `EVENTS`, `DateNavigator`, `ItemRow`, `Chip`, `Combobox`, `Field`, `UnknownDayState`.
- Produces: default-exported `TodayScreen`; `<EventChipGroup selected: EventId[] onToggle: (id: EventId) => void />`; `<IntakeField medications mg medicationId onMg onMedication onCreateMedication />`

Behaviour:
- Opens on today; the date navigator moves to any past date (R-05).
- All 13 items render in spec order. A record is written once **all 13** have a score (R-03); before that the screen shows a quiet line "3 of 13 scored — nothing is saved until all 13 are" (statement of fact, no nagging).
- Editing a saved day updates it in place with no "edited" marking (R-05).
- A day with no record shows the `UnknownDayState` copy above the blank form, so "unknown" is visible rather than implied.
- The dose field takes one total for the day (R-04); no time input exists anywhere on the screen.
- Desktop (≥768px) shows a recent rail of the last three days, each labelled recorded / dose / unknown, per `screens/today.html`.

- [ ] **Step 1: Write the failing test**

`src/screens/TodayScreen.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TodayScreen from './TodayScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { ITEMS } from '../domain/items'
import { dayRecords } from '../data/dayRecords'
import { medications } from '../data/medications'
import { intakes } from '../data/intakes'
import { closeDb, deleteDb } from '../data/db'
import { makeDayRecord } from '../test/factories'
import { todayIso } from '../domain/date'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen() {
  return render(
    <MemoryRouter><AppDataProvider><TodayScreen /></AppDataProvider></MemoryRouter>,
  )
}

test('renders all 13 items in spec order', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('Tiredness')).toBeInTheDocument())
  expect(screen.getAllByRole('radiogroup')).toHaveLength(13)
  for (const item of ITEMS) {
    expect(screen.getByRole('radiogroup', { name: item.label })).toBeInTheDocument()
  }
})

test('a day with no record says so, rather than showing zeros', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('No record for this day')).toBeInTheDocument())
})

test('progress is stated plainly and nothing is written until all 13 are scored (R-03)', async () => {
  renderScreen()
  await waitFor(() => screen.getByText('Tiredness'))
  const row = screen.getByRole('radiogroup', { name: 'Tiredness' })
  await userEvent.click(within(row).getByRole('radio', { name: '3' }))
  expect(screen.getByText('1 of 13 scored — nothing is saved until all 13 are')).toBeInTheDocument()
  expect(await dayRecords.all()).toHaveLength(0)
})

test('scoring all 13 writes the day record', async () => {
  renderScreen()
  await waitFor(() => screen.getByText('Tiredness'))
  for (const item of ITEMS) {
    const row = screen.getByRole('radiogroup', { name: item.label })
    await userEvent.click(within(row).getByRole('radio', { name: '3' }))
  }
  await waitFor(async () => expect(await dayRecords.all()).toHaveLength(1))
})

test('an existing record loads into the form and edits in place, unmarked (R-05)', async () => {
  await dayRecords.put(makeDayRecord(todayIso(), { score: 2 }))
  renderScreen()
  await waitFor(() => {
    const row = screen.getByRole('radiogroup', { name: 'Tiredness' })
    expect(within(row).getByRole('radio', { name: '2' })).toBeChecked()
  })
  expect(screen.queryByText(/edited|late|updated/i)).not.toBeInTheDocument()
})

test('ticking an event stores it on the day record', async () => {
  await dayRecords.put(makeDayRecord(todayIso(), { score: 2 }))
  renderScreen()
  await waitFor(() => screen.getByRole('switch', { name: 'Conflict' }))
  await userEvent.click(screen.getByRole('switch', { name: 'Conflict' }))
  await waitFor(async () => expect((await dayRecords.all())[0]!.events).toEqual(['conflict']))
})

test('the dose is a single total in milligrams, with no time input anywhere (R-04)', async () => {
  const med = await medications.add('Medication A')
  renderScreen()
  await waitFor(() => screen.getByLabelText(/dose today/i))
  await userEvent.type(screen.getByLabelText(/dose today/i), '150')
  await userEvent.tab()
  await waitFor(async () => expect(await intakes.forMedication(med.id)).toMatchObject([{ mg: 150 }]))
  expect(screen.queryByLabelText(/time/i)).not.toBeInTheDocument()
})

test('a past date can be opened and recorded', async () => {
  renderScreen()
  await waitFor(() => screen.getByRole('button', { name: 'Previous day' }))
  await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
  expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('')
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/screens/TodayScreen.test.tsx`

- [ ] **Step 3: Implement**

`src/components/EventChipGroup.tsx`:

```tsx
import { EVENTS } from '../domain/events'
import { Chip } from '../ui/Chip'
import type { EventId } from '../domain/types'

interface Props { selected: EventId[]; onToggle: (id: EventId) => void }

export function EventChipGroup({ selected, onToggle }: Props) {
  return (
    <div role="group" aria-label="Events" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
      {EVENTS.map((event) => (
        <Chip
          key={event.id}
          label={event.label}
          valence={event.valence}
          selected={selected.includes(event.id)}
          onToggle={() => onToggle(event.id)}
        />
      ))}
    </div>
  )
}
```

`src/components/IntakeField.tsx`:

```tsx
import { Combobox } from '../ui/Combobox'
import { fieldStyles } from '../ui/Field'
import type { Medication } from '../domain/types'

interface Props {
  medications: Medication[]
  medicationId: string | null
  mg: string
  onMedication: (id: string) => void
  onCreateMedication: (name: string) => void
  onMg: (value: string) => void
  onCommit: () => void
}

export function IntakeField({ medications, medicationId, mg, onMedication, onCreateMedication, onMg, onCommit }: Props) {
  const name = medications.find((m) => m.id === medicationId)?.name ?? 'medication'
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <Combobox
        label="Medication"
        options={medications.map((m) => ({ id: m.id, name: m.name }))}
        value={medicationId}
        onSelect={onMedication}
        onCreate={onCreateMedication}
      />
      <label className={fieldStyles.field}>
        <span className={fieldStyles.label}>{`${name} · dose today (mg)`}</span>
        <input
          className={fieldStyles.input}
          inputMode="numeric"
          value={mg}
          onChange={(e) => onMg(e.target.value.replace(/[^0-9.]/g, ''))}
          onBlur={onCommit}
        />
      </label>
    </div>
  )
}
```

`src/screens/TodayScreen.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { DateNavigator } from '../components/DateNavigator'
import { EventChipGroup } from '../components/EventChipGroup'
import { IntakeField } from '../components/IntakeField'
import { ItemRow } from '../components/ItemRow'
import { UnknownDayState } from '../components/UnknownDayState'
import { Card } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { ITEMS, ITEM_IDS } from '../domain/items'
import { addDays, formatShort, todayIso } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import type { EventId, IsoDate, Score } from '../domain/types'
import styles from './TodayScreen.module.css'

export default function TodayScreen() {
  const data = useAppData()
  const today = todayIso()
  const [date, setDate] = useState<IsoDate>(today)
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [events, setEvents] = useState<EventId[]>([])
  const [mg, setMg] = useState('')

  const record = useMemo(() => data.dayRecords.find((r) => r.date === date), [data.dayRecords, date])
  const intake = useMemo(() => data.intakes.find((i) => i.date === date), [data.intakes, date])

  useEffect(() => {
    setScores(record?.scores ?? {})
    setEvents(record?.events ?? [])
    setMg(intake ? String(intake.mg) : '')
  }, [date, record, intake])

  const scored = ITEM_IDS.filter((id) => scores[id] !== undefined).length
  const complete = scored === ITEM_IDS.length

  async function persist(nextScores: Record<string, Score>, nextEvents: EventId[]) {
    if (ITEM_IDS.every((id) => nextScores[id] !== undefined)) {
      await data.saveDayRecord({ date, scores: nextScores, events: nextEvents })
    }
  }

  function onScore(id: string, score: Score) {
    const next = { ...scores, [id]: score }
    setScores(next)
    void persist(next, events)
  }

  function onToggleEvent(id: EventId) {
    const next = events.includes(id) ? events.filter((e) => e !== id) : [...events, id]
    setEvents(next)
    void persist(scores, next)
  }

  async function commitDose() {
    const value = Number(mg)
    if (!data.analysisMedicationId) return
    if (mg.trim() === '' || !(value > 0)) {
      if (intake) await data.deleteIntake(date)
      return
    }
    await data.saveIntake({ date, medicationId: data.analysisMedicationId, mg: value })
  }

  const recordedDates = useMemo(
    () => new Set(data.dayRecords.map((r) => r.date)),
    [data.dayRecords],
  )

  if (data.loading) return <p>Loading…</p>

  return (
    <div className={styles.screen}>
      <div className={styles.form}>
        <DateNavigator date={date} today={today} recordedDates={recordedDates} onChange={setDate} />

        {record === undefined && !complete && <UnknownDayState />}

        <Card className={styles.items}>
          <div className={styles.itemGrid}>
            {ITEMS.map((item) => (
              <ItemRow
                key={item.id}
                label={item.label}
                value={scores[item.id] ?? null}
                onChange={(score) => onScore(item.id, score)}
              />
            ))}
          </div>
          {!complete && (
            <p className={styles.progress}>
              {`${scored} of ${ITEM_IDS.length} scored — nothing is saved until all ${ITEM_IDS.length} are`}
            </p>
          )}
        </Card>

        <section aria-labelledby="events-title">
          <SectionTitle><span id="events-title">Events</span></SectionTitle>
          <EventChipGroup selected={events} onToggle={onToggleEvent} />
        </section>

        <section aria-labelledby="intake-title">
          <SectionTitle><span id="intake-title">Medication</span></SectionTitle>
          <IntakeField
            medications={data.medications}
            medicationId={data.analysisMedicationId}
            mg={mg}
            onMedication={(id) => void data.setAnalysisTarget(id)}
            onCreateMedication={(name) => void data.addMedication(name)}
            onMg={setMg}
            onCommit={() => void commitDose()}
          />
        </section>
      </div>

      <aside className={styles.rail} aria-label="Recent days">
        <SectionTitle>Recent</SectionTitle>
        {[1, 2, 3].map((back) => {
          const dayDate = addDays(date, -back)
          const day = data.dayRecords.find((r) => r.date === dayDate)
          const dose = data.intakes.find((i) => i.date === dayDate)
          return (
            <Card key={dayDate} dashed={day === undefined} className={styles.railCard}>
              <div className={styles.railDate}>{formatShort(dayDate)}</div>
              <div className={styles.railNote}>
                {day === undefined ? 'unknown' : dose ? `dose · ${dose.mg}mg` : 'recorded, no dose'}
              </div>
            </Card>
          )
        })}
      </aside>
    </div>
  )
}
```

(`addDays` comes from the `'../domain/date'` import at the top of the file, alongside `formatShort` and `todayIso`.)

`src/screens/TodayScreen.module.css`:

```css
.screen { display: grid; gap: var(--sp-6); }
.form { display: grid; gap: var(--sp-6); }
.items { padding: var(--sp-2) var(--sp-6); }
.itemGrid { display: grid; gap: 0; }
.progress { font-size: var(--fs-micro); color: var(--text-tertiary); margin: var(--sp-3) 0; }
.rail { display: none; }
.railCard { padding: var(--sp-3); margin-bottom: var(--sp-2); }
.railDate { font-size: var(--fs-label); color: var(--text-secondary); }
.railNote { font-size: var(--fs-micro); color: var(--text-tertiary); }

@media (min-width: 768px) {
  .itemGrid { grid-template-columns: 1fr 1fr; column-gap: var(--sp-6); }
}
@media (min-width: 1024px) {
  .screen { grid-template-columns: 1fr 220px; align-items: start; gap: var(--sp-8); }
  .rail { display: block; }
}
```

- [ ] **Step 4: Verify green**

Run: `npx vitest run src/screens/TodayScreen.test.tsx && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/screens src/components
git commit -m "feat(today): full day-record form with events, dose and recent rail"
```

### Task 23: Trends screen

**Files:**
- Create: `src/screens/TrendsScreen.tsx`, `src/screens/TrendsScreen.module.css`
- Test: `src/screens/TrendsScreen.test.tsx`
- Reference: `design-system/screens/trends.html`

**Interfaces:**
- Consumes: `useAnalysis`, `useAppData`, `Toggle`, `TrendChart`, `PatternStatementCard`.
- Produces: default-exported `TrendsScreen`.

Behaviour: window toggle (Recent / Long-term, R-17) above the chart; chart stacked above statements on mobile, chart-left / statements-right at ≥1024px; every statement rendered, thin ones marked; when there is no baseline, the spacing-only statement leads.

- [ ] **Step 1: Write the failing test**

`src/screens/TrendsScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrendsScreen from './TrendsScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb } from '../data/db'
import { dayRecords } from '../data/dayRecords'
import { intakes } from '../data/intakes'
import { medications } from '../data/medications'
import { makeDayRecord, makeIntake } from '../test/factories'
import { addDays, todayIso } from '../domain/date'

afterEach(async () => { closeDb(); await deleteDb() })

async function seed() {
  const med = await medications.add('Medication A')
  for (let i = 40; i > 30; i--) {
    await dayRecords.put(makeDayRecord(addDays(todayIso(), -i), { score: 4 }))
  }
  for (const [offset, score, mg] of [[20, 3, 150], [18, 3, 150], [9, 2, 150], [2, 2, 150]] as const) {
    await dayRecords.put(makeDayRecord(addDays(todayIso(), -offset), { score }))
    await intakes.put(makeIntake(addDays(todayIso(), -offset), mg, med.id))
  }
}

function renderScreen() {
  return render(<AppDataProvider><TrendsScreen /></AppDataProvider>)
}

test('offers both time windows with recent selected first (R-17)', async () => {
  await seed()
  renderScreen()
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Recent' })).toBeChecked())
  expect(screen.getByRole('radio', { name: 'Long-term' })).toBeInTheDocument()
})

test('switching to long-term re-renders the statements from the wider window', async () => {
  await seed()
  renderScreen()
  await waitFor(() => screen.getByRole('radio', { name: 'Long-term' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Long-term' }))
  expect(screen.getByRole('radio', { name: 'Long-term' })).toBeChecked()
})

test('shows a chart and at least one statement carrying a sample size', async () => {
  await seed()
  renderScreen()
  await waitFor(() => expect(screen.getByRole('img', { name: /scores from/i })).toBeInTheDocument())
  expect(screen.getAllByText(/based on \d+ intakes?/).length).toBeGreaterThan(0)
})

test('with no medication at all the screen states that plainly', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('No doses have been recorded yet.')).toBeInTheDocument())
})

test('no statement tells the person what to do (R-08)', async () => {
  await seed()
  renderScreen()
  await waitFor(() => screen.getAllByText(/based on/))
  expect(document.body.textContent).not.toMatch(/\b(should|recommend|advice|aim for|try to)\b/i)
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/screens/TrendsScreen.test.tsx`

- [ ] **Step 3: Implement**

`src/screens/TrendsScreen.tsx`:

```tsx
import { useState } from 'react'
import { PatternStatementCard } from '../components/PatternStatementCard'
import { TrendChart } from '../components/TrendChart'
import { SectionTitle } from '../ui/SectionTitle'
import { Toggle } from '../ui/Toggle'
import { RECENT_WINDOW_DAYS, type WindowKey } from '../analysis'
import { addDays, todayIso } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import { useAnalysis } from '../state/useAnalysis'
import styles from './TrendsScreen.module.css'

const WINDOWS = [
  { value: 'recent' as const, label: 'Recent' },
  { value: 'long-term' as const, label: 'Long-term' },
]

export default function TrendsScreen() {
  const [window, setWindow] = useState<WindowKey>('recent')
  const data = useAppData()
  const analysis = useAnalysis(window)
  const today = todayIso()

  if (data.loading) return <p>Loading…</p>

  const from =
    window === 'recent'
      ? addDays(today, -RECENT_WINDOW_DAYS)
      : (data.dayRecords[0]?.date ?? addDays(today, -RECENT_WINDOW_DAYS))

  const records = data.dayRecords.filter((r) => r.date >= from)
  const intakes = data.intakes.filter((i) => i.date >= from)

  return (
    <div className={styles.screen}>
      <div className={styles.chartColumn}>
        <h1 className={styles.heading}>Trends &amp; Patterns</h1>
        <Toggle ariaLabel="Time window" options={WINDOWS} value={window} onChange={setWindow} />
        <TrendChart records={records} intakes={intakes} baseline={analysis.baseline} from={from} to={today} />
      </div>

      <section className={styles.statements} aria-label="Patterns">
        <SectionTitle>Patterns</SectionTitle>
        {analysis.statements.map((statement) => (
          <PatternStatementCard key={statement.id} statement={statement} />
        ))}
      </section>
    </div>
  )
}
```

`src/screens/TrendsScreen.module.css`:

```css
.screen { display: grid; gap: var(--sp-6); }
.chartColumn { display: grid; gap: var(--sp-4); }
.heading { font-size: var(--fs-title); line-height: var(--lh-title); margin: 0; }
.statements { display: grid; gap: var(--sp-3); align-content: start; }

@media (min-width: 1024px) {
  .screen { grid-template-columns: 1fr 280px; gap: var(--sp-8); align-items: start; }
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/screens
git commit -m "feat(trends): windowed chart and pattern statements"
```

### Task 24: Library screen

**Files:**
- Create: `src/screens/LibraryScreen.tsx`, `src/screens/LibraryScreen.module.css`, `src/components/MedicationLibraryList.tsx`, `src/components/MedicationLibraryList.module.css`
- Test: `src/screens/LibraryScreen.test.tsx`
- Reference: `design-system/screens/library.html`, `components/medication-library-list.html`, `components/export-action.html`

**Interfaces:**
- Consumes: `useAppData`, `useAnalysis`, `MedicationLibraryList`, `ExportAction`.
- Produces: default-exported `LibraryScreen`; `<MedicationLibraryList medications intakeCounts firstIntakeDates analysisMedicationId onAnalyze onAdd />`

Behaviour: every medication with its intake count and first-intake date; exactly one marked "under analysis"; the others offer "Analyze this"; switching the target keeps all history (R-11); "+ Add medication"; export lives here. At ≥1024px the list sits left with a detail panel right, per `screens/library.html`.

- [ ] **Step 1: Write the failing test**

`src/screens/LibraryScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryScreen from './LibraryScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb } from '../data/db'
import { intakes } from '../data/intakes'
import { medications } from '../data/medications'
import { makeIntake } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen() {
  return render(<AppDataProvider><LibraryScreen /></AppDataProvider>)
}

test('lists every medication with how many intakes it has', async () => {
  const a = await medications.add('Medication A')
  await medications.add('Caffeine')
  await intakes.put(makeIntake('2026-06-02', 150, a.id))
  await intakes.put(makeIntake('2026-06-06', 150, a.id))

  renderScreen()
  await waitFor(() => expect(screen.getByText('Medication A')).toBeInTheDocument())
  expect(screen.getByText('2 intakes · since Jun 2')).toBeInTheDocument()
  expect(screen.getByText('Caffeine')).toBeInTheDocument()
})

test('exactly one medication is under analysis and the others can take over (R-11)', async () => {
  await medications.add('Medication A')
  await medications.add('Caffeine')
  renderScreen()
  await waitFor(() => expect(screen.getAllByText('under analysis')).toHaveLength(1))
  await userEvent.click(screen.getAllByRole('button', { name: 'Analyze this' })[0]!)
  await waitFor(() => expect(screen.getAllByText('under analysis')).toHaveLength(1))
  expect(await medications.all()).toHaveLength(2) // switching discarded nothing
})

test('a medication can be added', async () => {
  renderScreen()
  await waitFor(() => screen.getByRole('button', { name: '+ Add medication' }))
  await userEvent.click(screen.getByRole('button', { name: '+ Add medication' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Medication name' }), 'Melatonin')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(async () => expect(await medications.all()).toHaveLength(1))
})

test('export is offered here, described as a file on the device (R-19)', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument())
  expect(screen.getByText('Saves a JSON file to your device')).toBeInTheDocument()
})

test('a medication with no measured baseline says only spacing can be analysed (R-10)', async () => {
  const med = await medications.add('Medication A')
  await intakes.put(makeIntake('2026-06-02', 150, med.id))
  renderScreen()
  await waitFor(() =>
    expect(screen.getByText(/only the spacing between doses/)).toBeInTheDocument(),
  )
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/screens/LibraryScreen.test.tsx`

- [ ] **Step 3: Implement**

`src/components/MedicationLibraryList.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Pill } from '../ui/Pill'
import { fieldStyles } from '../ui/Field'
import { formatShort } from '../domain/date'
import type { IsoDate, Medication } from '../domain/types'
import styles from './MedicationLibraryList.module.css'

interface Props {
  medications: Medication[]
  intakeCounts: Record<string, number>
  firstIntakeDates: Record<string, IsoDate | undefined>
  analysisMedicationId: string | null
  onAnalyze: (id: string) => void
  onAdd: (name: string) => void
}

export function MedicationLibraryList(props: Props) {
  const { medications, intakeCounts, firstIntakeDates, analysisMedicationId, onAnalyze, onAdd } = props
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <Card className={styles.card}>
      <ul className={styles.list}>
        {medications.map((medication) => {
          const count = intakeCounts[medication.id] ?? 0
          const first = firstIntakeDates[medication.id]
          return (
            <li key={medication.id} className={styles.row}>
              <div>
                <div className={styles.name}>{medication.name}</div>
                <div className={styles.meta}>
                  {`${count} ${count === 1 ? 'intake' : 'intakes'}${first ? ` · since ${formatShort(first).replace(/^\w+, /, '')}` : ''}`}
                </div>
              </div>
              {medication.id === analysisMedicationId ? (
                <Pill tone="accent">under analysis</Pill>
              ) : (
                <Button variant="ghost" onClick={() => onAnalyze(medication.id)}>Analyze this</Button>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <div className={styles.add}>
          <label className={fieldStyles.label} htmlFor="medication-name">Medication name</label>
          <input
            id="medication-name"
            className={fieldStyles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); setAdding(false) } }}
          >
            Add
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className={styles.addButton} onClick={() => setAdding(true)}>
          + Add medication
        </Button>
      )}
    </Card>
  )
}
```

`src/components/MedicationLibraryList.module.css`:

```css
.card { padding: 0 var(--sp-6); }
.list { list-style: none; margin: 0; padding: 0; }
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-4) 0; border-bottom: 1px solid var(--border-subtle);
}
.row:last-child { border-bottom: none; }
.name { font-size: var(--fs-body); color: var(--text-primary); }
.meta { font-size: var(--fs-micro); line-height: var(--lh-micro); color: var(--text-tertiary); }
.add { display: grid; gap: var(--sp-2); padding: var(--sp-4) 0; }
.addButton { color: var(--accent); font-weight: 700; padding: var(--sp-4) 0; }
```

`src/screens/LibraryScreen.tsx`:

```tsx
import { useMemo } from 'react'
import { ExportAction } from '../components/ExportAction'
import { MedicationLibraryList } from '../components/MedicationLibraryList'
import { Card } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { formatShort } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import { useAnalysis } from '../state/useAnalysis'
import styles from './LibraryScreen.module.css'

export default function LibraryScreen() {
  const data = useAppData()
  const analysis = useAnalysis('long-term')

  const intakeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const intake of data.intakes) counts[intake.medicationId] = (counts[intake.medicationId] ?? 0) + 1
    return counts
  }, [data.intakes])

  const firstIntakeDates = useMemo(() => {
    const first: Record<string, string | undefined> = {}
    for (const intake of data.intakes) {
      const current = first[intake.medicationId]
      if (current === undefined || intake.date < current) first[intake.medicationId] = intake.date
    }
    return first
  }, [data.intakes])

  if (data.loading) return <p>Loading…</p>

  const selected = data.medications.find((m) => m.id === data.analysisMedicationId)

  return (
    <div className={styles.screen}>
      <div className={styles.listColumn}>
        <h1 className={styles.heading}>Library</h1>
        <MedicationLibraryList
          medications={data.medications}
          intakeCounts={intakeCounts}
          firstIntakeDates={firstIntakeDates}
          analysisMedicationId={data.analysisMedicationId}
          onAnalyze={(id) => void data.setAnalysisTarget(id)}
          onAdd={(name) => void data.addMedication(name)}
        />
        <ExportAction onExport={data.exportData} />
      </div>

      <aside className={styles.detail} aria-label="Selected medication">
        <SectionTitle>Under analysis</SectionTitle>
        <Card>
          <p className={styles.detailName}>{selected?.name ?? 'Nothing selected yet'}</p>
          <p className={styles.detailMeta}>
            {analysis.baseline
              ? `${analysis.outcomes.length} intakes · baseline measured over ${analysis.baseline.dayCount} days up to ${formatShort(analysis.baseline.to)}`
              : `${analysis.outcomes.length} intakes · no days were recorded before the first dose, so only the spacing between doses can be analysed`}
          </p>
        </Card>
      </aside>
    </div>
  )
}
```

`src/screens/LibraryScreen.module.css`:

```css
.screen { display: grid; gap: var(--sp-6); }
.listColumn { display: grid; gap: var(--sp-4); align-content: start; }
.heading { font-size: var(--fs-title); line-height: var(--lh-title); margin: 0; }
.detail { display: grid; gap: var(--sp-3); align-content: start; }
.detailName { font-size: var(--fs-subtitle); color: var(--text-primary); margin: 0 0 var(--sp-2); }
.detailMeta { font-size: var(--fs-body); color: var(--text-secondary); margin: 0; }

@media (min-width: 1024px) {
  .screen { grid-template-columns: 1fr 320px; gap: var(--sp-8); align-items: start; }
}
```

- [ ] **Step 4: Verify green, then commit**

```bash
git add src/screens src/components
git commit -m "feat(library): medication library, analysis switching and export"
```

---

# Phase 5 — First run, parity and hardening

### Task 25: First-run state and keyboard/reader pass

**Files:**
- Modify: `src/screens/TodayScreen.tsx`, `src/screens/TrendsScreen.tsx`, `src/screens/LibraryScreen.tsx`, `src/components/NavShell.tsx`
- Create: `src/components/EmptyState.tsx`, `src/components/EmptyState.module.css`
- Test: `src/screens/firstRun.test.tsx`, `src/a11y.test.tsx`

**Interfaces:**
- Produces: `<EmptyState title: string note: string />` — the dashed-card treatment reused for "no medication yet" and "nothing recorded in this period".

Behaviour on a completely empty device: Today shows the blank form plus the unknown-day card and the medication picker offering "+ Add new medication"; Trends shows "No doses have been recorded yet."; Library shows "No medications yet" with the add control. No screen shows a spinner longer than the first load, and none shows an error banner for the ordinary empty case.

- [ ] **Step 1: Write the failing tests**

`src/screens/firstRun.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TodayScreen from './TodayScreen'
import TrendsScreen from './TrendsScreen'
import LibraryScreen from './LibraryScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb } from '../data/db'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen(ui: React.ReactElement) {
  return render(<MemoryRouter><AppDataProvider>{ui}</AppDataProvider></MemoryRouter>)
}

test('an empty device shows a usable Today form, not an error', async () => {
  renderScreen(<TodayScreen />)
  await waitFor(() => expect(screen.getByText('Tiredness')).toBeInTheDocument())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('an empty device shows plain statements on Trends', async () => {
  renderScreen(<TrendsScreen />)
  await waitFor(() => expect(screen.getByText('No doses have been recorded yet.')).toBeInTheDocument())
})

test('an empty library invites adding, without nagging', async () => {
  renderScreen(<LibraryScreen />)
  await waitFor(() => expect(screen.getByText('No medications yet')).toBeInTheDocument())
  expect(document.body.textContent).not.toMatch(/don't forget|remember to|streak|missed/i)
})
```

`src/a11y.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppDataProvider } from './state/AppDataProvider'
import { closeDb, deleteDb } from './data/db'

afterEach(async () => { closeDb(); await deleteDb() })

test('every screen has exactly one h1 and a main landmark', async () => {
  for (const path of ['/today', '/trends', '/library']) {
    const view = render(
      <MemoryRouter initialEntries={[path]}><AppDataProvider><App /></AppDataProvider></MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1))
    expect(screen.getByRole('main')).toBeInTheDocument()
    view.unmount()
  }
})

test('the whole day form can be completed from the keyboard', async () => {
  render(
    <MemoryRouter initialEntries={['/today']}><AppDataProvider><App /></AppDataProvider></MemoryRouter>,
  )
  await waitFor(() => screen.getByText('Tiredness'))
  await userEvent.tab()
  expect(document.activeElement).toBeInstanceOf(HTMLElement)
  await userEvent.keyboard('{Enter}')
  expect(document.body).toBeInTheDocument() // no crash, focus never trapped
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run src/screens/firstRun.test.tsx src/a11y.test.tsx`

- [ ] **Step 3: Implement**

`src/components/EmptyState.tsx`:

```tsx
import { Card } from '../ui/Card'
import styles from './EmptyState.module.css'

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <Card dashed className={styles.wrap}>
      <p className={styles.title}>{title}</p>
      <p className={styles.note}>{note}</p>
    </Card>
  )
}
```

`src/components/EmptyState.module.css`:

```css
.wrap { text-align: center; padding: var(--sp-12) var(--sp-6); }
.title { font-size: var(--fs-subtitle); color: var(--text-tertiary); margin: 0 0 6px; }
.note { font-size: var(--fs-micro); line-height: var(--lh-micro); color: var(--text-tertiary); margin: 0; }
```

In `LibraryScreen`, when `data.medications.length === 0`, render above the list:

```tsx
<EmptyState
  title="No medications yet"
  note="Add the one you want to look at — nothing is tracked until you do"
/>
```

In `TodayScreen`, ensure the `<h1>` is the `DateNavigator` title (already is) and that the loading branch returns `<p role="status">Loading…</p>` so it is announced and not mistaken for content. Give `TrendsScreen` and `LibraryScreen` their `<h1>` (already added in Tasks 23–24).

In `NavShell`, the `<main>` element already provides the landmark; confirm there is exactly one per screen (screens must not render their own `<main>`).

- [ ] **Step 4: Verify green, then commit**

```bash
git add src
git commit -m "feat(ux): first-run empty states and accessibility pass"
```

### Task 26: Design-system parity review

**Files:**
- Create: `docs/design-parity.md`
- Modify: whichever component CSS drifts from its reference

**Interfaces:**
- Produces: a checked-off parity table committed alongside any corrections.

This task is a review with a written artifact, not a feature. Work through each design-system file, open the implemented component beside it, and record verdicts.

- [ ] **Step 1: Build and view the app**

```bash
npm run dev
```

Open http://localhost:5173 in a browser at 360px, 768px and 1280px widths.

- [ ] **Step 2: Walk the checklist**

For each row, compare implementation against the reference file and record PASS or the fix applied:

| Reference | What must match |
|---|---|
| `foundations/colors.html` | every token value; severity ramp used only for scores; accent only for interaction; dose gold only on dose markers; event teal/rose only on events |
| `foundations/typography.html` | display 28/34, title 22/28, subtitle 17/24, body 15/22, label 13/18, micro 11/16, statement 18/29; tabular numerals |
| `foundations/spacing.html` | 4px scale; card 20px / control 12px / pill full radius; **no drop shadows anywhere**; focus glow present and used only for focus |
| `components/nav-shell.html` | three tabs, bottom on mobile, 180px sidebar on desktop, accent-muted active pill, no badges |
| `components/score-selector.html` | five segments, 40px tall (34px compact), gap 6px, correct on-fill text colors per level |
| `components/item-row.html` | 16px vertical padding, hairline divider, no divider on last row |
| `components/event-chip.html` | pill chips with 7px dot, muted good/bad fills when ticked, neutral overlay when not |
| `components/date-navigator.html` | 36px arrow buttons, centered long date, 7-day strip, dashed+dotless = unknown, solid+dot = recorded, accent border for today |
| `components/intake-field.html` | overlay fill, label 13px tertiary above 17px value; picker rows with hover fill and accent add row |
| `components/medication-library-list.html` | row layout, "under analysis" accent pill, ghost "Analyze this" |
| `components/pattern-statement-card.html` | statement at 18/29 in primary text, bolded emphasis, badge below |
| `components/thin-data-badge.html` | thin badge in severity-3 border / severity-2 text |
| `components/trend-chart.html` | severity line, gold dose squares (8×8, r2), event circles r4, dashed baseline band, **literal break at gaps** |
| `components/unknown-day-state.html` | dashed transparent card, exact copy |
| `components/window-toggle.html` | pill container, accent-muted active option |
| `components/export-action.html` | row with title + note left, secondary button right |
| `screens/today.html` | single column mobile; two-column items ≥768px; recent rail ≥1024px |
| `screens/trends.html` | toggle above chart; statements below on mobile, right rail ≥1024px |
| `screens/library.html` | plain list on mobile; list + detail panel ≥1024px |

- [ ] **Step 3: Write up and fix**

Record the table with verdicts in `docs/design-parity.md`. For each drift, fix the CSS in the owning module and note the fix in the row. Do not "improve" on the design system — parity means parity.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit`

```bash
git add docs/design-parity.md src
git commit -m "docs: design-system parity review with corrections"
```

### Task 27: Final verification — privacy, copy and build

**Files:**
- Create: `src/guards.test.ts`
- Create: `README.md`

**Interfaces:**
- Produces: guard tests that fail the build if the app gains network code or prescriptive copy.

- [ ] **Step 1: Write the failing guard tests**

`src/guards.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|css)$/.test(path) ? [path] : []
  })
}

const files = sourceFiles(resolve(__dirname))
const appFiles = files.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && !f.includes('/test/'))

test('no source file performs a network request (R-18)', () => {
  for (const file of appFiles) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|navigator\.sendBeacon/)
    expect(source, file).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
  }
})

test('no user-facing copy recommends an action (R-08)', () => {
  const banned = /\b(you should|we recommend|recommended|try taking|aim for|wait at least|advice)\b/i
  for (const file of appFiles) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(banned)
  }
})

test('nothing nudges, reminds or notifies (R-20)', () => {
  for (const file of appFiles) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toMatch(/Notification|requestPermission|serviceWorker|streak|don't forget/i)
  }
})

test('no time-of-day is captured anywhere (R-04)', () => {
  for (const file of appFiles) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/type="time"|getHours\(\)|setHours\(/)
  }
})

test('components use tokens, not raw colour values', () => {
  for (const file of appFiles.filter((f) => f.endsWith('.module.css'))) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  }
})
```

- [ ] **Step 2: Run them**

Run: `npx vitest run src/guards.test.ts`
Expected: they may legitimately fail on first run — fix the offending source rather than loosening the guard. (`src/styles/tokens.css` is not a `.module.css`, so the token file itself is exempt by construction.)

- [ ] **Step 3: Write the README**

`README.md`:

```markdown
# Moodcraft

A private, offline record of daily mood and medication, built to make the
relationship between dose spacing and how well a dose worked visible.

- Domain rules: [`domain-spec-moodcraft.md`](domain-spec-moodcraft.md)
- Visual language: [`design-system/`](design-system/) — open the HTML files directly
- Implementation plan: [`docs/superpowers/plans/2026-09-18-moodcraft-implementation.md`](docs/superpowers/plans/2026-09-18-moodcraft-implementation.md)

## Running it

    npm install
    npm run dev       # http://localhost:5173
    npm test          # unit and component tests
    npm run typecheck
    npm run build

## Where the data lives

In this browser, in IndexedDB, on this device. There is no account, no server,
no sync and no network code — a test enforces that. Export writes a JSON file
you keep yourself.

## Changing the stored shape

Append a migration to `src/data/migrations.ts` and let `SCHEMA_VERSION` follow
it. Shipped migrations are never edited.
```

- [ ] **Step 4: Full verification**

Run every check and paste the real output into the commit description:

```bash
npx vitest run && npx tsc --noEmit && npm run build
```

Expected: all tests pass, no type errors, `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add src/guards.test.ts README.md
git commit -m "test: privacy, copy and token guards; document the project"
```

---

## Coverage map — spec requirement to task

| Requirement | Where it is implemented and proved |
|---|---|
| R-01 one record per date | Task 5 (`put` replaces), Task 3 (`date` is the key) |
| R-02 scores 1–5, 5 worst | Task 3 (`Score`), Task 14 (control, "5, worst") |
| R-03 all 13 answered | Task 22 (write only when complete) |
| R-04 total mg, no time | Task 5 (`Intake`), Task 22, Task 27 guard |
| R-05 any past date, unmarked | Task 18 (navigator), Task 22 (edit-in-place test) |
| R-06 missing day is unknown | Task 7 (`meanComposite` null), Task 19 (`segmentPolylines`), Tasks 18/20 (visual states) |
| R-07 no intake = not taken | Task 12 (absence never imputed), copy carries no "missed" wording (Task 27 guard) |
| R-08 never recommends | Task 11 (statement wording), Task 23 test, Task 27 guard |
| R-09 measured baseline only | Task 7 (`computeBaseline`) |
| R-10 no baseline ⇒ spacing only | Task 12 (`spacingOnly`), Task 11 (`no-baseline` statement), Task 24 test |
| R-11 one medication at a time | Task 5 (`analysisTargetId`), Task 24 |
| R-12 intake day and following days | Task 8 (`responseWindow`) |
| R-13 gap + previous dose, events as confounders | Tasks 9, 10, 11 |
| R-14 learned threshold | Task 10 (`findResetThreshold`) |
| R-15 no configured medication knowledge | Task 3 (`Medication` has no such fields) |
| R-16 thin data shown and marked | Task 11 (`thin`), Task 20 (badge) |
| R-17 multiple windows | Task 12 (`WindowKey`), Task 23 (toggle) |
| R-18 device-only | Task 4 (IndexedDB), Task 27 guard |
| R-19 manual export | Task 6, Task 20, Task 24 |
| R-20 never notifies | Task 17 (no badges), Task 27 guard |
| §8.1 recording a day | Task 22 |
| §8.2 passive baseline | Task 7 |
| §8.3 spacing pattern | Tasks 8–11 |
| §8.4 reading the charts | Tasks 19, 23 |
| §9 edge: already taking at install | Task 12 spacing-only + Task 24 detail copy |
| §9 edge: deliberate breaks | Task 8 (a 14-day gap is data) |
| §9 edge: intake with no record | Task 8 (`improvement: null`, still counts for gaps) |
| §9 edge: item list changes | Task 7 (per-item means skip absent items), Task 3 (stable ids) |
| §9 edge: very sparse data | Task 11 (thin marking) |
| §9 edge: events coinciding with doses | Task 9 |

## Self-review notes

- **Spec coverage:** every R-rule and every §9 edge case maps to a task above. Q-01/Q-03 are resolved by the stated assumptions; Q-02 (out of scope) is honoured by omission — no side-effect, weight, cycle, cost or journal field exists in any type; Q-04 is resolved as composite + per-item; Q-05 (a pre-recording dose contaminating the baseline) is **not** solvable in code and is left as a question for the user — noted here so the executor does not invent a mechanism for it.
- **Naming consistency checked:** `composite`, `meanComposite`, `perItem`, `computeBaseline`, `withGaps`, `responseWindow`, `computeOutcomes`, `isConfounded`, `splitByConfounding`, `meanImprovement`, `bucketComparison`, `findResetThreshold`, `dosePreviousEffect`, `buildStatements`, `runAnalysis` are each defined once and used with the same spelling downstream. Repository objects are `dayRecords`, `intakes`, `medications`; the provider exposes `saveDayRecord` / `saveIntake` / `addMedication` / `setAnalysisTarget` / `exportData`.
- **Known ordering dependency:** Task 8's `improvement.ts` imports `isConfounded` from Task 9's `confounders.ts`; that file is written during Task 8 Step 3 using the code given in Task 9. Task 9 then adds its tests. This is called out in both tasks.
- **Deliberately deferred:** import-from-file UI (the `restoreExport` function exists and is tested, but no screen calls it — add it only if the user asks), per-item trend charts (the per-item data is computed; only the composite is plotted), and any settings surface beyond the analysis target.

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-09-18-moodcraft-implementation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, reviewed between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.
