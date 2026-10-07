import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { sudahScanHariIni } from '../../lib/scanHariIni.js'
import {
  formatTanggal,
  formatTanggalPendek,
  formatJam,
  hariWIB,
} from '../../lib/waktu.js'
import ModalBarcode from '../../components/user/ModalBarcode.jsx'

// Ambang visual saja. Nilai resmi diatur Super Admin di tabel pengaturan.
const AMBANG_WASPADA = 80
const AMBANG_KRITIS = 100

function rentangWaktu(r) {
  if (r.status === 'aktif' || !r.ended_at) {
    return `Mulai ${formatJam(r.started_at)}, masih berjalan`
  }
  const selesai =
    hariWIB(r.ended_at) === hariWIB(r.started_at)
      ? formatJam(r.ended_at)
      : `${formatTanggalPendek(r.ended_at)} ${formatJam(r.ended_at)}`
  return `Mulai ${formatJam(r.started_at)} sampai ${selesai}`
}

export default function Beranda() {
  const { profil, signOut } = useAuth()
  const [kuota, setKuota] = useState([])
  const [kendaraan, setKendaraan] = useState({})
  const [sesi, setSesi] = useState(undefined)
  const [daftarMinggu, setDaftarMinggu] = useState([])
  const [mingguDipilih, setMingguDipilih] = useState(null)
  const [riwayat, setRiwayat] = useState(undefined)
  const [modalBarcode, setModalBarcode] = useState(false)
  const [memuat, setMemuat] = useState(true)

  const scanOk = profil ? sudahScanHariIni(profil.id) : false

  // Data utama: kuota minggu berjalan, kendaraan, sesi aktif, dan daftar minggu
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
      supabase.rpc('daftar_minggu_saya'),
    ]).then(([{ data: k }, { data: v }, { data: s }, { data: m }]) => {
      if (!aktif) return
      const daftar = (m ?? []).map((x) => x.minggu)
      setKuota(k ?? [])
      setKendaraan(Object.fromEntries((v ?? []).map((x) => [x.id, x])))
      setSesi(s ?? null)
      setDaftarMinggu(daftar)
      setMingguDipilih(daftar[0] ?? null)
      setMemuat(false)
    })

    return () => {
      aktif = false
    }
  }, [])

  // Riwayat untuk minggu yang dipilih
  useEffect(() => {
    if (!mingguDipilih) return
    let aktif = true

    supabase
      .rpc('riwayat_saya', { p_minggu: mingguDipilih })
      .then(({ data, error }) => {
        if (!aktif) return
        setRiwayat(error ? [] : (data ?? []))
      })

    return () => {
      aktif = false
    }
  }, [mingguDipilih])

  const perHari = useMemo(() => {
    const grup = {}
    for (const r of riwayat ?? []) {
      const kunci = hariWIB(r.started_at)
      if (!grup[kunci]) grup[kunci] = []
      grup[kunci].push(r)
    }
    return Object.entries(grup).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [riwayat])

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
            Kuota minggu ini belum tersedia. Hubungi admin.
          </p>
        )}

        {kuota.map((k) => {
          const info = kendaraan[k.vehicle_id]
          const menunggu = k.status_kuota === 'menunggu'
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
                {menunggu ? (
                  <span className="lencana lencana-tunggu">Menunggu Persetujuan</span>
                ) : (
                  <span className="lencana lencana-info">{sisa.toFixed(1)} L sisa</span>
                )}
              </div>
              <progress className={kelasProgres} value={persen} max="100" />
              <p className="teks-kecil">
                {menunggu
                  ? `Kuota minggu ini: 0.0 liter. Pemakaian tercatat: ${terpakai.toFixed(1)} liter`
                  : `Terpakai ${terpakai.toFixed(1)} dari ${quota.toFixed(1)} liter`}
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

        {daftarMinggu.length > 0 && (
          <div className="pilihan-minggu">
            {daftarMinggu.map((m) => (
              <button
                key={m}
                className={m === mingguDipilih ? 'chip chip-aktif' : 'chip'}
                onClick={() => {
                  setRiwayat(undefined)
                  setMingguDipilih(m)
                }}
              >
                {formatTanggalPendek(m)}
              </button>
            ))}
          </div>
        )}

        {riwayat === undefined && <p className="teks-kecil">Memuat...</p>}

        {riwayat && riwayat.length === 0 && (
          <p className="teks-kecil">Belum ada perjalanan pada minggu ini.</p>
        )}

        {perHari.map(([hari, daftar]) => (
          <div className="daftar-langkah" key={hari}>
            <p className="judul">{formatTanggal(daftar[0].started_at)}</p>

            {daftar.map((r) => (
              <div
                key={r.id}
                className={r.status === 'aktif' ? 'kartu daftar-langkah' : 'kartu-nonaktif daftar-langkah'}
              >
                <p className="nama-plat">{r.plat}</p>
                <p className="teks-kecil">{rentangWaktu(r)}</p>
                {r.bisa_review ? (
                  <Link className="tombol-sekunder" to={`/review/${r.id}`}>
                    Review Laporan
                  </Link>
                ) : (
                  r.status === 'selesai' && (
                    <p className="teks-kecil">Review tidak tersedia</p>
                  )
                )}
              </div>
            ))}
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
