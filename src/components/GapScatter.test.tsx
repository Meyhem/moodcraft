import { render, screen } from '@testing-library/react'
import { GapScatter, buildPoints } from './GapScatter'
import type { IntakeOutcome } from '../analysis'

function outcome(overrides: Partial<IntakeOutcome>): IntakeOutcome {
  return {
    date: '2026-09-10',
    mg: 100,
    gapDays: 4,
    previousMg: 100,
    windowMean: 3,
    improvement: 1,
    measuredDays: 2,
    ...overrides,
  }
}

test('the first-ever intake has no gap and is excluded from the scatter', () => {
  const points = buildPoints([outcome({ gapDays: null })], true, '2026-01-01')
  expect(points).toHaveLength(0)
})

test('a dose with no measured outcome in its response window is excluded', () => {
  const points = buildPoints([outcome({ windowMean: null, improvement: null })], true, '2026-01-01')
  expect(points).toHaveLength(0)
})

test('with a baseline, the plotted value is improvement', () => {
  const points = buildPoints([outcome({ improvement: 1.5 })], true, '2026-01-01')
  expect(points[0]!.value).toBe(1.5)
})

test('with no baseline (R-10), the plotted value falls back to the raw post-dose score, never improvement', () => {
  const points = buildPoints([outcome({ windowMean: 2.5, improvement: null })], false, '2026-01-01')
  expect(points[0]!.value).toBe(2.5)
})

test('a dose before the window cutoff is marked out of window', () => {
  const points = buildPoints([outcome({ date: '2026-06-01' })], true, '2026-09-01')
  expect(points[0]!.inWindow).toBe(false)
})

test('a dose on or after the window cutoff is marked in window', () => {
  const points = buildPoints([outcome({ date: '2026-09-05' })], true, '2026-09-01')
  expect(points[0]!.inWindow).toBe(true)
})

test('with no eligible doses the chart explains rather than drawing an empty grid', () => {
  render(<GapScatter outcomes={[]} hasBaseline={true} windowFrom="2026-09-01" resetThresholdDays={null} />)
  expect(screen.getByText(/not enough doses/i)).toBeInTheDocument()
})

test('the chart is labelled and lists gap/outcome pairs for assistive tech', () => {
  render(
    <GapScatter
      outcomes={[outcome({ date: '2026-09-10', gapDays: 4, improvement: 1.2 })]}
      hasBaseline={true}
      windowFrom="2026-09-01"
      resetThresholdDays={5}
    />,
  )
  expect(screen.getByRole('img', { name: /gap in days/i })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /4 days since previous dose/i })).toBeInTheDocument()
})

test('the accessible description includes the average across shown doses', () => {
  render(
    <GapScatter
      outcomes={[
        outcome({ date: '2026-09-08', gapDays: 3, improvement: 1 }),
        outcome({ date: '2026-09-10', gapDays: 5, improvement: 3 }),
      ]}
      hasBaseline={true}
      windowFrom="2026-09-01"
      resetThresholdDays={null}
    />,
  )
  expect(screen.getByRole('img', { name: /average improvement across the shown doses is 2\.0/i })).toBeInTheDocument()
})
