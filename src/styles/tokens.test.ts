import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
const reference = readFileSync(
  resolve(__dirname, '../../design-system/foundations/colors.html'),
  'utf8',
)

function declarations(source: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1]
    const value = match[2]
    if (name && value && !map.has(name)) map.set(name, value.trim())
  }
  return map
}

test('every design-system token is declared with the same value', () => {
  const ours = declarations(tokens)
  const theirs = declarations(reference)
  expect(theirs.size).toBeGreaterThan(30)
  for (const [name, value] of theirs) {
    expect(ours.get(name), `token ${name}`).toBe(value)
  }
})

test('declares the derived on-fill and focus tokens', () => {
  const ours = declarations(tokens)
  expect(ours.get('--on-accent')).toBe('#14121F')
  expect(ours.get('--on-severity-light')).toBe('#20182B')
  expect(ours.get('--on-severity-dark')).toBe('#F4F2FB')
  expect(ours.has('--focus-glow')).toBe(true)
})
