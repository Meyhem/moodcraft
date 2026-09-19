import type { IsoDate } from './types'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function assertIso(value: string): asserts value is IsoDate {
  if (!ISO.test(value)) throw new Error(`Not an ISO date: ${value}`)
}

export function toIso(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` as IsoDate
}

export function todayIso(): IsoDate {
  return toIso(new Date())
}

function anchor(s: IsoDate): Date {
  assertIso(s)
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function fromAnchor(d: Date): IsoDate {
  return d.toISOString().slice(0, 10) as IsoDate
}

export function fromIso(s: IsoDate): Date {
  assertIso(s)
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

export function addDays(s: IsoDate, n: number): IsoDate {
  const a = anchor(s)
  a.setUTCDate(a.getUTCDate() + n)
  return fromAnchor(a)
}

export function daysBetween(earlier: IsoDate, later: IsoDate): number {
  return Math.round((anchor(later).getTime() - anchor(earlier).getTime()) / 86_400_000)
}

export function rangeInclusive(a: IsoDate, b: IsoDate): IsoDate[] {
  const out: IsoDate[] = []
  for (let d = a; daysBetween(d, b) >= 0; d = addDays(d, 1)) out.push(d)
  return out
}

const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const SHORT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export function formatLong(s: IsoDate): string {
  return LONG.format(fromIso(s))
}

export function formatShort(s: IsoDate): string {
  return SHORT.format(fromIso(s))
}

export function weekdayInitial(s: IsoDate): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(fromIso(s))
}

const WEEKDAY_SHORT = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

export function weekdayShort(s: IsoDate): string {
  return WEEKDAY_SHORT.format(fromIso(s))
}

export function monthYear(s: IsoDate): string {
  return MONTH_YEAR.format(fromIso(s))
}

export function dayOfMonth(s: IsoDate): number {
  return fromIso(s).getDate()
}

/** Monday of the week containing `s`. */
export function startOfWeek(s: IsoDate): IsoDate {
  const dow = fromIso(s).getDay() // 0=Sun..6=Sat
  const sinceMonday = (dow + 6) % 7
  return addDays(s, -sinceMonday)
}
