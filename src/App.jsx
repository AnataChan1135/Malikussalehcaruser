import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import RuteUser from './auth/RuteUser.jsx'
import Beranda from './pages/user/Beranda.jsx'
import Scan from './pages/user/Scan.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RuteUser />}>
        <Route path="/" element={<Beranda />} />
        <Route path="/scan" element={<Scan />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}