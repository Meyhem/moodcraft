import { useEffect, useRef, useState } from 'react'
import { addDays, dayOfMonth, formatLong, startOfWeek, weekRangeLabel, weekdayShort } from '../domain/date'
import type { IsoDate } from '../domain/types'
import styles from './DateNavigator.module.css'

interface Props {
  date: IsoDate
  today: IsoDate
  recordedDates: Set<string>
  dosedDates?: Set<string>
  onChange: (date: IsoDate) => void
}

export function DateNavigator({ date, today, recordedDates, dosedDates, onChange }: Props) {
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
        <h1 className={styles.title}>{weekRangeLabel(weekStart)}</h1>
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
          const dosed = dosedDates?.has(day) ?? false
          const future = day > today
          return (
            <button
              key={day}
              type="button"
              aria-label={`${formatLong(day)} — ${recorded ? 'recorded' : 'no record'}${dosed ? ', dose taken' : ''}`}
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
              {(recorded || dosed) && (
                <span className={styles.dots} aria-hidden="true">
                  {recorded && <span className={styles.dot} />}
                  {dosed && <span className={styles.doseDot} />}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
