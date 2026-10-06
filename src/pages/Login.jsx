import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../auth/useAuth.js'

export default function Login() {
  const { session, siap } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState(null)

  if (siap && session) return <Navigate to="/" replace />

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

  return (
    <div className="halaman-tengah">
      <div className="daftar-langkah">
        <h1 className="judul-besar">Kuota BBM Mobil Dinas</h1>
        <p className="teks-kecil">Universitas Malikussaleh</p>

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
