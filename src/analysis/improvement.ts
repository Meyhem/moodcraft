import { meanComposite } from './composite'
import { responseWindow, withGaps } from './gaps'
import type { Baseline, IntakeOutcome } from './types'
import type { DayRecord, Intake } from '../domain/types'

export function computeOutcomes(
  intakes: Intake[],
  records: DayRecord[],
  baseline: Baseline | null,
): IntakeOutcome[] {
  const byDate = new Map(records.map((r) => [r.date, r]))
  return withGaps(intakes).map((intake) => {
    const window = responseWindow(intake.date)
    const measured = window
      .map((d) => byDate.get(d))
      .filter((r): r is DayRecord => r !== undefined)
    const windowMean = meanComposite(measured)
    return {
      date: intake.date,
      mg: intake.mg,
      gapDays: intake.gapDays,
      previousMg: intake.previousMg,
      windowMean,
      improvement:
        baseline !== null && windowMean !== null ? baseline.mean - windowMean : null,
      measuredDays: measured.length,
    }
  })
}
