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
  await dayRecords.put(makeDayRecord('2026-09-15', { score: 2 }))
  const json = await serializeExport()

  closeDb(); await deleteDb()
  await restoreExport(json)

  const restored = await dayRecords.all()
  expect(restored).toHaveLength(1)
  expect(Object.values(restored[0]!.scores)[0]).toBe(2)
})

test('a foreign file is rejected', async () => {
  await expect(restoreExport('{"format":"something-else"}')).rejects.toThrow(/not a Moodcraft export/i)
})

test('the filename is dated and unceremonious', () => {
  expect(exportFilename('2026-09-18')).toBe('moodcraft-2026-09-18.json')
})

test('a file that is not JSON at all is rejected with a plain message', async () => {
  await expect(restoreExport('<!doctype html>')).rejects.toThrow(/not a valid JSON file/i)
})

test('a file written by a newer schema version is rejected', async () => {
  const json = JSON.stringify({ format: 'moodcraft-export', schemaVersion: SCHEMA_VERSION + 1 })
  await expect(restoreExport(json)).rejects.toThrow(/newer version/i)
})

test('one malformed record leaves the database untouched', async () => {
  await dayRecords.put(makeDayRecord('2026-09-14', { score: 2 }))
  const json = JSON.stringify({
    format: 'moodcraft-export',
    schemaVersion: SCHEMA_VERSION,
    medications: [],
    dayRecords: [makeDayRecord('2026-09-15'), { date: '2026-09-16' }],
    intakes: [],
    analysisMedicationId: null,
  })

  await expect(restoreExport(json)).rejects.toThrow(/2026-09-16/)

  const after = await dayRecords.all()
  expect(after).toHaveLength(1)
  expect(after[0]!.date).toBe('2026-09-14')
})

test('importing merges into what is already on the device, the file winning on conflicts', async () => {
  await dayRecords.put(makeDayRecord('2026-09-14', { score: 2 }))
  await dayRecords.put(makeDayRecord('2026-09-15', { score: 2 }))
  const json = JSON.stringify({
    format: 'moodcraft-export',
    schemaVersion: SCHEMA_VERSION,
    medications: [],
    dayRecords: [makeDayRecord('2026-09-15', { score: 5 }), makeDayRecord('2026-09-16', { score: 4 })],
    intakes: [],
    analysisMedicationId: null,
  })

  await restoreExport(json)

  const after = await dayRecords.all()
  expect(after.map((r) => r.date)).toEqual(['2026-09-14', '2026-09-15', '2026-09-16'])
  expect(after[0]!.scores.tiredness).toBe(2)
  expect(after[1]!.scores.tiredness).toBe(5)
})

test('a restore reports how many records it wrote', async () => {
  const med = await medications.add('Medication A')
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await intakes.put(makeIntake('2026-09-15', 150, med.id))
  const json = await serializeExport()

  const summary = await restoreExport(json)

  expect(summary).toEqual({ medications: 1, dayRecords: 1, intakes: 1 })
})
