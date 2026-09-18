# Design: dose-size decay chart

*2026-09-18. Status: approved for implementation.*

## Purpose

The user asked to see "which dose has the best improvement and longest lasting effect."
Today's analysis engine relates improvement to the *gap* before a dose (`GapScatter`,
`bucketComparison`, `findResetThreshold`) and to the *previous* dose's size
(`dosePreviousEffect`), but nothing groups outcomes by the size of the dose itself, and
nothing measures how long an effect persists — `RESPONSE_WINDOW_DAYS` is a fixed 3-day
window (R-12), not a decay curve. This spec adds both: a per-dose-bucket decay curve over
the days following intake.

## Definitions this introduces

- **Dose bucket** — intakes grouped by mg amount, using the data itself rather than any
  configured threshold (consistent with R-15, "the app holds no configured knowledge about
  any medication"). If the recorded intakes contain 3 or fewer distinct mg amounts, one
  bucket per amount. Otherwise, 3 buckets split at the tertiles of all recorded mg values,
  labelled by the actual mg range they cover (e.g. "5–9 mg"). Buckets are computed from
  **all** intakes ever recorded for the medication under analysis, not just the current
  recent/long-term window, matching how `allOutcomes` already works.
- **Day-offset improvement** — for a given dose and a given number of days after it
  (0 through 6), `baseline.mean - composite(day record)`, if that day has a day record.
- **Attribution cutoff** — a day-offset stops counting toward a dose once a *later* intake
  (of the same medication) has happened by that day. This means every day is attributed to
  exactly one dose — the most recent one — so a dose taken every 2 days never borrows
  apparent "lasting power" from the dose that actually followed it. The tradeoff, stated
  explicitly for the user: doses that are usually spaced closely will have thin or absent
  data at higher day-offsets, because most of their tail is cut off by the next dose. This
  is expected, not a bug — a dose taken frequently genuinely has fewer days that are
  attributable only to it.
- **Decay curve** — for each dose bucket, the mean day-offset improvement across all its
  doses, for offsets 0–6, plus the count of contributing doses/days at each offset (so thin
  points can be marked rather than hidden, per R-16).

This uses "all data," not last-dose-only, per the user's explicit correction during
brainstorming.

## Analysis layer: `src/analysis/duration.ts`

```ts
export interface DoseBucket { label: string; minMg: number; maxMg: number; doseCount: number }
export interface DecayPoint { dayOffset: number; meanImprovement: number | null; sampleSize: number }
export interface DecayCurve { bucket: DoseBucket; points: DecayPoint[] }

export function buildDoseBuckets(intakes: Intake[]): DoseBucket[]
export function computeDecayCurves(
  intakes: Intake[],
  records: DayRecord[],
  baseline: Baseline | null,
): DecayCurve[]
```

- `buildDoseBuckets` only groups; it does no time-series work, so it's testable alone
  against a plain list of mg values.
- `computeDecayCurves` returns `[]` when `baseline` is `null` (R-10 — no effectiveness
  claim without a measured baseline; the UI shows spacing-only messaging instead, same
  pattern as `GapScatter`'s `hasBaseline` prop).
- Implementation walks intakes sorted by date; for each intake, for offset 0..6, take
  `addDays(intake.date, offset)`, stop early if that date `>=` the next intake's date, look
  up the day record, and accumulate into that dose's bucket at that offset.

Wire into `run.ts`: add `decayCurves: DecayCurve[]` to `AnalysisResult`, computed once over
full history (like `allOutcomes`) so the window toggle doesn't affect bucket membership
(consistent with the bucket note above).

### Amendment: confounded days (added after initial implementation)

The initial version omitted R-13 — a day carrying a logged event that happened to land in a
dose's decay window was averaged in with no indication, unlike `GapScatter` and the
statements pipeline which both surface confounding. `DecayPoint` gained a
`confoundedCount: number` — how many of that point's contributing days had an event. The
day is still included in `meanImprovement` and `sampleSize` (noted, not excluded, same
policy as `isConfounded`/`splitByConfounding` elsewhere) — dropping it would mean silently
discarding recorded data, which the app avoids by design (R-16's spirit applied to R-13).
`DoseDecayChart` draws a dashed ring around any point with `confoundedCount > 0` (mirroring
`GapScatter`'s open-ring idiom for confounded points) and names the count in both the
tooltip and the accessible description.

## Statement: `src/analysis/statements.ts`

One new descriptive statement, added only when at least one bucket has a non-null
day-0 point:

> "The 10–14 mg doses had the best initial improvement (1.8), and still held 0.6 of that by
> day 3."

Computed from the bucket with the highest day-0 `meanImprovement`; "day 3" is fixed to
match `RESPONSE_WINDOW_DAYS` so the phrasing lines up with the rest of the app's language.
Sample size for `thin` marking is that bucket's day-0 `sampleSize`.

## Component: `src/components/DoseDecayChart.tsx`

- One `<svg>`, one `<polyline>` per bucket, x = day offset (0–6), y = mean improvement
  (same up-is-better sign convention as `TrendChart`/`GapScatter`).
- Line color: reuse the existing severity gradient tokens (`--severity-2`, `--severity-3`,
  `--severity-4`) ordered low-to-high dose bucket — no new hex tokens, per the guard test.
- A point with `sampleSize` below `THIN_SAMPLE` at that offset is drawn as a hollow marker
  rather than a filled one (R-16 — thin data shown, not hidden), matching the "open ring"
  idiom `GapScatter` already uses for confounded points.
- No baseline → renders the same explanatory sentence style as `GapScatter`'s
  "Not enough doses..." fallback, but naming the reason (no measured baseline yet).
- Legend lists each bucket's label and dose count. Hover/tap on a point shows exact
  improvement and sample size, mirroring `GapScatter`'s tooltip pattern.
- Accessible description (`role="img"` `aria-label`) lists each bucket and its curve in
  text, same idiom as `GapScatter`.
- New `DoseDecayChart.module.css`, tokens only.

## Screen wiring: `src/screens/TrendsScreen.tsx`

Added under a new `<SectionTitle>Dose size vs. how long it lasted</SectionTitle>`, below the
existing gap scatter, receiving `analysis.decayCurves` (computed over full history,
independent of the recent/long-term toggle, same as the bucket-membership note above).

## Domain spec update

`domain-spec-moodcraft.md` gets a new hard rule under §7 Analysis:

> **R-21** *(hard)* — Duration of effect is measured per dose-size bucket, where buckets are
> derived from the recorded mg values (never a configured threshold), and a day only counts
> toward a dose's decay curve if no later intake has occurred by that day, so no day is
> attributed to more than one dose.

And a line in §4.6 (or a new §4.7 "Dose bucket") introducing the term for the glossary.

## Testing

- `duration.test.ts`: bucketing (single amount, 3 amounts, >3 amounts/tertiles), attribution
  cutoff at the next intake, null baseline → `[]`, missing day records leave holes (no
  interpolation).
- `DoseDecayChart.test.tsx`: empty/no-baseline fallback text, accessible label content,
  thin-point rendering — same shape as `GapScatter.test.tsx`.
- `statements.test.ts`: new statement appears/doesn't appear correctly, thin flag.

## Out of scope

- Configurable horizon or bucket count (R-15 forbids configured medication knowledge).
- Cross-medication comparison (R-11 restricts analysis to one medication at a time).
