import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportAction } from './ImportAction'

function jsonFile(contents: string) {
  return new File([contents], 'moodcraft-2026-09-18.json', { type: 'application/json' })
}

test('a chosen file is handed over as text and what landed is reported', async () => {
  const onImport = vi.fn(async () => ({ medications: 2, dayRecords: 42, intakes: 12 }))
  render(<ImportAction onImport={onImport} />)

  await userEvent.upload(screen.getByLabelText('Import'), jsonFile('{"format":"moodcraft-export"}'))

  expect(onImport).toHaveBeenCalledWith('{"format":"moodcraft-export"}')
  expect(await screen.findByRole('status')).toHaveTextContent('Added 2 medications, 42 days and 12 doses from the file')
})

test('a single record of each kind is counted in the singular', async () => {
  const onImport = vi.fn(async () => ({ medications: 1, dayRecords: 1, intakes: 1 }))
  render(<ImportAction onImport={onImport} />)

  await userEvent.upload(screen.getByLabelText('Import'), jsonFile('{}'))

  expect(await screen.findByRole('status')).toHaveTextContent('Added 1 medication, 1 day and 1 dose from the file')
})

test('a rejected file reports why and claims nothing was added', async () => {
  const onImport = vi.fn(async () => { throw new Error('This is not a valid JSON file.') })
  render(<ImportAction onImport={onImport} />)

  await userEvent.upload(screen.getByLabelText('Import'), jsonFile('<!doctype html>'))

  expect(await screen.findByRole('alert')).toHaveTextContent('This is not a valid JSON file.')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('says plainly that a file merges into what is already here', () => {
  render(<ImportAction onImport={async () => ({ medications: 0, dayRecords: 0, intakes: 0 })} />)
  expect(screen.getByText(/replaced by the file/i)).toBeInTheDocument()
})

test('the Import button opens the file picker', async () => {
  render(<ImportAction onImport={async () => ({ medications: 0, dayRecords: 0, intakes: 0 })} />)
  const picker = vi.spyOn(screen.getByLabelText('Import'), 'click')

  await userEvent.click(screen.getByRole('button', { name: 'Import' }))

  expect(picker).toHaveBeenCalledOnce()
})
