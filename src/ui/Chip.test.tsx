import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

test('an unticked chip is an unchecked switch', () => {
  render(<Chip label="Conflict" valence="bad" selected={false} onToggle={() => {}} />)
  expect(screen.getByRole('switch', { name: 'Conflict' })).not.toBeChecked()
})

test('ticking reports the toggle', async () => {
  const onToggle = vi.fn()
  render(<Chip label="Exercise" valence="good" selected={false} onToggle={onToggle} />)
  await userEvent.click(screen.getByRole('switch', { name: 'Exercise' }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('a ticked chip states its valence in text for assistive tech, not only in colour', () => {
  render(<Chip label="Conflict" valence="bad" selected onToggle={() => {}} />)
  expect(screen.getByRole('switch', { name: 'Conflict' })).toHaveAccessibleDescription('bad event')
})
