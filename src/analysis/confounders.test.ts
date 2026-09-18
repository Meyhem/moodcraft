import { isConfounded, splitByConfounding } from './confounders'
import { makeDayRecord } from '../test/factories'
import type { IntakeOutcome } from './types'

test('a window with no events is clean', () => {
  expect(isConfounded([makeDayRecord('2026-09-15')])).toBe(false)
})

test('a bad event in the window confounds it', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['conflict'] })])).toBe(true)
})

test('a good event confounds it too — a good week containing a dose is the whole reason events exist', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['good-news'] })])).toBe(true)
})

test('an unknown event id is ignored rather than crashing a historic record', () => {
  expect(isConfounded([makeDayRecord('2026-09-15', { events: ['retired-event'] })])).toBe(false)
})

test('splitByConfounding keeps both halves', () => {
  const outcomes = [
    { confounded: false } as IntakeOutcome,
    { confounded: true } as IntakeOutcome,
  ]
  const { clean, confounded } = splitByConfounding(outcomes)
  expect(clean).toHaveLength(1)
  expect(confounded).toHaveLength(1)
})
