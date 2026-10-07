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

async function unggahFoto(userId, clientId, jenis, foto) {
  const path = `${userId}/${clientId}/${jenis}-${crypto.randomUUID()}.${foto.ext}`
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

export default function IsiMinyak() {
  const nav = useNavigate()
  const { profil } = useAuth()

  // Satu clientId per kunjungan halaman. Kirim ulang memakai id yang sama.
  const [clientId] = useState(() => crypto.randomUUID())

  const [muat, setMuat] = useState(true)
  const [gagalMuat, setGagalMuat] = useState(false)
  const [sesi, setSesi] = useState(null) // { id, plat, jenis }

  const [fotoSebelum, setFotoSebelum] = useState(null)
  const [fotoSesudah, setFotoSesudah] = useState(null)
  const [pathSebelum, setPathSebelum] = useState(null)
  const [pathSesudah, setPathSesudah] = useState(null)

  const [kmS, setKmS] = useState('')
  const [barS, setBarS] = useState('')
  const [literS, setLiterS] = useState('')
  const [kmA, setKmA] = useState('')
  const [barA, setBarA] = useState('')
  const [literA, setLiterA] = useState('')

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
        // Tidak ada perjalanan berjalan: halaman ini tidak relevan
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

  function gantiSebelum(hasil) {
    setFotoSebelum(hasil)
    setPathSebelum(null)
  }

  function gantiSesudah(hasil) {
    setFotoSesudah(hasil)
    setPathSesudah(null)
  }

  const bisaHitung =
    angkaValid(kmS, barS, literS) && angkaValid(kmA, barA, literA)
  const literDiisi = bisaHitung ? Number(literA) - Number(literS) : null

  const terkunci = Boolean(kodeAlasan) || sedangKirim
  const siapKirim =
    Boolean(fotoSebelum && fotoSesudah && bisaHitung) && !terkunci

  async function kirim(alasanBaru = null) {
    setPesan(null)
    setSedangKirim(true)
    try {
      const lok = await ambilLokasi()

      // Setiap foto diunggah sekali. Kirim ulang tidak mengunggah ulang.
      let pS = pathSebelum
      if (!pS) {
        pS = await unggahFoto(profil.id, clientId, 'isi-sebelum', fotoSebelum)
        setPathSebelum(pS)
      }
      let pA = pathSesudah
      if (!pA) {
        pA = await unggahFoto(profil.id, clientId, 'isi-sesudah', fotoSesudah)
        setPathSesudah(pA)
      }

      const { error } = await supabase.rpc('catat_isi', {
        p_sesi: sesi.id,
        p_data: {
          client_id: clientId,
          km_sebelum: Number(kmS),
          bar_sebelum: Number(barS),
          liter_sebelum: Number(literS),
          foto_sebelum_path: pS,
          foto_sebelum_sha256: fotoSebelum.sha256,
          foto_sebelum_bytes: fotoSebelum.bytes,
          km_sesudah: Number(kmA),
          bar_sesudah: Number(barA),
          liter_sesudah: Number(literA),
          foto_sesudah_path: pA,
          foto_sesudah_sha256: fotoSesudah.sha256,
          foto_sesudah_bytes: fotoSesudah.bytes,
          lat: lok.lat,
          lng: lok.lng,
          akurasi_m: lok.akurasi_m,
          waktu_perangkat: new Date().toISOString(),
          dari_offline: false,
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
        <h1 className="judul">Isi Minyak</h1>
      </header>

      <p className="teks-kecil">
        {sesi.plat} - {sesi.jenis}
      </p>

      <section className="daftar-langkah">
        <h2 className="judul">1. Sebelum Diisi</h2>
        <p className="pesan-info">
          Foto indikator bar BBM dan jumlah liter pada dashboard sebelum mengisi.
        </p>

        {fotoSebelum ? (
          <PratinjauFoto
            foto={fotoSebelum}
            label="Foto sebelum diisi"
            terkunci={terkunci}
            onUlangi={() => gantiSebelum(null)}
          />
        ) : (
          <KameraFoto onSelesai={gantiSebelum} />
        )}

        <FieldAngka id="km-s" label="Kilometer" value={kmS} onChange={setKmS} mode="numeric" step="1" disabled={terkunci} />
        <FieldAngka id="bar-s" label="Bar BBM" value={barS} onChange={setBarS} mode="numeric" step="1" disabled={terkunci} />
        <FieldAngka id="liter-s" label="Liter BBM" value={literS} onChange={setLiterS} mode="decimal" step="0.01" disabled={terkunci} />
      </section>

      {fotoSebelum && (
        <section className="daftar-langkah">
          <h2 className="judul">2. Setelah Diisi</h2>
          <p className="pesan-info">
            Foto indikator bar BBM dan jumlah liter pada dashboard setelah selesai
            mengisi.
          </p>

          {fotoSesudah ? (
            <PratinjauFoto
              foto={fotoSesudah}
              label="Foto setelah diisi"
              terkunci={terkunci}
              onUlangi={() => gantiSesudah(null)}
            />
          ) : (
            <KameraFoto onSelesai={gantiSesudah} />
          )}

          <FieldAngka id="km-a" label="Kilometer" value={kmA} onChange={setKmA} mode="numeric" step="1" disabled={terkunci} />
          <FieldAngka id="bar-a" label="Bar BBM" value={barA} onChange={setBarA} mode="numeric" step="1" disabled={terkunci} />
          <FieldAngka id="liter-a" label="Liter BBM" value={literA} onChange={setLiterA} mode="decimal" step="0.01" disabled={terkunci} />
        </section>
      )}

      {literDiisi !== null &&
        (literDiisi > 0 ? (
          <p className="pesan-sukses">Liter diisi: {literDiisi.toFixed(2)} L</p>
        ) : (
          <p className="pesan-peringatan">
            Liter setelah diisi harus lebih besar dari liter sebelum diisi.
          </p>
        ))}

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
          onClick={() => kirim()}
        >
          {sedangKirim ? 'Menyimpan...' : 'Simpan Pengisian'}
        </button>
      )}
    </div>
  )
}
