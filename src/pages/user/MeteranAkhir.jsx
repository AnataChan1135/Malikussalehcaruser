import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/useAuth.js'
import { ambilLokasi } from '../../lib/lokasi.js'
import { pesanError, parseKodeAlasan } from '../../lib/pesan.js'
import KameraFoto from '../../components/user/KameraFoto.jsx'
import PratinjauFoto from '../../components/user/PratinjauFoto.jsx'
import AlasanForm from '../../components/user/AlasanForm.jsx'

function angkaValid(km, bar, liter) {
  return (
    km !== '' &&
    bar !== '' &&
    liter !== '' &&
    Number.isInteger(Number(km)) &&
    Number(km) >= 0 &&
    Number.isInteger(Number(bar)) &&
    Number(bar) >= 0 &&
    Number(liter) >= 0
  )
}

async function unggahFoto(userId, clientId, foto) {
  const path = `${userId}/${clientId}/akhir-${crypto.randomUUID()}.${foto.ext}`
  const { error } = await supabase.storage
    .from('foto-kuota')
    .upload(path, foto.blob, { contentType: foto.blob.type, upsert: false })
  if (error) throw new Error('FOTO_GAGAL')
  return path
}

function FieldAngka({ id, label, value, onChange, mode, step, disabled }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode={mode}
        min="0"
        step={step}
        className="input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function MeteranAkhir() {
  const nav = useNavigate()
  const { profil } = useAuth()

  const [clientId] = useState(() => crypto.randomUUID())

  const [muat, setMuat] = useState(true)
  const [gagalMuat, setGagalMuat] = useState(false)
  const [sesi, setSesi] = useState(null) // { id, plat, jenis }

  const [foto, setFoto] = useState(null)
  const [pathFoto, setPathFoto] = useState(null)
  const [km, setKm] = useState('')
  const [bar, setBar] = useState('')
  const [liter, setLiter] = useState('')

  const [konfirmasi, setKonfirmasi] = useState(false)
  const [kodeAlasan, setKodeAlasan] = useState(null)
  const [sedangKirim, setSedangKirim] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    let aktif = true

    supabase
      .from('sessions')
      .select('id, vehicles(plat_tampilan, jenis)')
      .eq('status', 'aktif')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!aktif) return
        if (error) {
          setGagalMuat(true)
          setMuat(false)
          return
        }
        // Tidak ada perjalanan berjalan: tidak ada yang bisa diakhiri
        if (!data) {
          nav('/', { replace: true })
          return
        }
        setSesi({
          id: data.id,
          plat: data.vehicles?.plat_tampilan ?? '-',
          jenis: data.vehicles?.jenis ?? '',
        })
        setMuat(false)
      })

    return () => {
      aktif = false
    }
  }, [nav])

  function gantiFoto(hasil) {
    setFoto(hasil)
    setPathFoto(null)
  }

  const terkunci = Boolean(kodeAlasan) || sedangKirim
  const siapKirim =
    Boolean(foto) && angkaValid(km, bar, liter) && !terkunci

  async function kirim(alasanBaru = null) {
    setPesan(null)
    setSedangKirim(true)
    try {
      const lok = await ambilLokasi()

      // Foto diunggah sekali. Kirim ulang tidak mengunggah ulang.
      let p = pathFoto
      if (!p) {
        p = await unggahFoto(profil.id, clientId, foto)
        setPathFoto(p)
      }

      const { error } = await supabase.rpc('akhiri_sesi', {
        p_sesi: sesi.id,
        p_data: {
          km: Number(km),
          bar: Number(bar),
          liter: Number(liter),
          foto_path: p,
          foto_sha256: foto.sha256,
          foto_bytes: foto.bytes,
          lat: lok.lat,
          lng: lok.lng,
          akurasi_m: lok.akurasi_m,
          waktu_perangkat: new Date().toISOString(),
          alasan_jenis: alasanBaru?.jenis ?? null,
          alasan_isi: alasanBaru?.isi ?? null,
        },
      })
      if (error) throw error

      nav('/', { replace: true })
    } catch (err) {
      const kode = parseKodeAlasan(err)
      if (kode) {
        setKodeAlasan(kode)
      } else {
        setPesan(pesanError(err))
      }
    } finally {
      setSedangKirim(false)
    }
  }

  if (muat) {
    return <div className="layar-tengah teks-kecil">Memuat...</div>
  }

  if (gagalMuat) {
    return (
      <div className="layar-tengah">
        <p className="pesan-error">
          Data perjalanan belum bisa dimuat. Muat ulang halaman.
        </p>
      </div>
    )
  }

  return (
    <div className="halaman">
      <header className="header">
        <Link className="tombol-sekunder" to="/">
          Kembali
        </Link>
        <h1 className="judul">Meteran Akhir</h1>
      </header>

      <p className="teks-kecil">
        {sesi.plat} - {sesi.jenis}
      </p>

      <section className="daftar-langkah">
        <h2 className="judul">1. Foto Odometer dan Dashboard</h2>
        <p className="pesan-info">
          Foto odometer beserta indikator bar BBM dan jumlah liter saat perjalanan
          berakhir.
        </p>

        {foto ? (
          <PratinjauFoto
            foto={foto}
            label="Foto meteran akhir"
            terkunci={terkunci}
            onUlangi={() => gantiFoto(null)}
          />
        ) : (
          <KameraFoto onSelesai={gantiFoto} />
        )}
      </section>

      <section className="daftar-langkah">
        <h2 className="judul">2. Isi Angka dari Dashboard</h2>
        <FieldAngka id="km-akhir" label="Kilometer" value={km} onChange={setKm} mode="numeric" step="1" disabled={terkunci} />
        <FieldAngka id="bar-akhir" label="Bar BBM" value={bar} onChange={setBar} mode="numeric" step="1" disabled={terkunci} />
        <FieldAngka id="liter-akhir" label="Liter BBM" value={liter} onChange={setLiter} mode="decimal" step="0.01" disabled={terkunci} />
      </section>

      {pesan && <p className="pesan-error">{pesan}</p>}

      {kodeAlasan ? (
        <AlasanForm
          kode={kodeAlasan}
          memproses={sedangKirim}
          onKirim={(alasan) => kirim(alasan)}
        />
      ) : (
        <button
          className="tombol"
          disabled={!siapKirim}
          onClick={() => setKonfirmasi(true)}
        >
          Akhiri Perjalanan
        </button>
      )}

      {konfirmasi && (
        <div className="overlay">
          <div className="panel-modal">
            <h2 className="judul">Yakin mengakhiri perjalanan?</h2>
            <p className="teks-kecil">
              Setelah diakhiri, data perjalanan ini tidak bisa diubah oleh Anda.
              Anda hanya bisa melihat hasilnya dan menulis review.
            </p>
            <div className="daftar-langkah">
              <button
                className="tombol"
                disabled={sedangKirim}
                onClick={() => {
                  setKonfirmasi(false)
                  kirim()
                }}
              >
                Ya, Akhiri
              </button>
              <button
                className="tombol-sekunder"
                onClick={() => setKonfirmasi(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
