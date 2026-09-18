import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import type { Statement } from '../analysis'
import styles from './PatternStatementCard.module.css'

function withEmphasis(text: string, emphasis: string[]) {
  if (emphasis.length === 0) return text
  const pattern = new RegExp(`(${emphasis.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`)
  return text.split(pattern).map((part, index) =>
    emphasis.includes(part) ? <strong key={index}>{part}</strong> : part,
  )
}

export function PatternStatementCard({ statement }: { statement: Statement }) {
  const noun = statement.sampleSize === 1 ? 'intake' : 'intakes'
  return (
    <Card>
      <p className={styles.statement}>{withEmphasis(statement.text, statement.emphasis)}</p>
      <Badge thin={statement.thin}>
        {`based on ${statement.sampleSize} ${noun}${statement.thin ? ' · thin' : ''}`}
      </Badge>
    </Card>
  )
}
