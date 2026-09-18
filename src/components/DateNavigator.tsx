import { addDays, formatLong, weekdayInitial } from '../domain/date'
import type { IsoDate } from '../domain/types'
import styles from './DateNavigator.module.css'

interface Props {
  date: IsoDate
  today: IsoDate
  recordedDates: Set<string>
  onChange: (date: IsoDate) => void
}

export function DateNavigator({ date, today, recordedDates, onChange }: Props) {
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6))
  return (
    <div>
      <div className={styles.head}>
        <button type="button" className={styles.arrow} aria-label="Previous day" onClick={() => onChange(addDays(date, -1))}>←</button>
        <h1 className={styles.title}>{formatLong(date)}</h1>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next day"
          disabled={date >= today}
          onClick={() => onChange(addDays(date, 1))}
        >→</button>
      </div>
      <div className={styles.strip}>
        {strip.map((day) => {
          const recorded = recordedDates.has(day)
          return (
            <button
              key={day}
              type="button"
              aria-label={`${formatLong(day)} — ${recorded ? 'recorded' : 'no record'}`}
              aria-current={day === date ? 'date' : undefined}
              className={[styles.day, recorded ? styles.recorded : '', day === today ? styles.today : ''].join(' ').trim()}
              onClick={() => onChange(day)}
            >
              <span aria-hidden="true">{weekdayInitial(day)}</span>
              {recorded && <span className={styles.dot} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
