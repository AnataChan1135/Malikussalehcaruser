import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatTanggal, formatJam } from '../../lib/waktu.js'
import PetaSesi from '../../components/admin/PetaSesi.jsx'

// Mengumpulkan semua titik lokasi yang tercatat untuk satu sesi: scan
// barcode (dicari dari waktu terdekat sebelum sesi dimulai, karena scan
// tidak memiliki session_id langsung), meteran awal, setiap pengisian,
// dan meteran akhir.
async function muatTitik(sesi) {
  const [{ data: scan }, { data: odo }, { data: ref }] = await Promise.all([
    supabase
      .from('scan_events')
      .select('lat, lng, akurasi_m, created_at')
      .eq('profile_id', sesi.profile_id)
      .eq('cocok', true)
      .lte('created_at', sesi.started_at)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('odometer_readings')
      .select('tipe, lat, lng, akurasi_m, server_received_at')
      .eq('session_id', sesi.id),
    supabase
      .from('refuels')
      .select('lat, lng, akurasi_m, server_received_at')
      .eq('session_id', sesi.id)
      .order('server_received_at'),
  ])

  const titik = []

  if (scan?.[0]?.lat != null) {
    titik.push({
      label: 'Scan Barcode',
      waktu: scan[0].created_at,
      lat: scan[0].lat,
      lng: scan[0].lng,
      keterangan: `Akurasi ${scan[0].akurasi_m ? scan[0].akurasi_m.toFixed(0) : '-'} m`,
    })
  }

  for (const o of odo ?? []) {
    if (o.lat == null) continue
    titik.push({
      label: o.tipe === 'awal' ? 'Meteran Awal' : 'Meteran Akhir',
      waktu: o.server_received_at,
      lat: o.lat,
      lng: o.lng,
      keterangan: `Akurasi ${o.akurasi_m ? o.akurasi_m.toFixed(0) : '-'} m`,
    })
  }

  ;(ref ?? []).forEach((r, i) => {
    if (r.lat == null) return
    titik.push({
      label: `Isi Minyak #${i + 1}`,
      waktu: r.server_received_at,
      lat: r.lat,
      lng: r.lng,
      keterangan: `Akurasi ${r.akurasi_m ? r.akurasi_m.toFixed(0) : '-'} m`,
    })
  })

  return titik
}

export default function PetaLokasi() {
  const [memuat, setMemuat] = useState(true)
  const [daftar, setDaftar] = useState([])
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState(null)
  const [titikPerSesi, setTitikPerSesi] = useState({})
  const [memuatTitik, setMemuatTitik] = useState(false)

  async function muat() {
    setMemuat(true)
    const { data } = await supabase
      .from('sessions')
      .select('id, profile_id, status, started_at, ended_at, vehicles(plat_tampilan), profiles(nama)')
      .order('started_at', { ascending: false })
      .limit(30)
    setDaftar(data ?? [])
    setMemuat(false)
  }

  useEffect(() => {
    muat()
  }, [])

  async function buka(sesi) {
    if (terbuka === sesi.id) {
      setTerbuka(null)
      return
    }
    setTerbuka(sesi.id)
    if (!titikPerSesi[sesi.id]) {
      setMemuatTitik(true)
      const titik = await muatTitik(sesi)
      setTitikPerSesi((t) => ({ ...t, [sesi.id]: titik }))
      setMemuatTitik(false)
    }
  }

  const difilter = daftar.filter((s) => {
    const teks = `${s.vehicles?.plat_tampilan ?? ''} ${s.profiles?.nama ?? ''}`.toLowerCase()
    return teks.includes(cari.toLowerCase())
  })

  return (
    <div className="daftar-langkah">
      <h1 className="judul-besar">Peta Lokasi</h1>
      <p className="teks-kecil">
        Titik lokasi dari scan, meteran, dan setiap pengisian, diurutkan sesuai
        waktu. Tidak ada penilaian otomatis di sini — gunakan peta ini untuk
        memeriksa kewajaran lokasi secara manual. Menampilkan 30 sesi terbaru.
      </p>

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
            <button className="admin-baris-sesi" onClick={() => buka(s)}>
              <div>
                <p className="nama-plat">{s.vehicles?.plat_tampilan ?? '-'}</p>
                <p className="teks-kecil">
                  {s.profiles?.nama ?? '-'} · {formatTanggal(s.started_at)}
                </p>
              </div>
              <span className={s.status === 'aktif' ? 'lencana lencana-info' : 'lencana'}>
                {s.status === 'aktif' ? 'Berjalan' : 'Selesai'}
              </span>
            </button>

            {terbuka === s.id && (
              <div className="admin-detail daftar-langkah">
                {memuatTitik && !titikPerSesi[s.id] ? (
                  <p className="teks-kecil">Memuat titik lokasi...</p>
                ) : (
                  <>
                    <PetaSesi titik={titikPerSesi[s.id] ?? []} />
                    <div className="daftar-langkah">
                      {(titikPerSesi[s.id] ?? [])
                        .slice()
                        .sort((a, b) => new Date(a.waktu) - new Date(b.waktu))
                        .map((t, i) => (
                          <p key={i} className="teks-kecil">
                            {i + 1}. {t.label} — {formatJam(t.waktu)} ({t.keterangan})
                          </p>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
