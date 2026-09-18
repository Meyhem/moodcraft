import { render, screen } from '@testing-library/react'
import { DoseDecayChart } from './DoseDecayChart'
import type { DecayCurve } from '../analysis'

function curve(overrides: Partial<DecayCurve> = {}): DecayCurve {
  return {
    bucket: { label: '100 mg', minMg: 100, maxMg: 100, doseCount: 5 },
    points: [
      { dayOffset: 0, meanImprovement: 1.5, sampleSize: 5, thin: true, confoundedCount: 0 },
      { dayOffset: 1, meanImprovement: 1.0, sampleSize: 4, thin: true, confoundedCount: 0 },
    ],
    ...overrides,
  }
}

test('with no measured data the chart explains rather than drawing an empty grid', () => {
  render(<DoseDecayChart curves={[]} />)
  expect(screen.getByText(/not enough measured doses/i)).toBeInTheDocument()
})

test('a curve with every point null is treated as no data', () => {
  const empty = curve({
    points: [
      { dayOffset: 0, meanImprovement: null, sampleSize: 0, thin: true, confoundedCount: 0 },
      { dayOffset: 1, meanImprovement: null, sampleSize: 0, thin: true, confoundedCount: 0 },
    ],
  })
  render(<DoseDecayChart curves={[empty]} />)
  expect(screen.getByText(/not enough measured doses/i)).toBeInTheDocument()
})

test('the chart is labelled and describes each bucket for assistive tech', () => {
  render(<DoseDecayChart curves={[curve()]} />)
  const img = screen.getByRole('img', { name: /improvement by days since dose/i })
  expect(img).toBeInTheDocument()
  expect(img.getAttribute('aria-label')).toMatch(/100 mg \(5 doses\): day 0: 1\.5 \(thin\), day 1: 1\.0 \(thin\)\./)
})

test('the legend names each bucket with its dose count', () => {
  render(<DoseDecayChart curves={[curve()]} />)
  expect(screen.getByText(/100 mg \(5 doses\)/)).toBeInTheDocument()
})

test('a point with a confounded day is noted in the accessible label, not dropped', () => {
  const withEvent = curve({
    points: [
      { dayOffset: 0, meanImprovement: 1.5, sampleSize: 5, thin: true, confoundedCount: 2 },
      { dayOffset: 1, meanImprovement: 1.0, sampleSize: 4, thin: true, confoundedCount: 0 },
    ],
  })
  render(<DoseDecayChart curves={[withEvent]} />)
  const img = screen.getByRole('img', { name: /improvement by days since dose/i })
  expect(img.getAttribute('aria-label')).toMatch(/day 0: 1\.5 \(thin, 2 of 5 days had an event\)/)
  expect(img.getAttribute('aria-label')).toMatch(/day 1: 1\.0 \(thin\)\./)
})

test('multiple buckets are each described in the accessible label', () => {
  const low = curve({ bucket: { label: '50 mg', minMg: 50, maxMg: 50, doseCount: 3 } })
  const high = curve({ bucket: { label: '200 mg', minMg: 200, maxMg: 200, doseCount: 7 } })
  render(<DoseDecayChart curves={[low, high]} />)
  const img = screen.getByRole('img', { name: /improvement by days since dose/i })
  expect(img.getAttribute('aria-label')).toMatch(/50 mg \(3 doses\)/)
  expect(img.getAttribute('aria-label')).toMatch(/200 mg \(7 doses\)/)
})
