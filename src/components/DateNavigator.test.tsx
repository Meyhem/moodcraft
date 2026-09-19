import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateNavigator } from './DateNavigator'

const props = {
  date: '2026-09-15' as const, // Tuesday, in the Mon 09-14 – Sun 09-20 week
  today: '2026-09-18' as const, // Friday, same week
  recordedDates: new Set(['2026-09-14', '2026-09-15']),
}

test('header shows the month and year of the visible week, not a specific date', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
})

test('header spells out both months when the visible week crosses a month boundary', async () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  // Mon 09-14 -> Mon 08-31, whose week (Mon 08-31 - Sun 09-06) crosses August/September.
  await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(screen.getByRole('heading', { name: 'August - September 2026' })).toBeInTheDocument()
})

test('the visible week is fixed Monday–Sunday and does not reflow when a day in it is selected', () => {
  const { rerender } = render(<DateNavigator {...props} onChange={() => {}} />)
  // Sunday the 20th is visible even though it's after the selected date — Mon-Sun grid, not a sliding window.
  expect(screen.getByRole('button', { name: 'Sunday, September 20 — no record' })).toBeInTheDocument()

  rerender(<DateNavigator {...props} date="2026-09-14" onChange={() => {}} />)
  // Selecting another day inside the same week must not shift the strip.
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sunday, September 20 — no record' })).toBeInTheDocument()
})

test('clicking a day pill reports that date (any past date is editable, R-05)', async () => {
  const onChange = vi.fn()
  render(<DateNavigator {...props} onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: 'Monday, September 14 — recorded' }))
  expect(onChange).toHaveBeenCalledWith('2026-09-14')
})

test('the selected day is marked current', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Tuesday, September 15 — recorded' })).toHaveAttribute('aria-current', 'date')
})

test('arrows step a full week, not a single day', async () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(screen.getByRole('button', { name: 'Monday, September 7 — no record' })).toBeInTheDocument()
})

test('the future is not offered — the next-week control stops once the visible week reaches today', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Previous week' })).toBeEnabled()
})

test('future days within the visible week are shown but unselectable', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  // today is Friday the 18th, so Sat 19 / Sun 20 are future.
  expect(screen.getByRole('button', { name: 'Saturday, September 19 — no record' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Sunday, September 20 — no record' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Friday, September 18 — no record' })).toBeEnabled()
})

test('unknown days are labelled unknown, never zero or missed (R-06)', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Wednesday, September 16 — no record' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Monday, September 14 — recorded' })).toBeInTheDocument()
})
