import { EVENTS } from '../domain/events'
import { Chip } from '../ui/Chip'
import type { EventId } from '../domain/types'

interface Props { selected: EventId[]; onToggle: (id: EventId) => void }

export function EventChipGroup({ selected, onToggle }: Props) {
  return (
    <div role="group" aria-label="Events" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
      {EVENTS.map((event) => (
        <Chip
          key={event.id}
          label={event.label}
          valence={event.valence}
          selected={selected.includes(event.id)}
          onToggle={() => onToggle(event.id)}
        />
      ))}
    </div>
  )
}
