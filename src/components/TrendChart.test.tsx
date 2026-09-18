import { render, screen } from '@testing-library/react'
import { TrendChart, buildSeries, segmentPolylines } from './TrendChart'
import { makeDayRecord, makeIntake } from '../test/factories'

test('a day with no record leaves a hole in the series, never an interpolated point (R-06)', () => {
  const series = buildSeries(
    [makeDayRecord('2026-09-10', { score: 4 }), makeDayRecord('2026-09-12', { score: 2 })],
    '2026-09-10',
    '2026-09-12',
  )
  expect(series).toHaveLength(3)
  expect(series[1]).toBeNull()
})

test('the line is broken into one polyline per run of recorded days — gaps are never bridged', () => {
  const series = buildSeries(
    [
      makeDayRecord('2026-09-10', { score: 4 }),
      makeDayRecord('2026-09-11', { score: 3 }),
      makeDayRecord('2026-09-14', { score: 2 }),
      makeDayRecord('2026-09-15', { score: 2 }),
    ],
    '2026-09-10',
    '2026-09-15',
  )
  expect(segmentPolylines(series)).toHaveLength(2)
})

test('a single isolated recorded day still produces a mark, not an invisible segment', () => {
  const series = buildSeries([makeDayRecord('2026-09-12', { score: 3 })], '2026-09-10', '2026-09-14')
  expect(segmentPolylines(series)).toHaveLength(1)
})

test('the chart is labelled and lists its marks in text for assistive tech', () => {
  render(
    <TrendChart
      records={[makeDayRecord('2026-09-10', { score: 4, events: ['conflict'] })]}
      intakes={[makeIntake('2026-09-10', 150)]}
      baseline={null}
      from="2026-09-08"
      to="2026-09-12"
    />,
  )
  expect(screen.getByRole('img', { name: /scores from/i })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /150 mg/i })).toBeInTheDocument()
})

test('with nothing recorded the chart says so rather than drawing an empty grid', () => {
  render(<TrendChart records={[]} intakes={[]} baseline={null} from="2026-09-08" to="2026-09-12" />)
  expect(screen.getByText('Nothing recorded in this period.')).toBeInTheDocument()
})
