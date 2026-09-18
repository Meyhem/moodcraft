import { ITEM_IDS } from '../domain/items'
import type { DayRecord, Intake, IsoDate, Medication, Score } from '../domain/types'

export function makeScores(value: Score = 3, overrides: Record<string, Score> = {}) {
  return Object.fromEntries(
    ITEM_IDS.map((id) => [id, overrides[id] ?? value]),
  ) as Record<string, Score>
}

export function makeDayRecord(
  date: string,
  overrides: Partial<DayRecord> & { score?: Score } = {},
): DayRecord {
  const { score = 3, ...rest } = overrides
  return {
    date: date as IsoDate,
    scores: makeScores(score),
    events: [],
    ...rest,
  }
}

export function makeIntake(date: string, mg: number, medicationId = 'm1'): Intake {
  return { date: date as IsoDate, medicationId, mg }
}

export function makeMedication(name = 'Medication A', id = 'm1'): Medication {
  return { id, name, createdAt: '2026-06-01' as IsoDate }
}
