import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Projects from './pages/Projects'
import Softwares from './pages/Softwares'

// URLと画面の対応（テストの妨げになるため、現在はログインなしで全画面を表示する）
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/softwares" element={<Softwares />} />
        {/* 存在しないURLはダッシュボードへ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
