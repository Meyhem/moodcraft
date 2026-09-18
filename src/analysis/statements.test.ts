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
