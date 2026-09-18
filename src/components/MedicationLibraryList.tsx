import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Pill } from '../ui/Pill'
import { fieldStyles } from '../ui/Field'
import { formatShort } from '../domain/date'
import type { IsoDate, Medication } from '../domain/types'
import styles from './MedicationLibraryList.module.css'

interface Props {
  medications: Medication[]
  intakeCounts: Record<string, number>
  firstIntakeDates: Record<string, IsoDate | undefined>
  analysisMedicationId: string | null
  onAnalyze: (id: string) => void
  onAdd: (name: string) => void
}

export function MedicationLibraryList(props: Props) {
  const { medications, intakeCounts, firstIntakeDates, analysisMedicationId, onAnalyze, onAdd } = props
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <Card className={styles.card}>
      <ul className={styles.list}>
        {medications.map((medication) => {
          const count = intakeCounts[medication.id] ?? 0
          const first = firstIntakeDates[medication.id]
          return (
            <li key={medication.id} className={styles.row}>
              <div>
                <div className={styles.name}>{medication.name}</div>
                <div className={styles.meta}>
                  {`${count} ${count === 1 ? 'intake' : 'intakes'}${first ? ` · since ${formatShort(first).replace(/^\w+, /, '')}` : ''}`}
                </div>
              </div>
              {medication.id === analysisMedicationId ? (
                <Pill tone="accent">under analysis</Pill>
              ) : (
                <Button variant="ghost" onClick={() => onAnalyze(medication.id)}>Analyze this</Button>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <div className={styles.add}>
          <label className={fieldStyles.label} htmlFor="medication-name">Medication name</label>
          <input
            id="medication-name"
            className={fieldStyles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); setAdding(false) } }}
          >
            Add
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className={styles.addButton} onClick={() => setAdding(true)}>
          + Add medication
        </Button>
      )}
    </Card>
  )
}
