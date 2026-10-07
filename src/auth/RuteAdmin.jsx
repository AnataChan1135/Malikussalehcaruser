import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import AdminLayout from '../components/admin/AdminLayout.jsx'
import MfaEnroll from '../components/admin/MfaEnroll.jsx'

export default function RuteAdmin() {
  const { session, profil, statusProfil, siap, aal, segarkanAal, signOut } = useAuth()

  if (!siap) return <Memuat />
  if (!session) return <Navigate to="/admin/login" replace />
  if (statusProfil === 'memuat') return <Memuat />

  if (statusProfil === 'gagal') {
    return (
      <PesanBlokir
        teks="Data akun belum bisa dimuat. Periksa koneksi internet lalu muat ulang."
        onKeluar={signOut}
      />
    )
  }

  if (statusProfil !== 'ada' || !profil) {
    return <PesanBlokir teks="Akun ini belum terdaftar sebagai admin." onKeluar={signOut} />
  }

  if (!profil.is_active) {
    return <PesanBlokir teks="Akun ini sedang dinonaktifkan." onKeluar={signOut} />
  }

  if (profil.role !== 'admin_operasional' && profil.role !== 'super_admin') {
    return (
      <PesanBlokir
        teks="Akun ini tidak memiliki akses ke Dashboard Admin."
        onKeluar={signOut}
      />
    )
  }

  if (aal === undefined) return <Memuat />

  if (aal?.currentLevel !== 'aal2') {
    if (aal?.nextLevel !== 'aal2') {
      // Belum pernah mendaftarkan faktor TOTP sama sekali
      return (
        <div className="halaman-tengah">
          <MfaEnroll onSelesai={segarkanAal} />
        </div>
      )
    }
    // Faktor sudah ada, tapi sesi ini belum terverifikasi (biasanya setelah refresh)
    return <Navigate to="/admin/login" replace />
  }

  return (
    <AdminLayout profil={profil} onKeluar={signOut}>
      <Outlet />
    </AdminLayout>
  )
}

function Memuat() {
  return <div className="layar-tengah teks-kecil">Memuat...</div>
}

function PesanBlokir({ teks, onKeluar }) {
  return (
    <div className="layar-tengah">
      <div className="daftar-langkah">
        <p className="pesan-error">{teks}</p>
        <button className="tombol" onClick={onKeluar}>
          Keluar
        </button>
      </div>
    </div>
  )
}
