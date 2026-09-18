import { buildDoseBuckets, computeDecayCurves } from './duration'
import { makeDayRecord, makeIntake } from '../test/factories'
import type { Baseline } from './types'

function baseline(mean: number): Baseline {
  return { mean, perItem: {}, dayCount: 5, from: '2026-01-01', to: '2026-01-05' }
}

test('3 or fewer distinct mg amounts get one bucket each', () => {
  const buckets = buildDoseBuckets([makeIntake('2026-06-01', 100), makeIntake('2026-06-05', 200)])
  expect(buckets.map((b) => b.label)).toEqual(['100 mg', '200 mg'])
  expect(buckets.map((b) => b.doseCount)).toEqual([1, 1])
})

test('more than 3 distinct amounts are split into 3 tertile ranges', () => {
  const intakes = [50, 60, 70, 80, 90, 100, 150, 200, 250].map((mg, i) =>
    makeIntake(`2026-06-${String(i + 1).padStart(2, '0')}`, mg),
  )
  const buckets = buildDoseBuckets(intakes)
  expect(buckets).toHaveLength(3)
  expect(buckets.reduce((a, b) => a + b.doseCount, 0)).toBe(9)
})

test('no intakes produces no buckets', () => {
  expect(buildDoseBuckets([])).toEqual([])
})

test('no baseline means no decay curves (R-10)', () => {
  const curves = computeDecayCurves([makeIntake('2026-06-01', 100)], [], null)
  expect(curves).toEqual([])
})

test('a day only counts if a day record exists — missing days leave holes, never interpolated (R-06)', () => {
  const intakes = [makeIntake('2026-06-01', 100)]
  const records = [makeDayRecord('2026-06-01', { score: 2 }), makeDayRecord('2026-06-03', { score: 3 })]
  const curves = computeDecayCurves(intakes, records, baseline(4))
  const points = curves[0]!.points
  expect(points[0]!.meanImprovement).toBeCloseTo(2, 5) // baseline 4 - score 2
  expect(points[1]!.sampleSize).toBe(0)
  expect(points[1]!.meanImprovement).toBeNull()
  expect(points[2]!.meanImprovement).toBeCloseTo(1, 5) // baseline 4 - score 3
})

test('a day is attributed only to the most recent dose — cut off at the next intake', () => {
  const intakes = [makeIntake('2026-06-01', 100), makeIntake('2026-06-03', 200)]
  const records = [
    makeDayRecord('2026-06-01', { score: 2 }),
    makeDayRecord('2026-06-02', { score: 2 }),
    makeDayRecord('2026-06-03', { score: 1 }),
    makeDayRecord('2026-06-04', { score: 1 }),
  ]
  const curves = computeDecayCurves(intakes, records, baseline(4))
  const low = curves.find((c) => c.bucket.label === '100 mg')!
  const high = curves.find((c) => c.bucket.label === '200 mg')!

  // day offset 2 from the 100mg dose (2026-06-03) belongs to the new dose instead
  expect(low.points[2]!.sampleSize).toBe(0)
  // the 200mg dose's own day-0 point picks up 2026-06-03
  expect(high.points[0]!.sampleSize).toBe(1)
  expect(high.points[0]!.meanImprovement).toBeCloseTo(3, 5)
})

test('a bucket with fewer than THIN_SAMPLE contributing days at an offset is marked thin', () => {
  const intakes = [makeIntake('2026-06-01', 100)]
  const records = [makeDayRecord('2026-06-01', { score: 2 })]
  const curves = computeDecayCurves(intakes, records, baseline(4))
  expect(curves[0]!.points[0]!.thin).toBe(true)
})
