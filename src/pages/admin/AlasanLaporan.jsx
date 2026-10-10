import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatTanggal, formatJam } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'

const STATUS_LABEL = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  ditindaklanjuti: 'Ditindaklanjuti',
}
const KIND_LABEL = { alasan: 'Alasan', saran: 'Saran', review: 'Review' }
const JENIS_LABEL = {
  indikator_rusak: 'Indikator rusak',
  lupa_foto: 'Lupa foto',
  koreksi_km: 'Koreksi kilometer',
  lainnya: 'Lainnya',
}

export default function AlasanLaporan() {
  const [memuat, setMemuat] = useState(true)
  const [daftar, setDaftar] = useState([])
  const [filterStatus, setFilterStatus] = useState('menunggu')
  const [filterKind, setFilterKind] = useState('semua')

  async function muat() {
    setMemuat(true)
    // PENTING: review_requests punya DUA relasi ke profiles (pengirim dan
    // diputuskan_oleh), jadi relasi yang diambil harus ditulis eksplisit
    // lewat "profiles!pengirim(...)" agar PostgREST tidak bingung memilih
    // yang mana.
    let q = supabase
      .from('review_requests')
      .select('id, kind, jenis_alasan, isi, status, catatan_admin, created_at, profiles!pengirim(nama)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (filterStatus !== 'semua') q = q.eq('status', filterStatus)
    if (filterKind !== 'semua') q = q.eq('kind', filterKind)
    const { data } = await q
    setDaftar(data ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterKind])

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Alasan & Laporan</h1>

      <div className="baris">
        {[
          ['menunggu', 'Menunggu'],
          ['disetujui', 'Disetujui'],
          ['ditolak', 'Ditolak'],
          ['semua', 'Semua Status'],
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

      <div className="baris">
        {[
          ['semua', 'Semua Jenis'],
          ['alasan', 'Alasan'],
          ['saran', 'Saran'],
          ['review', 'Review'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={filterKind === v ? 'chip chip-aktif' : 'chip'}
            onClick={() => setFilterKind(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {memuat && <p className="teks-kecil">Memuat...</p>}
      {!memuat && daftar.length === 0 && <p className="teks-kecil">Tidak ada data.</p>}

      <div className="daftar-langkah">
        {daftar.map((item) => (
          <KartuLaporan key={item.id} item={item} onSelesai={muat} />
        ))}
      </div>
    </div>
  )
}

function KartuLaporan({ item, onSelesai }) {
  const [catatan, setCatatan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function putuskan(status) {
    if (catatan.trim().length === 0) {
      setPesan('Catatan wajib diisi sebelum memutuskan.')
      return
    }
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('putuskan_review', {
      p_id: item.id,
      p_status: status,
      p_catatan: catatan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  return (
    <div className="kartu daftar-langkah">
      <div className="header">
        <div>
          <p className="nama-plat">
            {KIND_LABEL[item.kind] ?? item.kind}
            {item.jenis_alasan && ` · ${JENIS_LABEL[item.jenis_alasan] ?? item.jenis_alasan}`}
          </p>
          <p className="teks-kecil">
            {item.profiles?.nama ?? '-'} · {formatTanggal(item.created_at)} {formatJam(item.created_at)}
          </p>
        </div>
        <span className="lencana lencana-info">{STATUS_LABEL[item.status] ?? item.status}</span>
      </div>

      <p className="teks-kecil">{item.isi}</p>

      {item.catatan_admin && (
        <p className="pesan-info">Catatan sebelumnya: {item.catatan_admin}</p>
      )}

      {pesan && <p className="pesan-error">{pesan}</p>}

      {item.status === 'menunggu' && (
        <div className="daftar-langkah">
          <input
            className="input"
            placeholder="Catatan keputusan (wajib)"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
          <div className="baris">
            <button
              className="tombol-sekunder admin-tombol-kecil"
              onClick={() => putuskan('disetujui')}
              disabled={memproses}
            >
              Setujui
            </button>
            <button
              className="tombol-sekunder admin-tombol-kecil admin-tombol-bahaya"
              onClick={() => putuskan('ditolak')}
              disabled={memproses}
            >
              Tolak
            </button>
            <button
              className="tombol-sekunder admin-tombol-kecil"
              onClick={() => putuskan('ditindaklanjuti')}
              disabled={memproses}
            >
              Tindak Lanjut
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
