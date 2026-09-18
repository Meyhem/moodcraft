import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TodayScreen from './TodayScreen'
import PatternsScreen from './PatternsScreen'
import LibraryScreen from './LibraryScreen'
import { AppDataProvider } from '../state/AppDataProvider'
import { closeDb, deleteDb } from '../data/db'

afterEach(async () => { closeDb(); await deleteDb() })

function renderScreen(ui: React.ReactElement) {
  return render(<MemoryRouter><AppDataProvider>{ui}</AppDataProvider></MemoryRouter>)
}

test('an empty device shows a usable Today form, not an error', async () => {
  renderScreen(<TodayScreen />)
  await waitFor(() => expect(screen.getByText('Tiredness')).toBeInTheDocument())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('an empty device shows plain statements on Patterns', async () => {
  renderScreen(<PatternsScreen />)
  await waitFor(() => expect(screen.getByText('No doses have been recorded yet.')).toBeInTheDocument())
})

test('an empty library invites adding, without nagging', async () => {
  renderScreen(<LibraryScreen />)
  await waitFor(() => expect(screen.getByText('No medications yet')).toBeInTheDocument())
  expect(document.body.textContent).not.toMatch(/don't forget|remember to|streak|missed/i)
})
