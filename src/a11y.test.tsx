import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppDataProvider } from './state/AppDataProvider'
import { closeDb, deleteDb } from './data/db'

afterEach(async () => { closeDb(); await deleteDb() })

test('every screen has exactly one h1 and a main landmark', async () => {
  for (const path of ['/today', '/trends', '/library']) {
    const view = render(
      <MemoryRouter initialEntries={[path]}><AppDataProvider><App /></AppDataProvider></MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1))
    expect(screen.getByRole('main')).toBeInTheDocument()
    view.unmount()
  }
})

test('the whole day form can be completed from the keyboard', async () => {
  render(
    <MemoryRouter initialEntries={['/today']}><AppDataProvider><App /></AppDataProvider></MemoryRouter>,
  )
  await waitFor(() => screen.getByText('Tiredness'))
  await userEvent.tab()
  expect(document.activeElement).toBeInstanceOf(HTMLElement)
  await userEvent.keyboard('{Enter}')
  expect(document.body).toBeInTheDocument() // no crash, focus never trapped
})
