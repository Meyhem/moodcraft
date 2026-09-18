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
