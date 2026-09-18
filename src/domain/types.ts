export type IsoDate = string & { readonly __isoDate?: unique symbol }
export type Score = 1 | 2 | 3 | 4 | 5
export type ItemId = string
export type EventId = string

export interface Item { id: ItemId; label: string }
export interface EventDef { id: EventId; label: string; valence: 'good' | 'bad' }

export interface DayRecord {
  date: IsoDate
  scores: Record<ItemId, Score>
  events: EventId[]
}

export interface Intake {
  date: IsoDate
  medicationId: string
  mg: number
}

export interface Medication {
  id: string
  name: string
  createdAt: IsoDate
}

export interface Settings {
  analysisMedicationId: string | null
}
