import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import styles from './ResetAction.module.css'

interface Props {
  onReset: () => Promise<void>
}

export function ResetAction({ onReset }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleConfirm() {
    setResetting(true)
    await onReset()
    setResetting(false)
    setConfirming(false)
  }

  return (
    <Card className={styles.row}>
      <div>
        <div className={styles.title}>Reset all data</div>
        <div className={styles.note}>
          {confirming
            ? 'This permanently deletes every day, dose and medication on this device.'
            : 'Permanently deletes everything stored on this device'}
        </div>
      </div>
      {confirming ? (
        <div className={styles.confirmRow}>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={resetting}>Cancel</Button>
          <Button variant="secondary" className={styles.danger} onClick={() => void handleConfirm()} disabled={resetting}>
            {resetting ? 'Deleting…' : 'Yes, delete everything'}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" className={styles.danger} onClick={() => setConfirming(true)}>Reset</Button>
      )}
    </Card>
  )
}
