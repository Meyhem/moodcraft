import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportAction } from './ExportAction'

test('exporting hands over a file and never touches the network', async () => {
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  const fetchSpy = vi.spyOn(globalThis, 'fetch' as never)

  const onExport = vi.fn(async () => ({ json: '{}', filename: 'moodcraft-2026-09-18.json' }))
  render(<ExportAction onExport={onExport} />)
  await userEvent.click(screen.getByRole('button', { name: 'Export' }))

  expect(onExport).toHaveBeenCalledOnce()
  expect(createObjectURL).toHaveBeenCalledOnce()
  expect(fetchSpy).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('says plainly where the data goes', () => {
  render(<ExportAction onExport={async () => ({ json: '{}', filename: 'x.json' })} />)
  expect(screen.getByText('Saves a JSON file to your device')).toBeInTheDocument()
})
