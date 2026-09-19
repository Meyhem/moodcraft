import { addDays, daysBetween, rangeInclusive, toIso, weekdayInitial, formatLong, weekdayShort, monthYear, dayOfMonth, startOfWeek } from './date'

test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})

test('addDays is immune to DST shifts', () => {
  // Europe/Warsaw springs forward 2026-03-29
  expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
})

test('daysBetween counts calendar days, later minus earlier', () => {
  expect(daysBetween('2026-09-10', '2026-09-15')).toBe(5)
  expect(daysBetween('2026-09-15', '2026-09-10')).toBe(-5)
  expect(daysBetween('2026-09-15', '2026-09-15')).toBe(0)
})

test('rangeInclusive yields every day between the bounds', () => {
  expect(rangeInclusive('2026-09-13', '2026-09-16')).toEqual([
    '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16',
  ])
})

test('toIso uses the local calendar day, not UTC', () => {
  expect(toIso(new Date(2026, 8, 15, 23, 30))).toBe('2026-09-15')
  expect(toIso(new Date(2026, 8, 15, 0, 30))).toBe('2026-09-15')
})

test('formatting matches the design system', () => {
  expect(formatLong('2026-09-15')).toBe('Tuesday, September 15')
  expect(weekdayInitial('2026-09-15')).toBe('T')
  expect(weekdayShort('2026-09-15')).toBe('Tue')
  expect(monthYear('2026-09-15')).toBe('September 2026')
  expect(dayOfMonth('2026-09-05')).toBe(5)
})

test('startOfWeek returns the Monday of the containing week', () => {
  expect(startOfWeek('2026-09-14')).toBe('2026-09-14') // Monday itself
  expect(startOfWeek('2026-09-16')).toBe('2026-09-14') // Wednesday
  expect(startOfWeek('2026-09-20')).toBe('2026-09-14') // Sunday, end of week
  expect(startOfWeek('2026-09-21')).toBe('2026-09-21') // next Monday
})
