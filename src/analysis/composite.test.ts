import { composite, meanComposite } from './composite'
import { makeDayRecord } from '../test/factories'

test('composite is the mean of the 13 item scores', () => {
  expect(composite(makeDayRecord('2026-09-15', { score: 3 }))).toBe(3)
})

test('composite ignores items with no score, so a changed item list leaves a hole not a zero', () => {
  const record = makeDayRecord('2026-09-15', { scores: { tiredness: 5, sadness: 1 } })
  expect(composite(record)).toBe(3)
})

test('meanComposite of no records is null, never zero (R-06)', () => {
  expect(meanComposite([])).toBeNull()
})
