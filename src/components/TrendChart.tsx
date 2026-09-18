import { composite } from '../analysis'
import { daysBetween, formatShort, rangeInclusive } from '../domain/date'
import { eventDef } from '../domain/events'
import type { Baseline } from '../analysis'
import type { DayRecord, Intake, IsoDate } from '../domain/types'
import styles from './TrendChart.module.css'

const W = 680
const H = 220
const PLOT_BOTTOM = 190 // marks live below this line
const PAD_X = 20

export interface Point { date: IsoDate; x: number; y: number; value: number }

function xFor(date: IsoDate, from: IsoDate, days: number): number {
  return PAD_X + (daysBetween(from, date) / Math.max(1, days - 1)) * (W - PAD_X * 2)
}

/** score 1 (best) at the top, 5 (worst) at the bottom of the plot area */
function yFor(value: number): number {
  return 20 + ((value - 1) / 4) * (PLOT_BOTTOM - 40)
}

export function buildSeries(records: DayRecord[], from: IsoDate, to: IsoDate): Array<Point | null> {
  const days = rangeInclusive(from, to)
  const byDate = new Map(records.map((r) => [r.date, r]))
  return days.map((date) => {
    const record = byDate.get(date)
    if (!record) return null
    const value = composite(record)
    if (Number.isNaN(value)) return null
    return { date, x: xFor(date, from, days.length), y: yFor(value), value }
  })
}

/** one polyline per run of consecutive recorded days — gaps are never bridged (R-06) */
export function segmentPolylines(series: Array<Point | null>): string[] {
  const out: string[] = []
  let run: Point[] = []
  for (const point of series) {
    if (point === null) {
      if (run.length > 0) out.push(run.map((p) => `${p.x},${p.y}`).join(' '))
      run = []
    } else {
      run.push(point)
    }
  }
  if (run.length > 0) out.push(run.map((p) => `${p.x},${p.y}`).join(' '))
  return out
}

interface Props {
  records: DayRecord[]
  intakes: Intake[]
  baseline: Baseline | null
  from: IsoDate
  to: IsoDate
}

export function TrendChart({ records, intakes, baseline, from, to }: Props) {
  const days = rangeInclusive(from, to).length
  const series = buildSeries(records, from, to)
  const points = series.filter((p): p is Point => p !== null)

  if (points.length === 0 && intakes.length === 0) {
    return <p className={styles.empty}>Nothing recorded in this period.</p>
  }

  const eventDays = records
    .filter((r) => r.events.some((id) => eventDef(id) !== undefined))
    .map((r) => ({
      date: r.date,
      x: xFor(r.date, from, days),
      valence: eventDef(r.events.find((id) => eventDef(id) !== undefined)!)!.valence,
    }))

  const description = [
    `Scores from ${formatShort(from)} to ${formatShort(to)}.`,
    ...intakes.map((i) => `${formatShort(i.date)}: ${i.mg} mg.`),
    ...points.map((p) => `${formatShort(p.date)}: ${p.value.toFixed(1)} of 5.`),
  ].join(' ')

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
        {baseline !== null && (
          <>
            <rect
              x="0" y={yFor(baseline.mean) - 14} width={W} height="28"
              fill="none" stroke="var(--baseline-line)" strokeDasharray="4 4"
            />
            <text x="8" y={yFor(baseline.mean) - 20} fill="var(--text-tertiary)" fontSize="11">baseline</text>
          </>
        )}

        {segmentPolylines(series).map((pointsAttr) => (
          <polyline
            key={pointsAttr}
            points={pointsAttr}
            fill="none"
            stroke="var(--severity-3)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="var(--severity-3)" />
        ))}

        {intakes.map((i) => (
          <rect key={i.date} x={xFor(i.date, from, days) - 4} y={PLOT_BOTTOM + 6} width="8" height="8" rx="2" fill="var(--dose)" />
        ))}

        {eventDays.map((e) => (
          <circle
            key={e.date}
            cx={e.x}
            cy={PLOT_BOTTOM + 24}
            r="4"
            fill={e.valence === 'good' ? 'var(--event-good)' : 'var(--event-bad)'}
          />
        ))}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.key} style={{ background: 'var(--dose)' }} />dose taken</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-bad)' }} />bad event</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-good)' }} />good event</span>
        <span className={styles.legendItem}><span className={styles.key} style={{ borderTop: '1px dashed var(--baseline-line)', height: 0, borderRadius: 0, width: 14 }} />baseline band</span>
      </div>
      <p className={styles.caption}>
        {intakes.map((i) => `${formatShort(i.date)} · ${i.mg} mg`).join('  ·  ')}
      </p>
    </div>
  )
}
