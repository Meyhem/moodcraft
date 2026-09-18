import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryScreen from './LibraryScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb, SCHEMA_VERSION } from '../data/db'
import { intakes } from '../data/intakes'
import { medications } from '../data/medications'
import { makeDayRecord, makeIntake, makeMedication } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen() {
  return render(<AppDataProvider><LibraryScreen /></AppDataProvider>)
}

test('lists every medication with how many intakes it has', async () => {
  const a = await medications.add('Medication A')
  await medications.add('Caffeine')
  await intakes.put(makeIntake('2026-06-02', 150, a.id))
  await intakes.put(makeIntake('2026-06-06', 150, a.id))

  renderScreen()
  await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument())
  const list = within(screen.getByRole('list'))
  expect(list.getByText('Medication A')).toBeInTheDocument()
  expect(list.getByText('2 intakes · since Jun 2')).toBeInTheDocument()
  expect(list.getByText('Caffeine')).toBeInTheDocument()
})

test('exactly one medication is under analysis and the others can take over (R-11)', async () => {
  await medications.add('Medication A')
  await medications.add('Caffeine')
  renderScreen()
  await waitFor(() => expect(screen.getAllByText('under analysis')).toHaveLength(1))
  await userEvent.click(screen.getAllByRole('button', { name: 'Analyze this' })[0]!)
  await waitFor(() => expect(screen.getAllByText('under analysis')).toHaveLength(1))
  expect(await medications.all()).toHaveLength(2) // switching discarded nothing
})

test('a medication can be added', async () => {
  renderScreen()
  await waitFor(() => screen.getByRole('button', { name: '+ Add medication' }))
  await userEvent.click(screen.getByRole('button', { name: '+ Add medication' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Medication name' }), 'Melatonin')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(async () => expect(await medications.all()).toHaveLength(1))
})

test('export is offered here, described as a file on the device (R-19)', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument())
  expect(screen.getByText('Saves a JSON file to your device')).toBeInTheDocument()
})

test('a medication with no measured baseline says only spacing can be analysed (R-10)', async () => {
  const med = await medications.add('Medication A')
  await intakes.put(makeIntake('2026-06-02', 150, med.id))
  renderScreen()
  await waitFor(() =>
    expect(screen.getByText(/only the spacing between doses/)).toBeInTheDocument(),
  )
})

test('importing a file writes it to the device and the screen catches up (R-19)', async () => {
  const exported = JSON.stringify({
    format: 'moodcraft-export',
    schemaVersion: SCHEMA_VERSION,
    medications: [makeMedication('Medication A', 'm1')],
    dayRecords: [makeDayRecord('2026-06-02')],
    intakes: [makeIntake('2026-06-02', 150, 'm1')],
    analysisMedicationId: 'm1',
  })

  renderScreen()
  await waitFor(() => expect(screen.getByLabelText('Import')).toBeInTheDocument())
  await userEvent.upload(
    screen.getByLabelText('Import'),
    new File([exported], 'moodcraft-2026-09-18.json', { type: 'application/json' }),
  )

  expect(await screen.findByText('Added 1 medication, 1 day and 1 dose from the file.')).toBeInTheDocument()
  expect(await medications.all()).toHaveLength(1)
  await waitFor(() => expect(within(screen.getByRole('list')).getByText('Medication A')).toBeInTheDocument())
})

test('a file that is not an export is refused and nothing is written', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByLabelText('Import')).toBeInTheDocument())
  await userEvent.upload(
    screen.getByLabelText('Import'),
    new File(['<!doctype html>'], 'page.html', { type: 'application/json' }),
  )

  expect(await screen.findByRole('alert')).toHaveTextContent('This is not a valid JSON file.')
  expect(await medications.all()).toHaveLength(0)
})
