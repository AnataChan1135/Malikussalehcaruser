import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import RuteUser from './auth/RuteUser.jsx'
import Beranda from './pages/user/Beranda.jsx'
import Scan from './pages/user/Scan.jsx'
import MeteranAwal from './pages/user/MeteranAwal.jsx'
import IsiMinyakUser from './pages/user/IsiMinyak.jsx'
import MeteranAkhir from './pages/user/MeteranAkhir.jsx'
import Review from './pages/user/Review.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import RuteAdmin from './auth/RuteAdmin.jsx'
import Ringkasan from './pages/admin/Ringkasan.jsx'
import Mobil from './pages/admin/Mobil.jsx'
import Pengguna from './pages/admin/Pengguna.jsx'
import SesiMeteran from './pages/admin/SesiMeteran.jsx'
import IsiMinyakAdmin from './pages/admin/IsiMinyak.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RuteUser />}>
        <Route path="/" element={<Beranda />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/meteran-awal" element={<MeteranAwal />} />
        <Route path="/isi-minyak" element={<IsiMinyakUser />} />
        <Route path="/meteran-akhir" element={<MeteranAkhir />} />
        <Route path="/review/:sesiId" element={<Review />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RuteAdmin />}>
        <Route index element={<Ringkasan />} />
        <Route path="mobil" element={<Mobil />} />
        <Route path="pengguna" element={<Pengguna />} />
        <Route path="sesi" element={<SesiMeteran />} />
        <Route path="isi-minyak" element={<IsiMinyakAdmin />} />
        {/* Halaman admin lain ditambahkan pada tahap berikutnya:
            alasan, kuota, peta, audit, ekspor, pengaturan */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
