import { LONG_GAP_MIN, SHORT_GAP_MAX, THRESHOLD_CANDIDATES } from './types'
import type { IntakeOutcome } from './types'

interface Measured extends IntakeOutcome {
  gapDays: number
  improvement: number
}

function measured(outcomes: IntakeOutcome[]): Measured[] {
  return outcomes.filter(
    (o): o is Measured => o.gapDays !== null && o.improvement !== null,
  )
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function meanImprovement(outcomes: IntakeOutcome[]): number | null {
  return mean(outcomes.map((o) => o.improvement).filter((v): v is number => v !== null))
}

export function bucketComparison(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes)
  const short = rows.filter((o) => o.gapDays <= SHORT_GAP_MAX)
  const long = rows.filter((o) => o.gapDays >= LONG_GAP_MIN)
  const shortMean = mean(short.map((o) => o.improvement))
  const longMean = mean(long.map((o) => o.improvement))
  return {
    shortMean,
    longMean,
    difference: shortMean !== null && longMean !== null ? longMean - shortMean : null,
    sampleSize: short.length + long.length,
  }
}

export function findResetThreshold(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes)
  let best: { days: number; difference: number; sampleSize: number } | null = null
  for (const days of THRESHOLD_CANDIDATES) {
    const below = rows.filter((o) => o.gapDays < days)
    const above = rows.filter((o) => o.gapDays >= days)
    if (below.length < 2 || above.length < 2) continue
    const difference = mean(above.map((o) => o.improvement))! - mean(below.map((o) => o.improvement))!
    if (best === null || difference > best.difference) {
      best = { days, difference, sampleSize: rows.length }
    }
  }
  return best
}

export function dosePreviousEffect(outcomes: IntakeOutcome[]) {
  const rows = measured(outcomes).filter((o) => o.previousMg !== null)
  if (rows.length < 3) return null
  const xs = rows.map((o) => o.previousMg!)
  const ys = rows.map((o) => o.improvement)
  const mx = mean(xs)!
  const my = mean(ys)!
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < rows.length; i++) {
    const a = xs[i]! - mx
    const b = ys[i]! - my
    num += a * b; dx += a * a; dy += b * b
  }
  if (dx === 0 || dy === 0) return null
  return { correlation: num / Math.sqrt(dx * dy), sampleSize: rows.length }
}
