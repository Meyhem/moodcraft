import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { ImportSummary } from '../data/exportImport'
import styles from './GenerateDebugDataAction.module.css'

interface Props {
  onGenerate: () => Promise<ImportSummary>
}

function counted(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function describe(summary: ImportSummary): string {
  const parts = [
    counted(summary.medications, 'medication', 'medications'),
    counted(summary.dayRecords, 'day', 'days'),
    counted(summary.intakes, 'dose', 'doses'),
  ]
  return `Added ${parts[0]}, ${parts[1]} and ${parts[2]} of made-up data.`
}

export function GenerateDebugDataAction({ onGenerate }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setSummary(describe(await onGenerate()))
    setGenerating(false)
  }

  return (
    <Card className={styles.row}>
      <div>
        <div className={styles.title}>Generate debug data</div>
        <div className={styles.note}>
          Fills in a made-up medication with months of scores and doses, for trying out the
          app without entering anything by hand
        </div>
        {summary !== null && <div role="status" className={styles.summary}>{summary}</div>}
      </div>
      <Button variant="secondary" onClick={() => void handleGenerate()} disabled={generating}>
        {generating ? 'Generating…' : 'Generate'}
      </Button>
    </Card>
  )
}
