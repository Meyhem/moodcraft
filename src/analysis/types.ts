import type { DecayCurve } from './duration'
import type { DayRecord, Intake, IsoDate, ItemId } from '../domain/types'

export interface Baseline {
  /** mean composite over recorded days before the first intake */
  mean: number
  perItem: Record<ItemId, number>
  dayCount: number
  from: IsoDate
  to: IsoDate
}

export interface IntakeOutcome {
  date: IsoDate
  mg: number
  /** days since the previous intake; null for the first intake ever */
  gapDays: number | null
  /** mg of the previous intake; null for the first */
  previousMg: number | null
  /** mean composite over the recorded days in the response window */
  windowMean: number | null
  /** baseline.mean - windowMean; positive means scores fell, i.e. improvement */
  improvement: number | null
  /** recorded days found in the response window */
  measuredDays: number
  /** the window contained a day carrying any event (R-13) */
  confounded: boolean
}

export interface Statement {
  id: string
  /** plain sentence; `emphasis` marks the substring rendered bold */
  text: string
  emphasis: string[]
  sampleSize: number
  thin: boolean
}

export type WindowKey = 'recent' | 'long-term'

export interface AnalysisResult {
  medicationId: string | null
  window: WindowKey
  baseline: Baseline | null
  /** true when there is no measured pre-intake baseline: spacing only (R-10) */
  spacingOnly: boolean
  outcomes: IntakeOutcome[]
  /** every outcome ever computed, ignoring the recent/long-term window (for charts that show full history) */
  allOutcomes: IntakeOutcome[]
  resetThresholdDays: number | null
  /** per dose-size bucket, over full history — independent of the recent/long-term window (R-21) */
  decayCurves: DecayCurve[]
  statements: Statement[]
}

export interface AnalysisInput {
  medicationId: string | null
  dayRecords: DayRecord[]
  intakes: Intake[]
  today: IsoDate
}

/** R-12: effect is looked for on the intake day and the days following it */
export const RESPONSE_WINDOW_DAYS = 3 // intake day + 2 following days
/** R-16: below this many contributing intakes a statement is marked thin */
export const THIN_SAMPLE = 8
/** R-17: the recent window */
export const RECENT_WINDOW_DAYS = 30
/** candidate reset thresholds searched in Task 10 (R-14) */
export const THRESHOLD_CANDIDATES = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14]
export const SHORT_GAP_MAX = 3
export const LONG_GAP_MIN = 5
