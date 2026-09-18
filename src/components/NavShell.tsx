import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import styles from './NavShell.module.css'

const DESTINATIONS = [
  { to: '/today', label: 'Today' },
  { to: '/trends', label: 'Trends' },
  { to: '/library', label: 'Library' },
] as const

export function NavShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Sections">
        {DESTINATIONS.map((d) => (
          <NavLink key={d.to} to={d.to} className={styles.link ?? ''}>
            {d.label}
          </NavLink>
        ))}
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
