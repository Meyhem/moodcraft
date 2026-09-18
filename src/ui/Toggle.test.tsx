import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle } from './Toggle'

const OPTIONS = [
  { value: 'recent' as const, label: 'Recent' },
  { value: 'long-term' as const, label: 'Long-term' },
]

test('shows both windows with the current one selected', () => {
  render(<Toggle ariaLabel="Time window" options={OPTIONS} value="recent" onChange={() => {}} />)
  expect(screen.getByRole('radio', { name: 'Recent' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Long-term' })).not.toBeChecked()
})

test('switching reports the new window', async () => {
  const onChange = vi.fn()
  render(<Toggle ariaLabel="Time window" options={OPTIONS} value="recent" onChange={onChange} />)
  await userEvent.click(screen.getByRole('radio', { name: 'Long-term' }))
  expect(onChange).toHaveBeenCalledWith('long-term')
})
