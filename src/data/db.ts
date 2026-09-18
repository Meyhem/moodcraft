import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayRecord, Intake, Medication } from '../domain/types'
import { MIGRATIONS } from './migrations'

export interface MoodcraftDB extends DBSchema {
  dayRecords: { key: string; value: DayRecord }
  intakes: {
    key: [string, string]
    value: Intake
    indexes: { 'by-medication': string }
  }
  medications: { key: string; value: Medication }
  settings: { key: string; value: { key: string; value: unknown } }
}

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version
export const DB_NAME = 'moodcraft'

let handle: Promise<IDBPDatabase<MoodcraftDB>> | null = null

export function openDb(name = DB_NAME): Promise<IDBPDatabase<MoodcraftDB>> {
  handle ??= openDB<MoodcraftDB>(name, SCHEMA_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (const migration of MIGRATIONS) {
        if (migration.version > oldVersion) migration.upgrade(db, tx)
      }
    },
    blocking() {
      // another tab wants to upgrade: let go so the update can proceed
      closeDb()
    },
  })
  return handle
}

export function closeDb(): void {
  void handle?.then((db) => db.close())
  handle = null
}

export async function deleteDb(name = DB_NAME): Promise<void> {
  closeDb()
  await deleteDB(name)
}

export { MIGRATIONS } from './migrations'
