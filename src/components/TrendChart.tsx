import { useState } from 'react'
import { composite } from '../analysis'
import { addDays, daysBetween, formatShort, rangeInclusive } from '../domain/date'
import { eventDef } from '../domain/events'
import { HelpTooltip } from '../ui/HelpTooltip'
import type { Baseline } from '../analysis'
import type { DayRecord, Intake, IsoDate } from '../domain/types'
import styles from './TrendChart.module.css'

const W = 680
const H = 250
const PLOT_TOP = 20
const PLOT_BOTTOM = 190 // marks live below this line
const DOSE_Y = PLOT_BOTTOM + 6
const EVENT_Y = PLOT_BOTTOM + 24
const TICKS_Y = PLOT_BOTTOM + 46
const PAD_X = 20
const MAX_TICKS = 6

export interface Point { date: IsoDate; x: number; y: number; value: number }

function xFor(date: IsoDate, from: IsoDate, days: number): number {
  return PAD_X + (daysBetween(from, date) / Math.max(1, days - 1)) * (W - PAD_X * 2)
}

/** score 1 (best) at the top, 5 (worst) at the bottom of the plot area */
function yFor(value: number): number {
  return PLOT_TOP + ((value - 1) / 4) * (PLOT_BOTTOM - PLOT_TOP - 20)
}

/** an evenly spaced subset of dates to label the x axis, always including the last day */
function pickTicks(from: IsoDate, to: IsoDate, days: number): IsoDate[] {
  if (days <= MAX_TICKS) return rangeInclusive(from, to)
  const step = Math.ceil((days - 1) / (MAX_TICKS - 1))
  const ticks: IsoDate[] = []
  for (let i = 0; i < days - 1; i += step) ticks.push(addDays(from, i))
  ticks.push(to)
  return ticks
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

interface DayInfo {
  date: IsoDate
  x: number
  score: number | null
  doseMg: number[]
  eventLabel: string | null
}

function buildDayInfo(
  dates: IsoDate[],
  from: IsoDate,
  days: number,
  byDate: Map<IsoDate, DayRecord>,
  intakes: Intake[],
): DayInfo[] {
  return dates.map((date) => {
    const record = byDate.get(date)
    const value = record ? composite(record) : NaN
    const eventId = record?.events.find((id) => eventDef(id) !== undefined)
    return {
      date,
      x: xFor(date, from, days),
      score: Number.isNaN(value) ? null : value,
      doseMg: intakes.filter((i) => i.date === date).map((i) => i.mg),
      eventLabel: eventId ? eventDef(eventId)!.label : null,
    }
  })
}

interface Props {
  records: DayRecord[]
  intakes: Intake[]
  baseline: Baseline | null
  from: IsoDate
  to: IsoDate
}

export function TrendChart({ records, intakes, baseline, from, to }: Props) {
  const [activeDate, setActiveDate] = useState<IsoDate | null>(null)
  const dateList = rangeInclusive(from, to)
  const days = dateList.length
  const series = buildSeries(records, from, to)
  const points = series.filter((p): p is Point => p !== null)

  if (points.length === 0 && intakes.length === 0) {
    return <p className={styles.empty}>Nothing recorded in this period.</p>
  }

  const byDate = new Map(records.map((r) => [r.date, r]))
  const dayInfos = buildDayInfo(dateList, from, days, byDate, intakes)
  const active = activeDate !== null ? dayInfos.find((d) => d.date === activeDate) ?? null : null
  const columnWidth = (W - PAD_X * 2) / Math.max(1, days - 1)

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

  const tooltipLines = active
    ? [
        formatShort(active.date),
        active.score !== null ? `${active.score.toFixed(1)} of 5` : 'no score recorded',
        [active.doseMg.map((mg) => `${mg} mg`).join(', '), active.eventLabel].filter(Boolean).join(' · ') || null,
      ].filter((line): line is string => line !== null)
    : []
  const tooltipWidth = 150
  const tooltipHeight = 14 + tooltipLines.length * 14
  const tooltipX = active
    ? Math.min(Math.max(active.x - tooltipWidth / 2, PAD_X), W - PAD_X - tooltipWidth)
    : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.help}>
        <HelpTooltip label="About this chart">
          Each dot is one day's mood score, from 1 (best) to 5 (worst) — lower is always
          better. The line breaks wherever a day wasn't recorded, since missing days are
          never guessed at or bridged. The dashed band marks your baseline: the average
          score from the days recorded before you ever started this medication, when there
          is one. The small squares below the line mark days you took a dose; the colored
          dots mark days you logged a life event, which could explain a mood change on its
          own. Hover or tap any point in the chart to see that day's exact numbers.
        </HelpTooltip>
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={description}
        onMouseLeave={() => setActiveDate(null)}
      >
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
          <rect key={i.date} x={xFor(i.date, from, days) - 4} y={DOSE_Y} width="8" height="8" rx="2" fill="var(--dose)" />
        ))}

        {eventDays.map((e) => (
          <circle
            key={e.date}
            cx={e.x}
            cy={EVENT_Y}
            r="4"
            fill={e.valence === 'good' ? 'var(--event-good)' : 'var(--event-bad)'}
          />
        ))}

        {pickTicks(from, to, days).map((date) => (
          <text
            key={date}
            x={Math.min(Math.max(xFor(date, from, days), PAD_X), W - PAD_X)}
            y={TICKS_Y}
            fill="var(--text-tertiary)"
            fontSize="11"
            textAnchor="middle"
          >
            {formatShort(date)}
          </text>
        ))}

        <text x={PAD_X} y={yFor(1) + 4} fill="var(--text-tertiary)" fontSize="11">1 (best)</text>
        <text x={PAD_X} y={yFor(5) + 4} fill="var(--text-tertiary)" fontSize="11">5 (worst)</text>

        {dayInfos.map((d) => (
          <rect
            key={d.date}
            x={d.x - columnWidth / 2}
            y={0}
            width={columnWidth}
            height={EVENT_Y + 10}
            fill="transparent"
            onMouseEnter={() => setActiveDate(d.date)}
            onClick={() => setActiveDate((prev) => (prev === d.date ? null : d.date))}
          />
        ))}

        {active && (
          <g>
            <line
              x1={active.x} x2={active.x} y1={PLOT_TOP - 10} y2={EVENT_Y + 8}
              stroke="var(--border-default)" strokeDasharray="3 3"
            />
            <rect
              x={tooltipX} y={4} width={tooltipWidth} height={tooltipHeight} rx="8"
              fill="var(--bg-overlay)" stroke="var(--border-subtle)"
            />
            {tooltipLines.map((line, i) => (
              <text
                key={line}
                x={tooltipX + 10}
                y={4 + 15 + i * 14}
                fill={i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'}
                fontSize="11"
              >
                {line}
              </text>
            ))}
          </g>
        )}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.key} style={{ background: 'var(--dose)' }} />dose taken</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-bad)' }} />bad event</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--event-good)' }} />good event</span>
        <span className={styles.legendItem}><span className={styles.key} style={{ borderTop: '1px dashed var(--baseline-line)', height: 0, borderRadius: 0, width: 14 }} />baseline band</span>
      </div>
    </div>
  )
}
