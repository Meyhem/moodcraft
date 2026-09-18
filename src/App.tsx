import { NavLink, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <div>
      <nav>
        <NavLink to="/today">Today</NavLink>
        <NavLink to="/trends">Trends</NavLink>
        <NavLink to="/library">Library</NavLink>
      </nav>
      <Routes>
        <Route path="/today" element={<main />} />
        <Route path="/trends" element={<main />} />
        <Route path="/library" element={<main />} />
      </Routes>
    </div>
  )
}
