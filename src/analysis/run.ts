import { addDays } from '../domain/date'
import { computeBaseline } from './baseline'
import { computeDecayCurves } from './duration'
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
  const decayCurves = computeDecayCurves(intakes, dayRecords, baseline)

  return {
    medicationId,
    window,
    baseline,
    spacingOnly: baseline === null,
    outcomes,
    allOutcomes: all,
    resetThresholdDays: threshold?.days ?? null,
    decayCurves,
    statements: buildStatements({
      outcomes,
      baseline,
      threshold,
      bucket,
      dose,
      decayCurves,
    }),
  }
}
