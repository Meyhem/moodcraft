import { meanComposite, perItem } from './composite'
import type { Baseline } from './types'
import type { DayRecord, Intake } from '../domain/types'

export function computeBaseline(records: DayRecord[], intakes: Intake[]): Baseline | null {
  const firstIntake = intakes.map((i) => i.date).sort()[0]
  const pre = firstIntake
    ? records.filter((r) => r.date < firstIntake)
    : [...records]
  if (pre.length === 0) return null
  const sorted = pre.sort((a, b) => a.date.localeCompare(b.date))
  const mean = meanComposite(sorted)
  if (mean === null) return null
  return {
    mean,
    perItem: perItem(sorted),
    dayCount: sorted.length,
    from: sorted[0]!.date,
    to: sorted[sorted.length - 1]!.date,
  }
}
