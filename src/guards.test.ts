import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|css)$/.test(path) ? [path] : []
  })
}

const files = sourceFiles(resolve(__dirname))
const appFiles = files.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && !f.includes('/test/'))

test('no source file performs a network request (R-18)', () => {
  for (const file of appFiles) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|navigator\.sendBeacon/)
    expect(source, file).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
  }
})

test('no user-facing copy recommends an action (R-08)', () => {
  const banned = /\b(you should|we recommend|recommended|try taking|aim for|wait at least|advice)\b/i
  for (const file of appFiles) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(banned)
  }
})

test('nothing nudges, reminds or notifies (R-20)', () => {
  for (const file of appFiles) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toMatch(/Notification|requestPermission|serviceWorker|streak|don't forget/i)
  }
})

test('no time-of-day is captured anywhere (R-04)', () => {
  for (const file of appFiles) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/type="time"|getHours\(\)|setHours\(/)
  }
})

test('components use tokens, not raw colour values', () => {
  for (const file of appFiles.filter((f) => f.endsWith('.module.css'))) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  }
})
