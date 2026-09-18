import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders the app shell with its three destinations', () => {
  render(
    <MemoryRouter initialEntries={['/today']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Trends' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
})
