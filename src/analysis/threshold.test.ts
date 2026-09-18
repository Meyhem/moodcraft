import { bucketComparison, dosePreviousEffect, findResetThreshold, meanImprovement } from './threshold'
import type { IntakeOutcome } from './types'

function outcome(gapDays: number | null, improvement: number | null, previousMg = 150): IntakeOutcome {
  return {
    date: '2026-06-01', mg: 150, gapDays, previousMg,
    windowMean: null, improvement, measuredDays: improvement === null ? 0 : 1,
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
