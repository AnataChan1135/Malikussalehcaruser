import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatJam } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'
import FotoAdmin from './FotoAdmin.jsx'

const JENIS_FLAG = {
  KM_MUNDUR: 'Kilometer mundur',
  BAR_NAIK_TANPA_ISI: 'Bar naik tanpa isi',
  LITER_NAIK_TANPA_ISI: 'Liter naik tanpa isi',
  KM_MUNDUR_ISI: 'Kilometer mundur saat isi',
  ISI_BAR_TIDAK_NAIK: 'Bar tidak naik setelah isi',
  ISI_LITER_TIDAK_NAIK: 'Liter tidak naik setelah isi',
  FOTO_IDENTIK: 'Foto identik dengan sesi lain',
}

export default function DetailSesi({ sesi, superAdmin, onSelesai }) {
  const [memuat, setMemuat] = useState(true)
  const [odometer, setOdometer] = useState([])
  const [refuels, setRefuels] = useState([])
  const [flags, setFlags] = useState([])
  const [laporan, setLaporan] = useState([])

  const [editTipe, setEditTipe] = useState(null)
  const [editKm, setEditKm] = useState('')
  const [editBar, setEditBar] = useState('')
  const [editLiter, setEditLiter] = useState('')
  const [editAlasan, setEditAlasan] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState(null)

  async function muat() {
    setMemuat(true)
    const [{ data: o }, { data: r }, { data: f }, { data: l }] = await Promise.all([
      supabase.from('odometer_readings').select('*').eq('session_id', sesi.id).order('server_received_at'),
      supabase.from('refuels').select('*').eq('session_id', sesi.id).order('server_received_at'),
      supabase.from('flags').select('*').eq('session_id', sesi.id).order('created_at'),
      supabase.from('review_requests').select('*').eq('session_id', sesi.id).order('created_at'),
    ])
    setOdometer(o ?? [])
    setRefuels(r ?? [])
    setFlags(f ?? [])
    setLaporan(l ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi.id])

  function mulaiEdit(baris) {
    setEditTipe(baris.tipe)
    setEditKm(baris.km)
    setEditBar(baris.bar)
    setEditLiter(baris.liter)
    setEditAlasan('')
    setPesan(null)
  }

  async function simpanEdit(id) {
    if (editAlasan.trim().length < 5) {
      setPesan('Alasan wajib diisi, minimal 5 karakter.')
      return
    }
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('ubah_meteran', {
      p_id: id,
      p_perubahan: { km: Number(editKm), bar: Number(editBar), liter: Number(editLiter) },
      p_alasan: editAlasan.trim(),
    })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    setEditTipe(null)
    muat()
  }

  async function hapusSesi() {
    const alasan = window.prompt(
      'Alasan menghapus sesi ini (data lama tetap tersimpan untuk audit):',
    )
    if (!alasan || alasan.trim().length < 5) return
    if (!window.confirm('Yakin menghapus sesi ini? Sesi akan disembunyikan dari daftar.')) return
    setMemproses(true)
    setPesan(null)
    const { error } = await supabase.rpc('hapus_sesi', { p_id: sesi.id, p_alasan: alasan.trim() })
    setMemproses(false)
    if (error) {
      setPesan(pesanError(error))
      return
    }
    onSelesai()
  }

  async function tolakRefuel(id) {
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

  if (memuat) return <p className="teks-kecil">Memuat detail...</p>

  const awal = odometer.find((o) => o.tipe === 'awal')
  const akhir = odometer.find((o) => o.tipe === 'akhir')

  return (
    <div className="daftar-langkah admin-detail">
      {pesan && <p className="pesan-error">{pesan}</p>}

      <div className="grid-kartu">
        {[
          ['awal', awal],
          ['akhir', akhir],
        ].map(([tipe, baris]) => (
          <div className="kartu daftar-langkah" key={tipe}>
            <p className="judul">Meteran {tipe === 'awal' ? 'Awal' : 'Akhir'}</p>
            {!baris && <p className="teks-kecil">Belum dicatat.</p>}
            {baris && editTipe === tipe && (
              <div className="daftar-langkah">
                <input
                  className="input"
                  type="number"
                  value={editKm}
                  onChange={(e) => setEditKm(e.target.value)}
                  placeholder="Km"
                />
                <input
                  className="input"
                  type="number"
                  value={editBar}
                  onChange={(e) => setEditBar(e.target.value)}
                  placeholder="Bar"
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={editLiter}
                  onChange={(e) => setEditLiter(e.target.value)}
                  placeholder="Liter"
                />
                <input
                  className="input"
                  value={editAlasan}
                  onChange={(e) => setEditAlasan(e.target.value)}
                  placeholder="Alasan perubahan"
                />
                <div className="baris">
                  <button
                    className="tombol-sekunder admin-tombol-kecil"
                    onClick={() => simpanEdit(baris.id)}
                    disabled={memproses}
                  >
                    Simpan
                  </button>
                  <button
                    className="tombol-sekunder admin-tombol-kecil"
                    onClick={() => setEditTipe(null)}
                    disabled={memproses}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
            {baris && editTipe !== tipe && (
              <>
                <p className="teks-kecil">
                  Km: {baris.km} - Bar: {baris.bar} - Liter: {baris.liter}
                </p>
                <p className="teks-kecil">
                  Lokasi: {baris.lat?.toFixed(5)}, {baris.lng?.toFixed(5)} (akurasi{' '}
                  {baris.akurasi_m ? `${baris.akurasi_m.toFixed(0)} m` : '-'})
                </p>
                <p className="teks-kecil">
                  Perangkat: {baris.waktu_perangkat ? formatJam(baris.waktu_perangkat) : '-'} ·
                  Server: {formatJam(baris.server_received_at)}
                </p>
                <FotoAdmin photoId={baris.photo_id} label={`Foto ${tipe}`} />
                {superAdmin && (
                  <button
                    className="tombol-sekunder admin-tombol-kecil"
                    onClick={() => mulaiEdit(baris)}
                  >
                    Koreksi
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {flags.length > 0 && (
        <div className="kartu daftar-langkah">
          <p className="judul">Tanda Perhatian</p>
          {flags.map((f) => (
            <p key={f.id} className="pesan-peringatan">
              {JENIS_FLAG[f.kode] ?? f.kode} (skor {f.skor})
            </p>
          ))}
        </div>
      )}

      {refuels.length > 0 && (
        <div className="daftar-langkah">
          <p className="judul">Pengisian ({refuels.length})</p>
          {refuels.map((r) => (
            <div
              key={r.id}
              className={r.status === 'ditolak' ? 'kartu-nonaktif daftar-langkah' : 'kartu daftar-langkah'}
            >
              <div className="header">
                <p className="nama-plat">
                  {formatJam(r.server_received_at)} - {Number(r.liter_diisi).toFixed(2)} L
                </p>
                {r.status === 'ditolak' && <span className="lencana lencana-tunggu">Ditolak</span>}
              </div>
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
              {superAdmin && r.status !== 'ditolak' && (
                <button
                  className="tombol-sekunder admin-tombol-kecil admin-tombol-bahaya"
                  onClick={() => tolakRefuel(r.id)}
                  disabled={memproses}
                >
                  Tolak Pengisian
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {laporan.length > 0 && (
        <div className="kartu daftar-langkah">
          <p className="judul">Alasan & Review</p>
          {laporan.map((l) => (
            <div key={l.id} className="daftar-langkah">
              <p className="teks-kecil">
                [{l.kind}] {l.isi}
              </p>
              <span className="lencana lencana-info">{l.status}</span>
            </div>
          ))}
        </div>
      )}

      {superAdmin && (
        <button
          className="tombol-sekunder admin-tombol-kecil admin-tombol-bahaya"
          onClick={hapusSesi}
          disabled={memproses}
        >
          Hapus Sesi Ini
        </button>
      )}
    </div>
  )
}
