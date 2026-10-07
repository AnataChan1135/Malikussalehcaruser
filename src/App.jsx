import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import RuteUser from './auth/RuteUser.jsx'
import Beranda from './pages/user/Beranda.jsx'
import Scan from './pages/user/Scan.jsx'
import MeteranAwal from './pages/user/MeteranAwal.jsx'
import IsiMinyak from './pages/user/IsiMinyak.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RuteUser />}>
        <Route path="/" element={<Beranda />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/meteran-awal" element={<MeteranAwal />} />
        <Route path="/isi-minyak" element={<IsiMinyak />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
