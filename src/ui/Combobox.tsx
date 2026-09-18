import { useState } from 'react'
import styles from './Combobox.module.css'
import { fieldStyles } from './Field'

export interface ComboboxOption { id: string; name: string; meta?: string; badge?: string }

interface Props {
  label: string
  options: ComboboxOption[]
  value: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}

export function Combobox({ label, options, value, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = options.find((o) => o.id === value)

  function close() { setOpen(false); setAdding(false); setDraft('') }

  return (
    <div className={styles.wrap} onKeyDown={(e) => { if (e.key === 'Escape') close() }}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={fieldStyles.label}>{label}</span>
        <span className={fieldStyles.value}>{selected?.name ?? 'Choose a medication'}</span>
      </button>

      {open && (
        <>
          <ul className={styles.list} role="listbox" aria-label={label}>
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className={styles.row}
                  onClick={() => { onSelect(option.id); close() }}
                >
                  <span>{option.name}</span>
                  <span className={styles.meta}>{option.badge ?? option.meta ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
          {adding ? (
            <div className={styles.list}>
              <label className={fieldStyles.label} htmlFor="new-medication">New medication name</label>
              <input
                id="new-medication"
                className={fieldStyles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className={styles.row}
                onClick={() => { if (draft.trim()) { onCreate(draft.trim()); close() } }}
              >
                Add
              </button>
            </div>
          ) : (
            <button type="button" className={`${styles.row} ${styles.add}`} onClick={() => setAdding(true)}>
              + Add new medication
            </button>
          )}
        </>
      )}
    </div>
  )
}
