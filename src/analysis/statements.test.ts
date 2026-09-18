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
    decayCurves: [],
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
    decayCurves: [],
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
    dose: null, decayCurves: [], confoundedCount: 0,
  })
  expect(statements).toHaveLength(1)
  expect(statements[0]!.text).toBe('No doses have been recorded yet.')
})

test('the best-dose-duration statement names the bucket with the highest day-0 improvement and how much held by day 3', () => {
  const decayCurves = [
    {
      bucket: { label: '50 mg', minMg: 50, maxMg: 50, doseCount: 4 },
      points: [
        { dayOffset: 0, meanImprovement: 0.8, sampleSize: 4, thin: true, confoundedCount: 0 },
        { dayOffset: 1, meanImprovement: 0.5, sampleSize: 4, thin: true, confoundedCount: 0 },
        { dayOffset: 2, meanImprovement: 0.3, sampleSize: 3, thin: true, confoundedCount: 0 },
        { dayOffset: 3, meanImprovement: 0.1, sampleSize: 2, thin: true, confoundedCount: 0 },
      ],
    },
    {
      bucket: { label: '100 mg', minMg: 100, maxMg: 100, doseCount: 6 },
      points: [
        { dayOffset: 0, meanImprovement: 1.8, sampleSize: 6, thin: true, confoundedCount: 0 },
        { dayOffset: 1, meanImprovement: 1.5, sampleSize: 6, thin: true, confoundedCount: 0 },
        { dayOffset: 2, meanImprovement: 1.2, sampleSize: 5, thin: true, confoundedCount: 0 },
        { dayOffset: 3, meanImprovement: 1.2, sampleSize: 4, thin: true, confoundedCount: 0 },
      ],
    },
  ]
  const statement = build(many).find((s) => s.id === 'best-dose-duration')
  expect(statement).toBeUndefined() // `many` was built with decayCurves: [] via `build`

  const statements = buildStatements({
    outcomes: many,
    baseline: { mean: 4, perItem: {}, dayCount: 12, from: '2026-06-01', to: '2026-06-12' } as never,
    threshold: findResetThreshold(many),
    bucket: bucketComparison(many),
    dose: dosePreviousEffect(many),
    decayCurves,
    confoundedCount: 0,
  })
  const best = statements.find((s) => s.id === 'best-dose-duration')
  expect(best!.text).toBe(
    'The 100 mg doses had the best initial improvement (1.8), and still held 1.2 of that by day 3.',
  )
  expect(best!.sampleSize).toBe(6)
})

test('with no decay curves the best-dose-duration statement is omitted', () => {
  const statements = build(many)
  expect(statements.some((s) => s.id === 'best-dose-duration')).toBe(false)
})
