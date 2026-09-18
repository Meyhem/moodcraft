import { closeDb, deleteDb } from './db'
import { dayRecords } from './dayRecords'
import { intakes } from './intakes'
import { medications } from './medications'
import { makeDayRecord, makeIntake } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

test('day records round-trip and come back in date order', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await dayRecords.put(makeDayRecord('2026-09-13'))
  expect((await dayRecords.all()).map((r) => r.date)).toEqual(['2026-09-13', '2026-09-15'])
  expect(await dayRecords.get('2026-09-15')).toMatchObject({ date: '2026-09-15' })
})

test('putting the same date twice replaces, never duplicates (R-01)', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15', { events: ['conflict'] }))
  await dayRecords.put(makeDayRecord('2026-09-15', { events: [] }))
  const all = await dayRecords.all()
  expect(all).toHaveLength(1)
  expect(all[0]!.events).toEqual([])
})

test('a removed day record becomes unknown again, not zero (R-06)', async () => {
  await dayRecords.put(makeDayRecord('2026-09-15'))
  await dayRecords.remove('2026-09-15')
  expect(await dayRecords.get('2026-09-15')).toBeUndefined()
})

test('intakes are scoped to a medication and ordered', async () => {
  await intakes.put(makeIntake('2026-09-15', 150, 'm1'))
  await intakes.put(makeIntake('2026-09-10', 100, 'm1'))
  await intakes.put(makeIntake('2026-09-12', 80, 'm2'))
  expect((await intakes.forMedication('m1')).map((i) => i.date))
    .toEqual(['2026-09-10', '2026-09-15'])
})

test('exactly one medication is the analysis target (R-11)', async () => {
  const a = await medications.add('Medication A')
  const b = await medications.add('Caffeine')
  await medications.setAnalysisTarget(a.id)
  expect(await medications.analysisTargetId()).toBe(a.id)
  await medications.setAnalysisTarget(b.id)
  expect(await medications.analysisTargetId()).toBe(b.id)
  expect(await medications.all()).toHaveLength(2) // switching discards nothing
})

test('the first medication added becomes the analysis target', async () => {
  const a = await medications.add('Medication A')
  expect(await medications.analysisTargetId()).toBe(a.id)
})
