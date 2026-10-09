import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { formatJam } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'
import FotoAdmin from '../../components/admin/FotoAdmin.jsx'

export default function IsiMinyak() {
  const { profil } = useAuth()
  const superAdmin = profil?.role === 'super_admin'

  const [memuat, setMemuat] = useState(true)
  const [daftar, setDaftar] = useState([])
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState(null)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function muat() {
    setMemuat(true)
    const { data } = await supabase
      .from('refuels')
      .select(
        'id, status, server_received_at, km_sebelum, bar_sebelum, liter_sebelum, km_sesudah, bar_sesudah, liter_sesudah, liter_diisi, foto_sebelum_id, foto_sesudah_id, vehicles(plat_tampilan), profiles(nama)',
      )
      .order('server_received_at', { ascending: false })
      .limit(50)
    setDaftar(data ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
  }, [])

  async function tolak(id) {
    const alasan = window.prompt('Alasan menolak pengisian ini:')
    if (!alasan || alasan.trim().length < 5) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('ubah_refuel', {
      p_id: id,
      p_perubahan: { status: 'ditolak' },
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    muat()
  }

  async function terimaKembali(id) {
    const alasan = window.prompt('Alasan mengakui kembali pengisian ini:')
    if (!alasan || alasan.trim().length < 5) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('ubah_refuel', {
      p_id: id,
      p_perubahan: { status: 'tercatat' },
      p_alasan: alasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    muat()
  }

  const difilter = daftar.filter((r) => {
    const teks = `${r.vehicles?.plat_tampilan ?? ''} ${r.profiles?.nama ?? ''}`.toLowerCase()
    return teks.includes(cari.toLowerCase())
  })

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Isi Minyak</h1>
      <p className="teks-kecil">Menampilkan 50 pengisian terbaru dari semua mobil.</p>

      <input
        className="input"
        placeholder="Cari plat atau nama supir..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />

      {pesan && <p className="pesan-error">{pesan}</p>}
      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && difilter.length === 0 && <p className="teks-kecil">Belum ada data pengisian.</p>}

      <div className="daftar-langkah">
        {difilter.map((r) => (
          <div
            key={r.id}
            className={r.status === 'ditolak' ? 'kartu-nonaktif daftar-langkah' : 'kartu daftar-langkah'}
          >
            <button
              className="admin-baris-sesi"
              onClick={() => setTerbuka(terbuka === r.id ? null : r.id)}
            >
              <div>
                <p className="nama-plat">{r.vehicles?.plat_tampilan ?? '-'}</p>
                <p className="teks-kecil">
                  {r.profiles?.nama ?? '-'} · {formatJam(r.server_received_at)} ·{' '}
                  {Number(r.liter_diisi).toFixed(2)} L
                </p>
              </div>
              {r.status === 'ditolak' && <span className="lencana lencana-tunggu">Ditolak</span>}
            </button>

            {terbuka === r.id && (
              <div className="daftar-langkah admin-detail">
                <p className="teks-kecil">
                  Sebelum: {r.km_sebelum} km, bar {r.bar_sebelum}, {r.liter_sebelum} L
                </p>
                <p className="teks-kecil">
                  Sesudah: {r.km_sesudah} km, bar {r.bar_sesudah}, {r.liter_sesudah} L
                </p>
                <div className="baris">
                  <FotoAdmin photoId={r.foto_sebelum_id} label="Foto sebelum" />
                  <FotoAdmin photoId={r.foto_sesudah_id} label="Foto sesudah" />
                </div>
                {superAdmin &&
                  (r.status === 'ditolak' ? (
                    <button
                      className="tombol-sekunder admin-tombol-kecil"
                      onClick={() => terimaKembali(r.id)}
                      disabled={memproses}
                    >
                      Akui Kembali
                    </button>
                  ) : (
                    <button
                      className="tombol-sekunder admin-tombol-kecil admin-tombol-bahaya"
                      onClick={() => tolak(r.id)}
                      disabled={memproses}
                    >
                      Tolak Pengisian
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
