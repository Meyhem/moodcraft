import { Navigate, Route, Routes } from 'react-router-dom'
import { NavShell } from './components/NavShell'
import TodayScreen from './screens/TodayScreen'
import TrendsScreen from './screens/TrendsScreen'
import PatternsScreen from './screens/PatternsScreen'
import LibraryScreen from './screens/LibraryScreen'

export default function App() {
  return (
    <NavShell>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/trends" element={<TrendsScreen />} />
        <Route path="/patterns" element={<PatternsScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </NavShell>
  )
}
