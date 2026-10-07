import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { formatTanggal, formatJam } from '../../lib/waktu.js'
import { pesanError } from '../../lib/pesan.js'

const STATUS_LABEL = {
  menunggu: 'Menunggu pemeriksaan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  ditindaklanjuti: 'Ditindaklanjuti',
}

const JENIS_LABEL = {
  indikator_rusak: 'Indikator rusak',
  lupa_foto: 'Lupa foto',
  koreksi_km: 'Koreksi kilometer',
  lainnya: 'Lainnya',
}

const KIND_LABEL = {
  alasan: 'Alasan',
  saran: 'Saran',
  review: 'Review',
}

export default function Review() {
  const { sesiId } = useParams()

  // undefined = memuat, null = tidak ditemukan atau belum selesai
  const [data, setData] = useState(undefined)
  const [versi, setVersi] = useState(0)
  const [isi, setIsi] = useState('')
  const [sedangKirim, setSedangKirim] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    let aktif = true

    Promise.all([
      supabase
        .from('sessions')
        .select('id, status, started_at, ended_at, vehicles(plat_tampilan, jenis)')
        .eq('id', sesiId)
        .maybeSingle(),
      supabase
        .from('odometer_readings')
        .select('tipe, km, bar, liter, server_received_at')
        .eq('session_id', sesiId)
        .order('server_received_at'),
      supabase
        .from('refuels')
        .select('liter_diisi, status, server_received_at')
        .eq('session_id', sesiId)
        .order('server_received_at'),
      supabase
        .from('review_requests')
        .select('id, kind, isi, status, catatan_admin, jenis_alasan, created_at')
        .eq('session_id', sesiId)
        .order('created_at'),
      supabase.rpc('sesi_bisa_review', { p_sesi: sesiId }),
    ]).then(([s, o, r, v, b]) => {
      if (!aktif) return
      if (s.error || !s.data || s.data.status !== 'selesai') {
        setData(null)
        return
      }
      setData({
        sesi: s.data,
        odometer: o.data ?? [],
        isi: r.data ?? [],
        laporan: v.data ?? [],
        bisaReview: b.data === true,
      })
    })

    return () => {
      aktif = false
    }
  }, [sesiId, versi])

  if (data === undefined) {
    return <div className="layar-tengah teks-kecil">Memuat...</div>
  }

  if (data === null) {
    return <Navigate to="/" replace />
  }

  const awal = data.odometer.find((x) => x.tipe === 'awal')
  const akhir = data.odometer.find((x) => x.tipe === 'akhir')
  const isiDihitung = data.isi.filter((x) => x.status !== 'ditolak')
  const totalLiter = isiDihitung.reduce((t, x) => t + Number(x.liter_diisi), 0)
  const selisihKm = awal && akhir ? akhir.km - awal.km : null
  const sudahReview = data.laporan.some((x) => x.kind === 'review')
  const isiValid = isi.trim().length >= 5

  async function kirimReview(e) {
    e.preventDefault()
    if (!isiValid || sedangKirim) return

    setSedangKirim(true)
    setPesan(null)

    const { error } = await supabase.rpc('kirim_review', {
      p_sesi: sesiId,
      p_isi: isi.trim(),
    })

    setSedangKirim(false)

    if (error) {
      setPesan(
        error.code === '23505'
          ? 'Review untuk perjalanan ini sudah dikirim.'
          : pesanError(error),
      )
      return
    }

    setIsi('')
    setVersi((n) => n + 1)
  }

  return (
    <div className="halaman">
      <header className="header">
        <Link className="tombol-sekunder" to="/">
          Kembali
        </Link>
        <h1 className="judul">Review Laporan</h1>
      </header>

      <section className="kartu daftar-langkah">
        <p className="judul">{formatTanggal(data.sesi.started_at)}</p>
        <p className="nama-plat">
          {data.sesi.vehicles?.plat_tampilan ?? '-'} - {data.sesi.vehicles?.jenis ?? ''}
        </p>
        <p className="teks-kecil">
          Mulai {formatJam(data.sesi.started_at)}
          {data.sesi.ended_at && ` sampai ${formatJam(data.sesi.ended_at)}`}
        </p>
      </section>

      <section className="kartu daftar-langkah">
        <h2 className="judul">Ringkasan</h2>
        <p className="teks-kecil">Kilometer awal: {awal ? awal.km : '-'}</p>
        <p className="teks-kecil">Kilometer akhir: {akhir ? akhir.km : '-'}</p>
        <p className="teks-kecil">
          Jarak tempuh: {selisihKm !== null ? `${selisihKm} km` : '-'}
        </p>
        <p className="teks-kecil">Total BBM diisi: {totalLiter.toFixed(2)} liter</p>
      </section>

      {data.isi.length > 0 && (
        <section className="daftar-langkah">
          <h2 className="judul">Pengisian</h2>
          {data.isi.map((x, i) => (
            <div className="kartu" key={`${x.server_received_at}-${i}`}>
              <p className="nama-plat">
                {formatJam(x.server_received_at)} - {Number(x.liter_diisi).toFixed(2)} liter
              </p>
              {x.status === 'ditolak' && (
                <p className="pesan-peringatan">Pengisian ini tidak diakui oleh admin.</p>
              )}
            </div>
          ))}
        </section>
      )}

      {data.laporan.length > 0 && (
        <section className="daftar-langkah">
          <h2 className="judul">Laporan dan Catatan</h2>
          {data.laporan.map((x) => (
            <div className="kartu daftar-langkah" key={x.id}>
              <p className="nama-plat">
                {KIND_LABEL[x.kind]}
                {x.jenis_alasan && ` - ${JENIS_LABEL[x.jenis_alasan] ?? x.jenis_alasan}`}
              </p>
              <p className="teks-kecil">{x.isi}</p>
              <span className="lencana lencana-info">
                {STATUS_LABEL[x.status] ?? x.status}
              </span>
              {x.catatan_admin && (
                <p className="pesan-info">Catatan admin: {x.catatan_admin}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {sudahReview ? (
        <p className="pesan-sukses">Review sudah dikirim.</p>
      ) : data.bisaReview ? (
        <form className="kartu daftar-langkah" onSubmit={kirimReview}>
          <h2 className="judul">Tulis Review</h2>
          <p className="teks-kecil">
            Review hanya bisa dikirim sekali dan hanya pada minggu perjalanan
            berlangsung. Setelah dikirim, tidak bisa diubah.
          </p>
          <textarea
            className="textarea"
            rows={4}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Tulis kondisi perjalanan, kendala, atau saran"
          />
          {pesan && <p className="pesan-error">{pesan}</p>}
          <button type="submit" className="tombol" disabled={!isiValid || sedangKirim}>
            {sedangKirim ? 'Mengirim...' : 'Kirim Review'}
          </button>
        </form>
      ) : (
        <p className="pesan-peringatan">
          Review tidak tersedia. Review hanya bisa dikirim pada minggu perjalanan
          berlangsung. Admin dapat membuka riwayat ini bila diperlukan.
        </p>
      )}
    </div>
  )
}
