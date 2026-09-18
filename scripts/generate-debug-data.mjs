#!/usr/bin/env node
// Generates a synthetic moodcraft-export JSON file for manual testing.
// Import it from the Library screen's "Import" button.
//
// Usage:
//   node scripts/generate-debug-data.mjs [output-path] [--days=180] [--seed=1]

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ITEM_IDS = [
  'tiredness', 'rumination', 'sadness', 'loneliness', 'social-withdrawal',
  'no-desire-company', 'anhedonia', 'anxiety', 'irritability', 'concentration',
  'motivation', 'hopelessness', 'sleep',
]

const EVENT_IDS = [
  'bad-sleep', 'conflict', 'illness', 'work-stress', 'good-news', 'social-event', 'exercise', 'travel',
]

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [key, value] = a.slice(2).split('=')
    return [key, value ?? true]
  }),
)

const outputPath = resolve(positional[0] ?? 'debug-data.json')
const totalDays = Number(flags.days ?? 180)
const seed = Number(flags.seed ?? 1)

// Deterministic PRNG so a given seed always produces the same file.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(seed)
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const pick = (arr) => arr[randInt(0, arr.length - 1)]
const clampScore = (n) => Math.max(1, Math.min(5, Math.round(n)))

function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return toIso(date)
}

const today = toIso(new Date())
const startDate = addDays(today, -totalDays)

const medicationId = crypto.randomUUID()
const medication = { id: medicationId, name: 'Debug Med', createdAt: startDate }

// First 14 days are a baseline period with no intakes, so the analysis engine
// has a measured baseline to compare doses against.
const baselineDays = 14
const firstIntakeOffset = baselineDays + randInt(0, 3)

const dayRecords = []
const intakes = []

let dayIndex = 0
let daysSinceLastIntake = Infinity
let underlyingSeverity = 3.2 // slow-drifting mean the daily scores wobble around

while (dayIndex < totalDays) {
  const date = addDays(startDate, dayIndex)

  // Occasional missing day, so charts exercise gap handling — never on the very first days.
  const isMissing = dayIndex > 2 && rand() < 0.08
  if (isMissing) {
    dayIndex += 1
    continue
  }

  underlyingSeverity += (rand() - 0.5) * 0.15
  underlyingSeverity = Math.max(1.8, Math.min(4.2, underlyingSeverity))

  // A recent dose temporarily lowers scores (i.e. "improvement"); the effect
  // fades over the response window and grows weaker the shorter the prior gap.
  let doseRelief = 0
  if (daysSinceLastIntake <= 2) {
    const freshnessFactor = Math.min(1, daysSinceLastIntake === 0 ? 1 : 0.6)
    doseRelief = 0.9 * freshnessFactor * (1 - daysSinceLastIntake * 0.25)
  }

  const scores = {}
  for (const itemId of ITEM_IDS) {
    const noise = (rand() - 0.5) * 1.4
    scores[itemId] = clampScore(underlyingSeverity - doseRelief + noise)
  }

  const events = []
  if (rand() < 0.2) events.push(pick(EVENT_IDS))
  if (rand() < 0.05) events.push(pick(EVENT_IDS))

  dayRecords.push({ date, scores, events: [...new Set(events)] })

  const isDoseDay =
    dayIndex === firstIntakeOffset ||
    (dayIndex > firstIntakeOffset && daysSinceLastIntake >= randInt(2, 9) && rand() < 0.6)

  if (isDoseDay) {
    intakes.push({ date, medicationId, mg: pick([25, 50, 50, 75, 100]) })
    daysSinceLastIntake = 0
  } else {
    daysSinceLastIntake += 1
  }

  dayIndex += 1
}

const exportFile = {
  format: 'moodcraft-export',
  schemaVersion: 1,
  exportedAt: today,
  medications: [medication],
  dayRecords,
  intakes,
  analysisMedicationId: medicationId,
}

writeFileSync(outputPath, JSON.stringify(exportFile, null, 2))

console.log(`Wrote ${dayRecords.length} day records and ${intakes.length} intakes to ${outputPath}`)
console.log('Import it from the Library screen\'s "Import" button.')
