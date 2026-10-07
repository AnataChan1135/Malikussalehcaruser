import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { sudahScanHariIni } from '../../lib/scanHariIni.js'
import { formatTanggal } from '../../lib/waktu.js'
import ModalBarcode from '../../components/user/ModalBarcode.jsx'

// Ambang visual saja. Nilai resmi diatur Super Admin di tabel pengaturan.
const AMBANG_WASPADA = 80
const AMBANG_KRITIS = 100

export default function Beranda() {
  const { profil, signOut } = useAuth()
  const [kuota, setKuota] = useState([])
  const [kendaraan, setKendaraan] = useState({})
  const [sesi, setSesi] = useState(undefined)
  const [riwayat, setRiwayat] = useState(undefined)
  const [modalBarcode, setModalBarcode] = useState(false)
  const [memuat, setMemuat] = useState(true)

  const scanOk = profil ? sudahScanHariIni(profil.id) : false

  useEffect(() => {
    let aktif = true

    Promise.all([
      supabase.rpc('kuota_saya'),
      supabase.from('vehicles').select('id, plat_tampilan, jenis'),
      supabase
        .from('sessions')
        .select('id, vehicle_id, started_at')
        .eq('status', 'aktif')
        .maybeSingle(),
      supabase
        .from('sessions')
        .select('id, started_at')
        .eq('status', 'selesai')
        .order('started_at', { ascending: false })
        .limit(10),
    ]).then(([{ data: k }, { data: v }, { data: s }, { data: r }]) => {
      if (!aktif) return
      setKuota(k ?? [])
      setKendaraan(Object.fromEntries((v ?? []).map((x) => [x.id, x])))
      setSesi(s ?? null)
      setRiwayat(r ?? [])
      setMemuat(false)
    })

    return () => {
      aktif = false
    }
  }, [])

  return (
    <div className="halaman">
      <header className="header">
        <div>
          <p className="teks-kecil">Halo,</p>
          <h1 className="judul">{profil?.nama}</h1>
        </div>
        <div className="baris">
          <button
            className="ikon-btn"
            aria-label="Tampilkan barcode"
            onClick={() => setModalBarcode(true)}
          >
            <QrCode size={22} />
          </button>
          <Link className="ikon-btn" to="/scan" aria-label="Scan barcode">
            <Camera size={22} />
          </Link>
        </div>
      </header>

      <section className="daftar-langkah">
        <h2 className="judul">Sisa Kuota Minggu Ini</h2>

        {memuat && <p className="teks-kecil">Memuat...</p>}

        {!memuat && kuota.length === 0 && (
          <p className="pesan-peringatan">
            Kuota minggu ini belum ditetapkan. Hubungi admin.
          </p>
        )}

        {kuota.map((k) => {
          const info = kendaraan[k.vehicle_id]
          const quota = Number(k.quota_liter)
          const terpakai = Number(k.terpakai_liter)
          const sisa = Number(k.sisa_liter)
          const persen = quota > 0 ? Math.min(100, (terpakai / quota) * 100) : 0
          const kelasProgres =
            persen >= AMBANG_KRITIS
              ? 'progres progres-kritis'
              : persen >= AMBANG_WASPADA
                ? 'progres progres-waspada'
                : 'progres'

          return (
            <div className="kartu" key={k.vehicle_id}>
              <div className="header">
                <div>
                  <p className="nama-plat">{info?.plat_tampilan ?? '-'}</p>
                  <p className="teks-kecil">{info?.jenis ?? ''}</p>
                </div>
                <span className="lencana lencana-info">
                  {sisa.toFixed(1)} L sisa
                </span>
              </div>
              <progress className={kelasProgres} value={persen} max="100" />
              <p className="teks-kecil">
                Terpakai {terpakai.toFixed(1)} dari {quota.toFixed(1)} liter
              </p>
            </div>
          )
        })}
      </section>

      <section className="daftar-langkah">
        <h2 className="judul">Perjalanan Hari Ini</h2>

        {sesi === undefined && <p className="teks-kecil">Memuat...</p>}

        {sesi === null && !scanOk && (
          <>
            <div className="kartu-nonaktif">Kilometer Awal</div>
            <p className="teks-kecil">
              Scan barcode dengan ikon kamera untuk membuka daftar perjalanan.
            </p>
          </>
        )}

        {sesi === null && scanOk && (
          <Link className="tombol" to="/meteran-awal">
            Kilometer Awal
          </Link>
        )}

        {sesi && (
          <>
            <div className="kartu-nonaktif">Kilometer Awal (sudah dicatat)</div>
            <Link className="tombol" to="/isi-minyak">
              Isi Minyak
            </Link>
            <Link className="tombol-sekunder" to="/meteran-akhir">
              Meteran Akhir
            </Link>
          </>
        )}
      </section>

      <section className="daftar-langkah">
        <h2 className="judul">Riwayat Perjalanan</h2>

        {riwayat === undefined && <p className="teks-kecil">Memuat...</p>}

        {riwayat && riwayat.length === 0 && (
          <p className="teks-kecil">Belum ada perjalanan yang selesai.</p>
        )}

        {riwayat?.map((s) => (
          <div className="kartu-nonaktif daftar-langkah" key={s.id}>
            <p className="judul">{formatTanggal(s.started_at)}</p>
            <Link className="tombol-sekunder" to={`/review/${s.id}`}>
              Review Laporan
            </Link>
          </div>
        ))}
      </section>

      <button className="tombol-sekunder" onClick={signOut}>
        Keluar
      </button>

      {modalBarcode && <ModalBarcode onTutup={() => setModalBarcode(false)} />}
    </div>
  )
}
