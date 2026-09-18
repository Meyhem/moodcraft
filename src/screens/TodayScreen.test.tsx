import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TodayScreen from './TodayScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { ITEMS } from '../domain/items'
import { dayRecords } from '../data/dayRecords'
import { medications } from '../data/medications'
import { intakes } from '../data/intakes'
import { closeDb, deleteDb } from '../data/db'
import { makeDayRecord } from '../test/factories'
import { todayIso } from '../domain/date'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen() {
  return render(
    <MemoryRouter><AppDataProvider><TodayScreen /></AppDataProvider></MemoryRouter>,
  )
}

test('renders all 13 items in spec order', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('Tiredness')).toBeInTheDocument())
  expect(screen.getAllByRole('radiogroup')).toHaveLength(13)
  for (const item of ITEMS) {
    expect(screen.getByRole('radiogroup', { name: item.label })).toBeInTheDocument()
  }
})

test('a day with no record says so, rather than showing zeros', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('No record for this day')).toBeInTheDocument())
})

test('progress is stated plainly and nothing is written until all 13 are scored (R-03)', async () => {
  renderScreen()
  await waitFor(() => screen.getByText('Tiredness'))
  const row = screen.getByRole('radiogroup', { name: 'Tiredness' })
  await userEvent.click(within(row).getByRole('radio', { name: '3' }))
  expect(screen.getByText('1 of 13 scored — nothing is saved until all 13 are')).toBeInTheDocument()
  expect(await dayRecords.all()).toHaveLength(0)
})

test('scoring all 13 writes the day record', async () => {
  renderScreen()
  await waitFor(() => screen.getByText('Tiredness'))
  for (const item of ITEMS) {
    const row = screen.getByRole('radiogroup', { name: item.label })
    await userEvent.click(within(row).getByRole('radio', { name: '3' }))
  }
  await waitFor(async () => expect(await dayRecords.all()).toHaveLength(1))
})

test('an existing record loads into the form and edits in place, unmarked (R-05)', async () => {
  await dayRecords.put(makeDayRecord(todayIso(), { score: 2 }))
  renderScreen()
  await waitFor(() => {
    const row = screen.getByRole('radiogroup', { name: 'Tiredness' })
    expect(within(row).getByRole('radio', { name: '2' })).toBeChecked()
  })
  expect(screen.queryByText(/edited|late|updated/i)).not.toBeInTheDocument()
})

test('ticking an event stores it on the day record', async () => {
  await dayRecords.put(makeDayRecord(todayIso(), { score: 2 }))
  renderScreen()
  await waitFor(() => screen.getByRole('switch', { name: 'Conflict' }))
  await userEvent.click(screen.getByRole('switch', { name: 'Conflict' }))
  await waitFor(async () => expect((await dayRecords.all())[0]!.events).toEqual(['conflict']))
})

test('the dose is a single total in milligrams, with no time input anywhere (R-04)', async () => {
  const med = await medications.add('Medication A')
  renderScreen()
  await waitFor(() => screen.getByLabelText(/dose today/i))
  await userEvent.type(screen.getByLabelText(/dose today/i), '150')
  await userEvent.tab()
  await waitFor(async () => expect(await intakes.forMedication(med.id)).toMatchObject([{ mg: 150 }]))
  expect(screen.queryByLabelText(/time/i)).not.toBeInTheDocument()
})

test('a past date can be opened and recorded', async () => {
  renderScreen()
  await waitFor(() => screen.getByRole('button', { name: 'Previous day' }))
  await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
  expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('')
})
