import type { Item, ItemId } from './types'

export const ITEMS: readonly Item[] = [
  { id: 'tiredness', label: 'Tiredness' },
  { id: 'rumination', label: 'Rumination' },
  { id: 'loneliness', label: 'Loneliness' },
  { id: 'no-desire-company', label: 'Lack of desire for company' },
  { id: 'anhedonia', label: 'Anhedonia — nothing felt enjoyable' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'irritability', label: 'Irritability' },
  { id: 'concentration', label: 'Difficulty concentrating' },
  { id: 'motivation', label: 'Lack of motivation' },
  { id: 'hopelessness', label: 'Hopelessness' },
  { id: 'sleep', label: 'Poor sleep' },
] as const

export const ITEM_IDS = ITEMS.map((i) => i.id)
export function itemLabel(id: ItemId): string {
  return ITEMS.find((i) => i.id === id)?.label ?? id
}
