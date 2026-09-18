import type { ReactNode } from 'react'
import styles from './Pill.module.css'

export function Pill({ tone = 'neutral', children }: { tone?: 'accent' | 'neutral'; children: ReactNode }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>
}
