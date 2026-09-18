import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedScore } from './SegmentedScore'
import type { Score } from '../domain/types'

function Harness({ initial = null as Score | null }) {
  const [value, setValue] = useState<Score | null>(initial)
  return <SegmentedScore label="Tiredness" value={value} onChange={setValue} />
}

test('renders a labelled radio group of five scores', () => {
  render(<Harness />)
  const group = screen.getByRole('radiogroup', { name: 'Tiredness' })
  expect(group).toBeInTheDocument()
  expect(screen.getAllByRole('radio')).toHaveLength(5)
})

test('the worst option says so, so the direction of the scale never has to be guessed', () => {
  render(<Harness />)
  expect(screen.getByRole('radio', { name: '5, worst' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '1, best' })).toBeInTheDocument()
})

test('choosing a score reports it and marks it selected', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '3' }))
  expect(screen.getByRole('radio', { name: '3' })).toBeChecked()
})

test('arrow keys move between scores', async () => {
  render(<Harness initial={3} />)
  await userEvent.click(screen.getByRole('radio', { name: '3' }))
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: '4' })).toBeChecked()
})

test('nothing is selected until the person picks — no default score (R-03 is a completeness rule, not a prefill)', () => {
  render(<Harness />)
  expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument()
})
