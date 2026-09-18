import { Combobox } from '../ui/Combobox'
import { fieldStyles } from '../ui/Field'
import type { Medication } from '../domain/types'

interface Props {
  medications: Medication[]
  medicationId: string | null
  mg: string
  onMedication: (id: string) => void
  onCreateMedication: (name: string) => void
  onMg: (value: string) => void
  onCommit: () => void
}

export function IntakeField({ medications, medicationId, mg, onMedication, onCreateMedication, onMg, onCommit }: Props) {
  const name = medications.find((m) => m.id === medicationId)?.name ?? 'medication'
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <Combobox
        label="Medication"
        options={medications.map((m) => ({ id: m.id, name: m.name }))}
        value={medicationId}
        onSelect={onMedication}
        onCreate={onCreateMedication}
      />
      <label className={fieldStyles.field}>
        <span className={fieldStyles.label}>{`${name} · dose today (mg)`}</span>
        <input
          className={fieldStyles.input}
          inputMode="numeric"
          value={mg}
          onChange={(e) => onMg(e.target.value.replace(/[^0-9.]/g, ''))}
          onBlur={onCommit}
        />
      </label>
    </div>
  )
}
