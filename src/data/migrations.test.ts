import { openDB } from 'idb'
import { MIGRATIONS, SCHEMA_VERSION, openDb, closeDb, deleteDb, type MoodcraftDB } from './db'

afterEach(async () => {
  closeDb()
  await deleteDb('moodcraft-test')
})

test('migration list is ordered, gapless, starts at 1 and ends at SCHEMA_VERSION', () => {
  expect(MIGRATIONS.map((m) => m.version)).toEqual(
    MIGRATIONS.map((_, i) => i + 1),
  )
  expect(MIGRATIONS.at(-1)?.version).toBe(SCHEMA_VERSION)
  for (const m of MIGRATIONS) expect(m.describe.length).toBeGreaterThan(0)
})

test('a fresh database ends up with every store', async () => {
  const db = await openDb('moodcraft-test')
  expect([...db.objectStoreNames].sort()).toEqual([
    'dayRecords', 'intakes', 'medications', 'settings',
  ])
  expect(db.version).toBe(SCHEMA_VERSION)
})

test('an older database is upgraded without losing rows', async () => {
  // simulate a v1 database written by an earlier release
  const legacy = await openDB<MoodcraftDB>('moodcraft-test', 1, {
    upgrade(db) {
      MIGRATIONS[0]!.upgrade(db, null as never)
    },
  })
  await legacy.put('dayRecords', { date: '2026-09-15', scores: {}, events: [] })
  legacy.close()

  const db = await openDb('moodcraft-test')
  expect(db.version).toBe(SCHEMA_VERSION)
  expect(await db.get('dayRecords', '2026-09-15')).toMatchObject({ date: '2026-09-15' })
})

test('intakes are keyed per medication per day', async () => {
  const db = await openDb('moodcraft-test')
  await db.put('intakes', { medicationId: 'm1', date: '2026-09-15', mg: 100 })
  await db.put('intakes', { medicationId: 'm1', date: '2026-09-15', mg: 150 })
  expect(await db.getAll('intakes')).toHaveLength(1)
  expect((await db.getAll('intakes'))[0]).toMatchObject({ mg: 150 })
})
