import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox } from './Combobox'

const OPTIONS = [
  { id: 'm1', name: 'Medication A', badge: 'under analysis' },
  { id: 'm2', name: 'Caffeine', meta: 'last: 3d ago' },
]

test('opens and lists the library so a returning medication is picked, not retyped', async () => {
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={() => {}} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  expect(screen.getByRole('option', { name: /Caffeine/ })).toBeInTheDocument()
})

test('selecting reports the id', async () => {
  const onSelect = vi.fn()
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={onSelect} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.click(screen.getByRole('option', { name: /Caffeine/ }))
  expect(onSelect).toHaveBeenCalledWith('m2')
})

test('a new medication can be added from the picker', async () => {
  const onCreate = vi.fn()
  render(<Combobox label="Medication" options={OPTIONS} value={null} onSelect={() => {}} onCreate={onCreate} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.click(screen.getByRole('button', { name: '+ Add new medication' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'New medication name' }), 'Melatonin')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onCreate).toHaveBeenCalledWith('Melatonin')
})

test('escape closes the list', async () => {
  render(<Combobox label="Medication" options={OPTIONS} value="m1" onSelect={() => {}} onCreate={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /Medication/ }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
