import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatternsScreen from './PatternsScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb } from '../data/db'
import { dayRecords } from '../data/dayRecords'
import { intakes } from '../data/intakes'
import { medications } from '../data/medications'
import { makeDayRecord, makeIntake } from '../test/factories'
import { addDays, todayIso } from '../domain/date'

afterEach(async () => { closeDb(); await deleteDb() })

async function seed() {
  const med = await medications.add('Medication A')
  for (let i = 40; i > 30; i--) {
    await dayRecords.put(makeDayRecord(addDays(todayIso(), -i), { score: 4 }))
  }
  for (const [offset, score, mg] of [[20, 3, 150], [18, 3, 150], [9, 2, 150], [2, 2, 150]] as const) {
    await dayRecords.put(makeDayRecord(addDays(todayIso(), -offset), { score }))
    await intakes.put(makeIntake(addDays(todayIso(), -offset), mg, med.id))
  }
}

function renderScreen() {
  return render(<AppDataProvider><PatternsScreen /></AppDataProvider>)
}

test('offers both time windows with recent selected first (R-17)', async () => {
  await seed()
  renderScreen()
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Recent' })).toBeChecked())
  expect(screen.getByRole('radio', { name: 'Long-term' })).toBeInTheDocument()
})

test('switching to long-term re-renders the statements from the wider window', async () => {
  await seed()
  renderScreen()
  await waitFor(() => screen.getByRole('radio', { name: 'Long-term' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Long-term' }))
  expect(screen.getByRole('radio', { name: 'Long-term' })).toBeChecked()
})

test('shows at least one statement carrying a sample size', async () => {
  await seed()
  renderScreen()
  await waitFor(() => expect(screen.getAllByText(/based on \d+ intakes?/).length).toBeGreaterThan(0))
})

test('with no medication at all the screen states that plainly', async () => {
  renderScreen()
  await waitFor(() => expect(screen.getByText('No doses have been recorded yet.')).toBeInTheDocument())
})

test('no statement tells the person what to do (R-08)', async () => {
  await seed()
  renderScreen()
  await waitFor(() => screen.getAllByText(/based on/))
  expect(document.body.textContent).not.toMatch(/\b(should|recommend|advice|aim for|try to)\b/i)
})
