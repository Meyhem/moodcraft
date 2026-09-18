import { eventDef } from '../domain/events'
import type { DayRecord } from '../domain/types'
import type { IntakeOutcome } from './types'

export function isConfounded(records: DayRecord[]): boolean {
  return records.some((r) => r.events.some((id) => eventDef(id) !== undefined))
}

export function splitByConfounding(outcomes: IntakeOutcome[]): {
  clean: IntakeOutcome[]
  confounded: IntakeOutcome[]
} {
  return {
    clean: outcomes.filter((o) => !o.confounded),
    confounded: outcomes.filter((o) => o.confounded),
  }
}
