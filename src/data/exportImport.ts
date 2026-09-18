import { openDb, SCHEMA_VERSION } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { todayIso } from '../domain/date'
import type { DayRecord, Intake, IsoDate, Medication } from '../domain/types'

export interface ExportFile {
  format: 'moodcraft-export'
  schemaVersion: number
  exportedAt: IsoDate
  medications: Medication[]
  dayRecords: DayRecord[]
  intakes: Intake[]
  analysisMedicationId: string | null
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

export async function restoreExport(json: string): Promise<void> {
  const parsed = JSON.parse(json) as Partial<ExportFile>
  if (parsed.format !== 'moodcraft-export') {
    throw new Error('This file is not a Moodcraft export.')
  }
  if ((parsed.schemaVersion ?? 0) > SCHEMA_VERSION) {
    throw new Error('This export was written by a newer version of Moodcraft.')
  }
  for (const m of parsed.medications ?? []) {
    await (await openDb()).put('medications', m)
  }
  for (const r of parsed.dayRecords ?? []) await dayRecords.put(r)
  for (const i of parsed.intakes ?? []) await intakes.put(i)
  if (parsed.analysisMedicationId) await medications.setAnalysisTarget(parsed.analysisMedicationId)
}
