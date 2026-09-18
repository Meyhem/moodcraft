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
