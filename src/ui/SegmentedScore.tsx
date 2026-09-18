import styles from './SegmentedScore.module.css'
import type { Score } from '../domain/types'

const SCORES: Score[] = [1, 2, 3, 4, 5]

function optionName(score: Score): string {
  if (score === 1) return '1, best'
  if (score === 5) return '5, worst'
  return String(score)
}

interface Props {
  label: string
  value: Score | null
  onChange: (score: Score) => void
  compact?: boolean
}

export function SegmentedScore({ label, value, onChange, compact = false }: Props) {
  function onKeyDown(event: React.KeyboardEvent, score: Score) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = Math.min(5, Math.max(1, score + delta)) as Score
    onChange(next)
    const group = (event.currentTarget.parentElement as HTMLElement | null)
    group?.querySelectorAll('button')[next - 1]?.focus()
  }

  return (
    <div className={compact ? `${styles.group} ${styles.compact}` : styles.group} role="radiogroup" aria-label={label}>
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={optionName(score)}
          tabIndex={value === score || (value === null && score === 1) ? 0 : -1}
          className={value === score ? `${styles.opt} ${styles[`on${score}`]}` : styles.opt}
          onClick={() => onChange(score)}
          onKeyDown={(event) => onKeyDown(event, score)}
        >
          {score}
        </button>
      ))}
    </div>
  )
}
