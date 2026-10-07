import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth.js'

export default function RuteUser() {
  const { session, profil, statusProfil, siap, signOut, ulangiProfil } = useAuth()
  const [lokasiOk, setLokasiOk] = useState(false)
  const bukaGerbang = useCallback(() => setLokasiOk(true), [])

  if (!siap) return <Memuat />
  if (!session) return <Navigate to="/login" replace />
  if (statusProfil === 'memuat') return <Memuat />

  if (statusProfil === 'gagal') {
    return (
      <PesanBlokir
        teks="Data akun belum bisa dimuat. Periksa koneksi internet lalu coba lagi."
        labelUtama="Coba Lagi"
        onUtama={ulangiProfil}
        onKeluar={signOut}
      />
    )
  }

  if (statusProfil !== 'ada' || !profil) {
    return (
      <PesanBlokir
        teks="Akun Anda belum terdaftar. Hubungi admin."
        onKeluar={signOut}
      />
    )
  }

  if (!profil.is_active) {
    return (
      <PesanBlokir
        teks="Akun Anda sedang dinonaktifkan. Hubungi admin."
        onKeluar={signOut}
      />
    )
  }

  if (profil.role !== 'supir') {
    return (
      <PesanBlokir
        teks="Akun ini tidak memiliki akses ke halaman ini."
        onKeluar={signOut}
      />
    )
  }

  if (!lokasiOk) {
    return <GerbangLokasi onOk={bukaGerbang} onKeluar={signOut} />
  }

  return <Outlet />
}

function Memuat() {
  return <div className="layar-tengah teks-kecil">Memuat...</div>
}

function PesanBlokir({ teks, labelUtama, onUtama, onKeluar }) {
  return (
    <div className="layar-tengah">
      <div className="daftar-langkah">
        <p className="pesan-error">{teks}</p>
        {labelUtama && (
          <button className="tombol" onClick={onUtama}>
            {labelUtama}
          </button>
        )}
        <button className="tombol-sekunder" onClick={onKeluar}>
          Keluar
        </button>
      </div>
    </div>
  )
}

function GerbangLokasi({ onOk, onKeluar }) {
  const [status, setStatus] = useState(() =>
    navigator.permissions ? 'cek' : 'prompt',
  )
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    if (!navigator.permissions) return

    let aktif = true
    let izin = null

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((r) => {
        if (!aktif) return
        izin = r

        if (r.state === 'granted') {
          onOk()
          return
        }

        setStatus(r.state)
        r.onchange = () => {
          if (r.state === 'granted') onOk()
          else setStatus(r.state)
        }
      })
      .catch(() => {
        if (aktif) setStatus('prompt')
      })

    return () => {
      aktif = false
      if (izin) izin.onchange = null
    }
  }, [onOk])

  function izinkan() {
    setPesan(null)
    navigator.geolocation.getCurrentPosition(
      () => onOk(),
      () =>
        setPesan(
          'Akses lokasi ditolak. Aplikasi tidak bisa digunakan tanpa lokasi.',
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="layar-tengah">
      <div className="daftar-langkah">
        <h1 className="judul-besar">Izin Lokasi</h1>
        <p className="teks-kecil">
          Lokasi Anda dicatat hanya saat scan barcode, input meteran awal, isi
          minyak, dan meteran akhir. Data ini digunakan untuk pengawasan kuota
          BBM mobil dinas Universitas Malikussaleh. Lokasi tidak dikirim di luar
          waktu tersebut.
        </p>

        {status === 'denied' ? (
          <p className="pesan-error">
            Lokasi diblokir. Aktifkan izin lokasi untuk situs ini di pengaturan
            browser atau HP, lalu muat ulang halaman.
          </p>
        ) : (
          <button className="tombol" onClick={izinkan}>
            Izinkan Lokasi
          </button>
        )}

        {pesan && <p className="pesan-error">{pesan}</p>}

        <button className="tombol-sekunder" onClick={onKeluar}>
          Keluar
        </button>
      </div>
    </div>
  )
}