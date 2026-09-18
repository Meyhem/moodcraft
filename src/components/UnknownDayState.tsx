import { Card } from '../ui/Card'
import styles from './UnknownDayState.module.css'

export function UnknownDayState() {
  return (
    <Card dashed className={styles.wrap}>
      <p className={styles.title}>No record for this day</p>
      <p className={styles.note}>Nothing was entered — this isn&rsquo;t scored as good or bad</p>
    </Card>
  )
}
