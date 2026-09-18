import { formatShort } from '../domain/date'
import type { IntakeOutcome } from '../analysis'
import type { IsoDate } from '../domain/types'
import styles from './GapScatter.module.css'

const W = 680
const H = 220
const PAD_X = 24
const PAD_TOP = 20
const PAD_BOTTOM = 36

export interface ScatterPoint {
  date: IsoDate
  gapDays: number
  /** improvement when a baseline exists, otherwise the raw post-dose score */
  value: number
  measuredDays: number
  confounded: boolean
  inWindow: boolean
}

/**
 * One point per dose that has both a gap (not the first-ever intake) and a
 * measured outcome. Plots improvement against baseline when one exists;
 * falls back to the raw post-dose score otherwise (R-10 — never fabricate
 * an effectiveness claim without a measured baseline).
 */
export function buildPoints(
  outcomes: IntakeOutcome[],
  hasBaseline: boolean,
  windowFrom: IsoDate,
): ScatterPoint[] {
  return outcomes
    .filter((o) => o.gapDays !== null && (hasBaseline ? o.improvement !== null : o.windowMean !== null))
    .map((o) => ({
      date: o.date,
      gapDays: o.gapDays!,
      value: hasBaseline ? o.improvement! : o.windowMean!,
      measuredDays: o.measuredDays,
      confounded: o.confounded,
      inWindow: o.date >= windowFrom,
    }))
}

/** badness metric: higher means visually lower (worse), matching TrendChart's up-is-better convention */
function badness(point: ScatterPoint, hasBaseline: boolean): number {
  return hasBaseline ? -point.value : point.value
}

function radiusFor(measuredDays: number): number {
  return 3 + Math.min(measuredDays, 3) * 1.5
}

interface Scale { xFor: (gapDays: number) => number; yFor: (point: ScatterPoint) => number }

function buildScale(points: ScatterPoint[], hasBaseline: boolean, resetThresholdDays: number | null): Scale {
  const gaps = points.map((p) => p.gapDays)
  const maxGap = Math.max(1, ...gaps, resetThresholdDays ?? 0)

  const badnesses = points.map((p) => badness(p, hasBaseline))
  const minB = Math.min(...badnesses, 0)
  const maxB = Math.max(...badnesses, 0)
  const spanB = maxB - minB || 1

  return {
    xFor: (gapDays) => PAD_X + (gapDays / maxGap) * (W - PAD_X * 2),
    yFor: (point) => PAD_TOP + ((badness(point, hasBaseline) - minB) / spanB) * (H - PAD_TOP - PAD_BOTTOM),
  }
}

interface Props {
  outcomes: IntakeOutcome[]
  hasBaseline: boolean
  windowFrom: IsoDate
  resetThresholdDays: number | null
}

export function GapScatter({ outcomes, hasBaseline, windowFrom, resetThresholdDays }: Props) {
  const points = buildPoints(outcomes, hasBaseline, windowFrom)

  if (points.length === 0) {
    return <p className={styles.empty}>Not enough doses with a measured outcome yet.</p>
  }

  const scale = buildScale(points, hasBaseline, resetThresholdDays)
  const yLabel = hasBaseline ? 'improvement' : 'score after dose'

  const description = [
    `Gap in days since the previous dose plotted against ${yLabel}.`,
    ...points.map(
      (p) =>
        `${formatShort(p.date)}: ${p.gapDays} day${p.gapDays === 1 ? '' : 's'} since previous dose, ${
          hasBaseline ? `${p.value.toFixed(1)} improvement` : `${p.value.toFixed(1)} of 5`
        }${p.confounded ? ', on a day with an event' : ''}.`,
    ),
  ].join(' ')

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
        {resetThresholdDays !== null && (
          <>
            <line
              x1={scale.xFor(resetThresholdDays)}
              x2={scale.xFor(resetThresholdDays)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="var(--baseline-line)"
              strokeDasharray="4 4"
            />
            <text x={scale.xFor(resetThresholdDays) + 6} y={PAD_TOP + 10} fill="var(--text-tertiary)" fontSize="11">
              reset threshold
            </text>
          </>
        )}

        {points.map((p) =>
          p.confounded ? (
            <circle
              key={p.date}
              cx={scale.xFor(p.gapDays)}
              cy={scale.yFor(p)}
              r={radiusFor(p.measuredDays)}
              fill="none"
              stroke="var(--severity-3)"
              strokeWidth="2"
              opacity={p.inWindow ? 1 : 0.35}
            />
          ) : (
            <circle
              key={p.date}
              cx={scale.xFor(p.gapDays)}
              cy={scale.yFor(p)}
              r={radiusFor(p.measuredDays)}
              fill="var(--severity-3)"
              opacity={p.inWindow ? 1 : 0.35}
            />
          ),
        )}

        <text x={PAD_X} y={H - 10} fill="var(--text-tertiary)" fontSize="11">
          days since previous dose
        </text>
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--severity-3)' }} />dose</span>
        <span className={styles.legendItem}><span className={styles.ring} />on a day with an event</span>
        <span className={styles.legendItem}><span className={styles.key} style={{ borderTop: '1px dashed var(--baseline-line)', height: 0, borderRadius: 0, width: 14 }} />reset threshold</span>
        <span className={styles.legendItem}>faded = outside current window</span>
      </div>
    </div>
  )
}
