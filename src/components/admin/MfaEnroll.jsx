import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

// Dipakai saat akun admin login tetapi belum punya faktor TOTP terverifikasi.
// Setelah berhasil, onSelesai dipanggil agar RuteAdmin menilai ulang status aal.
export default function MfaEnroll({ onSelesai }) {
  const [tahap, setTahap] = useState('mulai') // 'mulai' | 'daftar'
  const [qr, setQr] = useState(null)
  const [secret, setSecret] = useState(null)
  const [factorId, setFactorId] = useState(null)
  const [kode, setKode] = useState('')
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function mulaiDaftar() {
    setMemuat(true)
    setPesan(null)

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setMemuat(false)

    if (error) {
      setPesan('Pendaftaran verifikasi dua langkah gagal dimulai. Coba lagi.')
      return
    }

    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setTahap('daftar')
  }

  async function verifikasi(e) {
    e.preventDefault()
    setMemuat(true)
    setPesan(null)

    const { data: tantangan, error: errTantangan } = await supabase.auth.mfa.challenge({
      factorId,
    })
    if (errTantangan) {
      setMemuat(false)
      setPesan('Verifikasi gagal dimulai. Coba lagi.')
      return
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: tantangan.id,
      code: kode.trim(),
    })
    setMemuat(false)

    if (error) {
      setPesan('Kode tidak valid. Pastikan jam di perangkat Anda akurat, lalu coba lagi.')
      setKode('')
      return
    }

    onSelesai?.()
  }

  async function batalkanPendaftaran() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId })
    }
    setTahap('mulai')
    setQr(null)
    setSecret(null)
    setFactorId(null)
    setKode('')
    setPesan(null)
  }

  if (tahap === 'mulai') {
    return (
      <div className="daftar-langkah">
        <h1 className="judul-besar">Verifikasi Dua Langkah Wajib</h1>
        <p className="teks-kecil">
          Akun admin wajib mengaktifkan verifikasi dua langkah (TOTP) sebelum bisa
          membuka Dashboard Admin. Siapkan aplikasi autentikator seperti Google
          Authenticator atau Authy di HP Anda.
        </p>
        {pesan && <p className="pesan-error">{pesan}</p>}
        <button className="tombol" onClick={mulaiDaftar} disabled={memuat}>
          {memuat ? 'Menyiapkan...' : 'Mulai Pendaftaran'}
        </button>
      </div>
    )
  }

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Pindai Kode QR</h1>
      <p className="teks-kecil">
        Pindai kode berikut dengan aplikasi autentikator, lalu masukkan kode 6 digit
        yang muncul di aplikasi tersebut.
      </p>

      {qr && (
        <div className="kotak-barcode">
          <img src={qr} alt="Kode QR verifikasi dua langkah" width={200} height={200} />
        </div>
      )}

      {secret && (
        <p className="teks-kecil">
          Tidak bisa memindai? Masukkan kunci ini secara manual: <strong>{secret}</strong>
        </p>
      )}

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
          {memuat ? 'Memverifikasi...' : 'Verifikasi dan Aktifkan'}
        </button>
        <button
          type="button"
          className="tombol-sekunder"
          onClick={batalkanPendaftaran}
          disabled={memuat}
        >
          Batal
        </button>
      </form>
    </div>
  )
}
