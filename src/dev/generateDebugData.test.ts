import { generateDebugExport, reliefForDaysSince } from './generateDebugData'
import { ITEM_IDS } from '../domain/items'

describe('reliefForDaysSince', () => {
  test('improves over the first few days after a dose, then worsens', () => {
    expect(reliefForDaysSince(1)).toBeGreaterThan(reliefForDaysSince(0))
    expect(reliefForDaysSince(2)).toBeGreaterThan(0)
    expect(reliefForDaysSince(10)).toBeLessThan(0)
  })
})

describe('generateDebugExport', () => {
  test('is deterministic for a given seed', () => {
    const a = generateDebugExport({ days: 60, seed: 7 })
    const b = generateDebugExport({ days: 60, seed: 7 })
    expect(a.dayRecords).toEqual(b.dayRecords)
    expect(a.intakes.map((i) => ({ date: i.date, mg: i.mg }))).toEqual(
      b.intakes.map((i) => ({ date: i.date, mg: i.mg })),
    )
  })

  test('produces a well-formed export', () => {
    const file = generateDebugExport({ days: 60, seed: 1 })
    expect(file.format).toBe('moodcraft-export')
    expect(file.medications).toHaveLength(1)
    expect(file.analysisMedicationId).toBe(file.medications[0]!.id)
    expect(file.dayRecords.length).toBeGreaterThan(0)
    expect(file.intakes.length).toBeGreaterThan(0)

    for (const record of file.dayRecords) {
      for (const itemId of ITEM_IDS) {
        const score = record.scores[itemId]
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(5)
      }
    }
    for (const intake of file.intakes) {
      expect(intake.medicationId).toBe(file.medications[0]!.id)
      expect(intake.mg).toBeGreaterThan(0)
    }
  })

  test('leaves a baseline period with no intakes before the first dose', () => {
    const file = generateDebugExport({ days: 60, seed: 3 })
    const firstIntakeDate = file.intakes.reduce((min, i) => (i.date < min ? i.date : min), file.intakes[0]!.date)
    const daysBefore = file.dayRecords.filter((r) => r.date < firstIntakeDate)
    expect(daysBefore.length).toBeGreaterThanOrEqual(10)
  })
})
