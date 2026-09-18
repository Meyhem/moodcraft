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
