import { useState } from 'react'
import { formatShort } from '../domain/date'
import { HelpTooltip } from '../ui/HelpTooltip'
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
  const [activeDate, setActiveDate] = useState<IsoDate | null>(null)
  const points = buildPoints(outcomes, hasBaseline, windowFrom)

  if (points.length === 0) {
    return <p className={styles.empty}>Not enough doses with a measured outcome yet.</p>
  }

  const scale = buildScale(points, hasBaseline, resetThresholdDays)
  const yLabel = hasBaseline ? 'improvement' : 'score after dose'
  const active = activeDate !== null ? points.find((p) => p.date === activeDate) ?? null : null

  const description = [
    `Gap in days since the previous dose plotted against ${yLabel}.`,
    ...points.map(
      (p) =>
        `${formatShort(p.date)}: ${p.gapDays} day${p.gapDays === 1 ? '' : 's'} since previous dose, ${
          hasBaseline ? `${p.value.toFixed(1)} improvement` : `${p.value.toFixed(1)} of 5`
        }${p.confounded ? ', on a day with an event' : ''}.`,
    ),
  ].join(' ')

  const tooltipLines = active
    ? [
        formatShort(active.date),
        `${active.gapDays} day${active.gapDays === 1 ? '' : 's'} since previous dose`,
        hasBaseline ? `${active.value.toFixed(1)} improvement` : `${active.value.toFixed(1)} of 5`,
        active.confounded ? 'on a day with an event' : null,
      ].filter((line): line is string => line !== null)
    : []
  const tooltipWidth = 160
  const tooltipHeight = 14 + tooltipLines.length * 14
  const activeX = active ? scale.xFor(active.gapDays) : 0
  const tooltipX = active
    ? Math.min(Math.max(activeX - tooltipWidth / 2, PAD_X), W - PAD_X - tooltipWidth)
    : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.help}>
        <HelpTooltip label="About this chart">
          Each dot is one dose. Its position left-to-right is how many days had passed
          since the previous dose; its height is how well that dose seemed to work — either
          the drop from your baseline score, or, if there's no baseline yet, the raw score
          in the days right after. An open ring means a logged life event overlapped that
          dose's response window, which could explain the mood change on its own instead of
          the medication. Bigger dots are backed by more recorded days. The dashed line
          marks the gap length your own data suggests sensitivity resets at. Faded dots are
          outside the currently selected time window. Hover or tap any dot for its exact
          numbers.
        </HelpTooltip>
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={description}
        onMouseLeave={() => setActiveDate(null)}
      >
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
        <text x={PAD_X} y={PAD_TOP - 6} fill="var(--text-tertiary)" fontSize="11">
          ↑ {yLabel}
        </text>

        {points.map((p) => (
          <circle
            key={p.date}
            cx={scale.xFor(p.gapDays)}
            cy={scale.yFor(p)}
            r={Math.max(radiusFor(p.measuredDays) + 4, 10)}
            fill="transparent"
            onMouseEnter={() => setActiveDate(p.date)}
            onClick={() => setActiveDate((prev) => (prev === p.date ? null : p.date))}
          />
        ))}

        {active && (
          <g>
            <line
              x1={activeX} x2={activeX} y1={4} y2={H - PAD_BOTTOM}
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
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--severity-3)' }} />dose</span>
        <span className={styles.legendItem}><span className={styles.ring} />on a day with an event</span>
        <span className={styles.legendItem}><span className={styles.key} style={{ borderTop: '1px dashed var(--baseline-line)', height: 0, borderRadius: 0, width: 14 }} />reset threshold</span>
        <span className={styles.legendItem}>faded = outside current window</span>
      </div>
    </div>
  )
}
