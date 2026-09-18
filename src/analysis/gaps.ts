import { addDays, daysBetween } from '../domain/date'
import { RESPONSE_WINDOW_DAYS } from './types'
import type { Intake, IsoDate } from '../domain/types'

export interface GappedIntake extends Intake {
  gapDays: number | null
  previousMg: number | null
}

export function withGaps(intakes: Intake[]): GappedIntake[] {
  const sorted = [...intakes].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((intake, index) => {
    const previous = index > 0 ? sorted[index - 1]! : null
    return {
      ...intake,
      gapDays: previous ? daysBetween(previous.date, intake.date) : null,
      previousMg: previous ? previous.mg : null,
    }
  })
}

export function responseWindow(date: IsoDate): IsoDate[] {
  return Array.from({ length: RESPONSE_WINDOW_DAYS }, (_, i) => addDays(date, i))
}
