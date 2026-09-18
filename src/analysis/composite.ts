import { ITEM_IDS } from '../domain/items'
import type { DayRecord, ItemId, Score } from '../domain/types'

export function composite(record: DayRecord): number {
  const values = ITEM_IDS.map((id) => record.scores[id]).filter(
    (v): v is Score => typeof v === 'number',
  )
  if (values.length === 0) return Number.NaN
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function meanComposite(records: DayRecord[]): number | null {
  const values = records.map(composite).filter((v) => !Number.isNaN(v))
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function perItem(records: DayRecord[]): Record<ItemId, number> {
  const out: Record<ItemId, number> = {}
  for (const id of ITEM_IDS) {
    const values = records
      .map((r) => r.scores[id])
      .filter((v): v is Score => typeof v === 'number')
    if (values.length > 0) out[id] = values.reduce((a, b) => a + b, 0) / values.length
  }
  return out
}
