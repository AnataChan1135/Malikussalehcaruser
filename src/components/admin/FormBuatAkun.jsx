import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const PESAN_GAGAL = {
  EMAIL_SUDAH_TERDAFTAR: 'Email ini sudah terdaftar.',
  PASSWORD_TERLALU_PENDEK: 'Password minimal 8 karakter.',
  DATA_TIDAK_LENGKAP: 'Nama, email, dan password wajib diisi.',
  ROLE_TIDAK_VALID: 'Role tidak valid.',
  HANYA_SUPER_ADMIN: 'Hanya Super Admin yang bisa membuat akun.',
  PERLU_MFA: 'Sesi verifikasi dua langkah Anda sudah habis. Login ulang.',
  GAGAL_MEMBUAT_AKUN: 'Gagal membuat akun. Silakan coba lagi.',
  GAGAL_MEMBUAT_PROFIL: 'Akun login dibuat, tetapi profil gagal disimpan. Hubungi pengembang.',
}

function buatPasswordAcak() {
  const simbol = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const acak = new Uint32Array(12)
  crypto.getRandomValues(acak)
  let hasil = ''
  for (let i = 0; i < 12; i++) hasil += simbol[acak[i] % simbol.length]
  return hasil
}

export default function FormBuatAkun({ daftarMobil, onSelesai }) {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(() => buatPasswordAcak())
  const [vehicleId, setVehicleId] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)
  const [hasil, setHasil] = useState(null)

  async function simpan(e) {
    e.preventDefault()
    setMemproses(true)
    setPesan(null)

    const { data, error } = await supabase.functions.invoke('buat-akun', {
      body: {
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'supir',
        vehicleId: vehicleId || null,
      },
    })

    setMemproses(false)

    const kodeGagal = data?.error
    if (error || kodeGagal) {
      setPesan(PESAN_GAGAL[kodeGagal] ?? 'Gagal membuat akun. Silakan coba lagi.')
      return
    }

    setHasil({ email: email.trim(), password })
    setNama('')
    setEmail('')
    setVehicleId('')
    setPassword(buatPasswordAcak())
    onSelesai()
  }

  if (hasil) {
    return (
      <div className="kartu daftar-langkah">
        <h2 className="judul">Akun Berhasil Dibuat</h2>
        <p className="pesan-sukses">
          Catat kredensial ini sekarang dan sampaikan langsung ke supir. Password
          tidak akan ditampilkan lagi setelah Anda menutup kartu ini.
        </p>
        <p className="teks-kecil">
          Email: <strong>{hasil.email}</strong>
        </p>
        <p className="teks-kecil">
          Password: <strong>{hasil.password}</strong>
        </p>
        <button className="tombol" onClick={() => setHasil(null)}>
          Tutup
        </button>
      </div>
    )
  }

  return (
    <form className="kartu daftar-langkah" onSubmit={simpan}>
      <h2 className="judul">Buat Akun Supir Baru</h2>

      <div>
        <label className="label" htmlFor="nama-akun">
          Nama
        </label>
        <input
          id="nama-akun"
          className="input"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="email-akun">
          Email
        </label>
        <input
          id="email-akun"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password-akun">
          Password Awal
        </label>
        <div className="baris">
          <input
            id="password-akun"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="tombol-sekunder admin-tombol-kecil"
            onClick={() => setPassword(buatPasswordAcak())}
          >
            Buat Ulang
          </button>
        </div>
        <p className="teks-kecil">
          Sampaikan ke supir secara langsung, bukan lewat pesan yang tidak aman.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="mobil-akun">
          Tautkan ke Mobil (opsional)
        </label>
        <select
          id="mobil-akun"
          className="input"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          <option value="">Tidak ditautkan dulu</option>
          {daftarMobil.map((m) => (
            <option key={m.id} value={m.id}>
              {m.plat_tampilan} - {m.jenis}
            </option>
          ))}
        </select>
      </div>

      {pesan && <p className="pesan-error">{pesan}</p>}

      <button type="submit" className="tombol" disabled={memproses}>
        {memproses ? 'Membuat Akun...' : 'Buat Akun'}
      </button>
    </form>
  )
}
