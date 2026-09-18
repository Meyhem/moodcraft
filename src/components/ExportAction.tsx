import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import styles from './ExportAction.module.css'

interface Props {
  onExport: () => Promise<{ json: string; filename: string }>
}

export function ExportAction({ onExport }: Props) {
  async function handleExport() {
    const { json, filename } = await onExport()
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={styles.row}>
      <div>
        <div className={styles.title}>Export data</div>
        <div className={styles.note}>Saves a JSON file to your device</div>
      </div>
      <Button variant="secondary" onClick={handleExport}>Export</Button>
    </Card>
  )
}
