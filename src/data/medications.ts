import { openDb } from './db'
import { todayIso } from '../domain/date'
import type { Medication } from '../domain/types'

const ANALYSIS_TARGET = 'analysisMedicationId'

export const medications = {
  async all(): Promise<Medication[]> {
    const rows = await (await openDb()).getAll('medications')
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  },
  async get(id: string): Promise<Medication | undefined> {
    return (await openDb()).get('medications', id)
  },
  async add(name: string): Promise<Medication> {
    const medication: Medication = { id: crypto.randomUUID(), name: name.trim(), createdAt: todayIso() }
    const db = await openDb()
    await db.put('medications', medication)
    if ((await db.getAll('medications')).length === 1) {
      await medications.setAnalysisTarget(medication.id)
    }
    return medication
  },
  async analysisTargetId(): Promise<string | null> {
    const row = await (await openDb()).get('settings', ANALYSIS_TARGET)
    return (row?.value as string | undefined) ?? null
  },
  async setAnalysisTarget(id: string): Promise<void> {
    await (await openDb()).put('settings', { key: ANALYSIS_TARGET, value: id })
  },
}
