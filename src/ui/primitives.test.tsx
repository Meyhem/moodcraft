import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'

test('Button renders a real button and fires its handler', async () => {
  const onClick = vi.fn()
  render(<Button variant="primary" onClick={onClick}>Export</Button>)
  await userEvent.click(screen.getByRole('button', { name: 'Export' }))
  expect(onClick).toHaveBeenCalledOnce()
})

test('Badge announces thin data in its text, not only by colour', () => {
  render(<Badge thin>based on 4 intakes · thin</Badge>)
  expect(screen.getByText('based on 4 intakes · thin')).toBeInTheDocument()
})

test('Card can render as a section for landmark structure', () => {
  render(<Card as="section" aria-label="Patterns">body</Card>)
  expect(screen.getByRole('region', { name: 'Patterns' })).toBeInTheDocument()
})
