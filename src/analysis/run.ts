import { addDays } from '../domain/date'
import { computeBaseline } from './baseline'
import { computeOutcomes } from './improvement'
import { buildStatements } from './statements'
import { bucketComparison, dosePreviousEffect, findResetThreshold } from './threshold'
import { RECENT_WINDOW_DAYS } from './types'
import type { AnalysisInput, AnalysisResult, WindowKey } from './types'

export function runAnalysis(input: AnalysisInput, window: WindowKey): AnalysisResult {
  const { medicationId, dayRecords, intakes, today } = input
  const baseline = computeBaseline(dayRecords, intakes)

  // Outcomes are always computed over the full history, so a gap is measured
  // from the true previous intake even when it falls outside the window.
  const all = computeOutcomes(intakes, dayRecords, baseline)
  const cutoff = addDays(today, -RECENT_WINDOW_DAYS)
  const outcomes = window === 'recent' ? all.filter((o) => o.date >= cutoff) : all

  const bucket = bucketComparison(outcomes)
  const threshold = findResetThreshold(outcomes)
  const dose = dosePreviousEffect(outcomes)

  return {
    medicationId,
    window,
    baseline,
    spacingOnly: baseline === null,
    outcomes,
    resetThresholdDays: threshold?.days ?? null,
    statements: buildStatements({
      outcomes,
      baseline,
      threshold,
      bucket,
      dose,
      confoundedCount: outcomes.filter((o) => o.confounded).length,
    }),
  }
}
