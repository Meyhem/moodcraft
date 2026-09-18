import { render, screen } from '@testing-library/react'
import { PatternStatementCard } from './PatternStatementCard'

const statement = {
  id: 'spacing-buckets',
  text: 'Doses taken 1–3 days apart were followed by 0.9 less improvement than doses 5 or more days apart.',
  emphasis: ['0.9 less improvement'],
  sampleSize: 22,
  thin: false,
}

test('renders the sentence with its emphasis bolded', () => {
  render(<PatternStatementCard statement={statement} />)
  expect(screen.getByText('0.9 less improvement').tagName).toBe('STRONG')
})

test('always shows the sample size', () => {
  render(<PatternStatementCard statement={statement} />)
  expect(screen.getByText('based on 22 intakes')).toBeInTheDocument()
})

test('thin data is marked, and the statement is still shown in full (R-16)', () => {
  render(<PatternStatementCard statement={{ ...statement, sampleSize: 4, thin: true }} />)
  expect(screen.getByText('based on 4 intakes · thin')).toBeInTheDocument()
  expect(screen.getByText(/Doses taken 1–3 days apart/)).toBeInTheDocument()
})

test('a single-intake sample reads naturally', () => {
  render(<PatternStatementCard statement={{ ...statement, sampleSize: 1, thin: true }} />)
  expect(screen.getByText('based on 1 intake · thin')).toBeInTheDocument()
})
