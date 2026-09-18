import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppDataProvider } from './state/AppDataProvider'

test('renders the app shell with its three destinations', () => {
  render(
    <MemoryRouter initialEntries={['/today']}>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Trends' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
})
