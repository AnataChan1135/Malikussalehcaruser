import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { mingguIniWIB } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'

export default function Ringkasan() {
  const { profil } = useAuth()
  const [minggu] = useState(() => mingguIniWIB())

  const [memuat, setMemuat] = useState(true)
  const [sesiAktif, setSesiAktif] = useState(0)
  const [menunggu, setMenunggu] = useState(0)
  const [kuotaMenunggu, setKuotaMenunggu] = useState(0)
  const [pesan, setPesan] = useState(null)
  const [memproses, setMemproses] = useState(false)

  async function muat() {
    setMemuat(true)
    const [{ count: sa }, { count: rm }, { count: km }] = await Promise.all([
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'aktif'),
      supabase
        .from('review_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'menunggu'),
      supabase
        .from('quota_weeks')
        .select('vehicle_id', { count: 'exact', head: true })
        .eq('week_start', minggu)
        .eq('status_kuota', 'menunggu'),
    ])
    setSesiAktif(sa ?? 0)
    setMenunggu(rm ?? 0)
    setKuotaMenunggu(km ?? 0)
    setMemuat(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function terimaSemua() {
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('setujui_semua_kuota', { p_week: minggu })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    await muat()
  }

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Ringkasan</h1>
      <p className="teks-kecil">Selamat datang, {profil?.nama}.</p>

      {memuat ? (
        <p className="teks-kecil">Memuat...</p>
      ) : (
        <div className="grid-kartu">
          <Link to="/admin/sesi" className="kartu daftar-langkah">
            <p className="teks-kecil">Sesi Aktif</p>
            <p className="angka-besar">{sesiAktif}</p>
          </Link>
          <Link to="/admin/alasan" className="kartu daftar-langkah">
            <p className="teks-kecil">Menunggu Pemeriksaan</p>
            <p className="angka-besar">{menunggu}</p>
          </Link>
          <Link to="/admin/kuota" className="kartu daftar-langkah">
            <p className="teks-kecil">Kuota Menunggu Persetujuan</p>
            <p className="angka-besar">{kuotaMenunggu}</p>
          </Link>
        </div>
      )}

      {kuotaMenunggu > 0 && (
        <div className="kartu daftar-langkah">
          <p className="judul">Kuota Minggu Ini Menunggu Persetujuan</p>
          <p className="teks-kecil">
            {kuotaMenunggu} mobil memiliki usulan kuota minggu ini yang belum
            disetujui. Supir tetap melihat aplikasi, tetapi kuota tampil 0 dengan
            tanda "Menunggu Persetujuan" sampai disetujui.
          </p>
          {pesan && <p className="pesan-error">{pesan}</p>}
          <button className="tombol" onClick={terimaSemua} disabled={memproses}>
            {memproses ? 'Memproses...' : 'Terima Semua'}
          </button>
          <Link className="tombol-sekunder" to="/admin/kuota">
            Tinjau Satu per Satu
          </Link>
        </div>
      )}

      {!memuat && sesiAktif === 0 && menunggu === 0 && kuotaMenunggu === 0 && (
        <p className="pesan-sukses">Tidak ada yang perlu ditindaklanjuti saat ini.</p>
      )}
    </div>
  )
}
