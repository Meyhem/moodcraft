import { closeDb, deleteDb, SCHEMA_VERSION } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { buildExport, restoreExport, serializeExport, exportFilename } from './exportImport'
import { makeDayRecord, makeIntake } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

test('export carries every record and the schema version', async () => {
  const med = await medications.add('Medication A')
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await intakes.put(makeIntake('2026-09-15', 150, med.id))

  const file = await buildExport()
  expect(file.format).toBe('moodcraft-export')
  expect(file.schemaVersion).toBe(SCHEMA_VERSION)
  expect(file.dayRecords).toHaveLength(1)
  expect(file.intakes).toHaveLength(1)
  expect(file.medications).toHaveLength(1)
  expect(file.analysisMedicationId).toBe(med.id)
})

test('a round trip restores the same data', async () => {
  await medications.add('Medication A')
  await dayRecords.put(makeDayRecord('2026-09-15', { events: ['conflict'] }))
  const json = await serializeExport()

  closeDb(); await deleteDb()
  await restoreExport(json)

  const restored = await dayRecords.all()
  expect(restored).toHaveLength(1)
  expect(restored[0]!.events).toEqual(['conflict'])
})

test('a foreign file is rejected', async () => {
  await expect(restoreExport('{"format":"something-else"}')).rejects.toThrow(/not a Moodcraft export/i)
})

test('the filename is dated and unceremonious', () => {
  expect(exportFilename('2026-09-18')).toBe('moodcraft-2026-09-18.json')
})
