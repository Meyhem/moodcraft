import { Card } from '../ui/Card'
import styles from './EmptyState.module.css'

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <Card dashed className={styles.wrap}>
      <p className={styles.title}>{title}</p>
      <p className={styles.note}>{note}</p>
    </Card>
  )
}
