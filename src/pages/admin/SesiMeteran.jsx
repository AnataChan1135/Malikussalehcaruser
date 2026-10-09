import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { formatTanggal } from '../../lib/waktu.js'
import DetailSesi from '../../components/admin/DetailSesi.jsx'

export default function SesiMeteran() {
  const { profil } = useAuth()
  const superAdmin = profil?.role === 'super_admin'

  const [memuat, setMemuat] = useState(true)
  const [daftar, setDaftar] = useState([])
  const [filterStatus, setFilterStatus] = useState('semua')
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState(null)

  async function muat() {
    setMemuat(true)
    let q = supabase
      .from('sessions')
      .select('id, status, started_at, ended_at, dari_offline, vehicles(plat_tampilan, jenis), profiles(nama)')
      .order('started_at', { ascending: false })
      .limit(50)
    if (filterStatus !== 'semua') q = q.eq('status', filterStatus)
    const { data } = await q
    setDaftar(data ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const difilter = daftar.filter((s) => {
    const teks = `${s.vehicles?.plat_tampilan ?? ''} ${s.profiles?.nama ?? ''}`.toLowerCase()
    return teks.includes(cari.toLowerCase())
  })

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Sesi & Meteran</h1>
      <p className="teks-kecil">Menampilkan 50 sesi terbaru.</p>

      <div className="baris">
        {[
          ['semua', 'Semua'],
          ['aktif', 'Berjalan'],
          ['selesai', 'Selesai'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={filterStatus === v ? 'chip chip-aktif' : 'chip'}
            onClick={() => setFilterStatus(v)}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder="Cari plat atau nama supir..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />

      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && difilter.length === 0 && <p className="teks-kecil">Tidak ada data.</p>}

      <div className="daftar-langkah">
        {difilter.map((s) => (
          <div key={s.id} className="kartu daftar-langkah">
            <button
              className="admin-baris-sesi"
              onClick={() => setTerbuka(terbuka === s.id ? null : s.id)}
            >
              <div>
                <p className="nama-plat">{s.vehicles?.plat_tampilan ?? '-'}</p>
                <p className="teks-kecil">
                  {s.profiles?.nama ?? '-'} · {formatTanggal(s.started_at)}
                  {s.dari_offline && ' · dari antrean offline'}
                </p>
              </div>
              <span className={s.status === 'aktif' ? 'lencana lencana-info' : 'lencana'}>
                {s.status === 'aktif' ? 'Berjalan' : 'Selesai'}
              </span>
            </button>

            {terbuka === s.id && (
              <DetailSesi
                sesi={s}
                superAdmin={superAdmin}
                onSelesai={() => {
                  setTerbuka(null)
                  muat()
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
