import type { EventDef, EventId } from './types'

export const EVENTS: readonly EventDef[] = [
  { id: 'bad-sleep', label: 'Bad sleep', valence: 'bad' },
  { id: 'conflict', label: 'Conflict', valence: 'bad' },
  { id: 'illness', label: 'Illness', valence: 'bad' },
  { id: 'work-stress', label: 'Work stress', valence: 'bad' },
  { id: 'good-news', label: 'Good news', valence: 'good' },
  { id: 'social-event', label: 'Social event', valence: 'good' },
  { id: 'exercise', label: 'Exercise', valence: 'good' },
  { id: 'travel', label: 'Travel', valence: 'good' },
] as const

export function eventDef(id: EventId): EventDef | undefined {
  return EVENTS.find((e) => e.id === id)
}
