import { useMemo } from 'react'
import { ExportAction } from '../components/ExportAction'
import { MedicationLibraryList } from '../components/MedicationLibraryList'
import { Card } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { formatShort } from '../domain/date'
import { useAppData } from '../state/AppDataProvider'
import { useAnalysis } from '../state/useAnalysis'
import styles from './LibraryScreen.module.css'

export default function LibraryScreen() {
  const data = useAppData()
  const analysis = useAnalysis('long-term')

  const intakeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const intake of data.intakes) counts[intake.medicationId] = (counts[intake.medicationId] ?? 0) + 1
    return counts
  }, [data.intakes])

  const firstIntakeDates = useMemo(() => {
    const first: Record<string, string | undefined> = {}
    for (const intake of data.intakes) {
      const current = first[intake.medicationId]
      if (current === undefined || intake.date < current) first[intake.medicationId] = intake.date
    }
    return first
  }, [data.intakes])

  if (data.loading) return <p>Loading…</p>

  const selected = data.medications.find((m) => m.id === data.analysisMedicationId)

  return (
    <div className={styles.screen}>
      <div className={styles.listColumn}>
        <h1 className={styles.heading}>Library</h1>
        <MedicationLibraryList
          medications={data.medications}
          intakeCounts={intakeCounts}
          firstIntakeDates={firstIntakeDates}
          analysisMedicationId={data.analysisMedicationId}
          onAnalyze={(id) => void data.setAnalysisTarget(id)}
          onAdd={(name) => void data.addMedication(name)}
        />
        <ExportAction onExport={data.exportData} />
      </div>

      <aside className={styles.detail} aria-label="Selected medication">
        <SectionTitle>Under analysis</SectionTitle>
        <Card>
          <p className={styles.detailName}>{selected?.name ?? 'Nothing selected yet'}</p>
          <p className={styles.detailMeta}>
            {analysis.baseline
              ? `${analysis.outcomes.length} intakes · baseline measured over ${analysis.baseline.dayCount} days up to ${formatShort(analysis.baseline.to)}`
              : `${analysis.outcomes.length} intakes · no days were recorded before the first dose, so only the spacing between doses can be analysed`}
          </p>
        </Card>
      </aside>
    </div>
  )
}
