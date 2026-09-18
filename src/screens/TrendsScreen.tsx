import { useState } from 'react'
import { DoseDecayChart } from '../components/DoseDecayChart'
import { GapScatter } from '../components/GapScatter'
import { PatternStatementCard } from '../components/PatternStatementCard'
import { TrendChart } from '../components/TrendChart'
import { SectionTitle } from '../ui/SectionTitle'
import { Toggle } from '../ui/Toggle'
import { RECENT_WINDOW_DAYS, type WindowKey } from '../analysis'
import { addDays, todayIso } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import { useAnalysis } from '../state/useAnalysis'
import styles from './TrendsScreen.module.css'

const WINDOWS = [
  { value: 'recent' as const, label: 'Recent' },
  { value: 'long-term' as const, label: 'Long-term' },
]

export default function TrendsScreen() {
  const [window, setWindow] = useState<WindowKey>('recent')
  const data = useAppData()
  const analysis = useAnalysis(window)
  const today = todayIso()

  if (data.loading) return <p role="status">Loading…</p>

  const from =
    window === 'recent'
      ? addDays(today, -RECENT_WINDOW_DAYS)
      : (data.dayRecords[0]?.date ?? addDays(today, -RECENT_WINDOW_DAYS))

  const records = data.dayRecords.filter((r) => r.date >= from)
  const intakes = data.intakes.filter((i) => i.date >= from)

  return (
    <div className={styles.screen}>
      <div className={styles.chartColumn}>
        <h1 className={styles.heading}>Trends &amp; Patterns</h1>
        <Toggle ariaLabel="Time window" options={WINDOWS} value={window} onChange={setWindow} />
        <TrendChart records={records} intakes={intakes} baseline={analysis.baseline} from={from} to={today} />
        <SectionTitle>Spacing vs. outcome</SectionTitle>
        <GapScatter
          outcomes={analysis.allOutcomes}
          hasBaseline={analysis.baseline !== null}
          windowFrom={from}
          resetThresholdDays={analysis.resetThresholdDays}
        />
        <SectionTitle>Dose size vs. how long it lasted</SectionTitle>
        <DoseDecayChart curves={analysis.decayCurves} />
      </div>

      <section className={styles.statements} aria-label="Patterns">
        <SectionTitle>Patterns</SectionTitle>
        {analysis.statements.map((statement) => (
          <PatternStatementCard key={statement.id} statement={statement} />
        ))}
      </section>
    </div>
  )
}
