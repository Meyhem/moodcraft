import { useState } from 'react'
import { HelpTooltip } from '../ui/HelpTooltip'
import type { DecayCurve } from '../analysis'
import styles from './DoseDecayChart.module.css'

const W = 680
const H = 220
const PAD_X = 24
const PAD_TOP = 20
const PAD_BOTTOM = 36

const LINE_COLORS = ['--severity-2', '--severity-3', '--severity-4'] as const

interface Active { curveIndex: number; dayOffset: number }

function lineColor(index: number): string {
  return `var(${LINE_COLORS[index % LINE_COLORS.length]})`
}

interface Scale { xFor: (dayOffset: number) => number; yFor: (value: number) => number }

function buildScale(curves: DecayCurve[]): Scale {
  const maxOffset = Math.max(1, ...curves.flatMap((c) => c.points.map((p) => p.dayOffset)))
  const values = curves.flatMap((c) => c.points.map((p) => p.meanImprovement)).filter(
    (v): v is number => v !== null,
  )
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 0)
  const span = maxV - minV || 1

  return {
    xFor: (dayOffset) => PAD_X + (dayOffset / maxOffset) * (W - PAD_X * 2),
    // up is better: higher improvement plots higher on the chart
    yFor: (value) => PAD_TOP + ((maxV - value) / span) * (H - PAD_TOP - PAD_BOTTOM),
  }
}

interface Props {
  curves: DecayCurve[]
}

export function DoseDecayChart({ curves }: Props) {
  const [active, setActive] = useState<Active | null>(null)
  const withData = curves.filter((c) => c.points.some((p) => p.meanImprovement !== null))

  if (withData.length === 0) {
    return (
      <p className={styles.empty}>
        Not enough measured doses yet to compare dose sizes — this needs a baseline and
        recorded days after a dose.
      </p>
    )
  }

  const scale = buildScale(withData)
  const activeCurve = active ? withData[active.curveIndex] ?? null : null
  const activePoint = activeCurve?.points.find((p) => p.dayOffset === active!.dayOffset) ?? null

  const description = withData
    .map((curve) => {
      const parts = curve.points
        .filter((p) => p.meanImprovement !== null)
        .map((p) => `day ${p.dayOffset}: ${p.meanImprovement!.toFixed(1)}${p.thin ? ' (thin)' : ''}`)
      return `${curve.bucket.label} (${curve.bucket.doseCount} doses): ${parts.join(', ')}.`
    })
    .join(' ')

  return (
    <div className={styles.wrap}>
      <div className={styles.help}>
        <HelpTooltip label="About this chart">
          Each line is a group of doses of similar size. Its height at day 0 is how much
          scores improved right after that size of dose, relative to your baseline; how far
          right the line keeps its height shows how long that improvement lasted. A day
          stops counting toward a dose once a later dose has been taken, so no day is
          credited to two doses at once — doses you take close together will have shorter
          lines for that reason, not because the effect was weaker. Hollow points are
          backed by fewer recorded days. Hover or tap any point for its exact numbers.
        </HelpTooltip>
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Improvement by days since dose, per dose size. ${description}`}
        onMouseLeave={() => setActive(null)}
      >
        {withData.map((curve, curveIndex) => {
          const plotted = curve.points.filter((p) => p.meanImprovement !== null)
          const polyline = plotted.map((p) => `${scale.xFor(p.dayOffset)},${scale.yFor(p.meanImprovement!)}`).join(' ')
          return (
            <g key={curve.bucket.label}>
              <polyline points={polyline} fill="none" stroke={lineColor(curveIndex)} strokeWidth="2" />
              {plotted.map((p) => (
                <circle
                  key={p.dayOffset}
                  cx={scale.xFor(p.dayOffset)}
                  cy={scale.yFor(p.meanImprovement!)}
                  r={p.thin ? 4 : 5}
                  fill={p.thin ? 'none' : lineColor(curveIndex)}
                  stroke={lineColor(curveIndex)}
                  strokeWidth={p.thin ? 2 : 0}
                />
              ))}
              {plotted.map((p) => (
                <circle
                  key={`hit-${p.dayOffset}`}
                  cx={scale.xFor(p.dayOffset)}
                  cy={scale.yFor(p.meanImprovement!)}
                  r={10}
                  fill="transparent"
                  onMouseEnter={() => setActive({ curveIndex, dayOffset: p.dayOffset })}
                  onClick={() =>
                    setActive((prev) =>
                      prev && prev.curveIndex === curveIndex && prev.dayOffset === p.dayOffset
                        ? null
                        : { curveIndex, dayOffset: p.dayOffset },
                    )
                  }
                />
              ))}
            </g>
          )
        })}

        <text x={PAD_X} y={H - 10} fill="var(--text-tertiary)" fontSize="11">
          days since dose
        </text>
        <text x={PAD_X} y={PAD_TOP - 6} fill="var(--text-tertiary)" fontSize="11">
          ↑ improvement
        </text>

        {activeCurve && activePoint && activePoint.meanImprovement !== null && (
          <g>
            <rect
              x={Math.min(Math.max(scale.xFor(activePoint.dayOffset) - 75, PAD_X), W - PAD_X - 150)}
              y={4}
              width={150}
              height={44}
              rx="8"
              fill="var(--bg-overlay)"
              stroke="var(--border-subtle)"
            />
            <text
              x={Math.min(Math.max(scale.xFor(activePoint.dayOffset) - 65, PAD_X + 10), W - PAD_X - 140)}
              y={19}
              fill="var(--text-primary)"
              fontSize="11"
            >
              {activeCurve.bucket.label} — day {activePoint.dayOffset}
            </text>
            <text
              x={Math.min(Math.max(scale.xFor(activePoint.dayOffset) - 65, PAD_X + 10), W - PAD_X - 140)}
              y={33}
              fill="var(--text-secondary)"
              fontSize="11"
            >
              {activePoint.meanImprovement.toFixed(1)} improvement
              {activePoint.thin ? ', thin sample' : ''}
            </text>
          </g>
        )}
      </svg>

      <div className={styles.legend}>
        {withData.map((curve, index) => (
          <span key={curve.bucket.label} className={styles.legendItem}>
            <span className={styles.key} style={{ background: lineColor(index) }} />
            {curve.bucket.label} ({curve.bucket.doseCount} doses)
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.ring} />
          thin sample
        </span>
      </div>
    </div>
  )
}
