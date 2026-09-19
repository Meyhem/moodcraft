import { useEffect, useRef, useState } from 'react'
import { addDays, dayOfMonth, formatLong, monthYear, startOfWeek, weekdayShort } from '../domain/date'
import type { IsoDate } from '../domain/types'
import styles from './DateNavigator.module.css'

interface Props {
  date: IsoDate
  today: IsoDate
  recordedDates: Set<string>
  onChange: (date: IsoDate) => void
}

export function DateNavigator({ date, today, recordedDates, onChange }: Props) {
  const [weekStart, setWeekStart] = useState<IsoDate>(() => startOfWeek(date))
  const prevDate = useRef(date)

  useEffect(() => {
    if (date === prevDate.current) return
    prevDate.current = date
    const weekEnd = addDays(weekStart, 6)
    if (date < weekStart || date > weekEnd) setWeekStart(startOfWeek(date))
  }, [date, weekStart])

  const strip = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const nextWeekDisabled = addDays(weekStart, 7) > today

  return (
    <div>
      <div className={styles.head}>
        <button type="button" className={styles.arrow} aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
        <h1 className={styles.title}>{monthYear(weekStart)}</h1>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next week"
          disabled={nextWeekDisabled}
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >→</button>
      </div>
      <div className={styles.strip}>
        {strip.map((day) => {
          const recorded = recordedDates.has(day)
          const future = day > today
          return (
            <button
              key={day}
              type="button"
              aria-label={`${formatLong(day)} — ${recorded ? 'recorded' : 'no record'}`}
              aria-current={day === date ? 'date' : undefined}
              disabled={future}
              className={[
                styles.day,
                recorded ? styles.recorded : '',
                day === date ? styles.selected : '',
                day === today ? styles.today : '',
                future ? styles.future : '',
              ].join(' ').trim()}
              onClick={() => onChange(day)}
            >
              <span className={styles.weekday} aria-hidden="true">{weekdayShort(day)}</span>
              <span className={styles.daynum} aria-hidden="true">{dayOfMonth(day)}</span>
              {recorded && <span className={styles.dot} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
