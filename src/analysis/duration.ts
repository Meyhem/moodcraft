import { addDays } from '../domain/date'
import { composite } from './composite'
import { isConfounded } from './confounders'
import { THIN_SAMPLE } from './types'
import type { Baseline } from './types'
import type { DayRecord, Intake, IsoDate } from '../domain/types'

export interface DoseBucket {
  label: string
  minMg: number
  maxMg: number
  doseCount: number
}

export interface DecayPoint {
  dayOffset: number
  meanImprovement: number | null
  sampleSize: number
  thin: boolean
  /** R-13: how many of the contributing days carried a logged event — noted, not excluded */
  confoundedCount: number
}

export interface DecayCurve {
  bucket: DoseBucket
  points: DecayPoint[]
}

const MAX_DAY_OFFSET = 6

function labelFor(minMg: number, maxMg: number): string {
  return minMg === maxMg ? `${minMg} mg` : `${minMg}–${maxMg} mg`
}

/** R-15: buckets are derived from the recorded mg values, never a configured threshold */
export function buildDoseBuckets(intakes: Intake[]): DoseBucket[] {
  const amounts = [...new Set(intakes.map((i) => i.mg))].sort((a, b) => a - b)
  if (amounts.length === 0) return []

  if (amounts.length <= 3) {
    return amounts.map((mg) => ({
      label: labelFor(mg, mg),
      minMg: mg,
      maxMg: mg,
      doseCount: intakes.filter((i) => i.mg === mg).length,
    }))
  }

  const sortedMg = intakes.map((i) => i.mg).sort((a, b) => a - b)
  const tertile = (fraction: number) => sortedMg[Math.floor(sortedMg.length * fraction)]!
  const lowMax = tertile(1 / 3)
  const midMax = tertile(2 / 3)

  const ranges: Array<{ min: number; max: number }> = [
    { min: sortedMg[0]!, max: lowMax },
    { min: lowMax, max: midMax },
    { min: midMax, max: sortedMg[sortedMg.length - 1]! },
  ]

  return ranges.map(({ min, max }, index) => ({
    label: labelFor(min, max),
    minMg: min,
    maxMg: max,
    doseCount: intakes.filter((i) =>
      index === ranges.length - 1 ? i.mg >= min && i.mg <= max : i.mg >= min && i.mg < max,
    ).length,
  }))
}

function bucketFor(buckets: DoseBucket[], mg: number): DoseBucket | null {
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i]!
    if (bucket.minMg === bucket.maxMg) {
      if (mg === bucket.minMg) return bucket
      continue
    }
    const isLast = i === buckets.length - 1
    if (mg >= bucket.minMg && (isLast ? mg <= bucket.maxMg : mg < bucket.maxMg)) return bucket
  }
  return null
}

/**
 * For each dose bucket, the mean improvement at each day offset after intake
 * (0..6), where a day only counts toward a dose if no later intake has
 * happened by then — so no day is ever attributed to more than one dose.
 */
export function computeDecayCurves(
  intakes: Intake[],
  records: DayRecord[],
  baseline: Baseline | null,
): DecayCurve[] {
  if (baseline === null) return []

  const buckets = buildDoseBuckets(intakes)
  if (buckets.length === 0) return []

  const byDate = new Map(records.map((r) => [r.date, r]))
  const sorted = [...intakes].sort((a, b) => a.date.localeCompare(b.date))

  const sums = new Map<DoseBucket, number[]>(buckets.map((b) => [b, Array(MAX_DAY_OFFSET + 1).fill(0)]))
  const counts = new Map<DoseBucket, number[]>(buckets.map((b) => [b, Array(MAX_DAY_OFFSET + 1).fill(0)]))
  const confoundedCounts = new Map<DoseBucket, number[]>(
    buckets.map((b) => [b, Array(MAX_DAY_OFFSET + 1).fill(0)]),
  )

  sorted.forEach((intake, index) => {
    const bucket = bucketFor(buckets, intake.mg)
    if (bucket === null) return
    const next = sorted[index + 1] ?? null

    for (let offset = 0; offset <= MAX_DAY_OFFSET; offset++) {
      const date: IsoDate = addDays(intake.date, offset)
      if (next !== null && date >= next.date) break

      const record = byDate.get(date)
      if (record === undefined) continue

      const value = composite(record)
      if (Number.isNaN(value)) continue

      sums.get(bucket)![offset]! += baseline.mean - value
      counts.get(bucket)![offset]! += 1
      if (isConfounded([record])) confoundedCounts.get(bucket)![offset]! += 1
    }
  })

  return buckets.map((bucket) => ({
    bucket,
    points: Array.from({ length: MAX_DAY_OFFSET + 1 }, (_, offset) => {
      const sampleSize = counts.get(bucket)![offset]!
      return {
        dayOffset: offset,
        meanImprovement: sampleSize > 0 ? sums.get(bucket)![offset]! / sampleSize : null,
        sampleSize,
        thin: sampleSize < THIN_SAMPLE,
        confoundedCount: confoundedCounts.get(bucket)![offset]!,
      }
    }),
  }))
}
