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

test('allOutcomes ignores the window and always contains every intake', () => {
  const result = runAnalysis(
    {
      medicationId: 'm1',
      dayRecords: [...baselineDays, makeDayRecord('2026-06-10', { score: 2 }), makeDayRecord('2026-09-10', { score: 2 })],
      intakes: [makeIntake('2026-06-10', 150), makeIntake('2026-09-10', 150)],
      today: '2026-09-18',
    },
    'recent',
  )
  expect(result.allOutcomes.map((o) => o.date)).toEqual(['2026-06-10', '2026-09-10'])
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
