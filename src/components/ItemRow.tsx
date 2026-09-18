import { SegmentedScore } from '../ui/SegmentedScore'
import type { Score } from '../domain/types'
import styles from './ItemRow.module.css'

interface Props {
  label: string
  value: Score | null
  onChange: (score: Score) => void
}

export function ItemRow({ label, value, onChange }: Props) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <SegmentedScore label={label} value={value} onChange={onChange} compact />
    </div>
  )
}
