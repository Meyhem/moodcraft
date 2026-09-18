import { openDb, SCHEMA_VERSION } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { todayIso } from '../domain/date'
import type { DayRecord, EventId, Intake, IsoDate, ItemId, Medication, Score } from '../domain/types'

export interface ExportFile {
  format: 'moodcraft-export'
  schemaVersion: number
  exportedAt: IsoDate
  medications: Medication[]
  dayRecords: DayRecord[]
  intakes: Intake[]
  analysisMedicationId: string | null
}

export interface ImportSummary {
  medications: number
  dayRecords: number
  intakes: number
}

export async function buildExport(): Promise<ExportFile> {
  return {
    format: 'moodcraft-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: todayIso(),
    medications: await medications.all(),
    dayRecords: await dayRecords.all(),
    intakes: await intakes.all(),
    analysisMedicationId: await medications.analysisTargetId(),
  }
}

export async function serializeExport(): Promise<string> {
  return JSON.stringify(await buildExport(), null, 2)
}

export function exportFilename(today: IsoDate): string {
  return `moodcraft-${today}.json`
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SCORES: readonly unknown[] = [1, 2, 3, 4, 5]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIso(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE.test(value)
}

/** A handle for a record so a rejection can say which one it means. */
function named(value: unknown, key: 'date' | 'id', index: number): string {
  const handle = isObject(value) ? value[key] : undefined
  return typeof handle === 'string' && handle !== '' ? handle : `#${index + 1}`
}

function asArray(value: unknown, what: string): unknown[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`The ${what} in this file are not a list.`)
  return value
}

function readMedication(value: unknown, index: number): Medication {
  const name = named(value, 'id', index)
  const reject = (why: string): never => { throw new Error(`Medication ${name} in this file ${why}.`) }
  if (!isObject(value)) return reject('is not a record')
  if (typeof value.id !== 'string' || value.id === '') return reject('has no id')
  if (typeof value.name !== 'string' || value.name === '') return reject('has no name')
  if (!isIso(value.createdAt)) return reject('has no valid created-on date')
  return { id: value.id, name: value.name, createdAt: value.createdAt }
}

function readDayRecord(value: unknown, index: number): DayRecord {
  const name = named(value, 'date', index)
  const reject = (why: string): never => { throw new Error(`Day ${name} in this file ${why}.`) }
  if (!isObject(value)) return reject('is not a record')
  if (!isIso(value.date)) return reject('has no valid date')
  if (!isObject(value.scores)) return reject('has no scores')
  for (const [itemId, score] of Object.entries(value.scores)) {
    if (!SCORES.includes(score)) return reject(`has a score outside 1-5 for ${itemId}`)
  }
  if (!Array.isArray(value.events) || value.events.some((e) => typeof e !== 'string')) {
    return reject('has events that are not a list of names')
  }
  return {
    date: value.date,
    scores: value.scores as Record<ItemId, Score>,
    events: value.events as EventId[],
  }
}

function readIntake(value: unknown, index: number): Intake {
  const name = named(value, 'date', index)
  const reject = (why: string): never => { throw new Error(`Dose ${name} in this file ${why}.`) }
  if (!isObject(value)) return reject('is not a record')
  if (!isIso(value.date)) return reject('has no valid date')
  if (typeof value.medicationId !== 'string' || value.medicationId === '') return reject('has no medication')
  if (typeof value.mg !== 'number' || !Number.isFinite(value.mg) || value.mg <= 0) {
    return reject('has no positive dose in milligrams')
  }
  return { date: value.date, medicationId: value.medicationId, mg: value.mg }
}

/**
 * Merges an exported file into what is already on this device: a day or dose sharing a key
 * with one in the file is replaced by the file's, everything else is left alone. The whole
 * file is read and checked before anything is written, so a malformed record writes nothing.
 */
export async function restoreExport(json: string): Promise<ImportSummary> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('This is not a valid JSON file.')
  }
  if (!isObject(parsed) || parsed.format !== 'moodcraft-export') {
    throw new Error('This file is not a Moodcraft export.')
  }
  if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This export was written by a newer version of Moodcraft.')
  }

  const meds = asArray(parsed.medications, 'medications').map(readMedication)
  const records = asArray(parsed.dayRecords, 'days').map(readDayRecord)
  const doses = asArray(parsed.intakes, 'doses').map(readIntake)

  const db = await openDb()
  for (const m of meds) await db.put('medications', m)
  for (const r of records) await dayRecords.put(r)
  for (const i of doses) await intakes.put(i)
  if (typeof parsed.analysisMedicationId === 'string') {
    await medications.setAnalysisTarget(parsed.analysisMedicationId)
  }

  return { medications: meds.length, dayRecords: records.length, intakes: doses.length }
}
