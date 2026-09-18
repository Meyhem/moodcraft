import { useState } from 'react'
import { PatternStatementCard } from '../components/PatternStatementCard'
import { Toggle } from '../ui/Toggle'
import { type WindowKey } from '../analysis'
import { useAppData } from '../state/AppDataProvider'
import { useAnalysis } from '../state/useAnalysis'
import styles from './PatternsScreen.module.css'

const WINDOWS = [
  { value: 'recent' as const, label: 'Recent' },
  { value: 'long-term' as const, label: 'Long-term' },
]

export default function PatternsScreen() {
  const [window, setWindow] = useState<WindowKey>('recent')
  const data = useAppData()
  const analysis = useAnalysis(window)

  if (data.loading) return <p role="status">Loading…</p>

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>Patterns</h1>
      <Toggle ariaLabel="Time window" options={WINDOWS} value={window} onChange={setWindow} />
      <section className={styles.statements} aria-label="Patterns">
        {analysis.statements.map((statement) => (
          <PatternStatementCard key={statement.id} statement={statement} />
        ))}
      </section>
    </div>
  )
}
