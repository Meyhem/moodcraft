import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDataProvider, useAppData } from './AppDataProvider'
import { closeDb, deleteDb } from '../data/db'
import { makeDayRecord } from '../test/factories'

afterEach(async () => { closeDb(); await deleteDb() })

function Probe() {
  const data = useAppData()
  if (data.loading) return <p>loading</p>
  return (
    <div>
      <p>records: {data.dayRecords.length}</p>
      <p>target: {data.analysisMedicationId ?? 'none'}</p>
      <button onClick={() => void data.saveDayRecord(makeDayRecord('2026-09-15'))}>save</button>
      <button onClick={() => void data.addMedication('Medication A')}>add med</button>
    </div>
  )
}

test('loads from the device and exposes what was found', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => expect(screen.getByText('records: 0')).toBeInTheDocument())
})

test('a saved day record is visible immediately and persisted', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => screen.getByText('records: 0'))
  await userEvent.click(screen.getByRole('button', { name: 'save' }))
  await waitFor(() => expect(screen.getByText('records: 1')).toBeInTheDocument())
})

test('the first medication added becomes the analysis target', async () => {
  render(<AppDataProvider><Probe /></AppDataProvider>)
  await waitFor(() => screen.getByText('target: none'))
  await userEvent.click(screen.getByRole('button', { name: 'add med' }))
  await waitFor(() => expect(screen.queryByText('target: none')).not.toBeInTheDocument())
})
