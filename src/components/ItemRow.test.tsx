import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from './ItemRow'

test('shows the item wording verbatim and its score control', async () => {
  const onChange = vi.fn()
  render(<ItemRow label="Lack of desire for company" value={null} onChange={onChange} />)
  expect(screen.getByText('Lack of desire for company')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: '4' }))
  expect(onChange).toHaveBeenCalledWith(4)
})

test('the score group is named by the item, so a screen reader hears which item it is scoring', () => {
  render(<ItemRow label="Tiredness" value={3} onChange={() => {}} />)
  expect(screen.getByRole('radiogroup', { name: 'Tiredness' })).toBeInTheDocument()
})
