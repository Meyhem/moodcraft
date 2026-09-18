import { openDb } from './db'
import type { DayRecord, IsoDate } from '../domain/types'

export const dayRecords = {
  async get(date: IsoDate): Promise<DayRecord | undefined> {
    return (await openDb()).get('dayRecords', date)
  },
  async put(record: DayRecord): Promise<void> {
    await (await openDb()).put('dayRecords', record)
  },
  async remove(date: IsoDate): Promise<void> {
    await (await openDb()).delete('dayRecords', date)
  },
  async all(): Promise<DayRecord[]> {
    const rows = await (await openDb()).getAll('dayRecords')
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
}
