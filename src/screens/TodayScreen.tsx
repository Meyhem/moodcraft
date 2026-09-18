import { useEffect, useMemo, useRef, useState } from 'react'
import { DateNavigator } from '../components/DateNavigator'
import { IntakeField } from '../components/IntakeField'
import { ItemRow } from '../components/ItemRow'
import { UnknownDayState } from '../components/UnknownDayState'
import { Card } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { ITEMS, ITEM_IDS } from '../domain/items'
import { addDays, formatShort, todayIso } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import type { IsoDate, Score } from '../domain/types'
import styles from './TodayScreen.module.css'

export default function TodayScreen() {
  const data = useAppData()
  const today = todayIso()
  const [date, setDate] = useState<IsoDate>(today)
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [mg, setMg] = useState('')

  const record = useMemo(() => data.dayRecords.find((r) => r.date === date), [data.dayRecords, date])
  const intake = useMemo(() => data.intakes.find((i) => i.date === date), [data.intakes, date])

  // The form is the source of truth for the day being edited: partial scores are
  // deliberately never persisted (R-03), so re-reading the store after an unrelated
  // write — saving a dose reloads everything — would discard them. Load the stored
  // day once per date instead, once the initial load has finished.
  const hydratedDate = useRef<IsoDate | null>(null)
  useEffect(() => {
    if (data.loading || hydratedDate.current === date) return
    hydratedDate.current = date
    setScores(record?.scores ?? {})
    setMg(intake ? String(intake.mg) : '')
  }, [data.loading, date, record, intake])

  const scored = ITEM_IDS.filter((id) => scores[id] !== undefined).length
  const complete = scored === ITEM_IDS.length

  async function persist(nextScores: Record<string, Score>) {
    if (ITEM_IDS.every((id) => nextScores[id] !== undefined)) {
      await data.saveDayRecord({ date, scores: nextScores })
    }
  }

  function onScore(id: string, score: Score) {
    const next = { ...scores, [id]: score }
    setScores(next)
    void persist(next)
  }

  async function commitDose() {
    const value = Number(mg)
    if (!data.analysisMedicationId) return
    if (mg.trim() === '' || !(value > 0)) {
      if (intake) await data.deleteIntake(date)
      return
    }
    await data.saveIntake({ date, medicationId: data.analysisMedicationId, mg: value })
  }

  const recordedDates = useMemo(
    () => new Set(data.dayRecords.map((r) => r.date)),
    [data.dayRecords],
  )

  if (data.loading) return <p role="status">Loading…</p>

  return (
    <div className={styles.screen}>
      <div className={styles.form}>
        <DateNavigator date={date} today={today} recordedDates={recordedDates} onChange={setDate} />

        {record === undefined && !complete && <UnknownDayState />}

        <Card className={styles.items}>
          <div className={styles.itemGrid}>
            {ITEMS.map((item) => (
              <ItemRow
                key={item.id}
                label={item.label}
                value={scores[item.id] ?? null}
                onChange={(score) => onScore(item.id, score)}
              />
            ))}
          </div>
          {!complete && (
            <p className={styles.progress}>
              {`${scored} of ${ITEM_IDS.length} scored — nothing is saved until all ${ITEM_IDS.length} are`}
            </p>
          )}
        </Card>

        <section aria-labelledby="intake-title">
          <SectionTitle><span id="intake-title">Medication</span></SectionTitle>
          <IntakeField
            medications={data.medications}
            medicationId={data.analysisMedicationId}
            mg={mg}
            onMedication={(id) => void data.setAnalysisTarget(id)}
            onCreateMedication={(name) => void data.addMedication(name)}
            onMg={setMg}
            onCommit={() => void commitDose()}
          />
        </section>
      </div>

      <aside className={styles.rail} aria-label="Recent days">
        <SectionTitle>Recent</SectionTitle>
        {[1, 2, 3].map((back) => {
          const dayDate = addDays(date, -back)
          const day = data.dayRecords.find((r) => r.date === dayDate)
          const dose = data.intakes.find((i) => i.date === dayDate)
          return (
            <Card key={dayDate} dashed={day === undefined} className={styles.railCard}>
              <div className={styles.railDate}>{formatShort(dayDate)}</div>
              <div className={styles.railNote}>
                {day === undefined ? 'unknown' : dose ? `dose · ${dose.mg}mg` : 'recorded, no dose'}
              </div>
            </Card>
          )
        })}
      </aside>
    </div>
  )
}
