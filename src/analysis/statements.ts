import type { DecayCurve } from './duration'
import { LONG_GAP_MIN, RESPONSE_WINDOW_DAYS, SHORT_GAP_MAX, THIN_SAMPLE } from './types'
import type { Baseline, IntakeOutcome, Statement } from './types'

interface Bucket { shortMean: number | null; longMean: number | null; difference: number | null; sampleSize: number }

export interface StatementInput {
  outcomes: IntakeOutcome[]
  baseline: Baseline | null
  threshold: { days: number; difference: number; sampleSize: number } | null
  bucket: Bucket
  dose: { correlation: number; sampleSize: number } | null
  decayCurves: DecayCurve[]
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

function statement(id: string, text: string, emphasis: string[], sampleSize: number): Statement {
  return { id, text, emphasis, sampleSize, thin: sampleSize < THIN_SAMPLE }
}

export function buildStatements(input: StatementInput): Statement[] {
  const { outcomes, baseline, threshold, bucket, dose, decayCurves } = input
  if (outcomes.length === 0) {
    return [statement('no-intakes', 'No doses have been recorded yet.', [], 0)]
  }

  const out: Statement[] = []

  if (baseline === null) {
    out.push(
      statement(
        'no-baseline',
        'No days were recorded before this medication was first taken, so how well it worked cannot be measured — only the spacing between doses.',
        [],
        outcomes.length,
      ),
    )
  }

  if (bucket.difference !== null) {
    const amount = `${round1(Math.abs(bucket.difference))} ${bucket.difference >= 0 ? 'less' : 'more'} improvement`
    out.push(
      statement(
        'spacing-buckets',
        `Doses taken 1–${SHORT_GAP_MAX} days apart were followed by ${amount} than doses ${LONG_GAP_MIN} or more days apart.`,
        [amount],
        bucket.sampleSize,
      ),
    )
  }

  if (threshold !== null) {
    out.push(
      statement(
        'reset-threshold',
        `Sensitivity appears to have returned after roughly ${threshold.days} days off.`,
        [`${threshold.days} days`],
        threshold.sampleSize,
      ),
    )
  }

  if (dose !== null && Math.abs(dose.correlation) >= 0.3) {
    const direction = dose.correlation < 0 ? 'less' : 'more'
    out.push(
      statement(
        'previous-dose-size',
        `Doses that followed a larger previous dose were followed by ${direction} improvement.`,
        [`${direction} improvement`],
        dose.sampleSize,
      ),
    )
  }

  const bestCurve = decayCurves
    .filter((c) => c.points[0]!.meanImprovement !== null)
    .reduce<DecayCurve | null>(
      (best, curve) =>
        best === null || curve.points[0]!.meanImprovement! > best.points[0]!.meanImprovement!
          ? curve
          : best,
      null,
    )

  if (bestCurve !== null) {
    const day0 = bestCurve.points[0]!
    const laterPoint = bestCurve.points[RESPONSE_WINDOW_DAYS] ?? null
    const peak = round1(day0.meanImprovement!)
    if (laterPoint !== null && laterPoint.meanImprovement !== null) {
      out.push(
        statement(
          'best-dose-duration',
          `The ${bestCurve.bucket.label} doses had the best initial improvement (${peak}), and still held ${round1(
            laterPoint.meanImprovement,
          )} of that by day ${RESPONSE_WINDOW_DAYS}.`,
          [bestCurve.bucket.label, peak],
          day0.sampleSize,
        ),
      )
    } else {
      out.push(
        statement(
          'best-dose-duration',
          `The ${bestCurve.bucket.label} doses had the best initial improvement (${peak}).`,
          [bestCurve.bucket.label, peak],
          day0.sampleSize,
        ),
      )
    }
  }

  if (baseline !== null) {
    const measured = outcomes.filter((o) => o.improvement !== null)
    if (measured.length > 0) {
      const mean = measured.reduce((a, o) => a + o.improvement!, 0) / measured.length
      const amount = `${round1(Math.abs(mean))} ${mean >= 0 ? 'lower' : 'higher'}`
      out.push(
        statement(
          'overall-vs-baseline',
          `In the three days after a dose, scores averaged ${amount} than the ${baseline.dayCount} days recorded before this medication was first taken.`,
          [amount],
          measured.length,
        ),
      )
    }
  }

  return out
}
