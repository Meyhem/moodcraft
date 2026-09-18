import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateNavigator } from './DateNavigator'

const props = {
  date: '2026-09-15' as const,
  today: '2026-09-18' as const,
  recordedDates: new Set(['2026-09-13', '2026-09-15']),
}

test('shows the long date exactly as the design system does', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Tuesday, September 15' })).toBeInTheDocument()
})

test('stepping back a day reports the previous date (any past date is editable, R-05)', async () => {
  const onChange = vi.fn()
  render(<DateNavigator {...props} onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
  expect(onChange).toHaveBeenCalledWith('2026-09-14')
})

test('the future is not offered — the next-day control stops at today', () => {
  render(<DateNavigator {...props} date="2026-09-18" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
})

test('unknown days are labelled unknown, never zero or missed (R-06)', () => {
  render(<DateNavigator {...props} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Monday, September 14 — no record' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sunday, September 13 — recorded' })).toBeInTheDocument()
})
