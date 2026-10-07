import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'

export default function AdminLogin() {
  const { session, siap, aal, segarkanAal } = useAuth()
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kode, setKode] = useState('')
  const [tantangan, setTantangan] = useState(null) // { factorId, challengeId }
  const [menyiapkanTantangan, setMenyiapkanTantangan] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState(null)

  const perluTantangan =
    Boolean(session) && aal && aal.currentLevel !== 'aal2' && aal.nextLevel === 'aal2'

  // Begitu diketahui sesi butuh verifikasi TOTP, siapkan tantangannya otomatis
  // tanpa meminta user memasukkan email/password lagi.
  useEffect(() => {
    if (!perluTantangan || tantangan || menyiapkanTantangan) return
    let aktif = true
    setMenyiapkanTantangan(true)
    setPesan(null)

    supabase.auth.mfa.listFactors().then(async ({ data, error }) => {
      if (!aktif) return
      const totp = data?.totp?.find((f) => f.status === 'verified')

      if (error || !totp) {
        setMenyiapkanTantangan(false)
        setPesan('Verifikasi dua langkah tidak bisa dimulai. Keluar lalu masuk ulang.')
        return
      }

      const { data: c, error: errC } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      })
      if (!aktif) return
      setMenyiapkanTantangan(false)

      if (errC) {
        setPesan('Verifikasi dua langkah gagal dimulai. Coba lagi.')
        return
      }

      setTantangan({ factorId: totp.id, challengeId: c.id })
    })

    return () => {
      aktif = false
    }
  }, [perluTantangan, tantangan, menyiapkanTantangan])

  // --- Dari sini ke bawah tidak ada hook lagi ---

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

  async function verifikasi(e) {
    e.preventDefault()
    if (!tantangan) return
    setMemuat(true)
    setPesan(null)

    const { error } = await supabase.auth.mfa.verify({
      factorId: tantangan.factorId,
      challengeId: tantangan.challengeId,
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
    // Pada titik ini sudah pasti perluTantangan true
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
            <button
              type="submit"
              className="tombol"
              disabled={memuat || !tantangan || kode.length < 6}
            >
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
