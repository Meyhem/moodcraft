import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export function Badge({ thin = false, children }: { thin?: boolean; children: ReactNode }) {
  return <span className={thin ? `${styles.badge} ${styles.thin}` : styles.badge}>{children}</span>
}
