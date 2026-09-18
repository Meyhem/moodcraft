import { useId, useState, type ReactNode } from 'react'
import styles from './HelpTooltip.module.css'

interface Props {
  label: string
  children: ReactNode
}

/** a small "?" affordance that reveals an explanation on hover or tap */
export function HelpTooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        ?
      </button>
      <span id={id} role="tooltip" className={styles.popover} hidden={!open}>
        {children}
      </span>
    </span>
  )
}
