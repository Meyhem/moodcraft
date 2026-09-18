import { useMemo } from 'react'
import { runAnalysis, type AnalysisResult, type WindowKey } from '../analysis'
import { todayIso } from '../domain/date'
import { useAppData } from './AppDataProvider'

export function useAnalysis(window: WindowKey): AnalysisResult {
  const { dayRecords, intakes, analysisMedicationId } = useAppData()
  return useMemo(
    () => runAnalysis(
      { medicationId: analysisMedicationId, dayRecords, intakes, today: todayIso() },
      window,
    ),
    [dayRecords, intakes, analysisMedicationId, window],
  )
}
