import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dayRecords as dayRecordsRepo } from '../data/dayRecords'
import { intakes as intakesRepo } from '../data/intakes'
import { medications as medicationsRepo } from '../data/medications'
import { exportFilename, restoreExport, serializeExport } from '../data/exportImport'
import type { ImportSummary } from '../data/exportImport'
import { todayIso } from '../domain/date'
import type { DayRecord, Intake, IsoDate, Medication } from '../domain/types'

interface AppData {
  loading: boolean
  dayRecords: DayRecord[]
  intakes: Intake[]
  medications: Medication[]
  analysisMedicationId: string | null
  saveDayRecord: (record: DayRecord) => Promise<void>
  deleteDayRecord: (date: IsoDate) => Promise<void>
  saveIntake: (intake: Intake) => Promise<void>
  deleteIntake: (date: IsoDate) => Promise<void>
  addMedication: (name: string) => Promise<Medication>
  setAnalysisTarget: (id: string) => Promise<void>
  exportData: () => Promise<{ json: string; filename: string }>
  importData: (json: string) => Promise<ImportSummary>
}

const Context = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [analysisMedicationId, setAnalysisMedicationId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const targetId = await medicationsRepo.analysisTargetId()
    const [records, allMeds] = await Promise.all([dayRecordsRepo.all(), medicationsRepo.all()])
    setDayRecords(records)
    setMedications(allMeds)
    setAnalysisMedicationId(targetId)
    setIntakes(targetId ? await intakesRepo.forMedication(targetId) : [])
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  const value = useMemo<AppData>(() => ({
    loading,
    dayRecords,
    intakes,
    medications,
    analysisMedicationId,
    async saveDayRecord(record) { await dayRecordsRepo.put(record); await reload() },
    async deleteDayRecord(date) { await dayRecordsRepo.remove(date); await reload() },
    async saveIntake(intake) { await intakesRepo.put(intake); await reload() },
    async deleteIntake(date) {
      if (analysisMedicationId) await intakesRepo.remove(analysisMedicationId, date)
      await reload()
    },
    async addMedication(name) { const m = await medicationsRepo.add(name); await reload(); return m },
    async setAnalysisTarget(id) { await medicationsRepo.setAnalysisTarget(id); await reload() },
    async exportData() {
      return { json: await serializeExport(), filename: exportFilename(todayIso()) }
    },
    async importData(json) {
      const summary = await restoreExport(json)
      await reload()
      return summary
    },
  }), [loading, dayRecords, intakes, medications, analysisMedicationId, reload])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAppData(): AppData {
  const value = useContext(Context)
  if (value === null) throw new Error('useAppData must be used inside AppDataProvider')
  return value
}
