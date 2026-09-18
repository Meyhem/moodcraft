import { ITEM_IDS } from '../domain/items'
import { addDays, todayIso } from '../domain/date'
import type { DayRecord, Intake, IsoDate, Medication, Score } from '../domain/types'
import type { ExportFile } from '../data/exportImport'

export interface GenerateDebugDataOptions {
  /** How many days of history to generate, ending today. */
  days?: number
  /** Fixes the random sequence so the same options always produce the same data. */
  seed?: number
}

function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clampScore(n: number): Score {
  return Math.max(1, Math.min(5, Math.round(n))) as Score
}

/**
 * Shape of a dose's effect on the composite score, keyed by full days elapsed since that
 * dose (0 = the day after it was taken): a mild first-day improvement, peaking 2-3 days
 * out (the response window in the domain spec), then fading into a worse-than-baseline
 * rebound until the next dose. Lower score is better, so a positive number here is
 * subtracted from severity; negative makes it worse.
 */
function reliefForDaysSince(daysSince: number): number {
  const curve = [0.2, 0.9, 0.8, 0.2]
  return curve[daysSince] ?? -0.3
}

/** Builds a synthetic moodcraft-export for exercising the analysis and charts without manual entry. */
export function generateDebugExport(options: GenerateDebugDataOptions = {}): ExportFile {
  const totalDays = options.days ?? 180
  const rand = mulberry32(options.seed ?? Math.floor(Math.random() * 2 ** 31))
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const pick = <T,>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)] as T

  const today = todayIso()
  const startDate = addDays(today, -totalDays)

  const medicationId = crypto.randomUUID()
  const medication: Medication = { id: medicationId, name: 'Debug Med', createdAt: startDate }

  // A baseline period with no intakes first, so the analysis engine has a measured baseline.
  const baselineDays = 14
  const firstIntakeOffset = baselineDays + randInt(0, 3)

  const dayRecords: DayRecord[] = []
  const intakes: Intake[] = []

  let underlyingSeverity = 3.2 // slow-drifting mean the daily scores wobble around
  let daysSinceLastIntake = Infinity

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const date = addDays(startDate, dayIndex) as IsoDate

    // Occasional missing day, so charts exercise gap handling — never on the very first days.
    if (dayIndex > 2 && rand() < 0.08) continue

    underlyingSeverity += (rand() - 0.5) * 0.15
    underlyingSeverity = Math.max(1.8, Math.min(4.2, underlyingSeverity))

    const relief = daysSinceLastIntake === Infinity ? 0 : reliefForDaysSince(daysSinceLastIntake)

    const scores: Partial<Record<string, Score>> = {}
    for (const itemId of ITEM_IDS) {
      const noise = (rand() - 0.5) * 1.4
      scores[itemId] = clampScore(underlyingSeverity - relief + noise)
    }

    dayRecords.push({ date, scores: scores as Record<string, Score> })

    const isDoseDay =
      dayIndex === firstIntakeOffset ||
      (dayIndex > firstIntakeOffset && daysSinceLastIntake >= randInt(2, 9) && rand() < 0.6)

    if (isDoseDay) {
      intakes.push({ date, medicationId, mg: pick([25, 50, 50, 75, 100]) })
      daysSinceLastIntake = 0
    } else if (daysSinceLastIntake !== Infinity) {
      daysSinceLastIntake += 1
    }
  }

  return {
    format: 'moodcraft-export',
    schemaVersion: 1,
    exportedAt: today,
    medications: [medication],
    dayRecords,
    intakes,
    analysisMedicationId: medicationId,
  }
}

export { reliefForDaysSince }
