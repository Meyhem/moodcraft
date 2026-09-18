import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb'
import type { MoodcraftDB } from './db'

export interface Migration {
  version: number
  describe: string
  upgrade(
    db: IDBPDatabase<MoodcraftDB>,
    tx: IDBPTransaction<MoodcraftDB, ArrayLike<StoreNames<MoodcraftDB>>, 'versionchange'>,
  ): void
}

/**
 * Append-only. Never edit a migration that has shipped — add the next one.
 * Each entry takes the database from version-1 to version.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    describe: 'initial stores: dayRecords, intakes, medications, settings',
    upgrade(db) {
      db.createObjectStore('dayRecords', { keyPath: 'date' })
      const intakes = db.createObjectStore('intakes', { keyPath: ['medicationId', 'date'] })
      intakes.createIndex('by-medication', 'medicationId')
      db.createObjectStore('medications', { keyPath: 'id' })
      db.createObjectStore('settings', { keyPath: 'key' })
    },
  },
]
