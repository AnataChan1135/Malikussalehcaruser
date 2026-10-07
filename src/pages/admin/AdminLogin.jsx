import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'

export default function AdminLogin() {
  const { session, siap, aal, segarkanAal } = useAuth()
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kode, setKode] = useState('')
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState(null)

  if (!siap) return <div className="layar-tengah teks-kecil">Memuat...</div>

  if (session) {
    if (aal === undefined) return <div className="layar-tengah teks-kecil">Memuat...</div>
    if (aal?.currentLevel === 'aal2') return <Navigate to="/admin" replace />
    if (aal?.nextLevel !== 'aal2') return <Navigate to="/admin" replace />
  }

  async function masuk(e) {
    e.preventDefault()
    setMemuat(true)
    setPesan(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setMemuat(false)
    if (error) setPesan('Email atau password salah.')
  }

  // Tantangan (challenge) dibuat di sini, tepat saat tombol ditekan, bukan
  // disiapkan lebih dulu lewat useEffect. Ini membuat kode TOTP selalu
  // dicocokkan dengan tantangan yang baru, dan menghindari race condition.
  async function verifikasi(e) {
    e.preventDefault()
    setMemuat(true)
    setPesan(null)

    const { data: factors, error: errFactors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.find((f) => f.status === 'verified')

    if (errFactors || !totp) {
      setMemuat(false)
      setPesan('Verifikasi dua langkah tidak bisa dimulai. Keluar lalu masuk ulang.')
      return
    }

    const { data: tantangan, error: errTantangan } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    })
    if (errTantangan) {
      setMemuat(false)
      setPesan('Verifikasi dua langkah gagal dimulai. Coba lagi.')
      return
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: tantangan.id,
      code: kode.trim(),
    })
    setMemuat(false)

    if (error) {
      setPesan('Kode tidak valid. Silakan coba lagi.')
      setKode('')
      return
    }

    await segarkanAal()
    nav('/admin', { replace: true })
  }

  if (session) {
    // Pada titik ini sudah pasti: sesi ada, faktor TOTP ada, tapi belum aal2
    return (
      <div className="halaman-tengah">
        <div className="daftar-langkah">
          <h1 className="judul-besar">Verifikasi Dua Langkah</h1>
          <p className="teks-kecil">
            Masukkan kode 6 digit dari aplikasi autentikator Anda.
          </p>

          <form className="daftar-langkah" onSubmit={verifikasi}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="input"
              placeholder="123456"
              value={kode}
              onChange={(e) => setKode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
            {pesan && <p className="pesan-error">{pesan}</p>}
            <button type="submit" className="tombol" disabled={memuat || kode.length < 6}>
              {memuat ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="halaman-tengah">
      <div className="daftar-langkah">
        <h1 className="judul-besar">Dashboard Admin</h1>
        <p className="teks-kecil">Kuota BBM Mobil Dinas - Universitas Malikussaleh</p>

        <form className="daftar-langkah" onSubmit={masuk}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {pesan && <p className="pesan-error">{pesan}</p>}

          <button type="submit" className="tombol" disabled={memuat}>
            {memuat ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
