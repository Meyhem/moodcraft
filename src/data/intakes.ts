import { openDb } from './db'
import type { Intake, IsoDate } from '../domain/types'

export const intakes = {
  async forMedication(medicationId: string): Promise<Intake[]> {
    const rows = await (await openDb()).getAllFromIndex('intakes', 'by-medication', medicationId)
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
  async put(intake: Intake): Promise<void> {
    if (!(intake.mg > 0)) throw new Error('Dose must be a positive number of milligrams')
    await (await openDb()).put('intakes', intake)
  },
  async remove(medicationId: string, date: IsoDate): Promise<void> {
    await (await openDb()).delete('intakes', [medicationId, date])
  },
  async all(): Promise<Intake[]> {
    const rows = await (await openDb()).getAll('intakes')
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },
}
