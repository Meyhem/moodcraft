import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavShell } from './NavShell'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavShell><p>content</p></NavShell>
    </MemoryRouter>,
  )
}

test('exactly four destinations, in order', () => {
  renderAt('/today')
  const links = screen.getAllByRole('link')
  expect(links.map((l) => l.textContent)).toEqual(['Today', 'Trends', 'Patterns', 'Library'])
})

test('the current destination is marked for assistive tech, not only by colour', () => {
  renderAt('/trends')
  expect(screen.getByRole('link', { name: 'Trends' })).toHaveAttribute('aria-current', 'page')
})

test('carries no badge, count or notification dot (R-20)', () => {
  renderAt('/today')
  expect(screen.getByRole('navigation').textContent).toBe('TodayTrendsPatternsLibrary')
})
