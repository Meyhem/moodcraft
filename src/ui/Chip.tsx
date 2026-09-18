import { useId } from 'react'
import styles from './Chip.module.css'

interface Props {
  label: string
  valence: 'good' | 'bad'
  selected: boolean
  onToggle: () => void
}

export function Chip({ label, valence, selected, onToggle }: Props) {
  const descriptionId = useId()
  const on = valence === 'good' ? styles.goodOn : styles.badOn
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={selected}
        aria-describedby={selected ? descriptionId : undefined}
        className={selected ? `${styles.chip} ${on}` : styles.chip}
        onClick={onToggle}
      >
        <span className={styles.dot} aria-hidden="true" />
        {label}
      </button>
      <span id={descriptionId} className="visually-hidden">{valence} event</span>
    </>
  )
}
