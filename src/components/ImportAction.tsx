import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { ImportSummary } from '../data/exportImport'
import styles from './ImportAction.module.css'

interface Props {
  onImport: (json: string) => Promise<ImportSummary>
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
  return `Added ${parts[0]}, ${parts[1]} and ${parts[2]} from the file.`
}

export function ImportAction({ onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setSummary(null)
    setProblem(null)
    try {
      setSummary(describe(await onImport(await file.text())))
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'This file could not be read.')
    }
  }

  return (
    <Card className={styles.row}>
      <div>
        <div className={styles.title}>Import data</div>
        <div className={styles.note}>
          Merges a file you exported before — days and doses already on this device are
          replaced by the file’s
        </div>
        {summary !== null && <div role="status" className={styles.summary}>{summary}</div>}
        {problem !== null && <div role="alert" className={styles.problem}>{problem}</div>}
      </div>
      <Button variant="secondary" onClick={() => fileInput.current?.click()}>Import</Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Import"
        className={styles.input}
        onChange={(event) => void handleFile(event)}
      />
    </Card>
  )
}
